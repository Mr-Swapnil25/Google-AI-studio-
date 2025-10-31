
import React, { useState, useEffect } from 'react';
import { Product, Negotiation, UserRole, ProductType } from '../types';
import { XIcon } from './icons';

interface NegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Product | Negotiation;
    userRole: UserRole;
    onSubmit: (values: { price: number; quantity: number; notes: string }) => void;
}

export const NegotiationModal = ({ isOpen, onClose, item, userRole, onSubmit }: NegotiationModalProps) => {
    const isNewNegotiation = 'type' in item;
    const initialPrice = isNewNegotiation ? item.price : item.initialPrice;
    const productName = isNewNegotiation ? item.name : item.productName;
    const productImageUrl = isNewNegotiation ? item.imageUrl : item.productImageUrl;
    const buyerOffer = !isNewNegotiation ? item.offeredPrice : undefined;

    const [quantity, setQuantity] = useState(isNewNegotiation ? 1 : item.quantity);
    const [price, setPrice] = useState(buyerOffer || initialPrice);
    const [notes, setNotes] = useState(isNewNegotiation ? '' : item.notes);
    
    useEffect(() => {
        if (item) {
           const isNew = 'type' in item;
           setQuantity(isNew ? 10 : item.quantity); // Default bulk quantity
           setPrice(isNew ? item.price : item.offeredPrice);
           setNotes(isNew ? '' : item.notes);
        }
    }, [item]);


    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ price, quantity, notes });
    };

    const isFarmerCountering = userRole === UserRole.Farmer && 'status' in item;
    
    const primaryButtonClass = userRole === UserRole.Farmer 
        ? 'bg-farmer-primary text-white hover:bg-farmer-primary-dark' 
        : 'bg-primary text-white hover:bg-primary-dark';

    const ringColorClass = userRole === UserRole.Farmer ? 'focus:ring-farmer-accent' : 'focus:ring-primary';
    const inputClasses = `mt-1 block w-full rounded-xl bg-stone-100 text-stone-900 placeholder-stone-500 px-4 py-3 border border-stone-200 focus:outline-none focus:ring-2 ${ringColorClass}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-30 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md font-sans animate-fade-in" style={{ animationDuration: '200ms' }} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-heading text-stone-900">
                        {isFarmerCountering ? 'Make Counter-Offer' : 'Negotiate Price'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="flex items-center space-x-4 mb-6">
                    <img src={productImageUrl} alt={productName} className="w-20 h-20 rounded-lg object-cover" />
                    <div>
                        <h3 className="font-bold font-heading text-lg text-stone-900">{productName}</h3>
                        <p className="text-stone-500 text-sm">Original Price: <span className="font-bold">₹{initialPrice}</span></p>
                        {buyerOffer && <p className="text-sm text-primary">Buyer's Offer: <span className="font-bold">₹{buyerOffer}</span></p>}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-semibold text-stone-700">Quantity</label>
                        <input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                            className={`${inputClasses} disabled:bg-stone-300 disabled:cursor-not-allowed`}
                            min="1"
                            disabled={isFarmerCountering}
                        />
                    </div>
                     <div>
                        <label htmlFor="price" className="block text-sm font-semibold text-stone-700">
                           {isFarmerCountering ? 'Your Counter Price (per item)' : 'Your Offer Price (per item)'}
                        </label>
                        <input
                            id="price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(parseFloat(e.target.value))}
                            className={inputClasses}
                            step="0.01"
                        />
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-semibold text-stone-700">
                           Additional Notes (optional)
                        </label>
                        <textarea
                            id="notes"
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={inputClasses}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-stone-200 text-stone-800 px-5 py-2.5 rounded-lg font-bold hover:bg-stone-300 transition-colors">Cancel</button>
                        <button type="submit" className={`px-5 py-2.5 rounded-lg font-bold transition-colors ${primaryButtonClass}`}>
                            {isFarmerCountering ? 'Submit Counter' : 'Submit Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
