import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Negotiation, NegotiationStatus, ChatMessage, Farmer, MIN_BULK_QUANTITY_KG, CallStatus, User } from '../types';
import { classifyOffer, type OfferClassification, type PriceBand } from '../services/mandiPriceService';
import { firebaseService } from '../services/firebaseService';

interface BuyerNegotiationConsoleProps {
    negotiation: Negotiation;
    farmer?: Farmer;
    messages: ChatMessage[];
    currentUserId: string;
    currentUser: User;
    onClose: () => void;
    onSendMessage: (text: string) => void;
    onUpdateOffer: (price: number, quantity: number) => void;
    onAcceptOffer: () => void;
    onDeclineOffer: () => void;
    onStartCall?: (negotiationId: string) => void;
}

export const BuyerNegotiationConsole: React.FC<BuyerNegotiationConsoleProps> = ({
    negotiation,
    farmer,
    messages,
    currentUserId,
    currentUser,
    onClose,
    onSendMessage,
    onUpdateOffer,
    onAcceptOffer,
    onDeclineOffer,
    onStartCall,
}) => {
    const [messageInput, setMessageInput] = useState('');
    const [counterPrice, setCounterPrice] = useState(negotiation.offeredPrice);
    const [counterQuantity, setCounterQuantity] = useState(negotiation.quantity);
    const [isStartingCall, setIsStartingCall] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Get price band from negotiation (computed on creation)
    const priceBand: PriceBand | null = useMemo(() => {
        if (negotiation.floorPrice != null && negotiation.targetPrice != null) {
            return {
                floorPrice: negotiation.floorPrice,
                targetPrice: negotiation.targetPrice,
                stretchPrice: negotiation.targetPrice * 1.1,
                baseMandiPrice: 0, // Not needed for display
                qualityFactor: 1,
                isVerified: negotiation.priceVerified ?? false,
                priceSource: negotiation.priceSource ?? 'Market data',
                updatedAt: null,
            };
        }
        return null;
    }, [negotiation.floorPrice, negotiation.targetPrice, negotiation.priceVerified, negotiation.priceSource]);

    // Classify the current offer
    const offerClassification: OfferClassification | null = useMemo(() => {
        if (!priceBand) return null;
        return classifyOffer(counterPrice, priceBand);
    }, [counterPrice, priceBand]);

    // Check if offer is valid (not below floor)
    const isOfferValid = !offerClassification || offerClassification.status !== 'INVALID';
    
    // Check if quantity is valid (bulk minimum)
    const isQuantityValid = counterQuantity >= MIN_BULK_QUANTITY_KG;
    
    // Can submit only if both price and quantity are valid
    const canSubmitOffer = isOfferValid && isQuantityValid;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;
        onSendMessage(messageInput.trim());
        setMessageInput('');
    };

    const handleUpdateOffer = () => {
        if (!canSubmitOffer) return;
        onUpdateOffer(counterPrice, counterQuantity);
    };

    /**
     * Start a video/voice call with the farmer
     */
    const handleStartCall = async () => {
        if (isStartingCall || !onStartCall) return;
        
        setIsStartingCall(true);
        try {
            const result = await firebaseService.startCall(
                negotiation.id,
                currentUser.uid,
                currentUser.name || 'Buyer'
            );
            
            if (result.success) {
                onStartCall(negotiation.id);
            } else {
                console.error('[BuyerNegotiationConsole] Failed to start call:', result.error);
            }
        } catch (error) {
            console.error('[BuyerNegotiationConsole] Error starting call:', error);
        } finally {
            setIsStartingCall(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatPrice = (price: number) => price.toLocaleString('en-IN');
    const totalEstimate = counterPrice * counterQuantity;
    const logisticsEstimate = 1200;
    const finalTotal = totalEstimate + logisticsEstimate;

    // Determine current negotiation step
    const isAgreement = negotiation.status === NegotiationStatus.Accepted;
    const isRejected = negotiation.status === NegotiationStatus.Rejected;
    const isPending = negotiation.status === NegotiationStatus.Pending || negotiation.status === NegotiationStatus.CounterByFarmer;

    // Calculate price position for gauge (0-100)
    const pricePosition = useMemo(() => {
        if (!priceBand) return 50;
        const range = priceBand.targetPrice - priceBand.floorPrice;
        if (range <= 0) return 50;
        const pos = ((counterPrice - priceBand.floorPrice) / range) * 100;
        return Math.max(0, Math.min(100, pos));
    }, [counterPrice, priceBand]);

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
            {/* Compact Header */}
            <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors">
                        <span className="material-symbols-outlined text-xl text-gray-600">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-2xl bg-primary flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-lg">handshake</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-heading font-bold text-gray-900">Negotiation Console</h1>
                            <p className="text-[11px] font-mono text-gray-500">#{negotiation.id?.slice(-6)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onStartCall && isPending && (
                        <button
                            onClick={handleStartCall}
                            disabled={isStartingCall}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-2xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                            {isStartingCall ? (
                                <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-base">videocam</span>
                            )}
                            <span className="hidden sm:inline">Call Farmer</span>
                        </button>
                    )}
                    <button className="p-2 hover:bg-gray-100 rounded-2xl text-gray-500">
                        <span className="material-symbols-outlined text-lg">help</span>
                    </button>
                </div>
            </header>

            {/* Main Split-Pane Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Chat Interface */}
                <main className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
                    {/* Chat Header - Farmer Info */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">👨‍🌾</div>
                                <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 border-2 border-white rounded-full" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">{farmer?.name || 'Farmer'}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-xs text-amber-500">star</span>
                                        4.8
                                    </span>
                                    <span className="text-green-600">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
                                <span className="material-symbols-outlined text-lg">call</span>
                            </button>
                            <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
                                <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages - Dense View */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
                        {/* Current Offer Summary Strip */}
                        <div className="flex items-center justify-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs shadow-sm">
                                <span className="text-gray-600">Your offer:</span>
                                <span className="font-bold font-mono text-primary">₹{negotiation.offeredPrice}/kg</span>
                                <span className="text-gray-500">×</span>
                                <span className="font-medium font-mono">{negotiation.quantity}kg</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                                    negotiation.status === NegotiationStatus.Accepted ? 'bg-green-100 text-green-700' :
                                    negotiation.status === NegotiationStatus.Rejected ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {negotiation.status}
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id || idx} className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                    <div className={`size-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${isMe ? 'bg-primary text-white' : 'bg-gray-300 text-gray-700'}`}>
                                        {isMe ? 'Y' : 'F'}
                                    </div>
                                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary/10 text-gray-900' : 'bg-white border border-gray-200'}`}>
                                        <p>{msg.text}</p>
                                        <span className="text-[10px] text-gray-500 mt-1 block">
                                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {messages.length === 0 && (
                            <p className="text-center text-xs text-gray-500 py-4">Start a conversation</p>
                        )}

                        {/* Status Badges */}
                        {isAgreement && (
                            <div className="flex justify-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Offer Accepted
                                </span>
                            </div>
                        )}
                        {isRejected && (
                            <div className="flex justify-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                    Offer Rejected
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Chat Input - Compact */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 h-10 px-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                placeholder={`Message ${farmer?.name || 'farmer'}...`}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim()}
                                className="h-10 px-4 bg-primary text-white rounded-2xl disabled:opacity-40 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-lg">send</span>
                            </button>
                        </div>
                    </div>
                </main>

                {/* Right Column: Price Analytics Panel */}
                <aside className="w-80 lg:w-96 hidden md:flex flex-col bg-white overflow-hidden border-l border-gray-100">
                    {/* Price Analytics Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-sm font-heading font-bold text-gray-900">Price Analytics</h3>
                        <p className="text-xs text-gray-500 truncate">{negotiation.productName}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Fair Value Gauge */}
                        {priceBand && (
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-600">Market Band</span>
                                    {!priceBand.isVerified && (
                                        <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-xs">warning</span>
                                            Unverified
                                        </span>
                                    )}
                                </div>
                                {/* Price Gauge Bar */}
                                <div className="relative h-2 bg-gradient-to-r from-red-400 via-amber-400 to-green-400 rounded-full mb-2">
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 size-4 bg-white border-2 border-gray-800 rounded-full shadow-sm transition-all"
                                        style={{ left: `calc(${pricePosition}% - 8px)` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>₹{priceBand.floorPrice}</span>
                                    <span className="font-medium text-primary">₹{counterPrice}</span>
                                    <span>₹{priceBand.targetPrice}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                                    <span>Floor</span>
                                    <span>Your Offer</span>
                                    <span>Fair</span>
                                </div>
                            </div>
                        )}

                        {/* Offer Classification */}
                        {offerClassification && (
                            <div className={`p-2.5 rounded-2xl border ${
                                offerClassification.status === 'INVALID' ? 'bg-red-50 border-red-200' :
                                offerClassification.status === 'LOW' ? 'bg-amber-50 border-amber-200' :
                                offerClassification.status === 'FAIR' ? 'bg-green-50 border-green-200' :
                                'bg-blue-50 border-blue-200'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <span className={`material-symbols-outlined text-sm ${
                                        offerClassification.status === 'INVALID' ? 'text-red-600' :
                                        offerClassification.status === 'LOW' ? 'text-amber-600' :
                                        offerClassification.status === 'FAIR' ? 'text-green-600' :
                                        'text-blue-600'
                                    }`}>
                                        {offerClassification.status === 'INVALID' ? 'block' :
                                         offerClassification.status === 'LOW' ? 'trending_down' :
                                         offerClassification.status === 'FAIR' ? 'check_circle' : 'trending_up'}
                                    </span>
                                    <span className="text-xs font-medium">{offerClassification.message}</span>
                                </div>
                            </div>
                        )}

                        {/* Counter-Offer Controls */}
                        {isPending && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Counter-Offer</h4>
                                
                                {/* Price Input */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Price (₹/kg)</label>
                                    <div className={`flex items-center h-10 rounded-2xl border ${!isOfferValid ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                        <button
                                            onClick={() => setCounterPrice(Math.max(1, counterPrice - 1))}
                                            className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                        >
                                            <span className="material-symbols-outlined text-lg">remove</span>
                                        </button>
                                        <input
                                            className={`flex-1 h-full text-center font-bold text-base bg-transparent border-x border-gray-200 focus:outline-none ${!isOfferValid ? 'text-red-600' : ''}`}
                                            type="number"
                                            value={counterPrice}
                                            onChange={(e) => setCounterPrice(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                        <button
                                            onClick={() => setCounterPrice(counterPrice + 1)}
                                            className="w-10 h-full flex items-center justify-center text-primary hover:bg-gray-100"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Quantity Input */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Quantity (kg) - Min {MIN_BULK_QUANTITY_KG}</label>
                                    <div className={`flex items-center h-10 rounded-2xl border ${!isQuantityValid ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                        <button
                                            onClick={() => setCounterQuantity(Math.max(MIN_BULK_QUANTITY_KG, counterQuantity - 100))}
                                            className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                        >
                                            <span className="material-symbols-outlined text-lg">remove</span>
                                        </button>
                                        <input
                                            className={`flex-1 h-full text-center font-bold text-base bg-transparent border-x border-gray-200 focus:outline-none ${!isQuantityValid ? 'text-red-600' : ''}`}
                                            type="number"
                                            min={MIN_BULK_QUANTITY_KG}
                                            value={counterQuantity}
                                            onChange={(e) => setCounterQuantity(Math.max(1, parseInt(e.target.value) || MIN_BULK_QUANTITY_KG))}
                                        />
                                        <button
                                            onClick={() => setCounterQuantity(counterQuantity + 100)}
                                            className="w-10 h-full flex items-center justify-center text-primary hover:bg-gray-100"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateOffer}
                                    disabled={!canSubmitOffer}
                                    className={`w-full h-10 rounded-2xl font-semibold text-sm transition-colors ${
                                        canSubmitOffer
                                            ? 'bg-accent text-gray-900 hover:bg-accent-dark'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {canSubmitOffer ? 'Update Offer' : 'Invalid Offer'}
                                </button>
                            </div>
                        )}

                        {/* Deal Calculator */}
                        <div className="pt-3 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Calculator</h4>
                            <div className="space-y-2">
                                <div className="info-strip bg-gray-50 rounded">
                                    <span className="text-xs text-gray-600">Subtotal</span>
                                    <span className="text-sm font-semibold tabular-nums">₹{formatPrice(totalEstimate)}</span>
                                </div>
                                <div className="info-strip bg-gray-50 rounded">
                                    <span className="text-xs text-gray-600">Est. Logistics</span>
                                    <span className="text-sm font-medium tabular-nums">₹{formatPrice(logisticsEstimate)}</span>
                                </div>
                                <div className="info-strip bg-primary/5 rounded border border-primary/20">
                                    <span className="text-xs font-semibold text-primary">Total</span>
                                    <span className="text-base font-bold text-primary tabular-nums">₹{formatPrice(finalTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Stepper */}
                        <div className="pt-3 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Deal Status</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-green-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-xs">check</span>
                                    </div>
                                    <span className="text-xs font-medium">Deal Started</span>
                                </div>
                                <div className="w-px h-3 bg-gray-300 ml-2.5" />
                                <div className="flex items-center gap-2">
                                    <div className={`size-5 rounded-full flex items-center justify-center ${isAgreement ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}>
                                        <span className="material-symbols-outlined text-white text-xs">
                                            {isAgreement ? 'check' : 'pending'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium">{isAgreement ? 'Agreed' : 'Negotiating'}</span>
                                </div>
                                <div className="w-px h-3 bg-gray-300 ml-2.5" />
                                <div className="flex items-center gap-2">
                                    <div className={`size-5 rounded-full border ${isAgreement ? 'bg-gray-100 border-gray-300' : 'border-gray-300'} flex items-center justify-center`}>
                                        <span className="material-symbols-outlined text-gray-500 text-xs">payments</span>
                                    </div>
                                    <span className="text-xs text-gray-500">Payment</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        {isAgreement ? (
                            <button className="w-full h-11 bg-primary hover:bg-primary-dark text-white rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">payment</span>
                                Pay ₹{formatPrice(finalTotal)}
                            </button>
                        ) : (
                            <button
                                onClick={onAcceptOffer}
                                disabled={isRejected}
                                className="w-full h-11 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white rounded-2xl font-semibold text-sm transition-colors disabled:cursor-not-allowed"
                            >
                                Accept ₹{counterPrice}/kg
                            </button>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};
