
import React, { useState } from 'react';
import { Product, Farmer } from '../types';
import { HeartIcon, CheckCircleIcon, StarIcon, MapPinIcon, ShoppingCartIcon } from './icons';

interface ProductCardProps {
    product: Product;
    onNegotiate: (product: Product) => void;
    onAddToCart?: (product: Product, quantity: number) => void;
    isInWishlist: boolean;
    onToggleWishlist: (productId: string) => void;
    farmer: Farmer;
    onViewFarmerProfile: (farmerId: string) => void;
    isInCart?: boolean;
    cartQuantity?: number;
}

// Add to Cart Modal Component
const AddToCartModal: React.FC<{
    product: Product;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (quantity: number) => void;
}> = ({ product, isOpen, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(100); // Default 1 quintal (100kg)

    if (!isOpen) return null;

    const totalPrice = product.price * quantity;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in border border-white/30">
                    <div className="flex items-center gap-4 mb-4">
                        <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-16 h-16 rounded-2xl object-cover"
                        />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                            <p className="text-sm text-gray-500">₹{product.price}/kg</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-3 mb-4 border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium">
                            <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                            B2B Bulk Order: Minimum 100kg (1 quintal)
                        </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity (kg)
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(Math.max(100, quantity - 100))}
                                className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-primary hover:text-primary transition-colors"
                                disabled={quantity <= 100}
                            >
                                −
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(100, parseInt(e.target.value) || 100))}
                                min={100}
                                step={100}
                                className="flex-1 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                onClick={() => setQuantity(quantity + 100)}
                                className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-primary hover:text-primary transition-colors"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            = {(quantity / 100).toFixed(1)} quintals
                        </p>
                    </div>

                    {/* Total Price */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Price</span>
                            <span className="text-2xl font-bold text-primary font-heading">
                                ₹{totalPrice.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-gray-200 rounded-2xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm(quantity);
                                onClose();
                            }}
                            className="flex-1 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingCartIcon className="w-5 h-5" />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// B2B Platform - ProductCard with both Negotiate and Add to Cart options
export const ProductCard: React.FC<ProductCardProps> = ({ 
    product, 
    onNegotiate, 
    onAddToCart,
    isInWishlist, 
    onToggleWishlist, 
    farmer, 
    onViewFarmerProfile,
    isInCart,
    cartQuantity,
}) => {
    const [showAddToCartModal, setShowAddToCartModal] = useState(false);

    const handleAddToCart = (quantity: number) => {
        if (onAddToCart) {
            onAddToCart(product, quantity);
        }
    };

    return (
        <>
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden group transform hover:-translate-y-1 transition-all duration-300 flex flex-col h-full border border-white/40 hover:shadow-xl">
                <div className="relative">
                    <button 
                        onClick={() => onToggleWishlist(product.id)}
                        className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-300 ${isInWishlist ? 'bg-red-500/20 text-red-500' : 'text-stone-500 bg-white/70 backdrop-blur-sm hover:text-red-500 hover:bg-white'}`}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        <HeartIcon isFilled={isInWishlist} className="w-5 h-5" />
                    </button>
                    {/* Cart badge */}
                    {isInCart && cartQuantity && (
                        <div className="absolute top-3 left-3 z-10 bg-primary text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <ShoppingCartIcon className="w-3 h-3" />
                            {cartQuantity}kg
                        </div>
                    )}
                    <img src={product.imageUrl} alt={product.name} className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                </div>
                <div className="p-5 flex-grow flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold font-heading text-lg text-stone-800 tracking-wide pr-2">{product.name}</h3>
                        {product.isVerified && (
                            <div 
                                className="flex-shrink-0 flex items-center space-x-1 bg-green-100 text-green-800 rounded-full px-2.5 py-1 text-xs font-semibold cursor-help"
                                title={product.verificationFeedback || 'Verified by Anna AI for quality and authenticity.'}
                            >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>Verified</span>
                            </div>
                        )}
                    </div>
                    
                    <p className="text-stone-500 text-sm mb-4 flex-grow line-clamp-2">{product.description}</p>
                    
                    <button 
                        onClick={() => onViewFarmerProfile(farmer.id)} 
                        className="w-full text-left group mb-4 p-2 -mx-2 rounded-2xl hover:bg-stone-100 transition-colors"
                        aria-label={`View profile for ${farmer.name}`}
                    >
                        <div className="flex items-center space-x-3">
                            <img src={farmer.profileImageUrl} alt={farmer.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1.5">
                                    <p className="font-semibold text-sm text-stone-800 group-hover:text-primary truncate">{farmer.name}</p>
                                    {farmer.isVerified && <CheckCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0" title="Verified Farmer" />}
                                </div>
                                <div className="flex items-center space-x-3 mt-1">
                                    <div className="flex items-center space-x-1">
                                        <StarIcon className="h-3.5 w-3.5 text-yellow-400" />
                                        <span className="text-xs text-stone-500 font-medium">{farmer.rating.toFixed(1)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 text-xs text-stone-500">
                                        <MapPinIcon className="h-3.5 w-3.5" />
                                        <span>{farmer.location.split(',')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>

                    <div className="mt-auto pt-4 border-t border-stone-200/80">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-2xl font-bold text-primary font-heading">₹{product.price}</span>
                            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">per kg</span>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {onAddToCart && (
                                <button 
                                    onClick={() => setShowAddToCartModal(true)} 
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 shadow-sm ${
                                        isInCart 
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                            : 'bg-primary text-white hover:bg-primary-dark transform hover:scale-105'
                                    }`}
                                >
                                    <ShoppingCartIcon className="w-4 h-4" />
                                    {isInCart ? 'Update' : 'Add to Cart'}
                                </button>
                            )}
                            <button 
                                onClick={() => onNegotiate(product)} 
                                className="flex-1 bg-secondary text-white px-4 py-2.5 rounded-full font-semibold text-sm hover:bg-secondary-dark transform hover:scale-105 transition-all duration-300 shadow-sm"
                            >
                                Negotiate
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add to Cart Modal */}
            <AddToCartModal
                product={product}
                isOpen={showAddToCartModal}
                onClose={() => setShowAddToCartModal(false)}
                onConfirm={handleAddToCart}
            />
        </>
    );
};