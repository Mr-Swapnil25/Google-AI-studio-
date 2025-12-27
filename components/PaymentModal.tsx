import React, { useState, useEffect, useCallback } from 'react';
import { XIcon, LoaderIcon } from './icons';
import { useToast } from '../context/ToastContext';
import { PaymentItem, PaymentType, PaymentStatus } from '../types/payment';
import { createCartPayment, getPaymentStatus } from '../services/dodoPaymentService';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Customer details */
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    /** Payment details */
    items: PaymentItem[];
    totalAmount: number;
    /** Callbacks */
    onPaymentSuccess?: (paymentId: string) => void;
    onPaymentFailure?: (error: Error) => void;
}

type PaymentStep = 'review' | 'processing' | 'success' | 'failure';

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    items,
    totalAmount,
    onPaymentSuccess,
    onPaymentFailure,
}) => {
    const [step, setStep] = useState<PaymentStep>('review');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('review');
            setIsProcessing(false);
            setPaymentId(null);
            setError(null);
        }
    }, [isOpen]);

    // Check for payment return
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment_status');
        const storedPaymentId = sessionStorage.getItem('pending_payment_id');

        if (paymentStatus === 'complete' && storedPaymentId) {
            // Clear session storage
            sessionStorage.removeItem('pending_payment_id');

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Check payment status
            checkPaymentStatus(storedPaymentId);
        }
    }, []);

    const checkPaymentStatus = async (id: string) => {
        try {
            const payment = await getPaymentStatus(id);
            if (payment) {
                if (payment.status === PaymentStatus.Succeeded) {
                    setStep('success');
                    setPaymentId(id);
                    onPaymentSuccess?.(id);
                    showToast('Payment successful!', 'success');
                } else if (payment.status === PaymentStatus.Failed) {
                    setStep('failure');
                    setError(payment.failureReason || 'Payment failed');
                    onPaymentFailure?.(new Error(payment.failureReason || 'Payment failed'));
                }
            }
        } catch (err) {
            console.error('Error checking payment status:', err);
        }
    };

    const getReturnUrl = useCallback(() => {
        return `${window.location.origin}?payment_status=complete`;
    }, []);

    const handleProceedToPayment = async () => {
        setIsProcessing(true);
        setStep('processing');

        try {
            const result = await createCartPayment(
                customerId,
                customerName,
                customerEmail,
                customerPhone,
                items,
                totalAmount * 100, // Convert to paise
                getReturnUrl()
            );

            // Store payment ID
            sessionStorage.setItem('pending_payment_id', result.paymentId);
            setPaymentId(result.paymentId);

            // Redirect to Dodo checkout
            window.location.href = result.checkoutUrl;
        } catch (err) {
            console.error('Payment creation failed:', err);
            setStep('failure');
            setError(err instanceof Error ? err.message : 'Failed to create payment');
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        if (!isProcessing) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-primary to-primary-light p-6 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent)]" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl">shopping_cart_checkout</span>
                            <h2 className="text-2xl font-bold">Checkout</h2>
                        </div>
                        {!isProcessing && (
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <XIcon className="h-6 w-6" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'review' && (
                        <>
                            {/* Order Summary */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                                    Order Summary
                                </h3>
                                <div className="bg-stone-50 rounded-2xl p-4 space-y-3">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-stone-800">{item.productName}</p>
                                                <p className="text-sm text-stone-500">Qty: {item.quantity}</p>
                                            </div>
                                            <p className="font-bold text-stone-800">
                                                ₹{((item.unitPrice * item.quantity) / 100).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    ))}
                                    <div className="border-t border-stone-200 pt-3 flex justify-between items-center">
                                        <span className="text-lg font-bold text-stone-800">Total</span>
                                        <span className="text-2xl font-bold text-primary">
                                            ₹{totalAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-stone-800 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    Paying as
                                </h3>
                                <div className="bg-stone-50 rounded-2xl p-4">
                                    <p className="font-medium text-stone-800">{customerName}</p>
                                    {customerEmail && <p className="text-sm text-stone-500">{customerEmail}</p>}
                                    {customerPhone && <p className="text-sm text-stone-500">{customerPhone}</p>}
                                </div>
                            </div>

                            {/* Payment Method Info */}
                            <div className="mb-6">
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <span className="material-symbols-outlined text-blue-600 text-2xl">info</span>
                                    <p className="text-sm text-blue-800">
                                        You will be redirected to our secure payment partner <strong>Dodo Payments</strong> to complete this transaction.
                                    </p>
                                </div>
                            </div>

                            {/* Security Badges */}
                            <div className="flex items-center justify-center gap-6 mb-6 text-stone-400">
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="material-symbols-outlined text-green-600">lock</span>
                                    <span>SSL Secure</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="material-symbols-outlined text-green-600">verified_user</span>
                                    <span>PCI Compliant</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-4 rounded-full border-2 border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProceedToPayment}
                                    className="flex-1 py-4 rounded-full bg-gradient-to-r from-primary to-primary-light text-white font-bold shadow-card hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">payments</span>
                                    Pay ₹{totalAmount.toLocaleString('en-IN')}
                                </button>
                            </div>
                        </>
                    )}

                    {step === 'processing' && (
                        <div className="py-12 text-center">
                            <div className="relative mx-auto w-20 h-20 mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-3xl">payments</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 mb-2">Processing Payment</h3>
                            <p className="text-stone-500">Redirecting to secure payment page...</p>
                            <p className="text-sm text-stone-400 mt-4">Please do not close this window</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-12 text-center">
                            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 mb-2">Payment Successful!</h3>
                            <p className="text-stone-500 mb-6">Your order has been placed successfully.</p>
                            {paymentId && (
                                <p className="text-sm text-stone-400 mb-6">
                                    Payment ID: <span className="font-mono">{paymentId}</span>
                                </p>
                            )}
                            <button
                                onClick={handleClose}
                                className="px-8 py-3 rounded-full bg-primary text-white font-bold shadow-card hover:shadow-xl transition-all"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    )}

                    {step === 'failure' && (
                        <div className="py-12 text-center">
                            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 mb-2">Payment Failed</h3>
                            <p className="text-stone-500 mb-2">We couldn't process your payment.</p>
                            {error && <p className="text-sm text-red-500 mb-6">{error}</p>}
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-3 rounded-full border-2 border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setStep('review')}
                                    className="px-6 py-3 rounded-full bg-primary text-white font-bold shadow-card hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">refresh</span>
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
