
import React, { useState, useEffect, useMemo } from 'react';
import { Negotiation, ProductCategory, NegotiationStatus, Product, ProductType, OrderStatus } from '../types';
import { generateProductDetails, generateCounterOfferSuggestion } from '../services/geminiService';
// FIX: Import XIcon to be used in the edit modal.
import { SparklesIcon, ChatBubbleIcon, PencilIcon, DollarSignIcon, PackageIcon, ClipboardListIcon, XIcon } from './icons';

interface FarmerViewProps {
    products: Product[];
    negotiations: Negotiation[];
    onAddNewProduct: (product: Omit<Product, 'id' | 'farmerId'>) => void;
    onUpdateProduct: (product: Product) => void;
    onRespond: (negotiationId: string, response: 'Accepted' | 'Rejected') => void;
    onCounter: (negotiation: Negotiation) => void;
    onOpenChat: (negotiation: Negotiation) => void;
}

type FormErrors = { [key in keyof Omit<Product, 'id' | 'farmerId' | 'imageUrl'>]?: string } & { image?: string };

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const FarmerView = ({ products, negotiations, onAddNewProduct, onUpdateProduct, onRespond, onCounter, onOpenChat }: FarmerViewProps) => {
    const [aiIsLoading, setAiIsLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Add Product Form State
    const initialFormState = { name: '', category: ProductCategory.Other, description: '', price: 0, quantity: 0, type: ProductType.Retail };
    const [newProductForm, setNewProductForm] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
    
    // Edit Product Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editForm, setEditForm] = useState<Product | null>(null);
    const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
    const [editTouched, setEditTouched] = useState<{ [key: string]: boolean }>({});
    
    // Negotiation Suggestion State
    const [suggestions, setSuggestions] = useState<{ [key: string]: { loading: boolean; price?: number; error?: string } }>({});

    // Order Management State
    const [orderStatuses, setOrderStatuses] = useState<{ [orderId: string]: OrderStatus }>({});
    const acceptedOrders = useMemo(() => negotiations.filter(n => n.status === NegotiationStatus.Accepted), [negotiations]);

    // Effect to initialize order statuses
     useEffect(() => {
        const initialStatuses: { [orderId: string]: OrderStatus } = {};
        acceptedOrders.forEach(order => {
            if (!orderStatuses[order.id]) {
                initialStatuses[order.id] = OrderStatus.Processing;
            }
        });
        if (Object.keys(initialStatuses).length > 0) {
            setOrderStatuses(prev => ({ ...prev, ...initialStatuses }));
        }
    }, [acceptedOrders, orderStatuses]);

    // Clean up object URLs
    useEffect(() => {
        return () => {
            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        };
    }, [imagePreviewUrl]);
    
    // --- Validation ---
    const validateForm = (form: Omit<Product, 'id' | 'farmerId'>, forEdit = false): FormErrors => {
        const errors: FormErrors = {};
        if (!forEdit && !imageFile) errors.image = 'Product image is required.';
        if (!form.name.trim()) errors.name = 'Product name is required.';
        if (!form.description.trim()) errors.description = 'Description is required.';
        if (form.price <= 0) errors.price = 'Price must be a positive number.';
        if (form.quantity <= 0) errors.quantity = 'Stock quantity must be a positive number.';
        return errors;
    };

    // --- Add Product Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewProductForm(prev => ({ ...prev, [name]: name === 'price' || name === 'quantity' ? parseFloat(value) || 0 : value }));
        if (touched[name]) {
            const tempForm = { ...newProductForm, [name]: value };
            const errors = validateForm({ ...tempForm, imageUrl: imagePreviewUrl || '' });
            setFormErrors(errors);
        }
    };
    
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const errors = validateForm({ ...newProductForm, imageUrl: imagePreviewUrl || '' });
        setFormErrors(errors);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, forAI: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
        setTouched(prev => ({...prev, image: true}));

        if (forAI) {
            setAiIsLoading(true);
            setAiError('');
            try {
                const base64Image = await toBase64(file);
                const details = await generateProductDetails(base64Image, file.type);
                setNewProductForm(prev => ({...prev, ...details}));
            } catch (error) {
                setAiError(error instanceof Error ? error.message : "An unknown error occurred");
            } finally {
                setAiIsLoading(false);
            }
        }
    };

    const handleRemoveImage = () => {
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImageFile(null);
        setImagePreviewUrl(null);
        setNewProductForm(prev => ({ ...prev, name: '', category: ProductCategory.Other, description: '' }));
        setAiError('');
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, description: true, price: true, quantity: true, image: true });
        const errors = validateForm({ ...newProductForm, imageUrl: imagePreviewUrl || '' });
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        onAddNewProduct({ ...newProductForm, imageUrl: imagePreviewUrl! });
        setNewProductForm(initialFormState);
        setImageFile(null);
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
        setTouched({});
        setFormErrors({});
        alert('Product added successfully!');
    };
    
    // --- Edit Product Handlers ---
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
        const newFormState = { ...editForm, [name]: name === 'price' || name === 'quantity' ? parseFloat(value) || 0 : value };
        setEditForm(newFormState);
        if (editTouched[name]) {
            const errors = validateForm(newFormState, true);
            setEditFormErrors(errors);
        }
    };
    
    const handleEditInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editForm) return;
        const { name } = e.target;
        setEditTouched(prev => ({...prev, [name]: true}));
        const errors = validateForm(editForm, true);
        setEditFormErrors(errors);
    };

    const handleUpdateProductSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm) return;
        setEditTouched({ name: true, description: true, price: true, quantity: true });
        const errors = validateForm(editForm, true);
        if (Object.keys(errors).length > 0) {
            setEditFormErrors(errors);
            return;
        }
        onUpdateProduct(editForm);
        handleCloseEditModal();
    };


    // --- Other Handlers ---
    const handleGetSuggestion = async (neg: Negotiation) => {
        setSuggestions(prev => ({ ...prev, [neg.id]: { loading: true } }));
        try {
            const suggestedPrice = await generateCounterOfferSuggestion({
                productName: neg.productName,
                originalPrice: neg.initialPrice,
                offeredPrice: neg.offeredPrice,
                quantity: neg.quantity
            });
            setSuggestions(prev => ({ ...prev, [neg.id]: { loading: false, price: suggestedPrice } }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to get suggestion.";
            setSuggestions(prev => ({ ...prev, [neg.id]: { loading: false, error: errorMessage } }));
        }
    };

    const handleOrderStatusChange = (orderId: string, status: OrderStatus) => {
        setOrderStatuses(prev => ({...prev, [orderId]: status}));
    };
    
    const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string | number, color: string }) => (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-farmer-text-light font-medium">{title}</p>
                <p className="text-2xl font-bold font-heading text-farmer-text-dark">{value}</p>
            </div>
        </div>
    );
    
    // --- Render ---
    return (
        <div className="space-y-16">
            {/* Dashboard Stats */}
            <section>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={<DollarSignIcon className="h-6 w-6 text-green-700"/>} title="Total Revenue" value={`₹${acceptedOrders.reduce((sum, n) => sum + (n.counterPrice || n.offeredPrice) * n.quantity, 0).toLocaleString()}`} color="bg-green-100" />
                    <StatCard icon={<PackageIcon className="h-6 w-6 text-yellow-700"/>} title="Pending Orders" value={acceptedOrders.filter(o => orderStatuses[o.id] !== 'Delivered').length} color="bg-yellow-100" />
                    <StatCard icon={<ClipboardListIcon className="h-6 w-6 text-blue-700"/>} title="Products Listed" value={products.length} color="bg-blue-100" />
                </div>
            </section>
            
            {/* My Inventory */}
            <section>
                <h2 className="text-3xl font-bold font-heading text-farmer-text-dark mb-6">My Inventory</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-farmer-background/60 text-xs text-farmer-text-dark uppercase tracking-wider">
                            <tr>
                                <th scope="col" className="px-6 py-3">Product</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Price</th>
                                <th scope="col" className="px-6 py-3">Stock</th>
                                <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap flex items-center space-x-3">
                                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-md object-cover"/>
                                        <span className="font-bold text-farmer-text-dark">{p.name}</span>
                                    </th>
                                    <td className="px-6 py-4">{p.category}</td>
                                    <td className="px-6 py-4">₹{p.price.toFixed(2)}</td>
                                    <td className="px-6 py-4">{p.quantity}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleOpenEditModal(p)} className="p-2 rounded-md hover:bg-gray-200 text-farmer-secondary hover:text-farmer-primary">
                                            <PencilIcon className="h-5 w-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {products.length === 0 && <p className="p-6 text-center text-farmer-text-light">You haven't listed any products yet.</p>}
                </div>
            </section>

            {/* Add New Product */}
            <section>
                <h2 className="text-3xl font-bold font-heading text-farmer-text-dark mb-6">Add New Product</h2>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                         {aiIsLoading && (
                            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg z-10">
                                <SparklesIcon className="h-8 w-8 text-farmer-primary animate-pulse" />
                                <p className="ml-2 text-farmer-text-dark font-semibold">Generating details...</p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-farmer-text-dark mb-2">Product Image</label>
                            {imagePreviewUrl ? (
                                <div className="mt-1 relative group">
                                    <img src={imagePreviewUrl} alt="Product preview" className="w-full rounded-lg object-cover h-64" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center rounded-lg">
                                        <button type="button" onClick={handleRemoveImage} className="bg-white text-gray-800 rounded-full py-2 px-4 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Change Image</button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg ${formErrors.image && touched.image ? 'border-red-500' : 'border-gray-300'}`}>
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-farmer-primary hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-farmer-primary">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={aiIsLoading} />
                                            </label>
                                            <p className="pl-1">and get AI suggestions</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                    </div>
                                </div>
                            )}
                            {formErrors.image && touched.image && <p className="text-red-500 text-xs mt-1">{formErrors.image}</p>}
                            {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-farmer-text-dark">Product Name</label>
                                <input type="text" name="name" value={newProductForm.name} onChange={handleInputChange} onBlur={handleInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.name && touched.name ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`} />
                                 {formErrors.name && touched.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-farmer-text-dark">Category</label>
                                    <select name="category" value={newProductForm.category} onChange={handleInputChange} onBlur={handleInputBlur} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-farmer-primary focus:ring-farmer-primary sm:text-sm">
                                        {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-farmer-text-dark">Type</label>
                                    <select name="type" value={newProductForm.type} onChange={handleInputChange} onBlur={handleInputBlur} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-farmer-primary focus:ring-farmer-primary sm:text-sm">
                                        {Object.values(ProductType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-farmer-text-dark">Price (₹)</label>
                                    <input type="number" name="price" value={newProductForm.price} onChange={handleInputChange} onBlur={handleInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.price && touched.price ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`} />
                                    {formErrors.price && touched.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farmer-text-dark">Stock Quantity</label>
                                    <input type="number" name="quantity" value={newProductForm.quantity} onChange={handleInputChange} onBlur={handleInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.quantity && touched.quantity ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`} />
                                    {formErrors.quantity && touched.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-farmer-text-dark">Description</label>
                                <textarea name="description" rows={3} value={newProductForm.description} onChange={handleInputChange} onBlur={handleInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.description && touched.description ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`}></textarea>
                                {formErrors.description && touched.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                            </div>
                             <button type="submit" className="w-full bg-farmer-accent text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-sm">Add Product</button>
                        </div>
                    </form>
                </div>
            </section>
            
            {/* Incoming Negotiations */}
            <section>
                <h2 className="text-3xl font-bold font-heading text-farmer-text-dark mb-6">Incoming Negotiations</h2>
                <div className="space-y-4">
                    {negotiations.filter(n => n.status !== NegotiationStatus.Accepted).map(neg => {
                        const suggestion = suggestions[neg.id];
                        return (
                         <div key={neg.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                <img src={neg.productImageUrl} alt={neg.productName} className="w-24 h-24 rounded-lg object-cover"/>
                                <div>
                                    <p className="font-bold font-heading text-lg text-farmer-text-dark">{neg.productName}</p>
                                    <p className="text-sm text-farmer-text-light">Qty: {neg.quantity}</p>
                                    <p className="text-sm text-farmer-text-light">Buyer's Offer: <span className="font-semibold text-orange-500">₹{neg.offeredPrice}</span> (Original: ₹{neg.initialPrice})</p>
                                    <p className="text-xs italic text-gray-500 mt-1">"{neg.notes}"</p>
                                    {suggestion?.loading && <p className="text-sm text-gray-500 animate-pulse">Getting suggestion...</p>}
                                    {suggestion?.price && <p className="text-sm text-blue-600 font-semibold">AI Suggests: <span className="font-bold">₹{suggestion.price.toFixed(2)}</span></p>}
                                    {suggestion?.error && <p className="text-sm text-red-500">{suggestion.error}</p>}
                                </div>
                            </div>
                             <div className="flex items-center space-x-2 self-end sm:self-center">
                                <button onClick={() => onOpenChat(neg)} title="Open Chat" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                    <ChatBubbleIcon className="h-6 w-6 text-farmer-secondary"/>
                                </button>
                                {neg.status === NegotiationStatus.Pending && (
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-stretch">
                                        <button onClick={() => onRespond(neg.id, 'Accepted')} className="px-3 py-2 text-xs font-bold bg-farmer-accent text-white rounded-md hover:bg-green-600 transition-colors">Accept</button>
                                        <button onClick={() => onCounter(neg)} className="px-3 py-2 text-xs font-bold bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">Counter</button>
                                        <button onClick={() => onRespond(neg.id, 'Rejected')} className="px-3 py-2 text-xs font-bold bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Reject</button>
                                        <button onClick={() => handleGetSuggestion(neg)} className="px-3 py-2 bg-farmer-primary text-white text-xs font-bold rounded-md hover:bg-blue-800 flex items-center justify-center" disabled={suggestion?.loading}>
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
            
            {/* Order Management */}
            <section>
                <div className="flex items-center space-x-3 mb-6">
                    <ClipboardListIcon className="h-8 w-8 text-farmer-primary" />
                    <h2 className="text-3xl font-bold font-heading text-farmer-text-dark">Order Management</h2>
                </div>
                <div className="space-y-4">
                    {acceptedOrders.length > 0 ? (
                        acceptedOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div className="flex items-center space-x-4 mb-4 sm:mb-0 flex-1">
                                    <img src={order.productImageUrl} alt={order.productName} className="w-24 h-24 rounded-lg object-cover"/>
                                    <div>
                                        <p className="font-bold font-heading text-lg text-farmer-text-dark">{order.productName}</p>
                                        <p className="text-sm text-farmer-text-light">Qty: {order.quantity} | Buyer ID: {order.buyerId}</p>
                                        <p className="text-sm text-farmer-text-light">Final Price: <span className="font-semibold text-farmer-accent">₹{order.counterPrice || order.offeredPrice}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 self-end sm:self-center">
                                    <label htmlFor={`status-${order.id}`} className="text-sm font-medium text-farmer-text-dark sr-only">Status:</label>
                                    <select
                                        id={`status-${order.id}`}
                                        value={orderStatuses[order.id] || OrderStatus.Processing}
                                        onChange={(e) => handleOrderStatusChange(order.id, e.target.value as OrderStatus)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-farmer-primary focus:ring-farmer-primary sm:text-sm"
                                    >
                                        {Object.values(OrderStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                            <p className="text-farmer-text-light">You have no orders to fulfill at the moment.</p>
                        </div>
                    )}
                </div>
            </section>

            {isEditModalOpen && editForm && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center" onClick={handleCloseEditModal}>
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg m-4 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold font-heading text-gray-800">Edit Product</h2>
                            <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                        </div>
                         <form onSubmit={handleUpdateProductSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-farmer-text-dark">Product Name</label>
                                <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${editFormErrors.name && editTouched.name ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`} />
                                {editFormErrors.name && editTouched.name && <p className="text-red-500 text-xs mt-1">{editFormErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                    <label className="block text-sm font-medium text-farmer-text-dark">Price (₹)</label>
                                    <input type="number" name="price" value={editForm.price} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${editFormErrors.price && editTouched.price ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`} />
                                    {editFormErrors.price && editTouched.price && <p className="text-red-500 text-xs mt-1">{editFormErrors.price}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farmer-text-dark">Stock Quantity</label>
                                    <input type="number" name="quantity" value={editForm.quantity} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${editFormErrors.quantity && editTouched.quantity ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`} />
                                    {editFormErrors.quantity && editTouched.quantity && <p className="text-red-500 text-xs mt-1">{editFormErrors.quantity}</p>}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-farmer-text-dark">Description</label>
                                <textarea name="description" rows={4} value={editForm.description} onChange={handleEditInputChange} onBlur={handleEditInputBlur} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${editFormErrors.description && editTouched.description ? 'border-red-500' : 'border-gray-300'} focus:border-farmer-primary focus:ring-farmer-primary`}></textarea>
                                {editFormErrors.description && editTouched.description && <p className="text-red-500 text-xs mt-1">{editFormErrors.description}</p>}
                            </div>
                             <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={handleCloseEditModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded-lg font-semibold transition-colors bg-farmer-primary text-white hover:bg-blue-800">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
