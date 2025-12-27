/**
 * Cart Service - LocalStorage-based cart persistence
 * Handles add, remove, update, clear operations for the shopping cart
 */

import { CartItem, Product } from '../types';

const CART_STORAGE_KEY = 'annabazaar_cart';

// =============================================================================
// TYPES
// =============================================================================

export interface CartItemData {
  id: string;
  farmerId: string;
  farmerName?: string;
  name: string;
  category: string;
  imageUrl: string;
  price: number;           // Price per kg (from Price Engine)
  quantity: number;        // Available stock
  cartQuantity: number;    // Quantity in cart (in kg)
  addedAt: number;         // Timestamp
  isVerified?: boolean;
}

export interface CartState {
  items: CartItem[];
  count: number;
  subtotal: number;
  total: number;
}

// =============================================================================
// CART SERVICE
// =============================================================================

class CartService {
  /**
   * Get cart from localStorage
   */
  getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];
      
      const items = JSON.parse(stored) as CartItem[];
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('[CartService] Error reading cart from localStorage:', error);
      return [];
    }
  }

  /**
   * Save cart to localStorage
   */
  private saveCart(items: CartItem[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('[CartService] Error saving cart to localStorage:', error);
    }
  }

  /**
   * Add product to cart or update quantity if already exists
   */
  addToCart(product: Product, quantity: number = 100): { success: boolean; cart: CartItem[]; message: string } {
    const cart = this.getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex !== -1) {
      // Update existing item quantity
      cart[existingIndex].cartQuantity += quantity;
      this.saveCart(cart);
      return { 
        success: true, 
        cart, 
        message: `Updated ${product.name} quantity to ${cart[existingIndex].cartQuantity}kg` 
      };
    }
    
    // Add new item
    const newItem: CartItem = {
      ...product,
      cartQuantity: quantity,
    };
    
    cart.push(newItem);
    this.saveCart(cart);
    
    return { 
      success: true, 
      cart, 
      message: `Added ${quantity}kg of ${product.name} to cart` 
    };
  }

  /**
   * Remove item from cart
   */
  removeFromCart(productId: string): { success: boolean; cart: CartItem[] } {
    let cart = this.getCart();
    cart = cart.filter(item => item.id !== productId);
    this.saveCart(cart);
    return { success: true, cart };
  }

  /**
   * Update item quantity in cart
   */
  updateQuantity(productId: string, newQuantity: number): { success: boolean; cart: CartItem[] } {
    let cart = this.getCart();
    
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      return this.removeFromCart(productId);
    }
    
    cart = cart.map(item => 
      item.id === productId ? { ...item, cartQuantity: newQuantity } : item
    );
    
    this.saveCart(cart);
    return { success: true, cart };
  }

  /**
   * Clear the entire cart
   */
  clearCart(): { success: boolean } {
    this.saveCart([]);
    return { success: true };
  }

  /**
   * Get cart statistics
   */
  getCartState(): CartState {
    const items = this.getCart();
    const count = items.length;
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
    
    return {
      items,
      count,
      subtotal,
      total: subtotal, // Can add taxes/fees here later
    };
  }

  /**
   * Check if a product is in the cart
   */
  isInCart(productId: string): boolean {
    const cart = this.getCart();
    return cart.some(item => item.id === productId);
  }

  /**
   * Get quantity of a specific product in cart
   */
  getItemQuantity(productId: string): number {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId);
    return item?.cartQuantity || 0;
  }
}

// Export singleton instance
export const cartService = new CartService();
