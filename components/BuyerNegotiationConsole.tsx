import React, { useState, useRef, useEffect } from 'react';
import { Negotiation, NegotiationStatus, ChatMessage, Farmer } from '../types';

interface BuyerNegotiationConsoleProps {
    negotiation: Negotiation;
    farmer?: Farmer;
    messages: ChatMessage[];
    currentUserId: string;
    onClose: () => void;
    onSendMessage: (text: string) => void;
    onUpdateOffer: (price: number, quantity: number) => void;
    onAcceptOffer: () => void;
    onDeclineOffer: () => void;
}

export const BuyerNegotiationConsole: React.FC<BuyerNegotiationConsoleProps> = ({
    negotiation,
    farmer,
    messages,
    currentUserId,
    onClose,
    onSendMessage,
    onUpdateOffer,
    onAcceptOffer,
    onDeclineOffer,
}) => {
    const [messageInput, setMessageInput] = useState('');
    const [counterPrice, setCounterPrice] = useState(negotiation.offeredPrice);
    const [counterQuantity, setCounterQuantity] = useState(negotiation.quantity);
    const chatContainerRef = useRef<HTMLDivElement>(null);

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
        onUpdateOffer(counterPrice, counterQuantity);
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

    return (
        <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark font-display text-text-main dark:text-white flex flex-col overflow-hidden">
            {/* Top Navigation Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1a262d] border-b border-stone-200 dark:border-[#27333a] shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">agriculture</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black">Anna Bazaar</h1>
                            <p className="text-xs text-stone-500">Negotiation Console</p>
                        </div>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">help</span>
                    <span>Help</span>
                </button>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Chat Interface */}
                <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1a262d] border-b border-stone-200 dark:border-[#27333a] shadow-sm sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div
                                    className="size-12 rounded-full bg-gradient-to-r from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-600 flex items-center justify-center text-2xl border border-stone-300 dark:border-stone-700"
                                >
                                    👨‍🌾
                                </div>
                                <div className="absolute -bottom-1 -right-1 size-4 bg-green-500 border-2 border-white dark:border-stone-900 rounded-full"></div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{farmer?.name || 'Farmer'}</h3>
                                <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-yellow-500">star</span>
                                        4.8/5 Trust Score
                                    </span>
                                    <span>•</span>
                                    <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors">
                                <span className="material-symbols-outlined">call</span>
                            </button>
                            <button className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors">
                                <span className="material-symbols-outlined">more_vert</span>
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages Area */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-stone-50 dark:bg-stone-900/30">
                        {/* Date Separator - Dynamic */}
                        {messages.length > 0 && (
                            <div className="flex justify-center">
                                <span className="px-3 py-1 bg-stone-200 dark:bg-stone-800 rounded-full text-xs font-medium text-stone-600 dark:text-stone-400">
                                    {new Date(messages[0]?.timestamp || negotiation.lastUpdated).toLocaleDateString('en-IN', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </span>
                            </div>
                        )}

                        {/* Initial Offer Card - Only show if no messages yet */}
                        {messages.length === 0 && (
                            <div className="flex gap-4 max-w-[80%]">
                                <div className="size-8 rounded-full bg-gradient-to-r from-stone-400 to-stone-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    👨‍🌾
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="bg-white dark:bg-stone-800 p-0 rounded-2xl rounded-tl-none border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden w-[280px]">
                                        <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-2 border-b border-stone-200 dark:border-stone-700 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-600 text-sm">local_offer</span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Initial Offer</span>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex justify-between items-baseline mb-2">
                                                <span className="text-sm text-stone-600 dark:text-stone-400">Price/kg</span>
                                                <span className="text-2xl font-bold">₹{negotiation.initialPrice}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline mb-4">
                                                <span className="text-sm text-stone-600 dark:text-stone-400">Quantity</span>
                                                <span className="text-base font-medium">{negotiation.quantity} kg</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-stone-500 dark:text-stone-400 ml-2">
                                        {new Date(negotiation.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Current Offer Summary */}
                        <div className="flex justify-center">
                            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                    Your offer: ₹{negotiation.offeredPrice}/kg for {negotiation.quantity}kg
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    negotiation.status === NegotiationStatus.Accepted ? 'bg-green-500 text-white' :
                                    negotiation.status === NegotiationStatus.Rejected ? 'bg-red-500 text-white' :
                                    'bg-yellow-500 text-black'
                                }`}>
                                    {negotiation.status}
                                </span>
                            </div>
                        </div>

                        {/* All Messages from prop */}
                        {messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id || idx} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                    <div className={`size-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isMe ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-stone-400 to-stone-500'}`}>
                                        {isMe ? 'YOU' : '👨‍🌾'}
                                    </div>
                                    <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                                        <div className={`p-4 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-50 dark:bg-emerald-900/30 rounded-tr-none border border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-stone-800 rounded-tl-none border border-stone-200 dark:border-stone-700'}`}>
                                            <p className="text-base">{msg.text}</p>
                                        </div>
                                        <span className={`text-xs text-stone-500 dark:text-stone-400 ${isMe ? 'mr-2' : 'ml-2'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {messages.length === 0 && (
                            <div className="flex justify-center py-8">
                                <p className="text-sm text-stone-500 dark:text-stone-400">
                                    Start a conversation with {farmer?.name || 'the farmer'}
                                </p>
                            </div>
                        )}

                        {/* Agreement Message */}
                        {isAgreement && (
                            <div className="flex justify-center">
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-300 dark:border-green-800">
                                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                                    <span className="text-xs font-bold text-green-700 dark:text-green-300">Offer Accepted!</span>
                                </div>
                            </div>
                        )}

                        {/* Rejection Message */}
                        {isRejected && (
                            <div className="flex justify-center">
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full border border-red-300 dark:border-red-800">
                                    <span className="material-symbols-outlined text-red-600 text-sm">cancel</span>
                                    <span className="text-xs font-bold text-red-700 dark:text-red-300">Offer Rejected</span>
                                </div>
                            </div>
                        )}

                        <div className="h-24"></div>
                    </div>

                    {/* Footer: Counter-Offer Tool */}
                    {isPending && (
                        <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-[#1a262d] border-t border-stone-200 dark:border-[#27333a] p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">Make Counter-Offer</h4>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                    {/* Price Spinner */}
                                    <div className="flex-1 flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-300 dark:border-stone-700 px-2 py-1">
                                        <button
                                            onClick={() => setCounterPrice(Math.max(1, counterPrice - 1))}
                                            className="size-10 flex items-center justify-center rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400"
                                        >
                                            <span className="material-symbols-outlined">remove</span>
                                        </button>
                                        <div className="flex-1 text-center border-x border-stone-300 dark:border-stone-700 mx-2 py-1">
                                            <span className="block text-xs text-stone-600 dark:text-stone-400 font-medium">Price (₹)</span>
                                            <input
                                                className="w-full bg-transparent text-center font-bold text-xl border-none focus:ring-0 p-0"
                                                type="number"
                                                value={counterPrice}
                                                onChange={(e) => setCounterPrice(Math.max(1, parseInt(e.target.value) || 1))}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setCounterPrice(counterPrice + 1)}
                                            className="size-10 flex items-center justify-center rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-emerald-600 dark:text-emerald-400"
                                        >
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </div>

                                    {/* Qty Spinner */}
                                    <div className="flex-1 flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-300 dark:border-stone-700 px-2 py-1">
                                        <button
                                            onClick={() => setCounterQuantity(Math.max(1, counterQuantity - 10))}
                                            className="size-10 flex items-center justify-center rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400"
                                        >
                                            <span className="material-symbols-outlined">remove</span>
                                        </button>
                                        <div className="flex-1 text-center border-x border-stone-300 dark:border-stone-700 mx-2 py-1">
                                            <span className="block text-xs text-stone-600 dark:text-stone-400 font-medium">Qty (kg)</span>
                                            <input
                                                className="w-full bg-transparent text-center font-bold text-xl border-none focus:ring-0 p-0"
                                                type="number"
                                                value={counterQuantity}
                                                onChange={(e) => setCounterQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setCounterQuantity(counterQuantity + 10)}
                                            className="size-10 flex items-center justify-center rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-emerald-600 dark:text-emerald-400"
                                        >
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={handleUpdateOffer}
                                        className="flex-[0.5] bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold px-6 py-2 shadow-md transition-all flex flex-col items-center justify-center min-w-[120px] active:scale-95"
                                    >
                                        <span className="text-sm">Update Offer</span>
                                        <span className="text-[10px] opacity-80">Send Card</span>
                                    </button>
                                </div>

                                {/* Simple Chat Input for Text */}
                                <div className="flex gap-3 items-center mt-2 border-t border-stone-300 dark:border-stone-700 pt-3">
                                    <div className="flex-1 relative">
                                        <input
                                            className="w-full h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 px-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            placeholder={`Type a message to ${farmer?.name || 'farmer'}...`}
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                        />
                                        <button className="absolute right-2 top-2 p-2 text-stone-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400">
                                            <span className="material-symbols-outlined">mic</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim()}
                                        className="size-12 rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 dark:hover:bg-emerald-800 disabled:bg-stone-400 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Right Column: Deal Flow Sidebar */}
                <aside className="w-[360px] flex-shrink-0 bg-white dark:bg-[#141d22] border-l border-stone-200 dark:border-[#27333a] flex flex-col shadow-2xl z-30 hidden lg:flex">
                    <div className="p-6 border-b border-stone-200 dark:border-[#27333a]">
                        <h3 className="text-lg font-bold mb-1">Deal Flow</h3>
                        <p className="text-sm text-stone-500 dark:text-stone-400">Ref: #{negotiation.id?.slice(-5)}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Status Stepper */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-4">Status</h4>
                            <div className="grid grid-cols-[32px_1fr] gap-x-3">
                                {/* Step 1: Done */}
                                <div className="flex flex-col items-center">
                                    <div className="size-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                                        <span className="material-symbols-outlined text-lg">check</span>
                                    </div>
                                    <div className="w-0.5 bg-green-500 h-8 grow"></div>
                                </div>
                                <div className="pt-1 pb-6">
                                    <p className="text-sm font-bold">Deal Started</p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">10:30 AM</p>
                                </div>

                                {/* Step 2: Active */}
                                <div className="flex flex-col items-center">
                                    <div className={`size-8 rounded-full flex items-center justify-center text-white shadow-md ring-4 ${isAgreement ? 'bg-green-500 ring-green-500/20' : 'bg-emerald-600 ring-emerald-600/20'} ${!isAgreement ? 'animate-pulse' : ''}`}>
                                        <span className="material-symbols-outlined text-lg">handshake</span>
                                    </div>
                                    <div className={`w-0.5 h-8 grow ${isAgreement ? 'bg-green-500' : 'bg-stone-300 dark:bg-stone-700'}`}></div>
                                </div>
                                <div className="pt-1 pb-6">
                                    <p className={`text-sm font-bold ${isAgreement ? 'text-green-600' : 'text-emerald-600'}`}>
                                        {isAgreement ? 'Deal Finalized' : 'Negotiation Agreed'}
                                    </p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">{isAgreement ? 'Ready to Pay' : 'Pending Payment'}</p>
                                </div>

                                {/* Step 3: Pending */}
                                <div className="flex flex-col items-center">
                                    <div className={`size-8 rounded-full border flex items-center justify-center ${isAgreement ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-600 dark:text-green-400' : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'}`}>
                                        <span className="material-symbols-outlined text-lg">payments</span>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <p className={`text-sm font-medium ${isAgreement ? 'text-green-600 dark:text-green-400' : 'text-stone-600 dark:text-stone-400'}`}>Payment Release</p>
                                </div>
                            </div>
                        </div>

                        {/* Calculator Stats */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-4">Live Calculator</h4>
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                                    <span className="text-sm text-stone-600 dark:text-stone-400 font-medium">Base Price</span>
                                    <span className="text-base font-bold">₹{counterPrice} <span className="text-xs font-normal text-stone-500">/kg</span></span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                                    <span className="text-sm text-stone-600 dark:text-stone-400 font-medium">Quantity</span>
                                    <span className="text-base font-bold">{counterQuantity} kg</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                                    <span className="text-sm text-stone-600 dark:text-stone-400 font-medium">Est. Logistics</span>
                                    <span className="text-base font-bold">₹{logisticsEstimate.toLocaleString('en-IN')}</span>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-stone-300 dark:bg-stone-700 my-2"></div>

                                <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <span className="text-sm text-emerald-900 dark:text-emerald-200 font-bold">TOTAL ESTIMATE</span>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{finalTotal.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Action Area */}
                    <div className="p-6 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-200 dark:border-[#27333a] shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.1)]">
                        {isAgreement ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-green-600">lock</span>
                                    <p className="text-xs font-medium text-stone-600 dark:text-stone-400">Payment is held securely in escrow.</p>
                                </div>
                                <button className="w-full relative overflow-hidden group bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-14 px-5 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:scale-95 font-bold">
                                    <span className="material-symbols-outlined">payment</span>
                                    Release Payment: ₹{finalTotal.toLocaleString('en-IN')}
                                </button>
                                <p className="text-center text-xs text-stone-600 dark:text-stone-400 font-medium">
                                    Secured by Anna Bazaar Escrow
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={onAcceptOffer}
                                disabled={isRejected}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-400 disabled:cursor-not-allowed text-white rounded-xl h-12 px-4 flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-95 font-bold"
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Accept: ₹{counterPrice}/kg
                            </button>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};
