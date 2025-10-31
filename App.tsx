

import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Product, CartItem, Negotiation, NegotiationStatus, ProductType, ChatMessage, BotChatMessage, Farmer, User } from './types';
import { getChatResponse, verifyFarmerProfile } from './services/geminiService';
import { Header } from './components/Header';
import { BuyerView } from './components/BuyerView';
import { FarmerView } from './components/FarmerView';
import { NegotiationModal } from './components/NegotiationModal';
import { ChatModal } from './components/ChatModal';
import { ChatBot } from './components/ChatBot';
import { ChatBotIcon, MicrophoneIcon } from './components/icons';
import { CartView } from './components/CartView';
import { FarmerProfile } from './components/FarmerProfile';
import { Content } from "@google/genai";
import { LiveAssistantModal } from './components/LiveAssistantModal';
import { db, storage } from './firebase';
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from './context/ToastContext';

const mockBuyer: User = { uid: 'mockBuyerId', name: 'Demo Buyer', role: UserRole.Buyer, avatarUrl: 'https://i.pravatar.cc/150?u=mockBuyerId' };
const mockFarmer: User = { uid: 'mockFarmerId', name: 'Demo Farmer', role: UserRole.Farmer, avatarUrl: 'https://i.pravatar.cc/150?u=mockFarmerId' };

