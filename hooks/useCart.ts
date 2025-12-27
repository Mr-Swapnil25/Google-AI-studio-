/**
 * useCart Hook - React hook for cart state management
 * Provides cart state and actions with localStorage persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, Product } from '../types';
import { cartService, CartState } from '../services/cartService';

export interface UseCartReturn {
  // State
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartTotal: number;
  isCartOpen: boolean;
  
  // Actions
  addToCart: (product: Product, quantity?: number) => string;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  
  // Helpers
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadedCart = cartService.getCart();
    setCart(loadedCart);
  }, []);

  // Sync cart state with localStorage changes (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'annabazaar_cart') {
        const newCart = cartService.getCart();
        setCart(newCart);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Computed values
  const cartCount = useMemo(() => cart.length, [cart]);
  
  const cartSubtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), 
    [cart]
  );
  
  const cartTotal = useMemo(() => {
    // Add delivery fee logic here if needed
    const deliveryFee = cartSubtotal > 5000 ? 0 : 200;
    return cartSubtotal + deliveryFee;
  }, [cartSubtotal]);

  // Actions
  const addToCart = useCallback((product: Product, quantity: number = 100): string => {
    const result = cartService.addToCart(product, quantity);
    setCart(result.cart);
    return result.message;
  }, []);

  const removeFromCart = useCallback((productId: string): void => {
    const result = cartService.removeFromCart(productId);
    setCart(result.cart);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number): void => {
    const result = cartService.updateQuantity(productId, quantity);
    setCart(result.cart);
  }, []);

  const clearCart = useCallback((): void => {
    cartService.clearCart();
    setCart([]);
  }, []);

  // Helpers
  const isInCart = useCallback((productId: string): boolean => {
    return cart.some(item => item.id === productId);
  }, [cart]);

  const getItemQuantity = useCallback((productId: string): number => {
    const item = cart.find(item => item.id === productId);
    return item?.cartQuantity || 0;
  }, [cart]);

  return {
    cart,
    cartCount,
    cartSubtotal,
    cartTotal,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setIsCartOpen,
    isInCart,
    getItemQuantity,
  };
}
