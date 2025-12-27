/**
 * CartDrawer - Slide-over cart panel
 * Shows cart items, quantities, totals, and checkout button
 */

import React, { useState } from 'react';
import { CartItem } from '../types';
import { XIcon, TrashIcon, ShoppingCartIcon } from './icons';
import { PaymentGateway } from './PaymentGateway';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  currentUserId?: string;
  onPaymentSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  currentUserId,
  onPaymentSuccess,
}) => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const deliveryFee = subtotal > 5000 ? 0 : 200;
  const total = subtotal + deliveryFee;
  const itemCount = cart.length;

  // Generate product name summary for receipt
  const productNameSummary = cart.length === 0 
    ? 'No items'
    : cart.length === 1 
      ? cart[0].name 
      : `${cart[0].name} + ${cart.length - 1} more`;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsPaymentOpen(true);
  };

  const handlePaymentComplete = (success: boolean, transactionId?: string) => {
    if (success) {
      console.log('[CartDrawer] Payment successful:', transactionId);
      onClearCart();
      setIsPaymentOpen(false);
      onClose();
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } else {
      setIsPaymentOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary to-primary-dark">
          <div className="flex items-center gap-3">
            <ShoppingCartIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white font-heading">
              Shopping Cart
              {itemCount > 0 && (
                <span className="ml-2 text-sm font-normal text-white/80">
                  ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
            aria-label="Close cart"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingCartIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add products to start your bulk order</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* B2B Notice */}
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <span className="material-symbols-outlined text-lg">business</span>
                  B2B Bulk Orders
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Minimum 100kg per product. Prices shown are per kg.
                </p>
              </div>

              {/* Cart Items */}
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-200"
                >
                  {/* Product Image */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                  />

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-500">₹{item.price}/kg</p>
                        {item.isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Grade A
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Remove item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 bg-white rounded-full border border-gray-200 p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, Math.max(100, item.cartQuantity - 100))}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold transition-colors"
                          disabled={item.cartQuantity <= 100}
                        >
                          −
                        </button>
                        <span className="w-20 text-center font-semibold text-gray-800">
                          {item.cartQuantity}kg
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.cartQuantity + 100)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-primary text-lg">
                        ₹{(item.price * item.cartQuantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart */}
              <button
                onClick={onClearCart}
                className="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer with Totals & Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery</span>
                <span className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-xs text-green-600">
                  Add ₹{(5000 - subtotal).toLocaleString('en-IN')} more for free delivery!
                </p>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-primary font-heading">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-accent text-gray-900 rounded-2xl font-bold text-lg hover:bg-yellow-400 hover:shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">lock</span>
              Proceed to Checkout
            </button>

            <p className="text-xs text-center text-gray-500">
              Secure checkout powered by Dodo Payments
            </p>
          </div>
        )}
      </div>

      {/* Payment Gateway Modal */}
      <PaymentGateway
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={total}
        productName={productNameSummary}
        deliveryFee={deliveryFee}
        buyerId={currentUserId}
        cartItems={cart}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
};

export default CartDrawer;
