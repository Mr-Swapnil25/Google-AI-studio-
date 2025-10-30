import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShoppingCartIcon, UserIcon } from './icons';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    cartItemCount: number;
    onCartClick: () => void;
}

const UserMenu = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-primary font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
                {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full rounded-full" /> : <span>{initials}</span>}
            </button>
            {isOpen && (
                <div 
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" 
                    role="menu" 
                    aria-orientation="vertical" 
                    aria-labelledby="user-menu-button"
                >
                    <div className="px-4 py-2 border-b">
                        <p className="text-sm text-gray-700" role="none">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate" role="none">{user.name}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export const Header = ({ user, onLogout, cartItemCount, onCartClick }: HeaderProps) => {
    const isFarmer = user.role === UserRole.Farmer;
    
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
                        {user.role === UserRole.Buyer && (
                             <button onClick={onCartClick} className="relative group" aria-label={`View cart with ${cartItemCount} items`}>
                                <ShoppingCartIcon className="h-7 w-7 text-text-dark group-hover:text-primary transition-colors"/>
                                {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{cartItemCount}</span>}
                            </button>
                        )}
                       
                       <UserMenu user={user} onLogout={onLogout} />
                    </div>
                </div>
            </div>
        </header>
    );
}