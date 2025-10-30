
import React from 'react';
import { UserRole } from '../types';
import { ShoppingCartIcon } from './icons';

interface HeaderProps {
    userRole: UserRole;
    setUserRole: (role: UserRole) => void;
    cartItemCount: number;
    onCartClick: () => void;
}

export const Header = ({ userRole, setUserRole, cartItemCount, onCartClick }: HeaderProps) => {
    const isFarmer = userRole === UserRole.Farmer;
    
    return (
        <header className={`bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-20 transition-colors duration-300 ${isFarmer ? 'theme-farmer' : 'theme-buyer'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex-shrink-0">
                        <h1 className={`text-3xl font-bold font-heading ${isFarmer ? 'text-farmer-primary' : 'text-primary'}`}>
                            Anna Bazaar
                        </h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        {userRole === UserRole.Buyer && (
                             <button onClick={onCartClick} className="relative group" aria-label={`View cart with ${cartItemCount} items`}>
                                <ShoppingCartIcon className="h-7 w-7 text-text-dark group-hover:text-primary transition-colors"/>
                                {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{cartItemCount}</span>}
                            </button>
                        )}
                       
                        <div className="flex items-center bg-gray-100 rounded-full p-1 relative">
                             <div className={`absolute top-1 left-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] rounded-full transition-transform duration-300 ease-in-out ${isFarmer ? 'translate-x-full bg-farmer-primary' : 'translate-x-0 bg-primary'}`}></div>
                             <button 
                                 onClick={() => setUserRole(UserRole.Buyer)} 
                                 className={`relative px-5 py-2 text-sm font-semibold rounded-full z-10 transition-colors duration-300 ${!isFarmer ? 'text-white' : 'text-gray-600'}`}
                             >
                                 Buyer
                             </button>
                             <button 
                                 onClick={() => setUserRole(UserRole.Farmer)} 
                                 className={`relative px-5 py-2 text-sm font-semibold rounded-full z-10 transition-colors duration-300 ${isFarmer ? 'text-white' : 'text-gray-600'}`}
                             >
                                 Farmer
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
