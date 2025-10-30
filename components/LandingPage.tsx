import React from 'react';
import { UserRole } from '../types';
import { ShoppingCartIcon, LeafIcon, SparklesIcon, ChatBubbleIcon, PackageIcon } from './icons';

interface LandingPageProps {
  onStartAuth: (role: UserRole) => void;
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200/50 text-center transform hover:-translate-y-2 transition-transform duration-300">
        <div className="mx-auto bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold font-heading text-text-dark mb-2">{title}</h3>
        <p className="text-text-light text-sm">{description}</p>
    </div>
);

export const LandingPage = ({ onStartAuth }: LandingPageProps) => {
    return (
        <div className="bg-background min-h-screen text-text-dark">
            {/* Hero Section */}
            <div className="relative text-white text-center py-20 md:py-32 bg-gradient-to-br from-primary via-green-800 to-secondary overflow-hidden">
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl md:text-6xl font-extrabold font-heading mb-4 leading-tight">
                        Connect Farmers Directly with Buyers
                    </h1>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto text-white/90 mb-10">
                        Fresh produce, fair prices, and powerful tools for the modern agricultural marketplace.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => onStartAuth(UserRole.Buyer)}
                            className="w-full sm:w-auto flex items-center justify-center bg-accent text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 hover:shadow-xl transform hover:scale-105 transition-all duration-300 shadow-lg"
                        >
                            <ShoppingCartIcon className="h-6 w-6 mr-3" />
                            I'm a Buyer
                        </button>
                        <button
                            onClick={() => onStartAuth(UserRole.Farmer)}
                            className="w-full sm:w-auto flex items-center justify-center bg-farmer-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-800 hover:shadow-xl transform hover:scale-105 transition-all duration-300 shadow-lg"
                        >
                            <LeafIcon className="h-6 w-6 mr-3" />
                            I'm a Farmer
                        </button>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold font-heading text-center mb-12">
                        Why Choose Anna Bazaar?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <FeatureCard
                            icon={<SparklesIcon className="h-8 w-8" />}
                            title="AI-Powered Listings"
                            description="Use AI to instantly generate product names, descriptions, and categories from just a photo."
                        />
                         <FeatureCard
                            icon={<ChatBubbleIcon className="h-8 w-8" />}
                            title="Bulk Negotiation"
                            description="Engage in direct negotiations for bulk purchases, with AI-assisted counter-offer suggestions."
                        />
                        <FeatureCard
                            icon={<PackageIcon className="h-8 w-8" />}
                            title="Fair & Direct Pricing"
                            description="Cut out the middleman. Buyers get fresh produce at great prices, and farmers get the profits they deserve."
                        />
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="bg-white/50 py-6">
                <div className="container mx-auto px-4 text-center text-text-light text-sm">
                    &copy; {new Date().getFullYear()} Anna Bazaar. All Rights Reserved.
                </div>
            </footer>
        </div>
    );
};