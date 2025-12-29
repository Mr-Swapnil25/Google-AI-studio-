/**
 * CartDrawer - Slide-over cart panel
 * Shows cart items, quantities, totals, and checkout button
 * 
 * Now includes real-time distance-based delivery pricing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';
import { XIcon, TrashIcon, ShoppingCartIcon } from './icons';
import { PaymentGateway } from './PaymentGateway';
import { useDeliveryPricing } from '../hooks/useDeliveryPricing';
import { firebaseService } from '../services/firebaseService';
import type { Coordinates } from '../services/distanceMatrixService';

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
  const [farmerCoords, setFarmerCoords] = useState<Coordinates | null>(null);
  const [loadingFarmerLocation, setLoadingFarmerLocation] = useState(false);

  // Get primary farmer from cart (first item's farmer for simplicity)
  const primaryFarmerId = cart.length > 0 ? cart[0].farmerId : null;

  // Load farmer location when cart changes
  useEffect(() => {
    const loadFarmerLocation = async () => {
      if (!primaryFarmerId) {
        setFarmerCoords(null);
        return;
      }

      setLoadingFarmerLocation(true);
      try {
        const location = await firebaseService.getFarmerLocation(primaryFarmerId);
        if (location?.coordinates) {
          setFarmerCoords(location.coordinates);
          console.log('[CartDrawer] Farmer location loaded:', location.coordinates);
        }
      } catch (error) {
        console.error('[CartDrawer] Failed to load farmer location:', error);
      } finally {
        setLoadingFarmerLocation(false);
      }
    };

    loadFarmerLocation();
  }, [primaryFarmerId]);

  // Use delivery pricing hook
  const {
    deliveryQuote,
    loading: deliveryLoading,
    error: deliveryError,
    buyerLocation,
    detectingLocation,
    distanceResult,
    priceLockRemainingSeconds,
  } = useDeliveryPricing({
    farmerCoords,
    autoDetectLocation: isOpen, // Only detect when drawer is open
    useCache: true,
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  
  // Use distance-based delivery fee if available, otherwise fallback
  const deliveryFee = deliveryQuote?.deliveryFee ?? (subtotal > 5000 ? 0 : 200);
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
                <span className="ml-2 text-sm font-normal text-white/90">
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
                <ShoppingCartIcon className="w-12 h-12 text-gray-500" />
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

              {/* Delivery Location Status */}
              {(detectingLocation || deliveryLoading || loadingFarmerLocation) && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 animate-spin">sync</span>
                    <span className="text-sm text-amber-700">
                      {detectingLocation ? 'Detecting your location...' : 
                       loadingFarmerLocation ? 'Loading farmer location...' :
                       'Calculating delivery distance...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Distance & Delivery Info */}
              {deliveryQuote && !deliveryLoading && distanceResult && (
                <div className="p-3 bg-green-50 rounded-2xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                      <span className="material-symbols-outlined">location_on</span>
                      <span className="text-sm font-medium">{distanceResult.distanceKm.toFixed(1)} km away</span>
                    </div>
                    <span className="text-xs text-green-600">
                      ~{distanceResult.durationInTrafficMinutes || distanceResult.durationMinutes} mins
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {deliveryQuote.tier}
                    {priceLockRemainingSeconds && priceLockRemainingSeconds > 0 && (
                      <span className="ml-2">• Price locked for {Math.floor(priceLockRemainingSeconds / 60)}m {priceLockRemainingSeconds % 60}s</span>
                    )}
                  </p>
                </div>
              )}

              {/* Delivery Error */}
              {deliveryError && (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <span className="material-symbols-outlined">error</span>
                    <span className="text-sm">{deliveryError}</span>
                  </div>
                </div>
              )}

              {/* Not Deliverable Warning */}
              {deliveryQuote && !deliveryQuote.isDeliverable && (
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700">
                    <span className="material-symbols-outlined">warning</span>
                    <span className="text-sm font-medium">Out of Delivery Zone</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    {deliveryQuote.unavailableReason || 'This location is outside our delivery range. Consider pickup.'}
                  </p>
                </div>
              )}

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
              
              {/* Distance-based delivery breakdown */}
              {deliveryQuote && distanceResult ? (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      Delivery
                      <span className="text-xs text-gray-400">({distanceResult.distanceKm.toFixed(1)} km)</span>
                    </span>
                    <span className={`font-semibold ${deliveryQuote.deliveryFee === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                      {deliveryQuote.deliveryFee === 0 ? 'FREE' : `₹${deliveryQuote.deliveryFee.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  
                  {/* Delivery breakdown details */}
                  {deliveryQuote.deliveryFee > 0 && (
                    <div className="pl-4 space-y-1 text-xs text-gray-500">
                      {deliveryQuote.breakdown.baseFee > 0 && (
                        <div className="flex justify-between">
                          <span>Base fee</span>
                          <span>₹{deliveryQuote.breakdown.baseFee}</span>
                        </div>
                      )}
                      {deliveryQuote.breakdown.distanceCharge > 0 && (
                        <div className="flex justify-between">
                          <span>Distance charge</span>
                          <span>₹{deliveryQuote.breakdown.distanceCharge}</span>
                        </div>
                      )}
                      {deliveryQuote.breakdown.trafficPremium > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Traffic premium</span>
                          <span>₹{deliveryQuote.breakdown.trafficPremium}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Free delivery hint */}
                  {deliveryQuote.deliveryFee === 0 && distanceResult.distanceKm <= 10 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">celebration</span>
                      Free delivery within 10km!
                    </p>
                  )}
                </>
              ) : (
                // Fallback static delivery display
                <>
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
                </>
              )}
              
              {/* Estimated delivery time */}
              {deliveryQuote && distanceResult && deliveryQuote.isDeliverable && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Est. delivery time</span>
                  <span className="font-medium text-gray-700">
                    ~{distanceResult.durationInTrafficMinutes || distanceResult.durationMinutes} mins
                  </span>
                </div>
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
              disabled={deliveryQuote && !deliveryQuote.isDeliverable}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform
                ${deliveryQuote && !deliveryQuote.isDeliverable 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-accent text-gray-900 hover:bg-yellow-400 hover:shadow-lg hover:scale-[1.02]'
                }`}
            >
              <span className="material-symbols-outlined">lock</span>
              {deliveryQuote && !deliveryQuote.isDeliverable ? 'Delivery Unavailable' : 'Proceed to Checkout'}
            </button>

            <p className="text-xs text-center text-gray-500">
              {distanceResult 
                ? `Distance: ${distanceResult.distanceKm.toFixed(1)}km • Secure checkout powered by Dodo Payments`
                : 'Secure checkout powered by Dodo Payments'
              }
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
        distanceKm={distanceResult?.distanceKm}
        deliveryTier={deliveryQuote?.tier}
        estimatedDeliveryMinutes={distanceResult?.durationInTrafficMinutes || distanceResult?.durationMinutes}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
};

export default CartDrawer;
