

import React from 'react';
import { Product, ProductType, Farmer } from '../types';
import { HeartIcon, CheckCircleIcon, StarIcon, MapPinIcon } from './icons';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
    onNegotiate: (product: Product) => void;
    isInWishlist: boolean;
    onToggleWishlist: (productId: string) => void;
    farmer: Farmer;
    onViewFarmerProfile: (farmerId: string) => void;
}

export const ProductCard = ({ product, onAddToCart, onNegotiate, isInWishlist, onToggleWishlist, farmer, onViewFarmerProfile }: ProductCardProps) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden group transform hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
        <button 
            onClick={() => onToggleWishlist(product.id)}
            className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-colors duration-300 ${isInWishlist ? 'text-red-500 bg-red-100/80' : 'text-gray-400 bg-white/80 hover:text-red-500'}`}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
            <HeartIcon isFilled={isInWishlist} className="w-6 h-6" />
        </button>
        <div className="relative">
            <img src={product.imageUrl} alt={product.name} className="w-full h-52 object-cover"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70"></div>
            <p className="absolute bottom-2 left-4 text-white font-bold text-xl font-heading">{product.name}</p>
        </div>
        <div className="p-5 flex-grow flex flex-col">
            <p className="text-text-light text-sm mb-3 flex-grow">{product.description}</p>
            
            <button 
                onClick={() => onViewFarmerProfile(farmer.id)} 
                className="w-full text-left group mb-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label={`View profile for ${farmer.name}`}
            >
                <div className="flex items-center space-x-3">
                    <img src={farmer.profileImageUrl} alt={farmer.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                            <p className="font-semibold text-sm text-text-dark group-hover:text-primary truncate">{farmer.name}</p>
                            {farmer.isVerified && <CheckCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0" title="Verified Farmer" />}
                        </div>
                         <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <div className="flex items-center space-x-1">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} className={`h-3.5 w-3.5 ${i < Math.round(farmer.rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                                <span className="text-xs text-text-light font-medium">{farmer.rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-text-light">
                                <MapPinIcon className="h-3.5 w-3.5" />
                                <span>{farmer.location.split(',')[0]}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </button>

            <div className="flex justify-between items-center mt-auto">
                <span className="text-2xl font-bold text-primary font-heading">₹{product.price}</span>
                {product.type === ProductType.Retail ? (
                    <button 
                        onClick={() => onAddToCart(product)} 
                        className="bg-accent text-gray-900 px-5 py-2 rounded-full font-bold text-sm hover:bg-yellow-400 transform hover:scale-105 transition-all duration-300 shadow-sm"
                    >
                        Add to Cart
                    </button>
                ) : (
                    <button 
                        onClick={() => onNegotiate(product)} 
                        className="bg-secondary text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-orange-600 transform hover:scale-105 transition-all duration-300 shadow-sm"
                    >
                        Negotiate
                    </button>
                )}
            </div>
        </div>
    </div>
);