
import React from 'react';
import { Farmer, Product } from '../types';
import { ProductCard } from './ProductCard';
import { ArrowLeftIcon, CheckCircleIcon, StarIcon, MapPinIcon, LeafIcon, PackageIcon } from './icons';

interface FarmerProfileProps {
    farmer: Farmer;
    products: Product[];
    onBack: () => void;
    onAddToCart: (product: Product) => void;
    onNegotiate: (product: Product) => void;
    wishlist: string[];
    onToggleWishlist: (productId: string) => void;
    onViewFarmerProfile: (farmerId: string) => void;
}

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex items-center space-x-3">
        <div className="bg-gray-100 p-2 rounded-full">
            {icon}
        </div>
        <div>
            <p className="font-semibold text-text-dark">{value}</p>
            <p className="text-xs text-text-light">{label}</p>
        </div>
    </div>
);

export const FarmerProfile = ({ farmer, products, onBack, onAddToCart, onNegotiate, wishlist, onToggleWishlist }: FarmerProfileProps) => {
    // A no-op handler for product cards on the profile page itself.
    const noopViewProfile = () => {}; 
    
    return (
        <div className="animate-fade-in">
            <button
                onClick={onBack}
                className="flex items-center space-x-2 text-primary font-semibold hover:underline mb-6"
            >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Products</span>
            </button>

            <header className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center gap-6">
                <img src={farmer.profileImageUrl} alt={farmer.name} className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"/>
                <div className="flex-grow text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                        <h1 className="text-3xl font-bold font-heading text-text-dark">{farmer.name}</h1>
                        {farmer.isVerified && <CheckCircleIcon className="h-6 w-6 text-blue-500" title="Verified Farmer" />}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start space-x-1 mt-1 text-yellow-500">
                        <StarIcon className="h-5 w-5"/>
                        <span className="font-bold text-lg text-text-dark">{farmer.rating.toFixed(1)}</span>
                        <span className="text-sm text-text-light">(Rating)</span>
                    </div>
                </div>
                <button className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap">
                    Contact Farmer
                </button>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
                <aside className="lg:col-span-1 space-y-6">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold font-heading text-text-dark mb-3">About {farmer.name.split(' ')[0]}</h3>
                        <p className="text-text-light text-sm">{farmer.bio}</p>
                    </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                         <h3 className="text-lg font-bold font-heading text-text-dark mb-3">Stats</h3>
                        <StatItem icon={<PackageIcon className="h-5 w-5 text-primary"/>} label="Products Listed" value={products.length}/>
                        <StatItem icon={<LeafIcon className="h-5 w-5 text-green-500"/>} label="Years Farming" value={`${farmer.yearsFarming} Years`}/>
                        <StatItem icon={<MapPinIcon className="h-5 w-5 text-red-500"/>} label="Location" value={farmer.location}/>
                    </div>
                </aside>

                <section className="lg:col-span-3">
                    <h2 className="text-2xl font-bold font-heading text-text-dark mb-6">Products from {farmer.name}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                         {products.map(p => (
                            <ProductCard 
                                key={p.id}
                                product={p} 
                                onAddToCart={onAddToCart} 
                                onNegotiate={onNegotiate}
                                isInWishlist={wishlist.includes(p.id)}
                                onToggleWishlist={onToggleWishlist} 
                                farmer={farmer}
                                onViewFarmerProfile={noopViewProfile}
                            />
                        ))}
                    </div>
                     {products.length === 0 && <p className="text-text-light bg-white p-6 rounded-xl text-center">This farmer has not listed any products yet.</p>}
                </section>
            </main>
        </div>
    );
};