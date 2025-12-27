import React, { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { PaymentItem, PaymentType } from '../types/payment';
import { createCartPayment, createNegotiationPayment } from '../services/dodoPaymentService';
import { LoaderIcon } from './icons';

interface PaymentButtonProps {
    /** The user ID making the payment */
    customerId: string;
    /** Customer display name */
    customerName: string;
    /** Customer email (optional) */
    customerEmail?: string;
    /** Customer phone (optional) */
    customerPhone?: string;
    /** Total amount in INR (not paise) */
    amount: number;
    /** Items being purchased */
    items: PaymentItem[];
    /** Type of payment */
    paymentType: PaymentType;
    /** For negotiation payments */
    negotiationId?: string;
    farmerId?: string;
    productName?: string;
    quantity?: number;
    /** Button label */
    label?: string;
    /** Button variant */
    variant?: 'primary' | 'secondary' | 'accent';
    /** Full width button */
    fullWidth?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Callback after payment initiated */
    onPaymentInitiated?: (paymentId: string) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    /** Custom class names */
    className?: string;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    amount,
    items,
    paymentType,
    negotiationId,
    farmerId,
    productName,
    quantity = 1,
    label = 'Pay Now',
    variant = 'primary',
    fullWidth = false,
    disabled = false,
    onPaymentInitiated,
    onError,
    className = '',
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    // Get return URL for after payment
    const getReturnUrl = useCallback(() => {
        const baseUrl = window.location.origin;
        return `${baseUrl}?payment_status=complete`;
    }, []);

    const handlePayment = useCallback(async () => {
        if (isLoading || disabled) return;

        setIsLoading(true);

        try {
            let result: { checkoutUrl: string; paymentId: string };

            if (paymentType === PaymentType.NegotiationPayment && negotiationId && farmerId && productName) {
                // Negotiation payment
                result = await createNegotiationPayment(
                    customerId,
                    customerName,
                    customerEmail,
                    customerPhone,
                    negotiationId,
                    farmerId,
                    productName,
                    quantity,
                    amount,
                    getReturnUrl()
                );
            } else {
                // Cart or general payment
                result = await createCartPayment(
                    customerId,
                    customerName,
                    customerEmail,
                    customerPhone,
                    items,
                    amount * 100, // Convert to paise
                    getReturnUrl(),
                    negotiationId ? { negotiationId } : undefined
                );
            }

            showToast('Redirecting to payment...', 'info');
            onPaymentInitiated?.(result.paymentId);

            // Store payment ID in session for return handling
            sessionStorage.setItem('pending_payment_id', result.paymentId);

            // Redirect to Dodo checkout
            window.location.href = result.checkoutUrl;
        } catch (error) {
            console.error('Payment error:', error);
            const err = error instanceof Error ? error : new Error('Payment failed');
            showToast(err.message || 'Payment failed. Please try again.', 'error');
            onError?.(err);
        } finally {
            setIsLoading(false);
        }
    }, [
        isLoading,
        disabled,
        paymentType,
        negotiationId,
        farmerId,
        productName,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        amount,
        quantity,
        items,
        getReturnUrl,
        showToast,
        onPaymentInitiated,
        onError,
    ]);

    // Variant styles
    const variantStyles = {
        primary: 'bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-white',
        secondary: 'bg-gradient-to-r from-secondary to-secondary-light hover:from-secondary-dark hover:to-secondary text-white',
        accent: 'bg-gradient-to-r from-accent to-accent-light hover:from-accent-dark hover:to-accent text-stone-900',
    };

    return (
        <button
            onClick={handlePayment}
            disabled={disabled || isLoading}
            className={`
        relative overflow-hidden
        ${fullWidth ? 'w-full' : ''}
        px-8 py-4 rounded-full
        font-bold text-lg
        shadow-card hover:shadow-xl
        transition-all duration-300
        transform hover:-translate-y-0.5 active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        flex items-center justify-center gap-3
        ${variantStyles[variant]}
        ${className}
      `}
        >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out" />

            {isLoading ? (
                <>
                    <LoaderIcon className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    <span className="material-symbols-outlined text-2xl">payments</span>
                    <span>{label}</span>
                    <span className="font-bold">₹{amount.toLocaleString('en-IN')}</span>
                </>
            )}
        </button>
    );
};

export default PaymentButton;
