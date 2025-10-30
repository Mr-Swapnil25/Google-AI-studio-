
import React from 'react';
import { CartItem } from '../types';
import { ArrowLeftIcon, TrashIcon } from './icons';

interface CartViewProps {
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onClose: () => void;
}

export const CartView = ({ cart, cartTotal, onUpdateQuantity, onClose }: CartViewProps) => {

    if (cart.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-3xl font-bold font-heading text-text-dark mb-4">Your cart is empty</h2>
                <p className="text-text-light mb-8">Looks like you haven't added anything to your cart yet.</p>
                <button
                    onClick={onClose}
                    className="bg-primary text-white px-8 py-3 rounded-full font-semibold transition-colors hover:opacity-90 flex items-center mx-auto"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Continue Shopping
                </button>
            </div>
        );
    }
    
    const deliveryCharge = cartTotal > 500 ? 0 : 50;
    const grandTotal = cartTotal + deliveryCharge;

    return (
        <div>
            <div className="flex items-center mb-8">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200/50 mr-4">
                    <ArrowLeftIcon className="h-6 w-6 text-text-dark" />
                </button>
                <h1 className="text-4xl font-bold font-heading text-text-dark">My Cart</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Cart Items */}
                <div className="lg:col-span-2 bg-white/70 p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between border-b pb-2 mb-2 text-sm font-semibold text-text-light">
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
                                    <h3 className="font-bold font-heading text-lg text-text-dark">{item.name}</h3>
                                    <p className="text-text-light text-sm">₹{item.price.toFixed(2)} / unit</p>
                                    <button onClick={() => onUpdateQuantity(item.id, 0)} className="text-red-500 hover:text-red-700 text-xs font-semibold mt-1">
                                        Remove
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center border rounded-full">
                                    <button onClick={() => onUpdateQuantity(item.id, item.cartQuantity - 1)} className="px-3 py-1 text-lg font-bold text-gray-600 hover:bg-gray-100 rounded-l-full">-</button>
                                    <span className="px-4 py-1 font-semibold w-12 text-center">{item.cartQuantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.id, item.cartQuantity + 1)} className="px-3 py-1 text-lg font-bold text-gray-600 hover:bg-gray-100 rounded-r-full">+</button>
                                </div>
                                <p className="font-bold text-text-dark w-24 text-right">₹{(item.price * item.cartQuantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Order Summary & Checkout */}
                <div className="lg:col-span-1 space-y-6">
                     <div className="bg-white/70 p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold font-heading text-text-dark border-b pb-3 mb-4">Order Summary</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-text-light"><span>Subtotal</span><span className="font-semibold">₹{cartTotal.toFixed(2)}</span></div>
                            <div className="flex justify-between text-text-light"><span>Delivery Charge</span><span className="font-semibold">{deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : 'FREE'}</span></div>
                            {deliveryCharge > 0 && <p className="text-xs text-green-600 text-right">Add items worth ₹{(500 - cartTotal).toFixed(2)} more for FREE delivery.</p>}
                            <div className="border-t pt-3 mt-3 flex justify-between font-bold text-text-dark text-lg"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>

                    <div className="bg-white/70 p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold font-heading text-text-dark mb-4">Delivery Information</h2>
                        <form className="space-y-4">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Street Address</label>
                                <input type="text" id="address" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm" />
                            </div>
                        </form>
                    </div>

                    <div className="bg-white/70 p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold font-heading text-text-dark mb-4">Payment Method</h2>
                        <div className="space-y-3">
                            <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors cursor-pointer">
                                <input type="radio" name="payment" className="h-4 w-4 text-primary focus:ring-primary border-gray-300" defaultChecked />
                                <span className="ml-3 font-medium text-sm text-gray-700">Cash on Delivery</span>
                            </label>
                             <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors cursor-pointer">
                                <input type="radio" name="payment" className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                                <span className="ml-3 font-medium text-sm text-gray-700">UPI / Net Banking</span>
                            </label>
                        </div>
                    </div>
                    
                    <button className="w-full bg-accent text-gray-900 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 hover:shadow-lg transition-all duration-300">
                        Proceed to Payment
                    </button>
                </div>
            </div>
        </div>
    );
};
