
import React, { useState, useEffect, useRef } from 'react';
import { Negotiation, ChatMessage, UserRole } from '../types';
import { XIcon } from './icons';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    negotiation: Negotiation;
    messages: ChatMessage[];
    currentUserId: string;
    onSendMessage: (text: string) => void;
    userRole: UserRole;
}

export const ChatModal = ({ isOpen, onClose, negotiation, messages, currentUserId, onSendMessage, userRole }: ChatModalProps) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, messages]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSendMessage(newMessage);
        setNewMessage('');
    };
    
    const theme = userRole === UserRole.Farmer ? 'farmer' : 'buyer';
    const primaryBgClass = theme === 'farmer' ? 'bg-farmer-primary' : 'bg-primary';
    const primaryRingClass = theme === 'farmer' ? 'focus:ring-farmer-accent' : 'focus:ring-primary';
    const primaryBorderClass = theme === 'farmer' ? 'focus:border-farmer-accent' : 'focus:border-primary';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-xl w-full max-w-lg h-[70vh] m-4 flex flex-col font-sans animate-fade-in" 
                style={{animationDuration: '200ms'}}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                     <div className="flex items-center space-x-3">
                        <img src={negotiation.productImageUrl} alt={negotiation.productName} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                            <h2 className="text-lg font-bold font-heading text-stone-800">Chat for {negotiation.productName}</h2>
                            <p className="text-sm text-stone-500">Negotiation ID: {negotiation.id.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-6 w-6" /></button>
                </div>
                
                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto bg-stone-50">
                    <div className="space-y-2">
                        {messages.map((msg) => {
                            const isCurrentUser = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${isCurrentUser ? `${primaryBgClass} text-white rounded-br-lg` : 'bg-white text-stone-800 rounded-bl-lg shadow-sm border border-stone-200/80'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-stone-400'} text-right`}>
                                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSubmit} className="p-4 border-t bg-white rounded-b-xl">
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className={`flex-1 block w-full rounded-full border-stone-300 shadow-sm sm:text-sm px-4 py-2 ${primaryRingClass} ${primaryBorderClass}`}
                        />
                        <button 
                            type="submit" 
                            className={`${primaryBgClass} text-white p-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity disabled:bg-stone-400`}
                            disabled={!newMessage.trim()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};