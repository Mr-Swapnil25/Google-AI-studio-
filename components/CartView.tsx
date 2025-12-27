
import React, { useState } from 'react';
import { CartItem, User } from '../types';
import { ArrowLeftIcon, TrashIcon } from './icons';
import { PaymentModal } from './PaymentModal';
import { PaymentItem, PaymentType } from '../types/payment';

interface CartViewProps {
    cart: CartItem[];
    cartTotal: number;
    onUpdateQuantity: (productId: string, newQuantity: number) => void;
    onClose: () => void;
    currentUser?: User | null;
}

export const CartView = ({ cart, cartTotal, onUpdateQuantity, onClose, currentUser }: CartViewProps) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');

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

    // Convert cart items to payment items format
    const paymentItems: PaymentItem[] = cart.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.cartQuantity,
        unitPrice: item.price * 100, // Convert to paise
    }));

    const handleProceedToPayment = () => {
        if (paymentMethod === 'online') {
            setIsPaymentModalOpen(true);
        } else {
            // Handle COD - show confirmation or proceed with order
            alert('Cash on Delivery order placed! Coming soon.');
        }
    };

    const handlePaymentSuccess = (paymentId: string) => {
        console.log('Payment successful:', paymentId);
        setIsPaymentModalOpen(false);
        // Optionally clear cart and show success message
    };

    const handlePaymentFailure = (error: Error) => {
        console.error('Payment failed:', error);
        // Error is already handled by the modal
    };

    return (
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

                    <div className="bg-background-alt/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-stone-200/80">
                        <h2 className="text-xl font-bold font-heading text-stone-800 mb-4">Payment Method</h2>
                        <div className="space-y-3">
                            <label className={`flex items-center p-3 border rounded-lg hover:bg-stone-50 transition-colors cursor-pointer ${paymentMethod === 'online' ? 'bg-primary/10 border-primary' : ''}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    className="h-4 w-4 text-primary focus:ring-primary border-stone-300"
                                    checked={paymentMethod === 'online'}
                                    onChange={() => setPaymentMethod('online')}
                                />
                                <div className="ml-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">payments</span>
                                    <span className="font-medium text-sm text-stone-700">Pay Online (UPI / Cards / Net Banking)</span>
                                </div>
                                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Recommended</span>
                            </label>
                            <label className={`flex items-center p-3 border rounded-lg hover:bg-stone-50 transition-colors cursor-pointer ${paymentMethod === 'cod' ? 'bg-primary/10 border-primary' : ''}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    className="h-4 w-4 text-primary focus:ring-primary border-stone-300"
                                    checked={paymentMethod === 'cod'}
                                    onChange={() => setPaymentMethod('cod')}
                                />
                                <div className="ml-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-stone-600">local_shipping</span>
                                    <span className="font-medium text-sm text-stone-700">Cash on Delivery</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToPayment}
                        className="w-full bg-gradient-to-r from-accent to-yellow-400 text-stone-900 py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">shopping_cart_checkout</span>
                        {paymentMethod === 'online' ? `Pay ₹${grandTotal.toFixed(2)}` : 'Place Order (COD)'}
                    </button>

                    {/* Secure payment badge */}
                    <div className="flex items-center justify-center gap-4 text-xs text-stone-400">
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-green-600 text-base">lock</span>
                            <span>SSL Secure</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-green-600 text-base">verified_user</span>
                            <span>100% Safe</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                customerId={currentUser?.uid || 'guest'}
                customerName={currentUser?.name || 'Guest User'}
                customerEmail={currentUser?.email}
                customerPhone={currentUser?.phone}
                items={paymentItems}
                totalAmount={grandTotal}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailure={handlePaymentFailure}
            />
        </div>
    );
};