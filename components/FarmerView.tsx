

import React, { useState, useEffect, useMemo } from 'react';
import { Negotiation, ProductCategory, NegotiationStatus, Product, ProductType, OrderStatus } from '../types';
import { generateProductDetails, generateCounterOfferSuggestion, verifyProductListing } from '../services/geminiService';
import { SparklesIcon, ChatBubbleIcon, PencilIcon, DollarSignIcon, PackageIcon, ClipboardListIcon, XIcon, LoaderIcon, CheckCircleIcon } from './icons';
import { useToast } from '../context/ToastContext';

interface FarmerViewProps {
    products: Product[];
    negotiations: Negotiation[];
    onAddNewProduct: (product: Omit<Product, 'id' | 'farmerId' | 'imageUrl' | 'isVerified' | 'verificationFeedback'>, imageFile: File) => Promise<void>;
    onUpdateProduct: (product: Product) => void;
    onRespond: (negotiationId: string, response: 'Accepted' | 'Rejected') => void;
    onCounter: (negotiation: Negotiation) => void;
    onOpenChat: (negotiation: Negotiation) => void;
}

type FormErrors = { [key in keyof Omit<Product, 'id' | 'farmerId' | 'imageUrl' | 'isVerified' | 'verificationFeedback'>]?: string } & { image?: string };

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
  
const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

