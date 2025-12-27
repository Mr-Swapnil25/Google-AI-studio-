

import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Product, CartItem, Negotiation, NegotiationStatus, ProductType, ChatMessage, BotChatMessage, Farmer, User } from './types';
import type { Role } from './components/landing';
import { getChatResponse, verifyFarmerProfile } from './services/geminiService';
import { LandingPage } from './components/LandingPage';
import { BuyerView } from './components/BuyerView';
import { FarmerView } from './components/FarmerView';
import { NegotiationModal } from './components/NegotiationModal';
import { ChatModal } from './components/ChatModal';
import { ChatBot } from './components/ChatBot';
import { ChatBotIcon, MicrophoneIcon } from './components/icons';
import { CartView } from './components/CartView';
import { FarmerProfile } from './components/FarmerProfile';
import { FarmerKYC } from './components/FarmerKYC';
import { Content } from "@google/genai";
import { LiveAssistantModal } from './components/LiveAssistantModal';
import { useToast } from './context/ToastContext';
import { AuthModal } from './components/AuthModal';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { firebaseService } from './services/firebaseService';

export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isKYCOpen, setIsKYCOpen] = useState(false);
    const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
    const [pendingRole, setPendingRole] = useState<UserRole>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('anna_bazaar_pending_role');
            if (saved === 'farmer') return UserRole.Farmer;
            if (saved === 'buyer') return UserRole.Buyer;
        }
        return UserRole.Buyer;
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [farmers, setFarmers] = useState<Farmer[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
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

    const handleAuthClose = () => {
        if (!currentUser) {
            showToast('Please sign in to continue.', 'info');
            return;
        }
        setIsAuthOpen(false);
    };

    const handleAuthSuccess = (user: User) => {
        setCurrentUser(user);
        setIsAuthOpen(false);
    };

    useEffect(() => {
        const unsubProducts = firebaseService.subscribeProducts((prods) => {
            setProducts(prods);
            setIsLoadingProducts(false); // Mark loading complete on first callback
        });
        const unsubFarmers = firebaseService.subscribeFarmers(setFarmers);
        return () => {
            unsubProducts();
            unsubFarmers();
        };
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setCurrentUser(null);
                // Don't auto-open modal; let user click CTA
                setNegotiations([]);
                setMessages([]);
                setCart([]);
                setWishlist([]);
                return;
            }

            try {
                const profile = await firebaseService.getUserProfile(firebaseUser.uid);
                if (profile) {
                    setCurrentUser(profile);
                    setIsAuthOpen(false);
                } else {
                    // Signed in but no profile yet; AuthModal will collect role/details.
                    setIsAuthOpen(true);
                }
            } catch (e) {
                console.error('Failed to load user profile', e);
                setIsAuthOpen(true);
            }
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setNegotiations([]);
            return;
        }
        const unsubNegs = firebaseService.subscribeNegotiations(currentUser.uid, currentUser.role, setNegotiations);
        return () => unsubNegs();
    }, [currentUser?.uid, currentUser?.role]);

    useEffect(() => {
        if (!currentUser || negotiations.length === 0) {
            setMessages([]);
            return;
        }
        const negIds = negotiations.map((n) => n.id);
        const unsubMsgs = firebaseService.subscribeMessages(negIds, setMessages);
        return () => unsubMsgs();
    }, [currentUser?.uid, negotiations]);

    // Check KYC status for farmers - CRITICAL: blocks dashboard until KYC is complete
    useEffect(() => {
        const checkKYC = async () => {
            if (!currentUser || currentUser.role !== UserRole.Farmer) {
                setKycStatus('none');
                setIsKYCOpen(false);
                return;
            }
            try {
                const status = await firebaseService.getFarmerKYCStatus(currentUser.uid);
                setKycStatus(status);
                // Force KYC modal open if farmer hasn't completed verification
                // This is mandatory - farmer CANNOT access dashboard without KYC
                if (status === 'none' || status === 'rejected') {
                    setIsKYCOpen(true);
                }
            } catch (e) {
                console.error('Failed to check KYC status', e);
                setKycStatus('none');
            }
        };
        checkKYC();
    }, [currentUser?.uid, currentUser?.role]);

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0), [cart]);
    const MIN_CART_VALUE = 199;

    const handleSwitchRole = async () => {
        if (!currentUser) return;

        const nextRole = currentUser.role === UserRole.Buyer ? UserRole.Farmer : UserRole.Buyer;
        try {
            await firebaseService.setUserRole(currentUser.uid, nextRole);
            const nextUser = { ...currentUser, role: nextRole };
            await firebaseService.upsertUserProfile(nextUser);
            await firebaseService.ensureFarmerProfile(nextUser);
            setCurrentUser(nextUser);
        } catch (e) {
            console.error('Failed to switch role', e);
            showToast('Could not switch role. Please try again.', 'error');
            return;
        }
        
        // Reset relevant state on role switch
        setIsCartViewOpen(false);
        setViewingFarmerId(null);
        setCart([]);
        setNegotiations([]);
        setMessages([]);
        
        showToast(`Switched to ${nextRole} view.`, 'info');
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
            await firebaseService.addProduct(currentUser, productData, imageFile);
            showToast('Product added successfully!', 'success');
        } catch (error) {
            console.error('Error adding product:', error);
            showToast('Failed to add product. Please try again.', 'error');
        }
    };

    const handleUpdateProduct = async (updatedProduct: Product) => {
        // Mock update
        showToast('Product updated successfully!', 'success');
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
            // Mock update
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
                await firebaseService.createNegotiation({
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
                    lastUpdated: new Date(),
                });
                showToast('Negotiation offer sent!', 'success');
            }
            else if ('status' in activeNegotiation) {
                await firebaseService.updateNegotiation(activeNegotiation.id, {
                    status: NegotiationStatus.CounterByFarmer,
                    counterPrice: values.price,
                    offeredPrice: values.price, // Update offered price to farmer's counter
                    notes: values.notes || activeNegotiation.notes,
                    lastUpdated: new Date(),
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
        const newStatus = response === 'Accepted' ? NegotiationStatus.Accepted : NegotiationStatus.Rejected;
        try {
            await firebaseService.updateNegotiation(negotiationId, { status: newStatus });
            showToast(`Offer ${response.toLowerCase()}!`, 'success');

            if (response === 'Accepted') {
                const negotiation = negotiations.find(n => n.id === negotiationId);
                const product = products.find(p => p.id === negotiation?.productId);
                if (product && negotiation) {
                    // Check for any counter status (including legacy CounterOffer for read compatibility)
                    const hasCounter = negotiation.status === NegotiationStatus.CounterByFarmer ||
                                       negotiation.status === NegotiationStatus.CounterByBuyer ||
                                       negotiation.status === NegotiationStatus.CounterOffer;
                    const finalPrice = hasCounter && negotiation.counterPrice
                        ? negotiation.counterPrice
                        : negotiation.offeredPrice;
                    handleAddToCart({ ...product, price: finalPrice }, negotiation.quantity);

                    // Record payment in farmer's wallet
                    try {
                        await firebaseService.recordNegotiationPayment(
                            negotiation,
                            currentUser.uid, // buyerId
                            negotiation.farmerId,
                            finalPrice,
                            negotiation.quantity
                        );
                    } catch (paymentError) {
                        console.warn('Failed to record payment in wallet:', paymentError);
                        // Don't fail the entire transaction, just warn
                    }
                }
            }
        } catch (error) {
            console.error("Error responding to negotiation:", error);
            showToast('Failed to respond to offer.', 'error');
        }
    };
    
    const handleOpenChat = (negotiation: Negotiation) => setActiveChat(negotiation);
    const handleCloseChat = () => setActiveChat(null);

    // Contact farmer from profile - opens negotiation on their first product
    const handleContactFarmer = (farmerId: string) => {
        const farmerProducts = products.filter(p => p.farmerId === farmerId);
        if (farmerProducts.length > 0) {
            handleOpenNegotiation(farmerProducts[0]); // Open negotiation on first product
        } else {
            showToast('This farmer has no products listed yet.', 'info');
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!activeChat || !text.trim() || !currentUser) return;
        
        // Optimistic UI: Add message immediately with temporary ID
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: ChatMessage = {
            id: tempId,
            negotiationId: activeChat.id,
            senderId: currentUser.uid,
            text: text.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        try {
            await firebaseService.sendMessage({
                negotiation: activeChat,
                senderId: currentUser.uid,
                text,
            });
            // Firebase subscription will replace optimistic message with real one
        } catch(error) {
            console.error("Error sending message:", error);
            showToast('Could not send message.', 'error');
            // Remove the optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleSendMessageToNegotiation = async (negotiationId: string, text: string) => {
        if (!text.trim() || !currentUser) return;
        const negotiation = negotiations.find(n => n.id === negotiationId);
        if (!negotiation) return;
        
        // Optimistic UI: Add message immediately with temporary ID
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: ChatMessage = {
            id: tempId,
            negotiationId,
            senderId: currentUser.uid,
            text: text.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        try {
            await firebaseService.sendMessage({
                negotiation,
                senderId: currentUser.uid,
                text,
            });
            // Firebase subscription will replace optimistic message with real one
        } catch(error) {
            console.error("Error sending message:", error);
            showToast('Could not send message.', 'error');
            // Remove the optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
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
    
    const userRole = currentUser?.role ?? UserRole.Buyer;
    const appClasses = userRole === UserRole.Farmer ? 'bg-farmer-background' : 'bg-background';

    const renderMainContent = () => {
        if (!currentUser) return null;
        if (viewingFarmerId) {
            const farmer = farmers.find(f => f.id === viewingFarmerId);
            if (!farmer) {
                 return <div className="text-center py-10"><p>Farmer not found.</p></div>;
            }
            return <FarmerProfile {...{farmer, products: products.filter(p => p.farmerId === viewingFarmerId), onBack: handleBackToProducts, onAddToCart: handleAddToCart, onNegotiate: handleOpenNegotiation, wishlist, onToggleWishlist: handleToggleWishlist, onVerifyFarmer: handleVerifyFarmer, onContactFarmer: handleContactFarmer }} />;
        }
        if (isCartViewOpen && userRole === UserRole.Buyer) {
            const handlePaymentSuccess = () => {
                setCart([]);
                setIsCartViewOpen(false);
                showToast('Payment successful! Your order has been placed.', 'success');
            };
            return <CartView {...{cart, cartTotal, onUpdateQuantity: handleUpdateCartQuantity, onClose: () => setIsCartViewOpen(false), currentUserId: currentUser.uid, onPaymentSuccess: handlePaymentSuccess}} />;
        }
        if (userRole === UserRole.Farmer) {
            // CRITICAL: Block dashboard access if KYC not complete
            const isKYCRequired = kycStatus === 'none' || kycStatus === 'rejected';
            if (isKYCRequired) {
                // When KYC modal is open, render nothing here (KYC takes over fullscreen)
                // Only show blocker when KYC modal is closed
                if (isKYCOpen) {
                    return null;
                }
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
                        <div className="text-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/60 max-w-md mx-4">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-primary">verified_user</span>
                            </div>
                            <h2 className="text-2xl font-bold text-stone-900 mb-3">Complete Your Verification</h2>
                            <p className="text-stone-600 mb-6">Please complete your KYC verification to access your farmer dashboard and start selling.</p>
                            <button
                                onClick={() => setIsKYCOpen(true)}
                                className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-dark transition-colors"
                            >
                                Start Verification
                            </button>
                        </div>
                    </div>
                );
            }
             return <FarmerView {...{
                 onAddNewProduct: (data, file) => handleAddNewProduct(data, file), 
                 onUpdateProduct: handleUpdateProduct, 
                 onRespond: handleNegotiationResponse, 
                 onCounter: handleOpenNegotiation, 
                 onOpenChat: handleOpenChat, 
                 onSendMessage: handleSendMessageToNegotiation,
                 products: products.filter(p => p.farmerId === currentUser.uid), 
                 negotiations: negotiations.filter(n => n.farmerId === currentUser.uid),
                 messages: messages,
                 currentUserId: currentUser.uid,
                 currentUser: currentUser
             }} />;
        }
        return <BuyerView {...{products, cart, cartTotal, minCartValue: MIN_CART_VALUE, negotiations: negotiations.filter(n => n.buyerId === currentUser.uid), messages, currentUserId: currentUser.uid, onAddToCart: handleAddToCart, onStartNegotiation: handleOpenNegotiation, onRespondToCounter: handleNegotiationResponse, onOpenChat: handleOpenChat, onSendMessage: handleSendMessageToNegotiation, wishlist, onToggleWishlist: handleToggleWishlist, farmers, onViewFarmerProfile: handleViewFarmerProfile, onSwitchRole: handleSwitchRole, isLoadingProducts}} />;
    }

    // Show landing page if not authenticated
    if (!currentUser) {
        const handleLandingGetStarted = (role: Role) => {
            // Store selected role for AuthModal
            localStorage.setItem('anna_bazaar_pending_role', role);
            setPendingRole(role === 'farmer' ? UserRole.Farmer : UserRole.Buyer);
            setIsAuthOpen(true);
        };
        return (
            <>
                <LandingPage onGetStarted={handleLandingGetStarted} />
                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={handleAuthClose}
                    initialRole={pendingRole}
                    onAuthenticated={handleAuthSuccess}
                />
            </>
        );
    }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${appClasses} text-stone-800`}>
            <div className="absolute inset-0 h-full w-full bg-background bg-[radial-gradient(#e7e5e4_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
            <div className="relative z-10">
                <main className={userRole === UserRole.Farmer ? '' : 'container mx-auto p-4 sm:p-6 lg:p-8'}>{renderMainContent()}</main>

                {activeNegotiation && <NegotiationModal {...{isOpen: !!activeNegotiation, onClose: handleCloseNegotiation, item: activeNegotiation, userRole, onSubmit: handleNegotiationSubmit}} />}
                {activeChat && currentUser && <ChatModal {...{isOpen: !!activeChat, onClose: handleCloseChat, negotiation: activeChat, messages: messages.filter(m => m.negotiationId === activeChat.id), currentUserId: currentUser.uid, onSendMessage: handleSendMessage, userRole}} />}
                
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

                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={handleAuthClose}
                    initialRole={pendingRole}
                    onAuthenticated={handleAuthSuccess}
                />

                {currentUser && currentUser.role === UserRole.Farmer && (
                    <FarmerKYC
                        isOpen={isKYCOpen}
                        currentUser={currentUser}
                        onClose={() => setIsKYCOpen(false)}
                        onComplete={() => {
                            setKycStatus('pending');
                            setIsKYCOpen(false);
                            showToast('KYC submitted successfully! Verification in progress.', 'success');
                        }}
                        required={kycStatus === 'none' || kycStatus === 'rejected'}
                    />
                )}
            </div>
        </div>
    );
}