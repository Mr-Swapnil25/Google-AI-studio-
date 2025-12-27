/**
 * Dodo Payments Service
 * 
 * This service handles all Dodo Payments API interactions.
 * 
 * SECURITY NOTE: For production, the API key should NEVER be exposed in frontend code.
 * This implementation is designed to work with Firebase Cloud Functions in production.
 * 
 * Current setup:
 * - Development: Direct API calls (for testing only)
 * - Production: Should use Firebase Cloud Functions
 */

import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    PaymentStatus,
    PaymentType,
    PaymentItem,
    CreatePaymentRequest,
    DodoCheckoutResponse,
    PaymentRecord,
} from '../types/payment';

// Dodo Payments API configuration
const DODO_API_BASE_URL = import.meta.env.VITE_DODO_API_URL || 'https://test.dodopayments.com';
const DODO_API_KEY = import.meta.env.VITE_DODO_API_KEY || '';

/**
 * Create a Dodo checkout session
 * 
 * In production, this should call a Firebase Cloud Function instead of direct API call
 */
export const createCheckoutSession = async (
    request: CreatePaymentRequest
): Promise<{ checkoutUrl: string; paymentId: string }> => {
    // Validate API key
    if (!DODO_API_KEY) {
        throw new Error('Dodo Payments API key not configured. Please add VITE_DODO_API_KEY to your .env.local file.');
    }

    try {
        // Create payment record in Firestore first
        const paymentRef = await addDoc(collection(db, 'payments'), {
            customerId: request.customerId,
            customerName: request.customerName,
            customerEmail: request.customerEmail || null,
            customerPhone: request.customerPhone || null,
            amount: request.amount,
            currency: request.currency,
            status: PaymentStatus.Pending,
            paymentType: request.paymentType,
            items: request.items,
            metadata: request.metadata || {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const paymentId = paymentRef.id;

        // Prepare Dodo API request
        // Using the product_cart format as per Dodo API docs
        const productCart = request.items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
        }));

        // For dynamic pricing, we'll use the total amount
        const dodoRequest = {
            billing: {
                city: 'India',
                country: 'IN',
                state: 'Unknown',
                street: 'Not provided',
                zipcode: '000000',
            },
            customer: {
                name: request.customerName,
                email: request.customerEmail || `${request.customerId}@annabazaar.app`,
                phone_number: request.customerPhone || null,
            },
            payment_link: true, // Use payment link mode for flexibility
            return_url: request.returnUrl,
            // Include metadata for tracking
            metadata: {
                payment_id: paymentId,
                customer_id: request.customerId,
                payment_type: request.paymentType,
                ...request.metadata,
            },
            // For custom amounts, we'll create a dynamic product
            product_cart: [
                {
                    product_id: 'dynamic_payment', // Placeholder - in production, create products in Dodo dashboard
                    quantity: 1,
                }
            ],
        };

        // Make API call to Dodo
        const response = await fetch(`${DODO_API_BASE_URL}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DODO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                billing: dodoRequest.billing,
                customer: dodoRequest.customer,
                payment_link: true,
                return_url: request.returnUrl,
                metadata: dodoRequest.metadata,
                // For one-time payments with custom amount
                product_cart: [{
                    product_id: 'prod_dynamic', // You'll need to create this in Dodo dashboard
                    quantity: 1,
                }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Dodo API error:', errorData);

            // Update payment status to failed
            await updateDoc(doc(db, 'payments', paymentId), {
                status: PaymentStatus.Failed,
                failureReason: `API Error: ${response.status}`,
                updatedAt: serverTimestamp(),
            });

            throw new Error(`Payment creation failed: ${response.status}`);
        }

        const dodoResponse = await response.json();

        // Update payment record with Dodo checkout ID
        await updateDoc(doc(db, 'payments', paymentId), {
            checkoutId: dodoResponse.payment_id || dodoResponse.id,
            checkoutUrl: dodoResponse.payment_link || dodoResponse.checkout_url,
            status: PaymentStatus.Processing,
            updatedAt: serverTimestamp(),
        });

        return {
            checkoutUrl: dodoResponse.payment_link || dodoResponse.checkout_url,
            paymentId,
        };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

/**
 * Create a simplified payment link for cart checkout
 * This uses the Dodo payment link approach
 */
export const createCartPayment = async (
    customerId: string,
    customerName: string,
    customerEmail: string | undefined,
    customerPhone: string | undefined,
    items: PaymentItem[],
    totalAmount: number,
    returnUrl: string,
    metadata?: Record<string, string>
): Promise<{ checkoutUrl: string; paymentId: string }> => {
    return createCheckoutSession({
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        amount: totalAmount,
        currency: 'INR',
        paymentType: PaymentType.CartCheckout,
        items,
        metadata,
        returnUrl,
    });
};

/**
 * Create payment for accepted negotiation
 */
export const createNegotiationPayment = async (
    customerId: string,
    customerName: string,
    customerEmail: string | undefined,
    customerPhone: string | undefined,
    negotiationId: string,
    farmerId: string,
    productName: string,
    quantity: number,
    agreedPrice: number,
    returnUrl: string
): Promise<{ checkoutUrl: string; paymentId: string }> => {
    const items: PaymentItem[] = [{
        productId: negotiationId,
        productName,
        quantity,
        unitPrice: agreedPrice * 100, // Convert to paise
    }];

    return createCheckoutSession({
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        amount: agreedPrice * quantity * 100, // Total in paise
        currency: 'INR',
        paymentType: PaymentType.NegotiationPayment,
        items,
        metadata: {
            negotiationId,
            farmerId,
        },
        returnUrl,
    });
};

/**
 * Get payment status from Firestore
 */
export const getPaymentStatus = async (paymentId: string): Promise<PaymentRecord | null> => {
    try {
        const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
        if (!paymentDoc.exists()) return null;

        const data = paymentDoc.data();
        return {
            id: paymentDoc.id,
            checkoutId: data.checkoutId || '',
            customerId: data.customerId,
            customerName: data.customerName,
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            paymentType: data.paymentType,
            items: data.items || [],
            metadata: data.metadata,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            completedAt: data.completedAt?.toDate?.(),
            dodoPaymentId: data.dodoPaymentId,
            failureReason: data.failureReason,
        };
    } catch (error) {
        console.error('Error fetching payment status:', error);
        return null;
    }
};

/**
 * Update payment status (called by webhook handler)
 */
export const updatePaymentStatus = async (
    paymentId: string,
    status: PaymentStatus,
    dodoPaymentId?: string,
    failureReason?: string
): Promise<void> => {
    const updates: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
    };

    if (dodoPaymentId) {
        updates.dodoPaymentId = dodoPaymentId;
    }

    if (status === PaymentStatus.Succeeded) {
        updates.completedAt = serverTimestamp();
    }

    if (failureReason) {
        updates.failureReason = failureReason;
    }

    await updateDoc(doc(db, 'payments', paymentId), updates);
};

/**
 * Verify webhook signature (for Cloud Function use)
 * This should be implemented in the Cloud Function
 */
export const verifyWebhookSignature = (
    payload: string,
    signature: string,
    secret: string
): boolean => {
    // Implementation for webhook signature verification
    // This uses HMAC-SHA256 typically
    // Should be done server-side in Cloud Function
    console.warn('Webhook verification should be done server-side');
    return false;
};