const imageUrlToBase64 = async (url: string): Promise<{ base64: string, mimeType: string }> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    const mimeType = blob.type;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const FarmerView = ({ products, negotiations, onAddNewProduct, onUpdateProduct, onRespond, onCounter, onOpenChat }: FarmerViewProps) => {
    const [aiIsLoading, setAiIsLoading] = useState(false);
    const [formIsSubmitting, setFormIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    const [activeFormTab, setActiveFormTab] = useState<ProductType>(ProductType.Retail);
    const initialFormState = { name: '', category: ProductCategory.Other, description: '', price: 0, quantity: 0, type: ProductType.Retail };
    const [newProductForm, setNewProductForm] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editForm, setEditForm] = useState<Product | null>(null);
    const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
    const [editTouched, setEditTouched] = useState<{ [key: string]: boolean }>({});
    
    const [suggestions, setSuggestions] = useState<{ [key: string]: { loading: boolean; price?: number; error?: string } }>({});
    const [verifyingProductId, setVerifyingProductId] = useState<string | null>(null);
    const [orderStatuses, setOrderStatuses] = useState<{ [orderId: string]: OrderStatus }>({});
    const [verificationResults, setVerificationResults] = useState<{ [productId: string]: { message: string; type: 'success' | 'error' } }>({});
    const acceptedOrders = useMemo(() => negotiations.filter(n => n.status === NegotiationStatus.Accepted), [negotiations]);
    
    const { showToast } = useToast();

     useEffect(() => {
        const initialStatuses: { [orderId: string]: OrderStatus } = {};
        acceptedOrders.forEach(order => {
            if (!orderStatuses[order.id]) initialStatuses[order.id] = OrderStatus.Processing;
        });
        if (Object.keys(initialStatuses).length > 0) setOrderStatuses(prev => ({ ...prev, ...initialStatuses }));
    }, [acceptedOrders, orderStatuses]);

    useEffect(() => {
        setNewProductForm(prev => ({ ...prev, type: activeFormTab }));
    }, [activeFormTab]);
    
    const validateForm = (form: Omit<Product, 'id' | 'farmerId' | 'isVerified' | 'verificationFeedback' | 'imageUrl'>, forEdit = false): FormErrors => {
        const errors: FormErrors = {};
        if (!forEdit && !imageFile) errors.image = 'Product image is required.';
        if (!form.name.trim()) errors.name = 'Product name is required.';
        if (!form.description.trim()) errors.description = 'Description is required.';
        if (form.price <= 0) errors.price = 'Price must be a positive number.';
        if (form.quantity <= 0) errors.quantity = 'Stock quantity must be a positive number.';
        return errors;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewProductForm(prev => ({ ...prev, [name]: name === 'price' || name === 'quantity' ? parseFloat(value) || 0 : value }));
    };
    
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setTouched(prev => ({ ...prev, [e.target.name]: true }));
        setFormErrors(validateForm(newProductForm));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageFile(file);
        setImagePreviewUrl(await fileToDataUrl(file));
        setTouched(prev => ({...prev, image: true}));
        setFormErrors(prev => ({...prev, image: undefined}));

        setAiIsLoading(true);
        try {
            const base64Image = await fileToBase64(file);
            const details = await generateProductDetails(base64Image, file.type);
            setNewProductForm(prev => ({...prev, ...details}));
            showToast('AI analysis complete!', 'info');
        } catch (error) {
            showToast(error instanceof Error ? error.message : "An unknown error occurred", 'error');
        } finally {
            setAiIsLoading(false);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreviewUrl(null);
        setNewProductForm(prev => ({ ...prev, name: '', category: ProductCategory.Other, description: '' }));
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, description: true, price: true, quantity: true, image: true });
        const errors = validateForm(newProductForm);
        if (Object.keys(errors).length > 0 || !imageFile) {
            setFormErrors(errors);
            return;
        }
        setFormIsSubmitting(true);
        try {
            await onAddNewProduct(newProductForm, imageFile);
            setNewProductForm({ ...initialFormState, type: activeFormTab });
            setImageFile(null);
            setImagePreviewUrl(null);
            setTouched({});
            setFormErrors({});
        } catch (error) {
            // Error is handled by the passed-in onAddNewProduct function using toast
            console.error("Failed to add product:", error);
        } finally {
            setFormIsSubmitting(false);
        }
    };
    
    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditForm(product);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingProduct(null);
        setEditForm(null);
        setEditFormErrors({});
        setEditTouched({});
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editForm) return;
        const { name, value } = e.target;
        setEditForm({ ...editForm, [name]: name === 'price' || name === 'quantity' ? parseFloat(value) || 0 : value });
    };
    
    const handleEditInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editForm) return;
        setEditTouched(prev => ({...prev, [e.target.name]: true}));
        setEditFormErrors(validateForm(editForm, true));
    };

    const handleUpdateProductSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm) return;
        const errors = validateForm(editForm, true);
        if (Object.keys(errors).length > 0) {
            setEditFormErrors(errors);
            return;
        }
        onUpdateProduct(editForm);
        handleCloseEditModal();
    };

    const handleGetSuggestion = async (neg: Negotiation) => {
        setSuggestions(prev => ({ ...prev, [neg.id]: { loading: true } }));
        try {
            const price = await generateCounterOfferSuggestion({ productName: neg.productName, originalPrice: neg.initialPrice, offeredPrice: neg.offeredPrice, quantity: neg.quantity });
            setSuggestions(prev => ({ ...prev, [neg.id]: { loading: false, price } }));
        } catch (error) {
            setSuggestions(prev => ({ ...prev, [neg.id]: { loading: false } }));
            showToast(error instanceof Error ? error.message : "Failed to get suggestion.", 'error');
        }
    };
    
    const handleVerifyProduct = async (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setVerificationResults(prev => {
            const newResults = { ...prev };
            delete newResults[productId];
            return newResults;
        });
        
        setVerifyingProductId(productId);
        try {
            const { base64, mimeType } = await imageUrlToBase64(product.imageUrl);
            const { isVerified, feedback } = await verifyProductListing({ name: product.name, description: product.description, imageBase64: base64, mimeType });
            
            await onUpdateProduct({ ...product, isVerified, verificationFeedback: feedback });
            
            const resultMessage = `AI: "${feedback}"`;
            setVerificationResults(prev => ({ ...prev, [productId]: { message: resultMessage, type: isVerified ? 'success' : 'error' } }));

            setTimeout(() => {
                setVerificationResults(prev => {
                    const newResults = { ...prev };
                    delete newResults[productId];
                    return newResults;
                });
            }, 7000);

        } catch (error) {
            showToast(error instanceof Error ? error.message : "Verification failed.", 'error');
        } finally {
            setVerifyingProductId(null);
        }
    };

    const handleOrderStatusChange = (orderId: string, status: OrderStatus) => setOrderStatuses(prev => ({...prev, [orderId]: status}));
    
    const StatCard = ({ icon, title, value, color, iconBgColor }: { icon: React.ReactNode, title: string, value: string | number, color: string, iconBgColor: string }) => (
        <div className="bg-farmer-background-alt p-5 rounded-xl shadow-sm border border-stone-200/80 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${iconBgColor}`}>{icon}</div>
            <div>
                <p className="text-sm text-stone-500 font-medium">{title}</p>
                <p className={`text-2xl font-bold font-heading ${color}`}>{value}</p>
            </div>
        </div>
    );

    const inputClasses = (hasError: boolean) =>
        `mt-1 block w-full rounded-lg bg-stone-100 border text-stone-900 sm:text-sm px-3 py-2.5 focus:border-farmer-accent focus:ring-2 focus:ring-farmer-accent/50 ${
            hasError ? 'border-red-500' : 'border-stone-200'
        }`;
    
    const editInputClasses = (hasError: boolean) =>
        `mt-1 block w-full rounded-lg bg-stone-100 border text-stone-900 sm:text-sm px-3 py-2.5 focus:outline-none focus:border-farmer-accent focus:ring-2 focus:ring-farmer-accent/50 ${
            hasError ? 'border-red-500' : 'border-stone-200'
        }`;

    return (
        <div className="space-y-16 animate-fade-in">
            <section>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={<DollarSignIcon className="h-6 w-6 text-farmer-primary-dark"/>} title="Total Revenue" value={`₹${acceptedOrders.reduce((sum, n) => sum + (n.counterPrice || n.offeredPrice) * n.quantity, 0).toLocaleString()}`} color="text-farmer-primary-dark" iconBgColor="bg-farmer-primary/20" />
                    <StatCard icon={<PackageIcon className="h-6 w-6 text-yellow-600"/>} title="Pending Orders" value={acceptedOrders.filter(o => orderStatuses[o.id] !== 'Delivered').length} color="text-yellow-700" iconBgColor="bg-yellow-500/20" />
                    <StatCard icon={<ClipboardListIcon className="h-6 w-6 text-farmer-accent-dark"/>} title="Products Listed" value={products.length} color="text-farmer-accent-dark" iconBgColor="bg-farmer-accent/20" />
                </div>
            </section>
            
            <section>
                <h2 className="text-3xl font-bold font-heading text-stone-800 mb-6">My Inventory</h2>
                <div className="bg-farmer-background-alt rounded-xl shadow-sm border border-stone-200/80 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-farmer-background/60 text-xs text-stone-600 uppercase tracking-wider">
                            <tr>
                                <th scope="col" className="px-6 py-4">Product</th>
                                <th scope="col" className="px-6 py-4">Price</th>
                                <th scope="col" className="px-6 py-4">Stock</th>
                                <th scope="col" className="px-6 py-4">Verification</th>
                                <th scope="col" className="px-6 py-4"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/80">
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-farmer-background/50">
                                    <td scope="row" className="px-6 py-4 font-medium whitespace-nowrap flex items-center space-x-3">
                                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-md object-cover"/>
                                        <span className="font-bold text-stone-800">{p.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-stone-600">₹{p.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-stone-600">{p.quantity}</td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col items-start">
                                            {verifyingProductId === p.id ? (
                                                <div className="flex items-center space-x-2 text-stone-500"><LoaderIcon className="h-4 w-4 animate-spin"/><span>Verifying...</span></div>
                                            ) : p.isVerified ? (
                                                <div title={p.verificationFeedback} className="flex items-center space-x-2 text-green-600 font-semibold cursor-help"><CheckCircleIcon className="h-5 w-5"/><span>Verified</span></div>
                                            ) : (
                                                <button
                                                    onClick={() => handleVerifyProduct(p.id)}
                                                    className="px-3 py-1.5 text-xs font-bold bg-farmer-accent text-white rounded-md hover:bg-farmer-accent-dark flex items-center justify-center transition-colors shadow-sm"
                                                >
                                                    <SparklesIcon className="h-4 w-4 mr-1.5" />
                                                    <span>Verify Product</span>
                                                </button>
                                            )}
                                            {verificationResults[p.id] && (
                                                <p className={`text-xs mt-2 animate-fade-in max-w-xs ${verificationResults[p.id].type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                                                    {verificationResults[p.id].message}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleOpenEditModal(p)} className="p-2 rounded-md hover:bg-stone-200/60 text-stone-500 hover:text-farmer-accent transition-colors"><PencilIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {products.length === 0 && <p className="p-6 text-center text-stone-500">You haven't listed any products yet.</p>}
                </div>
            </section>

            <section>
                <h2 className="text-3xl font-bold font-heading text-stone-800 mb-6">List a New Product</h2>
                 <div className="bg-farmer-background-alt p-6 rounded-xl shadow-sm border border-stone-200/80">
                    <div className="flex border-b border-stone-200 mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveFormTab(ProductType.Retail)}
                            className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                                activeFormTab === ProductType.Retail
                                    ? 'border-farmer-primary text-farmer-primary'
                                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
                            }`}
                            aria-pressed={activeFormTab === ProductType.Retail}
                        >
                            List Retail Product
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFormTab(ProductType.Bulk)}
                            className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                                activeFormTab === ProductType.Bulk
                                    ? 'border-farmer-primary text-farmer-primary'
                                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
                            }`}
                            aria-pressed={activeFormTab === ProductType.Bulk}
                        >
                            List Bulk Product (Negotiable)
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                         {(aiIsLoading || formIsSubmitting) && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
                                <LoaderIcon className="h-8 w-8 text-farmer-primary animate-spin" />
                                <p className="mt-2 text-stone-700 font-semibold">{formIsSubmitting ? 'Saving product...' : 'Anna is thinking...'}</p>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-2">Product Image</label>
                                {imagePreviewUrl ? (
                                    <div className="mt-1 relative group">
                                        <img src={imagePreviewUrl} alt="Product preview" className="w-full rounded-lg object-cover h-64" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center rounded-lg">
                                            <button type="button" onClick={handleRemoveImage} className="bg-white/90 text-stone-800 rounded-full py-2 px-4 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-100 scale-90">Change Image</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg ${formErrors.image && touched.image ? 'border-red-500' : 'border-stone-300'}`}>
                                        <div className="space-y-1 text-center">
                                             <svg className="mx-auto h-12 w-12 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                                            </svg>
                                            <div className="flex text-sm text-stone-600">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-farmer-accent hover:text-farmer-accent-dark focus-within:outline-none"><input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={aiIsLoading || formIsSubmitting} /><span>Upload a file</span></label>
                                                <p className="pl-1">and get AI suggestions</p>
                                            </div>
                                            <p className="text-xs text-stone-500">PNG, JPG up to 10MB</p>
                                        </div>
                                    </div>
                                )}
                                {formErrors.image && touched.image && <p className="text-red-500 text-xs mt-1">{formErrors.image}</p>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700">Product Name</label>
                                <input type="text" name="name" value={newProductForm.name} onChange={handleInputChange} onBlur={handleInputBlur} className={inputClasses(!!(formErrors.name && touched.name))} />
                                 {formErrors.name && touched.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700">Category</label>
                                <select name="category" value={newProductForm.category} onChange={handleInputChange} onBlur={handleInputBlur} className={inputClasses(false)}>
                                    {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700">Price (₹)</label>
                                    <input type="number" name="price" value={newProductForm.price} onChange={handleInputChange} onBlur={handleInputBlur} className={inputClasses(!!(formErrors.price && touched.price))} />
                                    {formErrors.price && touched.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700">Stock Quantity</label>
                                    <input type="number" name="quantity" value={newProductForm.quantity} onChange={handleInputChange} onBlur={handleInputBlur} className={inputClasses(!!(formErrors.quantity && touched.quantity))} />
                                    {formErrors.quantity && touched.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700">Description</label>
                                <textarea name="description" rows={3} value={newProductForm.description} onChange={handleInputChange} onBlur={handleInputBlur} className={inputClasses(!!(formErrors.description && touched.description))}></textarea>
                                {formErrors.description && touched.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                            </div>
                             <button type="submit" disabled={formIsSubmitting} className="w-full bg-farmer-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-farmer-primary-dark transition-all shadow-sm transform hover:scale-[1.02] disabled:bg-stone-400">Add Product</button>
                        </div>
                    </form>
                </div>
            </section>
            
            <section>
                <h2 className="text-3xl font-bold font-heading text-stone-800 mb-6">Incoming Negotiations</h2>
                <div className="space-y-4">
                    {negotiations.filter(n => n.status !== NegotiationStatus.Accepted).map(neg => {
                        const suggestion = suggestions[neg.id];
                        return (
                         <div key={neg.id} className="bg-farmer-background-alt p-4 rounded-xl shadow-sm border border-stone-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <img src={neg.productImageUrl} alt={neg.productName} className="w-24 h-24 rounded-lg object-cover"/>
                                <div>
                                    <p className="font-bold font-heading text-lg text-stone-800">{neg.productName}</p>
                                    <p className="text-sm text-stone-500">Qty: {neg.quantity}</p>
                                    <p className="text-sm text-stone-500">Buyer's Offer: <span className="font-semibold text-orange-500">₹{neg.offeredPrice}</span> (Original: ₹{neg.initialPrice})</p>
                                    <p className="text-xs italic text-stone-500 mt-1">"{neg.notes}"</p>
                                    {suggestion?.loading && <p className="text-sm text-stone-500 animate-pulse">Getting suggestion...</p>}
                                    {suggestion?.price && <p className="text-sm text-blue-600 font-semibold">AI Suggests: <span className="font-bold">₹{suggestion.price.toFixed(2)}</span></p>}
                                </div>
                            </div>
                             <div className="flex items-center space-x-2 self-end sm:self-center">
                                <button onClick={() => onOpenChat(neg)} title="Open Chat" className="p-2.5 rounded-full hover:bg-stone-200/50 transition-colors">
                                    <ChatBubbleIcon className="h-6 w-6 text-stone-600"/>
                                </button>
                                {neg.status === NegotiationStatus.Pending && (
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-stretch">
                                        <button onClick={() => onRespond(neg.id, 'Accepted')} className="px-3 py-2 text-xs font-bold bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors">Accept</button>
                                        <button onClick={() => onCounter(neg)} className="px-3 py-2 text-xs font-bold bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">Counter</button>
                                        <button onClick={() => onRespond(neg.id, 'Rejected')} className="px-3 py-2 text-xs font-bold bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Reject</button>
                                        <button onClick={() => handleGetSuggestion(neg)} className="px-3 py-2 bg-farmer-accent text-white text-xs font-bold rounded-md hover:bg-farmer-accent-dark flex items-center justify-center" disabled={suggestion?.loading}>
                                            <SparklesIcon className="h-4 w-4 mr-1" /> AI Suggest
                                        </button>
                                    </div>
                                )}
                            </div>
                         </div>
                        )
                    })}
                </div>
            </section>
            
            <section>
                <div className="flex items-center space-x-3 mb-6">
                    <ClipboardListIcon className="h-8 w-8 text-farmer-primary" />
                    <h2 className="text-3xl font-bold font-heading text-stone-800">Order Management</h2>
                </div>
                <div className="space-y-4">
                    {acceptedOrders.length > 0 ? (
                        acceptedOrders.map(order => (
                            <div key={order.id} className="bg-farmer-background-alt p-4 rounded-xl shadow-sm border border-stone-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center space-x-4 mb-4 sm:mb-0 flex-1">
                                    <img src={order.productImageUrl} alt={order.productName} className="w-24 h-24 rounded-lg object-cover"/>
                                    <div>
                                        <p className="font-bold font-heading text-lg text-stone-800">{order.productName}</p>
                                        <p className="text-sm text-stone-500">Qty: {order.quantity} | Buyer ID: {order.buyerId.slice(0, 5)}...</p>
                                        <p className="text-sm text-stone-500">Final Price: <span className="font-semibold text-farmer-primary-dark">₹{order.counterPrice || order.offeredPrice}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 self-end sm:self-center">
                                    <label htmlFor={`status-${order.id}`} className="text-sm font-medium text-stone-700 sr-only">Status:</label>
                                    <select
                                        id={`status-${order.id}`}
                                        value={orderStatuses[order.id] || OrderStatus.Processing}
                                        onChange={(e) => handleOrderStatusChange(order.id, e.target.value as OrderStatus)}
                                        className="block w-full rounded-md border-stone-300 shadow-sm focus:border-farmer-accent focus:ring-2 focus:ring-farmer-accent/50 sm:text-sm"
                                    >
                                        {Object.values(OrderStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                    {(orderStatuses[order.id] || OrderStatus.Processing) !== OrderStatus.Delivered && (
                                        <button
                                            onClick={() => handleOrderStatusChange(order.id, OrderStatus.Delivered)}
                                            className="px-3 py-2 text-xs font-bold bg-farmer-primary text-white rounded-md hover:bg-farmer-primary-dark transition-colors whitespace-nowrap"
                                        >
                                            Mark Delivered
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-farmer-background-alt p-6 rounded-xl shadow-sm border border-stone-200/80 text-center">
                            <p className="text-stone-500">You have no orders to fulfill at the moment.</p>
                        </div>
                    )}
                </div>
            </section>

            {isEditModalOpen && editForm && (
                 <div className="fixed inset-0 bg-black/50 z-30 flex justify-center items-center p-4" onClick={handleCloseEditModal}>
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg m-4 font-sans animate-fade-in" style={{animationDuration: '200ms'}} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold font-heading text-stone-800">Edit Product</h2>
                            <button onClick={handleCloseEditModal} className="text-stone-400 hover:text-stone-600"><XIcon className="h-6 w-6" /></button>
                        </div>
                         <form onSubmit={handleUpdateProductSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700">Product Name</label>
                                <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={editInputClasses(!!(editFormErrors.name && editTouched.name))} />
                                {editFormErrors.name && editTouched.name && <p className="text-red-500 text-xs mt-1">{editFormErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                    <label className="block text-sm font-medium text-stone-700">Price (₹)</label>
                                    <input type="number" name="price" value={editForm.price} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={editInputClasses(!!(editFormErrors.price && editTouched.price))} />
                                    {editFormErrors.price && editTouched.price && <p className="text-red-500 text-xs mt-1">{editFormErrors.price}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700">Stock Quantity</label>
                                    <input type="number" name="quantity" value={editForm.quantity} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={editInputClasses(!!(editFormErrors.quantity && editTouched.quantity))} />
                                    {editFormErrors.quantity && editTouched.quantity && <p className="text-red-500 text-xs mt-1">{editFormErrors.quantity}</p>}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-stone-700">Description</label>
                                <textarea name="description" rows={4} value={editForm.description} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={editInputClasses(!!(editFormErrors.description && editTouched.description))}></textarea>
                                {editFormErrors.description && editTouched.description && <p className="text-red-500 text-xs mt-1">{editFormErrors.description}</p>}
                            </div>
                             <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={handleCloseEditModal} className="bg-stone-200 text-stone-800 px-4 py-2 rounded-lg font-semibold hover:bg-stone-300 transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded-lg font-semibold transition-colors bg-farmer-primary text-white hover:bg-farmer-primary-dark">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
