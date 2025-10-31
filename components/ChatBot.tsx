
import React, { useState, useEffect, useRef } from 'react';
import { BotChatMessage } from '../types';
import { XIcon, SparklesIcon } from './icons';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  messages: BotChatMessage[];
  onSendMessage: (message: string, useThinkingMode: boolean) => void;
  isLoading: boolean;
}

export const ChatBot = ({ isOpen, onClose, messages, onSendMessage, isLoading }: ChatBotProps) => {
    const [input, setInput] = useState('');
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, messages, isLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input, useThinkingMode);
            setInput('');
        }
    };
    
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-25 z-30" onClick={onClose} />
            
            {/* Chat Window */}
            <div className="fixed bottom-24 right-4 sm:right-6 lg:right-8 z-40" aria-modal="true" role="dialog" aria-labelledby="chatbot-title">
                <div className="bg-white rounded-2xl shadow-xl w-[calc(100vw-2rem)] sm:w-96 h-[60vh] flex flex-col font-sans animate-slide-in-up" style={{ animationDuration: '300ms' }}>
                    {/* Header */}
                    <header className="flex items-center justify-between p-4 border-b bg-stone-50 rounded-t-2xl">
                        <div className="flex items-center space-x-2">
                             <SparklesIcon className="h-6 w-6 text-primary" />
                            <h2 id="chatbot-title" className="text-lg font-bold font-heading text-stone-800">Anna Helper</h2>
                        </div>
                        <div className="flex items-center space-x-3">
                             <div className="flex items-center space-x-2">
                                 <label htmlFor="thinking-mode" className="text-xs font-medium text-stone-600 cursor-pointer">Pro Mode</label>
                                 <button
                                     role="switch"
                                     aria-checked={useThinkingMode}
                                     onClick={() => setUseThinkingMode(!useThinkingMode)}
                                     id="thinking-mode"
                                     className={`${useThinkingMode ? 'bg-primary' : 'bg-stone-200'} relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                                 >
                                     <span className={`${useThinkingMode ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                 </button>
                             </div>
                            <button onClick={onClose} className="text-stone-400 hover:text-stone-600" aria-label="Close chat">
                               <XIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    </header>
                    
                    {/* Messages Body */}
                    <div className="flex-1 p-4 overflow-y-auto bg-background space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 {msg.role !== 'user' && <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-heading">A</div>}
                                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white rounded-br-lg' : 'bg-white text-stone-800 rounded-bl-lg shadow-sm border border-stone-200/80'} ${msg.role === 'error' ? 'bg-red-100 text-red-700' : ''}`}>
                                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex items-end gap-2.5 justify-start">
                               <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-heading">A</div>
                                <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-white text-dark rounded-bl-lg shadow-sm">
                                    <div className="flex items-center space-x-1.5">
                                        <span className="h-2 w-2 bg-stone-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                        <span className="h-2 w-2 bg-stone-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                        <span className="h-2 w-2 bg-stone-400 rounded-full animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input Form */}
                    <form onSubmit={handleSend} className="p-3 border-t bg-white rounded-b-2xl">
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 block w-full rounded-full border-stone-300 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm px-4 py-2"
                                aria-label="Chat input"
                            />
                            <button 
                                type="submit" 
                                className="bg-primary text-white p-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity disabled:bg-stone-400 disabled:cursor-not-allowed"
                                disabled={!input.trim() || isLoading}
                                aria-label="Send message"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};