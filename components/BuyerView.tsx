
import React, { useState, useMemo } from 'react';
import { Product, CartItem, Negotiation, ProductType, NegotiationStatus, ProductCategory, Farmer } from '../types';
import { ProductCard } from './ProductCard';
import { ChatBubbleIcon, SearchIcon } from './icons';
import { ProductCardSkeleton } from './ProductCardSkeleton';

interface BuyerViewProps {
    products: Product[];
    cart: CartItem[];
    cartTotal: number;
    minCartValue: number;
    negotiations: Negotiation[];
    onAddToCart: (product: Product) => void;
    onStartNegotiation: (product: Product) => void;
    onRespondToCounter: (negotiationId: string, response: 'Accepted' | 'Rejected') => void;
    onOpenChat: (negotiation: Negotiation) => void;
    wishlist: string[];
    onToggleWishlist: (productId: string) => void;
    farmers: Farmer[];
    onViewFarmerProfile: (farmerId: string) => void;
}

const getStatusChipClass = (status: NegotiationStatus) => {
    switch (status) {
        case NegotiationStatus.Pending: return 'bg-yellow-100 text-yellow-800';
        case NegotiationStatus.CounterOffer: return 'bg-blue-100 text-blue-800';
        case NegotiationStatus.Accepted: return 'bg-green-100 text-green-800';
        case NegotiationStatus.Rejected: return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

export const BuyerView = ({ products, negotiations, onAddToCart, onStartNegotiation, onRespondToCounter, onOpenChat, wishlist, onToggleWishlist, farmers, onViewFarmerProfile }: BuyerViewProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<ProductCategory | 'All'>('All');
    const [sortOrder, setSortOrder] = useState<'default' | 'price-asc' | 'price-desc'>('default');
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);

    const displayedProducts = useMemo(() => {
        let filtered = [...products];

        // Apply search filter
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(lowercasedQuery) ||
                p.category.toLowerCase().includes(lowercasedQuery)
            );
        }

        // Apply category filter
        if (filterCategory !== 'All') {
            filtered = filtered.filter(p => p.category === filterCategory);
        }

        // Apply sorting
        if (sortOrder === 'price-asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'price-desc') {
            filtered.sort((a, b) => b.price - a.price);
        }
        
        return filtered;
    }, [products, filterCategory, sortOrder, searchQuery]);

    const retailProducts = displayedProducts.filter(p => p.type === ProductType.Retail);
    const bulkProducts = displayedProducts.filter(p => p.type === ProductType.Bulk);
    const wishlistedProducts = useMemo(() => products.filter(p => wishlist.includes(p.id)), [products, wishlist]);

    const renderProductCard = (product: Product) => {
        const farmer = farmerMap.get(product.farmerId);
        if (!farmer) return null; // Or a fallback UI
        
        return (
            <ProductCard 
                key={product.id}
                product={product} 
                onAddToCart={onAddToCart} 
                onNegotiate={onStartNegotiation}
                isInWishlist={wishlist.includes(product.id)}
                onToggleWishlist={onToggleWishlist} 
                farmer={farmer}
                onViewFarmerProfile={onViewFarmerProfile}
            />
        );
    };

    const renderProductGrid = (productList: Product[], title: string, emptyMessage: string) => (
         <section>
            <h2 className="text-3xl font-bold font-heading text-text-dark mb-6">{title}</h2>
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
            ) : productList.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {productList.map(renderProductCard)}
                </div>
            ) : (
                <p className="text-text-light">{emptyMessage}</p>
            )}
        </section>
    );

    return (
        <div className="space-y-16">
            <div className="bg-white/70 p-4 rounded-xl shadow-sm mb-8 border border-gray-200 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for products or categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                        {(['All', ...Object.values(ProductCategory)] as const).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                                    filterCategory === cat
                                        ? 'bg-primary text-white shadow'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                                aria-pressed={filterCategory === cat}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Sorting Dropdown */}
                    <div>
                        <label htmlFor="sort-order" className="sr-only">Sort by</label>
                        <select
                            id="sort-order"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'default' | 'price-asc' | 'price-desc')}
                            className="rounded-full border-gray-300 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm px-4 py-2"
                        >
                            <option value="default">Sort by: Default</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {wishlistedProducts.length > 0 && renderProductGrid(wishlistedProducts, "My Wishlist", "")}

            {renderProductGrid(retailProducts, "Retail Products", "No retail products match the current filters.")}
            
            {renderProductGrid(bulkProducts, "Bulk Products (Negotiable)", "No bulk products match the current filters.")}
            
            {negotiations.length > 0 &&
            <section>
                <h2 className="text-3xl font-bold font-heading text-text-dark mb-6">My Negotiations</h2>
                <div className="space-y-4">
                    {negotiations.map(neg => (
                         <div key={neg.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                <img src={neg.productImageUrl} alt={neg.productName} className="w-24 h-24 rounded-lg object-cover"/>
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <p className="font-bold font-heading text-lg text-text-dark">{neg.productName}</p>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(neg.status)}`}>{neg.status}</span>
                                    </div>
                                    <p className="text-sm text-text-light">Qty: {neg.quantity}</p>
                                    <p className="text-sm text-text-light">Your Offer: <span className="font-bold text-secondary">₹{neg.offeredPrice}</span> (Original: ₹{neg.initialPrice})</p>
                                    {neg.status === NegotiationStatus.CounterOffer && neg.counterPrice &&
                                        <p className="text-sm text-blue-600 font-semibold">Farmer's Counter: <span className="font-bold">₹{neg.counterPrice}</span></p>
                                    }
                                </div>
                            </div>
                            <div className="flex space-x-2 self-end sm:self-center">
                                <button onClick={() => onOpenChat(neg)} title="Open Chat" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                    <ChatBubbleIcon className="h-6 w-6 text-gray-600"/>
                                </button>
                                {neg.status === NegotiationStatus.CounterOffer &&
                                    <>
                                        <button onClick={() => onRespondToCounter(neg.id, 'Accepted')} className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full hover:bg-green-600 transition-colors">Accept</button>
                                        <button onClick={() => onRespondToCounter(neg.id, 'Rejected')} className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full hover:bg-red-600 transition-colors">Reject</button>
                                    </>
                                }
                            </div>
                         </div>
                    ))}
                </div>
            </section>
            }
        </div>
    );
}