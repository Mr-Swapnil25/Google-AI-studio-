
import React from 'react';
import { Product, ProductType } from '../types';
import { HeartIcon } from './icons';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
    onNegotiate: (product: Product) => void;
    isInWishlist: boolean;
    onToggleWishlist: (productId: string) => void;
}

export const ProductCard = ({ product, onAddToCart, onNegotiate, isInWishlist, onToggleWishlist }: ProductCardProps) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden group transform hover:-translate-y-1 transition-all duration-300 relative">
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
        <div className="p-5">
            <p className="text-text-light text-sm mb-4 h-10">{product.description}</p>
            <div className="flex justify-between items-center mt-4">
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