import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ShoppingCartIcon, UserIcon, HamburgerMenuIcon, XIcon, PackageIcon, ClipboardListIcon, ChatBubbleIcon, LogoutIcon } from './icons';

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
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-primary font-bold text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-all hover:ring-2 hover:ring-gray-200"
            >
                {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" /> : <span>{initials}</span>}
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
                    <div 
                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-40 animate-fade-in border border-gray-100" 
                        role="menu" 
                        aria-orientation="vertical"
                    >
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-primary/10 text-primary">
                                {user.role}
                            </span>
                        </div>
                        <div className="py-1">
                            <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">
                               <UserIcon className="w-4 h-4 text-gray-400" /> My Profile
                            </a>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onLogout();
                                }}
                                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                role="menuitem"
                            >
                               <LogoutIcon className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const MobileMenu = ({ user, onLogout, cartItemCount, onCartClick, onClose }: HeaderProps & { onClose: () => void }) => {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    const menuItems = [
        { label: 'My Profile', icon: <UserIcon className="w-5 h-5" />, action: () => {}, role: 'all' },
        { label: 'My Cart', icon: <ShoppingCartIcon className="w-5 h-5" />, action: onCartClick, role: UserRole.Buyer, badge: cartItemCount },
        { label: 'My Orders', icon: <PackageIcon className="w-5 h-5" />, action: () => {}, role: UserRole.Buyer },
        { label: 'My Inventory', icon: <ClipboardListIcon className="w-5 h-5" />, action: () => {}, role: UserRole.Farmer },
        { label: 'My Negotiations', icon: <ChatBubbleIcon className="w-5 h-5" />, action: () => {}, role: 'all' },
    ];

    const visibleItems = menuItems.filter(item => item.role === 'all' || item.role === user.role);

    return (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in" onClick={onClose}>
            <div
                className="absolute inset-y-0 left-0 w-4/5 max-w-xs bg-white shadow-xl z-50 flex flex-col animate-slide-in-left"
                onClick={e => e.stopPropagation()}
            >
                {/* Menu Header */}
                <div className="p-4 bg-primary text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" /> : <span>{initials}</span>}
                        </div>
                        <div>
                            <p className="font-bold text-sm">{user.name}</p>
                            <p className="text-xs opacity-80">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Close menu">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Menu Items */}
                <nav className="flex-1 py-2">
                    {visibleItems.map(item => (
                        <button 
                            key={item.label} 
                            onClick={() => { item.action(); onClose(); }}
                            className="w-full h-11 text-left flex items-center justify-between px-4 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {item.icon}
                                <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            {item.badge && item.badge > 0 && (
                                <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.badge}</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Logout Button - Bottom aligned, red accent */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => { onLogout(); onClose(); }}
                        className="w-full h-11 flex items-center justify-center gap-2 px-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium text-sm transition-colors"
                    >
                       <LogoutIcon className="w-5 h-5" />
                       <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Header = ({ user, onLogout, cartItemCount, onCartClick }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);
    
    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo Section - Left */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <span className="material-symbols-outlined text-2xl text-primary">agriculture</span>
                            <h1 className="text-lg sm:text-xl font-heading font-bold text-gray-900 tracking-tight">
                                Anna Bazaar
                            </h1>
                        </div>

                        {/* Center Section - Search (Buyer only, hidden on mobile) */}
                        {user.role === UserRole.Buyer && (
                            <div className="hidden md:flex flex-1 max-w-lg mx-8">
                                <label className="flex w-full items-center h-10 rounded-lg bg-gray-50 border border-gray-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 overflow-hidden transition-all">
                                    <div className="flex items-center justify-center pl-3 text-gray-400">
                                        <span className="material-symbols-outlined text-xl">search</span>
                                    </div>
                                    <input 
                                        className="w-full h-full bg-transparent border-none focus:ring-0 px-3 text-sm placeholder:text-gray-400 text-gray-900" 
                                        placeholder="Search products..."
                                    />
                                </label>
                            </div>
                        )}

                        {/* Right Section - User Profile + Cart */}
                        <div className="hidden md:flex items-center gap-4">
                            {/* Cart Icon (Buyer only) */}
                            {user.role === UserRole.Buyer && (
                                <button 
                                    onClick={onCartClick} 
                                    className="relative p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors" 
                                    aria-label={`View cart with ${cartItemCount} items`}
                                >
                                    <ShoppingCartIcon className="h-5 w-5"/>
                                    {cartItemCount > 0 && (
                                        <span className="cart-badge">{cartItemCount}</span>
                                    )}
                                </button>
                            )}
                            
                            {/* User info + Avatar */}
                            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                                <div className="text-right hidden lg:block">
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.role}</p>
                                </div>
                                <UserMenu user={user} onLogout={onLogout} />
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center gap-2">
                            {user.role === UserRole.Buyer && (
                                <button 
                                    onClick={onCartClick} 
                                    className="relative p-2 text-gray-600" 
                                    aria-label={`View cart with ${cartItemCount} items`}
                                >
                                    <ShoppingCartIcon className="h-5 w-5"/>
                                    {cartItemCount > 0 && (
                                        <span className="cart-badge">{cartItemCount}</span>
                                    )}
                                </button>
                            )}
                            <button onClick={() => setIsMenuOpen(true)} className="p-2" aria-label="Open menu">
                                <HamburgerMenuIcon className="h-6 w-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            {isMenuOpen && (
                <MobileMenu
                    user={user}
                    onLogout={onLogout}
                    cartItemCount={cartItemCount}
                    onCartClick={() => {
                        onCartClick();
                        setIsMenuOpen(false);
                    }}
                    onClose={() => setIsMenuOpen(false)}
                />
            )}
        </>
    );
}
