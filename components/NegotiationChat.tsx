import React, { useState, useRef, useEffect } from 'react';
import { Negotiation, NegotiationStatus, ChatMessage, PricingEngineResult } from '../types';
import { XIcon } from './icons';

interface NegotiationChatProps {
    negotiations: Negotiation[];
    messages: ChatMessage[];
    currentUserId: string;
    onClose: () => void;
    onSendMessage: (negotiationId: string, text: string) => void;
    onRespond: (negotiationId: string, response: 'Accepted' | 'Rejected') => void;
    onCounter: (negotiation: Negotiation) => void;
    initialNegotiationId?: string;
    // NEW: Pricing engine integration
    pricingMap?: Map<string, PricingEngineResult>; // productId -> pricing
}

export const NegotiationChat: React.FC<NegotiationChatProps> = ({
    negotiations,
    messages,
    currentUserId,
    onClose,
    onSendMessage,
    onRespond,
    onCounter,
    initialNegotiationId,
    pricingMap,
}) => {
    const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(
        initialNegotiationId 
            ? negotiations.find(n => n.id === initialNegotiationId) || negotiations[0] || null
            : negotiations[0] || null
    );
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const filteredNegotiations = negotiations.filter(n => 
        n.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.buyerId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentMessages = messages.filter(m => m.negotiationId === selectedNegotiation?.id);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [currentMessages]);

    const handleSend = () => {
        if (!messageInput.trim() || !selectedNegotiation) return;
        onSendMessage(selectedNegotiation.id, messageInput.trim());
        setMessageInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getStatusColor = (status: NegotiationStatus) => {
        switch (status) {
            case NegotiationStatus.Accepted: return 'bg-green-500';
            case NegotiationStatus.Rejected: return 'bg-red-500';
            case NegotiationStatus.CounterByFarmer:
            case NegotiationStatus.CounterByBuyer: return 'bg-orange-500';
            default: return 'bg-blue-500';
        }
    };

    const quickReplies = [
        'I accept the offer',
        'Price is too low',
        'Call me',
        'Let me check quality first',
    ];

    return (
        <div className="bg-[#f6f8f7] font-display text-[#101618] flex flex-col h-screen overflow-hidden">
            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Chat List */}
                <aside className="w-80 min-w-[280px] max-w-[400px] bg-white border-r border-[#e0e0e0] flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                    <div className="p-4 border-b border-[#f0f3f5]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold px-1">Active Negotiations</h3>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <XIcon className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex w-full items-stretch rounded-xl h-12 bg-[#f0f3f5] border border-transparent focus-within:border-[#0288D1]/50 transition-colors">
                            <div className="text-[#5e7c8d] flex items-center justify-center pl-4 pr-2">
                                <span className="material-symbols-outlined">search</span>
                            </div>
                            <input 
                                className="flex-1 bg-transparent border-none focus:ring-0 text-base font-medium placeholder:text-[#5e7c8d] text-[#101618]" 
                                placeholder="Search buyers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredNegotiations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">forum</span>
                                <p className="text-gray-500 font-medium">No active negotiations</p>
                            </div>
                        ) : (
                            filteredNegotiations.map((neg) => {
                                const isActive = selectedNegotiation?.id === neg.id;
                                const lastMessage = messages
                                    .filter(m => m.negotiationId === neg.id)
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                
                                return (
                                    <div 
                                        key={neg.id}
                                        onClick={() => setSelectedNegotiation(neg)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer relative group transition-all ${
                                            isActive 
                                                ? 'bg-[#e3f2fd] border border-[#bbdefb] shadow-sm' 
                                                : 'bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100'
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#0288D1] rounded-r-xl"></div>
                                        )}
                                        <div 
                                            className="bg-center bg-no-repeat bg-cover rounded-full h-14 w-14 shrink-0 border-2 border-white shadow-sm"
                                            style={{ backgroundImage: `url('${neg.productImageUrl}')` }}
                                        ></div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <p className={`text-lg font-bold line-clamp-1 ${isActive ? 'text-[#101618]' : 'text-[#5e7c8d]'}`}>
                                                    Buyer #{neg.buyerId.slice(-4)}
                                                </p>
                                                <span className={`text-xs font-bold whitespace-nowrap ${isActive ? 'text-[#0288D1]' : 'text-[#9aaeb8]'}`}>
                                                    {getTimeAgo(neg.lastUpdated)}
                                                </span>
                                            </div>
                                            <p className={`text-sm truncate ${isActive ? 'text-[#101618] font-semibold' : 'text-[#5e7c8d]'}`}>
                                                {lastMessage?.text || `Offer: ₹${neg.offeredPrice}/kg`}
                                            </p>
                                        </div>
                                        {neg.status === NegotiationStatus.Accepted && (
                                            <div className="size-3 rounded-full bg-green-500 shrink-0"></div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Center Column: Chat Thread */}
                {selectedNegotiation ? (
                    <main className="flex-1 flex flex-col bg-[#f8fafc] min-w-[400px]">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#e0e0e0] shadow-sm sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div 
                                        className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 border border-gray-200"
                                        style={{ backgroundImage: `url('${selectedNegotiation.productImageUrl}')` }}
                                    ></div>
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white rounded-full p-0.5">
                                        <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-[#101618]">Buyer #{selectedNegotiation.buyerId.slice(-4)}</h2>
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold border border-green-200 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                            Verified
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#5e7c8d] font-medium">{selectedNegotiation.productName}</p>
                                </div>
                            </div>
                            <button className="bg-[#f0f3f5] hover:bg-[#e0e3e5] rounded-full p-3 text-[#101618] transition-colors">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
                            </button>
                        </div>

                        {/* Market Reference Badge - NEW */}
                        {pricingMap && selectedNegotiation && pricingMap.get(selectedNegotiation.productId) && (
                            <div className="mx-6 mt-2 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600 text-lg">store</span>
                                    <div>
                                        <span className="text-sm font-medium text-blue-800">
                                            {pricingMap.get(selectedNegotiation.productId)?.mandiReference?.marketName || 'Market Reference'}
                                        </span>
                                        <span className="text-xs text-blue-600 ml-2">
                                            Modal: ₹{pricingMap.get(selectedNegotiation.productId)?.mandiReference?.modalPricePerKg?.toFixed(0) || pricingMap.get(selectedNegotiation.productId)?.targetPrice.toFixed(0)}/kg
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold">
                                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                        Min: ₹{pricingMap.get(selectedNegotiation.productId)?.floorPrice.toFixed(0)}
                                    </span>
                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                        Fair: ₹{pricingMap.get(selectedNegotiation.productId)?.targetPrice.toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Chat Content */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                            <div className="flex justify-center">
                                <span className="bg-[#e0e3e5] text-[#5e7c8d] text-xs font-bold px-3 py-1 rounded-full">
                                    {new Date(selectedNegotiation.lastUpdated).toLocaleDateString('en-IN', { 
                                        weekday: 'long', 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </span>
                            </div>

                            {/* Initial Offer Bubble */}
                            <div className="self-center w-full max-w-md my-2">
                                <div className="bg-white border-2 border-orange-100 rounded-xl shadow-lg overflow-hidden">
                                    <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex justify-between items-center">
                                        <span className="text-orange-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">local_offer</span>
                                            Initial Offer
                                        </span>
                                        <span className="text-xs font-semibold text-orange-600">From Buyer</span>
                                    </div>
                                    <div className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-[#5e7c8d] font-medium">Offered Price</p>
                                            <p className="text-3xl font-black text-[#101618]">₹{selectedNegotiation.offeredPrice}<span className="text-lg text-gray-500 font-medium">/kg</span></p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[#5e7c8d] font-medium">Your Ask</p>
                                            <p className="text-xl font-bold text-gray-600">₹{selectedNegotiation.initialPrice}/kg</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            {currentMessages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUserId;
                                return (
                                    <div key={idx} className={`flex gap-3 max-w-[80%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                        <div 
                                            className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shrink-0 self-end border border-gray-200"
                                            style={{ backgroundImage: `url('https://i.pravatar.cc/150?u=${msg.senderId}')` }}
                                        ></div>
                                        <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                                            <div className={`p-4 rounded-2xl shadow-sm ${
                                                isMe 
                                                    ? 'bg-[#e1f5fe] rounded-br-none border border-[#b3e5fc]' 
                                                    : 'bg-white rounded-bl-none border border-gray-100'
                                            }`}>
                                                <p className={`text-lg leading-relaxed ${isMe ? 'text-[#01579b]' : 'text-[#101618]'}`}>
                                                    {msg.text}
                                                </p>
                                            </div>
                                            <span className="text-xs text-[#9aaeb8] font-medium mx-1">
                                                {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Current Status Bubble */}
                            {selectedNegotiation.status === NegotiationStatus.Pending && (
                                <div className="self-center w-full max-w-md my-2 animate-pulse">
                                    <div className="bg-white border-2 border-[#0288D1] rounded-xl shadow-lg overflow-hidden">
                                        <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                                            <span className="text-[#0288D1] font-bold text-sm uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
                                                Awaiting Response
                                            </span>
                                            <span className="text-xs font-semibold text-blue-600">Action Required</span>
                                        </div>
                                        <div className="p-5 flex items-center justify-between bg-blue-50/30">
                                            <div>
                                                <p className="text-sm text-[#5e7c8d] font-medium">Current Offer</p>
                                                <p className="text-4xl font-black text-[#0288D1]">₹{selectedNegotiation.offeredPrice}<span className="text-lg font-bold text-gray-500">/kg</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onRespond(selectedNegotiation.id, 'Rejected')}
                                                    className="px-4 py-2 rounded-lg border-2 border-[#e0e0e0] font-bold text-[#5e7c8d] hover:bg-gray-50 text-sm"
                                                >
                                                    Decline
                                                </button>
                                                <button 
                                                    onClick={() => onCounter(selectedNegotiation)}
                                                    className="px-4 py-2 rounded-lg bg-orange-100 text-orange-800 font-bold hover:bg-orange-200 border border-orange-200 text-sm"
                                                >
                                                    Counter
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedNegotiation.status === NegotiationStatus.Accepted && (
                                <div className="self-center w-full max-w-md my-2">
                                    <div className="bg-white border-2 border-green-300 rounded-xl shadow-lg overflow-hidden">
                                        <div className="bg-green-50 px-4 py-3 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-green-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            <span className="text-green-800 font-bold text-lg">Deal Finalized at ₹{selectedNegotiation.offeredPrice}/kg</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-[#e0e0e0] space-y-3">
                            {/* Smart Chips */}
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {quickReplies.map((reply, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setMessageInput(reply)}
                                        className="whitespace-nowrap px-4 py-2 rounded-full bg-[#f0f3f5] hover:bg-[#e0e3e5] border border-gray-200 text-[#101618] font-bold text-sm transition-colors"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                            {/* Main Input */}
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 bg-[#f0f3f5] rounded-2xl flex items-center px-2 py-2 border-2 border-transparent focus-within:border-[#0288D1] focus-within:bg-white transition-all">
                                    <button className="p-3 text-[#5e7c8d] hover:text-[#0288D1] rounded-full hover:bg-blue-50 transition-colors">
                                        <span className="material-symbols-outlined">add_circle</span>
                                    </button>
                                    <input 
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-[#101618] placeholder:text-[#9aaeb8]" 
                                        placeholder="Type your message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                    <button className="p-3 text-[#5e7c8d] hover:text-[#0288D1] rounded-full hover:bg-blue-50 transition-colors">
                                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                                    </button>
                                </div>
                                <button 
                                    onClick={handleSend}
                                    disabled={!messageInput.trim()}
                                    className="h-14 w-14 bg-[#0288D1] hover:bg-[#0277bd] disabled:bg-gray-300 text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:scale-100"
                                >
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                                </button>
                            </div>
                        </div>
                    </main>
                ) : (
                    <main className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc]">
                        <span className="material-symbols-outlined text-8xl text-gray-300 mb-4">chat</span>
                        <h3 className="text-2xl font-bold text-gray-400 mb-2">No Negotiation Selected</h3>
                        <p className="text-gray-400">Select a negotiation from the list to start chatting</p>
                    </main>
                )}

                {/* Right Column: Deal Context */}
                {selectedNegotiation && (
                    <aside className="w-80 min-w-[300px] max-w-[400px] bg-white border-l border-[#e0e0e0] flex flex-col z-10 hidden lg:flex">
                        <div className="p-6 bg-[#f8fafc] border-b border-[#e0e0e0]">
                            <h3 className="text-lg font-bold text-[#101618] mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#0288D1]">inventory_2</span>
                                Deal Summary
                            </h3>
                            {/* Product Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] overflow-hidden">
                                <div 
                                    className="h-32 bg-gray-100 bg-center bg-cover relative"
                                    style={{ backgroundImage: `url('${selectedNegotiation.productImageUrl}')` }}
                                >
                                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-3">
                                        <p className="text-white font-bold text-lg">{selectedNegotiation.productName}</p>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-[#5e7c8d] font-bold uppercase tracking-wider mb-1">Your Ask</p>
                                            <p className="text-[#101618] font-semibold">₹{selectedNegotiation.initialPrice}/kg</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#5e7c8d] font-bold uppercase tracking-wider mb-1">Quantity</p>
                                            <p className="text-[#101618] font-semibold">{selectedNegotiation.quantity} kg</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Offer Tracker */}
                        <div className="flex-1 p-6 flex flex-col gap-6">
                            <div>
                                <p className="text-[#5e7c8d] text-sm font-bold uppercase tracking-wider mb-2">Current Offer</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-[#101618] tracking-tight">₹{selectedNegotiation.offeredPrice}</span>
                                    <span className="text-xl text-[#5e7c8d] font-medium">/ kg</span>
                                </div>
                                {selectedNegotiation.offeredPrice >= selectedNegotiation.initialPrice ? (
                                    <div className="mt-2 flex items-center gap-2 text-green-600 font-bold bg-green-50 w-fit px-2 py-1 rounded">
                                        <span className="material-symbols-outlined text-[18px]">trending_up</span>
                                        <span className="text-sm">₹{selectedNegotiation.offeredPrice - selectedNegotiation.initialPrice} above your ask</span>
                                    </div>
                                ) : (
                                    <div className="mt-2 flex items-center gap-2 text-red-600 font-bold bg-red-50 w-fit px-2 py-1 rounded">
                                        <span className="material-symbols-outlined text-[18px]">trending_down</span>
                                        <span className="text-sm">₹{selectedNegotiation.initialPrice - selectedNegotiation.offeredPrice} below your ask</span>
                                    </div>
                                )}
                            </div>
                            <div className="h-px bg-[#e0e0e0] w-full"></div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[#5e7c8d] font-medium">Subtotal</p>
                                    <p className="text-[#101618] font-bold">₹{(selectedNegotiation.offeredPrice * selectedNegotiation.quantity).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[#5e7c8d] font-medium">Mandi Tax (1%)</p>
                                    <p className="text-[#101618] font-bold">- ₹{Math.round(selectedNegotiation.offeredPrice * selectedNegotiation.quantity * 0.01).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-[#e0e0e0]">
                                    <p className="text-[#101618] font-bold text-lg">Net Total</p>
                                    <p className="text-[#0288D1] font-black text-2xl">
                                        ₹{Math.round(selectedNegotiation.offeredPrice * selectedNegotiation.quantity * 0.99).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Finalize Action */}
                        {selectedNegotiation.status !== NegotiationStatus.Accepted && selectedNegotiation.status !== NegotiationStatus.Rejected && (
                            <div className="p-6 bg-white border-t border-[#e0e0e0] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <button 
                                    onClick={() => onRespond(selectedNegotiation.id, 'Accepted')}
                                    className="w-full bg-[#0288D1] hover:bg-[#0277bd] text-white text-xl font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Accept: ₹{selectedNegotiation.offeredPrice}/kg
                                </button>
                                <p className="text-center text-xs text-[#9aaeb8] mt-3 font-medium">
                                    Clicking accept generates a binding contract.
                                </p>
                            </div>
                        )}

                        {selectedNegotiation.status === NegotiationStatus.Accepted && (
                            <div className="p-6 bg-green-50 border-t border-green-200">
                                <div className="flex items-center justify-center gap-2 text-green-700">
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                    <span className="font-bold text-lg">Deal Accepted</span>
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
};
