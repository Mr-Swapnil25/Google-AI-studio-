
import React, { useState } from 'react';
import { CartItem } from '../types';
import { ArrowLeftIcon, TrashIcon } from './icons';
import { PaymentGateway } from './PaymentGateway';

interface CartViewProps {
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onClose: () => void;
  currentUserId?: string;
  onPaymentSuccess?: () => void;
}

export const CartView = ({ cart, cartTotal, onUpdateQuantity, onClose, currentUserId, onPaymentSuccess }: CartViewProps) => {
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    if (cart.length === 0) {
        return (
            <div className="text-center py-20 animate-fade-in">
                <h2 className="text-3xl font-bold font-heading text-stone-800 mb-4">Your cart is empty</h2>
                <p className="text-stone-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
                <button
                    onClick={onClose}
                    className="bg-primary text-white px-8 py-3 rounded-full font-semibold transition-colors hover:bg-primary-dark flex items-center mx-auto"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Continue Shopping
                </button>
            </div>
        );
    }
    
    const deliveryCharge = cartTotal > 500 ? 0 : 50;
    const grandTotal = cartTotal + deliveryCharge;

    const handleProceedToPayment = () => {
        setIsPaymentOpen(true);
    };

    const handlePaymentComplete = (success: boolean, transactionId?: string) => {
        if (success) {
            // Clear cart and show success
            console.log('Payment successful:', transactionId);
            if (onPaymentSuccess) {
                onPaymentSuccess();
            }
        }
    };

    const handlePaymentClose = () => {
        setIsPaymentOpen(false);
    };

    // Generate product name summary for receipt
    const productNameSummary = cart.length === 1 
        ? cart[0].name 
        : `${cart[0].name} + ${cart.length - 1} more items`;

    return (
        <>
            <div className="animate-fade-in">
                <div className="flex items-center mb-8">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-200/50 mr-4">
                        <ArrowLeftIcon className="h-6 w-6 text-stone-700" />
                    </button>
                    <h1 className="text-4xl font-bold font-heading text-stone-800">My Cart</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 bg-background-alt/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-stone-200/80 space-y-4">
                        <div className="flex justify-between border-b pb-2 mb-2 text-sm font-semibold text-stone-500">
                            <span>Product</span>
                            <div className="flex space-x-20">
                                <span>Quantity</span>
                                <span>Total</span>
                            </div>
                        </div>
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <img src={item.imageUrl} alt={item.name} className="w-24 h-24 rounded-lg object-cover" />
                                    <div>
                                        <h3 className="font-bold font-heading text-lg text-stone-800">{item.name}</h3>
                                        <p className="text-stone-500 text-sm">₹{item.price.toFixed(2)} / unit</p>
                                        <button onClick={() => onUpdateQuantity(item.id, 0)} className="text-red-500 hover:text-red-700 text-xs font-semibold mt-1">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center border rounded-full">
                                        <button onClick={() => onUpdateQuantity(item.id, item.cartQuantity - 1)} className="px-3 py-1 text-lg font-bold text-stone-600 hover:bg-stone-100 rounded-l-full">-</button>
                                        <span className="px-4 py-1 font-semibold w-12 text-center">{item.cartQuantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.id, item.cartQuantity + 1)} className="px-3 py-1 text-lg font-bold text-stone-600 hover:bg-stone-100 rounded-r-full">+</button>
                                    </div>
                                    <p className="font-bold text-stone-800 w-24 text-right">₹{(item.price * item.cartQuantity).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary & Checkout */}
                    <div className="lg:col-span-1 space-y-6">
                         <div className="bg-background-alt/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-stone-200/80">
                            <h2 className="text-xl font-bold font-heading text-stone-800 border-b pb-3 mb-4">Order Summary</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-stone-500"><span>Subtotal</span><span className="font-semibold text-stone-800">₹{cartTotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-stone-500"><span>Delivery Charge</span><span className="font-semibold text-stone-800">{deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : 'FREE'}</span></div>
                                {deliveryCharge > 0 && <p className="text-xs text-green-600 text-right">Add items worth ₹{(500 - cartTotal).toFixed(2)} more for FREE delivery.</p>}
                                <div className="border-t pt-3 mt-3 flex justify-between font-bold text-stone-800 text-lg"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div className="bg-background-alt/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-stone-200/80">
                            <h2 className="text-xl font-bold font-heading text-stone-800 mb-4">Delivery Information</h2>
                            <form className="space-y-4">
                                <div>
                                    <label htmlFor="address" className="block text-sm font-medium text-stone-700">Street Address</label>
                                    <input type="text" id="address" className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm" />
                                </div>
                            </form>
                        </div>
                        
                        <button 
                            onClick={handleProceedToPayment}
                            className="w-full bg-accent text-stone-900 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                        >
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Gateway Modal */}
            <PaymentGateway
                isOpen={isPaymentOpen}
                onClose={handlePaymentClose}
                totalAmount={grandTotal}
                productName={productNameSummary}
                deliveryFee={deliveryCharge}
                buyerId={currentUserId}
                cartItems={cart}
                onPaymentComplete={handlePaymentComplete}
            />
        </>
    );
};