export default function App() {
    const [currentUser, setCurrentUser] = useState<User>(mockBuyer);

    const [products, setProducts] = useState<Product[]>([]);
    const [farmers, setFarmers] = useState<Farmer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [wishlist, setWishlist] = useState<string[]>([]);
    
    const [activeNegotiation, setActiveNegotiation] = useState<Negotiation | Product | null>(null);
    const [activeChat, setActiveChat] = useState<Negotiation | null>(null);

    const [isCartViewOpen, setIsCartViewOpen] = useState(false);
    const [viewingFarmerId, setViewingFarmerId] = useState<string | null>(null);

    const [isChatBotOpen, setIsChatBotOpen] = useState(false);
    const [botMessages, setBotMessages] = useState<BotChatMessage[]>([
        { role: 'model', text: "Hello! I'm Anna, your personal assistant. How can I help you today?" }
    ]);
    const [botIsLoading, setBotIsLoading] = useState(false);
    const [isLiveAssistantOpen, setIsLiveAssistantOpen] = useState(false);
    
    const { showToast } = useToast();

    useEffect(() => {
        // Fetch products
        const productsQuery = query(collection(db, "products"));
        const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
            const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(productsList);
        });

        // Fetch farmers
        const farmersQuery = query(collection(db, "farmers"));
        const unsubFarmers = onSnapshot(farmersQuery, (snapshot) => {
            const farmersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Farmer));
            setFarmers(farmersList);
        });
        
        return () => {
            unsubProducts();
            unsubFarmers();
        };
    }, []);

    useEffect(() => {
        const userField = currentUser.role === UserRole.Buyer ? 'buyerId' : 'farmerId';
        const negotiationsQuery = query(collection(db, "negotiations"), where(userField, "==", currentUser.uid));
        
        const unsubNegotiations = onSnapshot(negotiationsQuery, (snapshot) => {
            const negs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Negotiation));
            setNegotiations(negs);

            if (negs.length > 0) {
                const negIds = negs.map(n => n.id);
                // FIX: The original query combined a `where` filter with an `in` clause and an `orderBy` on a different field, which requires a composite index in Firestore. To resolve the "failed-precondition" error without manual index creation, the `orderBy` clause has been removed from the query.
                const messagesQuery = query(collection(db, "messages"), where("negotiationId", "in", negIds));
                const unsubMessages = onSnapshot(messagesQuery, msgSnapshot => {
                    const msgs = msgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate() } as ChatMessage));
                    // FIX: Messages are now sorted on the client-side to ensure they appear in chronological order, compensating for the removed `orderBy` clause.
                    msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    setMessages(msgs);
                });
                return () => unsubMessages();
            } else {
                setMessages([]);
            }
        });

        return () => unsubNegotiations();
    }, [currentUser]);

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0), [cart]);
    const MIN_CART_VALUE = 199;

    const handleSwitchRole = async () => {
        const newRoleUser = currentUser.role === UserRole.Buyer ? mockFarmer : mockBuyer;
        setCurrentUser(newRoleUser);
        
        // Reset relevant state on role switch
        setIsCartViewOpen(false);
        setViewingFarmerId(null);
        setCart([]);
        setNegotiations([]);
        setMessages([]);
        
        showToast(`Switched to ${newRoleUser.role} view.`, 'info');
    };
    
    const handleAddToCart = (product: Product, quantity: number = 1) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + quantity } : item);
            }
            return [...prevCart, { ...product, cartQuantity: quantity }];
        });
        showToast(`${product.name} added to cart!`, 'success');
    };
    
    const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
        setCart(prevCart => {
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== productId);
            }
            return prevCart.map(item =>
                item.id === productId ? { ...item, cartQuantity: newQuantity } : item
            );
        });
    };

    const handleAddNewProduct = async (productData: Omit<Product, 'id' | 'farmerId' | 'imageUrl' | 'isVerified' | 'verificationFeedback'>, imageFile: File) => {
        if (!currentUser) return;
        
        try {
            const storageRef = ref(storage, `product-images/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, imageFile);
            const imageUrl = await getDownloadURL(uploadResult.ref);

            await addDoc(collection(db, "products"), {
                ...productData,
                imageUrl,
                farmerId: currentUser.uid,
                isVerified: false,
            });
            showToast('Product added successfully!', 'success');
        } catch (error) {
            console.error("Error adding product:", error);
            showToast('Failed to add product. Please try again.', 'error');
        }
    };

    const handleUpdateProduct = async (updatedProduct: Product) => {
        const productRef = doc(db, "products", updatedProduct.id);
        const { id, ...dataToUpdate } = updatedProduct;
        try {
            await updateDoc(productRef, dataToUpdate);
            showToast('Product updated successfully!', 'success');
        } catch (error) {
            console.error("Error updating product:", error);
            showToast('Failed to update product.', 'error');
        }
    };

    const handleToggleWishlist = (productId: string) => {
        setWishlist(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleViewFarmerProfile = (farmerId: string) => {
        setIsCartViewOpen(false);
        setViewingFarmerId(farmerId);
    };
    
    const handleVerifyFarmer = async (farmer: Farmer) => {
        try {
            const { isVerified, feedback } = await verifyFarmerProfile(farmer);
            const farmerRef = doc(db, "farmers", farmer.id);
            await updateDoc(farmerRef, { isVerified, verificationFeedback: feedback });
            showToast(`Verification result: ${feedback}`, isVerified ? 'success' : 'info');
        } catch (error) {
            showToast(error instanceof Error ? error.message : "An unknown error occurred during verification.", 'error');
        }
    };

    const handleBackToProducts = () => setViewingFarmerId(null);
    const handleOpenNegotiation = (item: Product | Negotiation) => setActiveNegotiation(item);
    const handleCloseNegotiation = () => setActiveNegotiation(null);

    const handleNegotiationSubmit = async (values: { price: number; quantity: number; notes: string }) => {
        if (!activeNegotiation || !currentUser) return;
        try {
            if ('type' in activeNegotiation && activeNegotiation.type === ProductType.Bulk) {
                await addDoc(collection(db, 'negotiations'), {
                    productId: activeNegotiation.id,
                    productName: activeNegotiation.name,
                    productImageUrl: activeNegotiation.imageUrl,
                    buyerId: currentUser.uid,
                    farmerId: activeNegotiation.farmerId,
                    initialPrice: activeNegotiation.price,
                    offeredPrice: values.price,
                    quantity: values.quantity,
                    status: NegotiationStatus.Pending,
                    notes: values.notes,
                });
                showToast('Negotiation offer sent!', 'success');
            }
            else if ('status' in activeNegotiation) {
                const negRef = doc(db, 'negotiations', activeNegotiation.id);
                await updateDoc(negRef, {
                    status: NegotiationStatus.CounterOffer,
                    counterPrice: values.price,
                    notes: values.notes || activeNegotiation.notes,
                });
                showToast('Counter-offer sent!', 'success');
            }
            handleCloseNegotiation();
        } catch(error) {
            console.error("Error submitting negotiation:", error);
            showToast('Failed to submit offer. Please try again.', 'error');
        }
    };

    const handleNegotiationResponse = async (negotiationId: string, response: 'Accepted' | 'Rejected') => {
        const negRef = doc(db, "negotiations", negotiationId);
        const newStatus = response === 'Accepted' ? NegotiationStatus.Accepted : NegotiationStatus.Rejected;
        try {
            await updateDoc(negRef, { status: newStatus });
            showToast(`Offer ${response.toLowerCase()}!`, 'success');

            if (response === 'Accepted') {
                const negotiation = negotiations.find(n => n.id === negotiationId);
                const product = products.find(p => p.id === negotiation?.productId);
                if (product && negotiation) {
                    const finalPrice = negotiation.status === NegotiationStatus.CounterOffer
                        ? negotiation.counterPrice!
                        : negotiation.offeredPrice;
                    handleAddToCart({ ...product, price: finalPrice }, negotiation.quantity);
                }
            }
        } catch (error) {
            console.error("Error responding to negotiation:", error);
            showToast('Failed to respond to offer.', 'error');
        }
    };
    
    const handleOpenChat = (negotiation: Negotiation) => setActiveChat(negotiation);
    const handleCloseChat = () => setActiveChat(null);

    const handleSendMessage = async (text: string) => {
        if (!activeChat || !text.trim() || !currentUser) return;
        try {
            await addDoc(collection(db, 'messages'), {
                negotiationId: activeChat.id,
                senderId: currentUser.uid,
                text,
                timestamp: serverTimestamp(),
            });
        } catch(error) {
            console.error("Error sending message:", error);
            showToast('Could not send message.', 'error');
        }
    };

    const handleSendMessageToBot = async (message: string, useThinkingMode: boolean) => {
        setBotMessages(prev => [...prev, { role: 'user', text: message }]);
        setBotIsLoading(true);
        const historyForApi: Content[] = botMessages
            .filter(msg => msg.role === 'user' || msg.role === 'model')
            .map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
        try {
            const responseText = await getChatResponse(historyForApi, message, useThinkingMode);
            setBotMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (error) {
            setBotMessages(prev => [...prev, { role: 'error', text: error instanceof Error ? error.message : "An unknown error occurred." }]);
        } finally {
            setBotIsLoading(false);
        }
    };
    
    const userRole = currentUser.role;
    const appClasses = userRole === UserRole.Farmer ? 'bg-farmer-background' : 'bg-background';

    const renderMainContent = () => {
        if (viewingFarmerId) {
            const farmer = farmers.find(f => f.id === viewingFarmerId);
            if (!farmer) {
                 return <div className="text-center py-10"><p>Farmer not found.</p></div>;
            }
            return <FarmerProfile {...{farmer, products: products.filter(p => p.farmerId === viewingFarmerId), onBack: handleBackToProducts, onAddToCart: handleAddToCart, onNegotiate: handleOpenNegotiation, wishlist, onToggleWishlist: handleToggleWishlist, onVerifyFarmer: handleVerifyFarmer }} />;
        }
        if (isCartViewOpen && userRole === UserRole.Buyer) {
            return <CartView {...{cart, cartTotal, onUpdateQuantity: handleUpdateCartQuantity, onClose: () => setIsCartViewOpen(false)}} />;
        }
        if (userRole === UserRole.Farmer) {
             return <FarmerView {...{onAddNewProduct: (data, file) => handleAddNewProduct(data, file), onUpdateProduct: handleUpdateProduct, onRespond: handleNegotiationResponse, onCounter: handleOpenNegotiation, onOpenChat: handleOpenChat, products: products.filter(p => p.farmerId === currentUser.uid), negotiations: negotiations.filter(n => n.farmerId === currentUser.uid)}} />;
        }
        return <BuyerView {...{products, cart, cartTotal, minCartValue: MIN_CART_VALUE, negotiations: negotiations.filter(n => n.buyerId === currentUser.uid), onAddToCart: handleAddToCart, onStartNegotiation: handleOpenNegotiation, onRespondToCounter: handleNegotiationResponse, onOpenChat: handleOpenChat, wishlist, onToggleWishlist: handleToggleWishlist, farmers, onViewFarmerProfile: handleViewFarmerProfile}} />;
    }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${appClasses} text-stone-800`}>
            <div className="absolute inset-0 h-full w-full bg-background bg-[radial-gradient(#e7e5e4_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
            <div className="relative z-10">
                <Header {...{user: currentUser, onSwitchRole: handleSwitchRole, cartItemCount: cart.length, onCartClick: () => setIsCartViewOpen(true)}} />
                <main className="container mx-auto p-4 sm:p-6 lg:p-8">{renderMainContent()}</main>

                {activeNegotiation && <NegotiationModal {...{isOpen: !!activeNegotiation, onClose: handleCloseNegotiation, item: activeNegotiation, userRole, onSubmit: handleNegotiationSubmit}} />}
                {activeChat && <ChatModal {...{isOpen: !!activeChat, onClose: handleCloseChat, negotiation: activeChat, messages: messages.filter(m => m.negotiationId === activeChat.id), currentUserId: currentUser.uid, onSendMessage: handleSendMessage, userRole}} />}
                
                {userRole === UserRole.Buyer && cart.length > 0 && !isCartViewOpen && !viewingFarmerId &&
                    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4 border-t border-stone-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                        <div className="container mx-auto flex justify-between items-center">
                            <div>
                                <h3 className="font-heading font-bold text-lg">Cart Total: <span className="text-primary">₹{cartTotal.toFixed(2)}</span></h3>
                                {cartTotal < MIN_CART_VALUE && <p className="text-sm text-red-600">Add ₹{(MIN_CART_VALUE-cartTotal).toFixed(2)} more to checkout.</p>}
                            </div>
                            <button onClick={() => setIsCartViewOpen(true)} disabled={cartTotal < MIN_CART_VALUE} className="bg-accent text-stone-900 px-8 py-3 rounded-full font-bold transition-all duration-300 disabled:bg-stone-400 disabled:cursor-not-allowed disabled:text-white hover:bg-yellow-400 hover:shadow-lg transform hover:-translate-y-0.5">Checkout</button>
                        </div>
                    </div>
                }

                {!isChatBotOpen && userRole === UserRole.Buyer && (
                    <button onClick={() => setIsChatBotOpen(true)} className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-30 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-dark transition-all duration-300 transform hover:scale-110 hover:shadow-xl animate-fade-in" aria-label="Open chatbot">
                        <ChatBotIcon className="h-7 w-7" />
                    </button>
                )}

                <ChatBot {...{isOpen: isChatBotOpen, onClose: () => setIsChatBotOpen(false), messages: botMessages, onSendMessage: handleSendMessageToBot, isLoading: botIsLoading}} />

                {!isLiveAssistantOpen && userRole === UserRole.Farmer && (
                    <button onClick={() => setIsLiveAssistantOpen(true)} className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-30 bg-farmer-primary text-white p-4 rounded-full shadow-lg hover:bg-farmer-primary-dark transition-all duration-300 transform hover:scale-110 hover:shadow-xl animate-fade-in" aria-label="Open live assistant">
                        <MicrophoneIcon className="h-7 w-7" />
                    </button>
                )}
                
                <LiveAssistantModal isOpen={isLiveAssistantOpen} onClose={() => setIsLiveAssistantOpen(false)} />
            </div>
        </div>
    );
}