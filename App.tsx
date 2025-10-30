
import React, { useState, useMemo } from 'react';
import { UserRole, Product, CartItem, Negotiation, NegotiationStatus, ProductType, ChatMessage, BotChatMessage } from './types';
import { initialProducts, initialNegotiations, initialMessages } from './data';
import { getChatResponse } from './services/geminiService';
import { Header } from './components/Header';
import { BuyerView } from './components/BuyerView';
import { FarmerView } from './components/FarmerView';
import { NegotiationModal } from './components/NegotiationModal';
import { ChatModal } from './components/ChatModal';
import { ChatBot } from './components/ChatBot';
import { ChatBotIcon } from './components/icons';
import { CartView } from './components/CartView';
import { Content } from "@google/genai";

export default function App() {
    const [userRole, setUserRole] = useState<UserRole>(UserRole.Buyer);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [negotiations, setNegotiations] = useState<Negotiation[]>(initialNegotiations);
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [wishlist, setWishlist] = useState<string[]>([]);
    
    const [activeNegotiation, setActiveNegotiation] = useState<Negotiation | Product | null>(null);
    const [activeChat, setActiveChat] = useState<Negotiation | null>(null);

    const [isCartViewOpen, setIsCartViewOpen] = useState(false);

    const [isChatBotOpen, setIsChatBotOpen] = useState(false);
    const [botMessages, setBotMessages] = useState<BotChatMessage[]>([
        { role: 'model', text: "Hello! I'm Anna, your personal assistant. How can I help you today?" }
    ]);
    const [botIsLoading, setBotIsLoading] = useState(false);

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0), [cart]);
    const MIN_CART_VALUE = 199;
    const MOCK_USER_ID = userRole === UserRole.Buyer ? 'b1' : 'f1';

    const handleAddToCart = (product: Product, quantity: number = 1) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + quantity } : item);
            }
            return [...prevCart, { ...product, cartQuantity: quantity }];
        });
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

    const handleAddNewProduct = (newProduct: Omit<Product, 'id' | 'farmerId'>) => {
        const product: Product = {
            ...newProduct,
            id: `p${Date.now()}`,
            farmerId: 'f1', // Mock farmer ID
        };
        setProducts(prev => [product, ...prev]);
    };

    const handleUpdateProduct = (updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };

    const handleToggleWishlist = (productId: string) => {
        setWishlist(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };


    // --- Negotiation Handlers ---
    const handleOpenNegotiation = (item: Product | Negotiation) => {
        setActiveNegotiation(item);
    };

    const handleCloseNegotiation = () => {
        setActiveNegotiation(null);
    };

    const handleNegotiationSubmit = (values: { price: number; quantity: number; notes: string }) => {
        if (!activeNegotiation) return;

        if ('type' in activeNegotiation && activeNegotiation.type === ProductType.Bulk) {
            const newNegotiation: Negotiation = {
                id: `n${Date.now()}`,
                productId: activeNegotiation.id,
                productName: activeNegotiation.name,
                productImageUrl: activeNegotiation.imageUrl,
                buyerId: 'b1',
                farmerId: activeNegotiation.farmerId,
                initialPrice: activeNegotiation.price,
                offeredPrice: values.price,
                quantity: values.quantity,
                status: NegotiationStatus.Pending,
                notes: values.notes,
            };
            setNegotiations(prev => [...prev, newNegotiation]);
        }
        else if ('status' in activeNegotiation) {
            setNegotiations(prev => prev.map(n => 
                n.id === activeNegotiation.id 
                ? { ...n, status: NegotiationStatus.CounterOffer, counterPrice: values.price, notes: values.notes || n.notes } 
                : n
            ));
        }

        handleCloseNegotiation();
    };

    const handleNegotiationResponse = (negotiationId: string, response: 'Accepted' | 'Rejected') => {
        const negotiation = negotiations.find(n => n.id === negotiationId);
        if (!negotiation) return;

        const newStatus = response === 'Accepted' ? NegotiationStatus.Accepted : NegotiationStatus.Rejected;
        
        setNegotiations(prev => prev.map(n => n.id === negotiationId ? { ...n, status: newStatus } : n));
        
        if (response === 'Accepted') {
            const product = products.find(p => p.id === negotiation.productId);
            if (product) {
                const finalPrice = negotiation.status === NegotiationStatus.CounterOffer 
                    ? negotiation.counterPrice! 
                    : negotiation.offeredPrice;
                
                handleAddToCart({ ...product, price: finalPrice }, negotiation.quantity);
            }
        }
    };
    
    // --- Chat Handlers ---
    const handleOpenChat = (negotiation: Negotiation) => {
        setActiveChat(negotiation);
    };

    const handleCloseChat = () => {
        setActiveChat(null);
    };

    const handleSendMessage = (text: string) => {
        if (!activeChat || !text.trim()) return;
        
        const newMessage: ChatMessage = {
            id: `m${Date.now()}`,
            negotiationId: activeChat.id,
            senderId: MOCK_USER_ID,
            text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
    };

    // --- ChatBot Handlers ---
    const handleSendMessageToBot = async (message: string, useThinkingMode: boolean) => {
        const newUserMessage: BotChatMessage = { role: 'user', text: message };
        setBotMessages(prev => [...prev, newUserMessage]);
        setBotIsLoading(true);

        const historyForApi: Content[] = botMessages
            .filter(msg => msg.role === 'user' || msg.role === 'model')
            .map(msg => ({
                role: msg.role as 'user' | 'model',
                parts: [{ text: msg.text }]
            }));

        try {
            const responseText = await getChatResponse(historyForApi, message, useThinkingMode);
            const newBotMessage: BotChatMessage = { role: 'model', text: responseText };
            setBotMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
            const errorMessage: BotChatMessage = { role: 'error', text: error instanceof Error ? error.message : "An unknown error occurred." };
            setBotMessages(prev => [...prev, errorMessage]);
        } finally {
            setBotIsLoading(false);
        }
    };
    
    const appClasses = userRole === UserRole.Farmer 
        ? 'theme-farmer bg-farmer-background text-farmer-text-dark' 
        : 'theme-buyer bg-background text-text-dark';

    const renderMainContent = () => {
        if (isCartViewOpen && userRole === UserRole.Buyer) {
            return (
                <CartView
                    cart={cart}
                    cartTotal={cartTotal}
                    onUpdateQuantity={handleUpdateCartQuantity}
                    onClose={() => setIsCartViewOpen(false)}
                />
            );
        }

        if (userRole === UserRole.Farmer) {
             return (
                <FarmerView 
                    products={products.filter(p => p.farmerId === 'f1')}
                    negotiations={negotiations.filter(n => n.farmerId === 'f1')}
                    onAddNewProduct={handleAddNewProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onRespond={handleNegotiationResponse}
                    onCounter={handleOpenNegotiation}
                    onOpenChat={handleOpenChat}
                />
            );
        }

        return (
            <BuyerView 
                products={products}
                cart={cart}
                cartTotal={cartTotal}
                minCartValue={MIN_CART_VALUE}
                negotiations={negotiations.filter(n => n.buyerId === 'b1')}
                onAddToCart={handleAddToCart}
                onStartNegotiation={handleOpenNegotiation}
                onRespondToCounter={handleNegotiationResponse}
                onOpenChat={handleOpenChat}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
            />
        );
    }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${appClasses}`}>
            <Header 
                userRole={userRole} 
                setUserRole={setUserRole} 
                cartItemCount={cart.length}
                onCartClick={() => setIsCartViewOpen(true)}
            />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
               {renderMainContent()}
            </main>

            {activeNegotiation && (
                <NegotiationModal
                    isOpen={!!activeNegotiation}
                    onClose={handleCloseNegotiation}
                    item={activeNegotiation}
                    userRole={userRole}
                    onSubmit={handleNegotiationSubmit}
                />
            )}

            {activeChat && (
                <ChatModal
                    isOpen={!!activeChat}
                    onClose={handleCloseChat}
                    negotiation={activeChat}
                    messages={messages.filter(m => m.negotiationId === activeChat.id)}
                    currentUserId={MOCK_USER_ID}
                    onSendMessage={handleSendMessage}
                    userRole={userRole}
                />
            )}
            
            {userRole === UserRole.Buyer && cart.length > 0 && !isCartViewOpen &&
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
                    <div className="container mx-auto flex justify-between items-center">
                        <div>
                            <h3 className="font-heading font-bold text-lg">Cart Total: <span className="text-primary">₹{cartTotal.toFixed(2)}</span></h3>
                            {cartTotal < MIN_CART_VALUE && <p className="text-sm text-red-500">Add ₹{(MIN_CART_VALUE-cartTotal).toFixed(2)} more to checkout.</p>}
                        </div>
                        <button 
                            onClick={() => setIsCartViewOpen(true)}
                            disabled={cartTotal < MIN_CART_VALUE}
                            className="bg-accent text-gray-900 px-8 py-3 rounded-full font-bold transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-white hover:bg-yellow-400 hover:shadow-lg"
                        >
                            Checkout
                        </button>
                    </div>
                </div>
            }

             {/* ChatBot FAB and Modal */}
            {!isChatBotOpen && (
                 <button
                    onClick={() => setIsChatBotOpen(true)}
                    className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-30 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-transform hover:scale-110"
                    aria-label="Open chatbot"
                >
                    <ChatBotIcon className="h-7 w-7" />
                </button>
            )}

            <ChatBot
                isOpen={isChatBotOpen}
                onClose={() => setIsChatBotOpen(false)}
                messages={botMessages}
                onSendMessage={handleSendMessageToBot}
                isLoading={botIsLoading}
            />
        </div>
    );
}