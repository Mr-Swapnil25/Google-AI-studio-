
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Negotiation, UserRole, ProductType, MIN_BULK_QUANTITY_KG } from '../types';
import { XIcon } from './icons';
import { classifyOffer, computePriceBand, type PriceBand, type OfferClassification } from '../services/mandiPriceService';

interface NegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Product | Negotiation;
    userRole: UserRole;
    onSubmit: (values: { price: number; quantity: number; notes: string; priceBand?: PriceBand }) => void;
}

export const NegotiationModal = ({ isOpen, onClose, item, userRole, onSubmit }: NegotiationModalProps) => {
    const isNewNegotiation = 'type' in item;
    const initialPrice = isNewNegotiation ? item.price : item.initialPrice;
    const productName = isNewNegotiation ? item.name : item.productName;
    const productImageUrl = isNewNegotiation ? item.imageUrl : item.productImageUrl;
    const buyerOffer = !isNewNegotiation ? item.offeredPrice : undefined;
    
    // Get existing price band from negotiation if available
    const existingFloorPrice = !isNewNegotiation ? item.floorPrice : undefined;
    const existingTargetPrice = !isNewNegotiation ? item.targetPrice : undefined;

    const [quantity, setQuantity] = useState(isNewNegotiation ? MIN_BULK_QUANTITY_KG : item.quantity);
    const [price, setPrice] = useState(buyerOffer || initialPrice);
    const [notes, setNotes] = useState(isNewNegotiation ? '' : item.notes);
    const [priceBand, setPriceBand] = useState<PriceBand | null>(null);
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);
    
    // Load price band on mount for new negotiations
    useEffect(() => {
        const loadPriceBand = async () => {
            if (isNewNegotiation) {
                setIsLoadingPrices(true);
                try {
                    // For new negotiations, compute price band
                    const band = await computePriceBand(
                        productName,
                        item.isVerified ? 'A' : 'B', // Grade based on verification
                    );
                    setPriceBand(band);
                } catch (error) {
                    console.error('Failed to compute price band:', error);
                } finally {
                    setIsLoadingPrices(false);
                }
            } else if (existingFloorPrice != null && existingTargetPrice != null) {
                // Use existing price band from negotiation
                setPriceBand({
                    floorPrice: existingFloorPrice,
                    targetPrice: existingTargetPrice,
                    stretchPrice: existingTargetPrice * 1.1,
                    baseMandiPrice: 0,
                    qualityFactor: 1,
                    isVerified: item.priceVerified ?? false,
                    priceSource: item.priceSource ?? 'Market data',
                    updatedAt: null,
                });
            }
        };
        
        if (isOpen) {
            loadPriceBand();
        }
    }, [isOpen, isNewNegotiation, productName, existingFloorPrice, existingTargetPrice]);
    
    useEffect(() => {
        if (item) {
           const isNew = 'type' in item;
           setQuantity(isNew ? MIN_BULK_QUANTITY_KG : item.quantity); // Default bulk quantity (1 quintal)
           setPrice(isNew ? item.price : item.offeredPrice);
           setNotes(isNew ? '' : item.notes);
        }
    }, [item]);

    // Classify the current offer
    const offerClassification: OfferClassification | null = useMemo(() => {
        if (!priceBand || userRole === UserRole.Farmer) return null; // Farmers can counter at any price
        return classifyOffer(price, priceBand);
    }, [price, priceBand, userRole]);

    // Validation
    const isOfferValid = userRole === UserRole.Farmer || !offerClassification || offerClassification.status !== 'INVALID';
    const isQuantityValid = quantity >= MIN_BULK_QUANTITY_KG;
    const canSubmit = isOfferValid && isQuantityValid;

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ price, quantity, notes, priceBand: priceBand ?? undefined });
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
                        {isFarmerCountering ? 'Make Counter-Offer' : 'Negotiate Bulk Order'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><XIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                    <img src={productImageUrl} alt={productName} className="w-20 h-20 rounded-lg object-cover" />
                    <div>
                        <h3 className="font-bold font-heading text-lg text-stone-900">{productName}</h3>
                        <p className="text-stone-500 text-sm">Listed Price: <span className="font-bold">₹{initialPrice}/kg</span></p>
                        {buyerOffer && <p className="text-sm text-primary">Buyer's Offer: <span className="font-bold">₹{buyerOffer}/kg</span></p>}
                    </div>
                </div>

                {/* Price Band Display */}
                {priceBand && userRole === UserRole.Buyer && (
                    <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-stone-500">Mandi Price Reference</span>
                            {!priceBand.isVerified && (
                                <span className="text-orange-600 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">warning</span>
                                    Fallback pricing
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div>
                                <span className="text-stone-500">Floor:</span>
                                <span className="ml-1 font-bold text-red-600">₹{priceBand.floorPrice}/kg</span>
                            </div>
                            <div>
                                <span className="text-stone-500">Fair:</span>
                                <span className="ml-1 font-bold text-green-600">₹{priceBand.targetPrice}/kg</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1">{priceBand.priceSource}</p>
                    </div>
                )}

                {/* Offer Classification */}
                {offerClassification && (
                    <div className={`mb-4 p-3 rounded-lg border ${offerClassification.bgClass}`}>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${offerClassification.colorClass}`}>
                                {offerClassification.status === 'INVALID' ? 'block' :
                                 offerClassification.status === 'LOW' ? 'trending_down' :
                                 offerClassification.status === 'FAIR' ? 'check_circle' : 'trending_up'}
                            </span>
                            <span className={`text-sm font-bold ${offerClassification.colorClass}`}>
                                {offerClassification.status}
                            </span>
                            <span className={`text-xs ${offerClassification.colorClass}`}>
                                {offerClassification.message}
                            </span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-semibold text-stone-700">
                            Bulk Lot Quantity (kg) <span className="text-xs text-stone-500">- Min {MIN_BULK_QUANTITY_KG}kg (1 quintal)</span>
                        </label>
                        <input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || MIN_BULK_QUANTITY_KG))}
                            className={`${inputClasses} ${!isQuantityValid ? 'border-red-500 bg-red-50' : ''} disabled:bg-stone-300 disabled:cursor-not-allowed`}
                            min={MIN_BULK_QUANTITY_KG}
                            step={100}
                            disabled={isFarmerCountering}
                        />
                        {!isQuantityValid && (
                            <p className="text-xs text-red-600 mt-1">
                                Minimum bulk order is {MIN_BULK_QUANTITY_KG}kg (1 quintal). This is a B2B platform.
                            </p>
                        )}
                    </div>
                     <div>
                        <label htmlFor="price" className="block text-sm font-semibold text-stone-700">
                           {isFarmerCountering ? 'Your Counter Price (per kg)' : 'Your Offer Price (per kg)'}
                        </label>
                        <input
                            id="price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                            className={`${inputClasses} ${!isOfferValid ? 'border-red-500 bg-red-50' : ''}`}
                            step="0.50"
                            min={priceBand?.floorPrice || 1}
                        />
                        {!isOfferValid && priceBand && (
                            <p className="text-xs text-red-600 mt-1">
                                Offer cannot be below the minimum fair mandi-adjusted price of ₹{priceBand.floorPrice}/kg.
                            </p>
                        )}
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-semibold text-stone-700">
                           Additional Notes (optional)
                        </label>
                        <textarea
                            id="notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={inputClasses}
                            placeholder="Delivery requirements, quality specifications, etc."
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-stone-200 text-stone-800 px-5 py-2.5 rounded-lg font-bold hover:bg-stone-300 transition-colors">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={!canSubmit || isLoadingPrices}
                            className={`px-5 py-2.5 rounded-lg font-bold transition-colors ${
                                canSubmit && !isLoadingPrices 
                                    ? primaryButtonClass 
                                    : 'bg-stone-400 text-stone-200 cursor-not-allowed'
                            }`}
                        >
                            {isLoadingPrices ? 'Loading...' : isFarmerCountering ? 'Submit Counter' : 'Submit Bulk Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
