
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
           setQuantity(isNew ? 1 : item.quantity);
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
    const theme = userRole === UserRole.Farmer ? 'farmer' : 'buyer';
    
    const primaryButtonClass = theme === 'farmer' 
        ? 'bg-farmer-primary text-white hover:bg-blue-800' 
        : 'bg-primary text-white hover:bg-green-700';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md m-4 font-sans" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-bold font-heading text-gray-800">
                        {isFarmerCountering ? 'Make Counter-Offer' : 'Negotiate Price'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="mt-4 flex items-center space-x-4 border-b pb-4">
                    <img src={productImageUrl} alt={productName} className="w-24 h-24 rounded-lg object-cover" />
                    <div>
                        <h3 className="font-semibold font-heading text-lg text-gray-900">{productName}</h3>
                        <p className="text-gray-600">Original Price: <span className="font-bold">₹{initialPrice}</span></p>
                        {buyerOffer && <p className="text-secondary">Buyer's Offer: <span className="font-bold">₹{buyerOffer}</span></p>}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                            min="1"
                            disabled={isFarmerCountering}
                        />
                    </div>
                     <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                           {isFarmerCountering ? 'Your Counter Price (per item)' : 'Your Offer Price (per item)'}
                        </label>
                        <input
                            id="price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                           {isFarmerCountering ? 'Update Notes (optional)' : 'Additional Notes (optional)'}
                        </label>
                        <textarea
                            id="notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className={`px-4 py-2 rounded-lg font-semibold transition-colors ${primaryButtonClass}`}>
                            {isFarmerCountering ? 'Submit Counter' : 'Submit Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
