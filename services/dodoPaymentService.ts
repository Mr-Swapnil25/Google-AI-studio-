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
    BillingAddress,
} from '../types/payment';

// Dodo Payments API configuration
const DODO_API_BASE_URL = import.meta.env.VITE_DODO_API_URL || 'https://test.dodopayments.com';
const DODO_API_KEY = import.meta.env.VITE_DODO_API_KEY || '';

/**
 * Get default billing address based on user info
 * Uses sensible defaults for Indian addresses when not provided
 */
const getDefaultBillingAddress = (customerName: string, customerLocation?: string): BillingAddress => {
    return {
        street: customerLocation || 'Not specified',
        city: customerLocation || 'Not specified',
        state: 'Not specified',
        country: 'IN',
        zipcode: '000000', // Placeholder - Dodo may require valid zipcode
    };
};

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

    // Validate required fields
    if (!request.customerId || !request.customerName) {
        throw new Error('Customer ID and name are required for payment.');
    }

    if (!request.items || request.items.length === 0) {
        throw new Error('At least one item is required for payment.');
    }

    if (request.amount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
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
            billingAddress: request.billingAddress || null,
            metadata: request.metadata || {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const paymentId = paymentRef.id;

        // Use provided billing address or generate default
        const billing = request.billingAddress || getDefaultBillingAddress(
            request.customerName,
            request.metadata?.farmerId ? undefined : undefined
        );

        // Map cart items to Dodo's product_cart format
        // NOTE: For this to work, you need to create products in Dodo dashboard
        // or use their dynamic payment links feature
        const productCart = request.items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
        }));

        // Build customer email - use provided or construct a valid one
        const customerEmail = request.customerEmail ||
            (request.customerPhone ? `${request.customerPhone.replace(/\D/g, '')}@customer.annabazaar.in` :
                `${request.customerId}@customer.annabazaar.in`);

        // Make API call to Dodo
        // Using payment link mode which allows dynamic amounts
        const response = await fetch(`${DODO_API_BASE_URL}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DODO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                billing: {
                    city: billing.city,
                    country: billing.country,
                    state: billing.state,
                    street: billing.street,
                    zipcode: billing.zipcode,
                },
                customer: {
                    name: request.customerName,
                    email: customerEmail,
                    phone_number: request.customerPhone || null,
                },
                payment_link: true,
                return_url: request.returnUrl,
                metadata: {
                    payment_id: paymentId,
                    customer_id: request.customerId,
                    payment_type: request.paymentType,
                    amount_paise: String(request.amount), // Store amount for verification
                    items_count: String(request.items.length),
                    ...request.metadata,
                },
                // Send actual cart items if products exist in Dodo dashboard
                // Otherwise Dodo will use the payment link mode
                product_cart: productCart,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Dodo API error:', errorData);

            // Update payment status to failed
            await updateDoc(doc(db, 'payments', paymentId), {
                status: PaymentStatus.Failed,
                failureReason: `API Error: ${response.status} - ${errorData}`,
                updatedAt: serverTimestamp(),
            });

            throw new Error(`Payment creation failed: ${response.status}`);
        }

        const dodoResponse: DodoCheckoutResponse = await response.json();

        // Update payment record with Dodo checkout ID
        await updateDoc(doc(db, 'payments', paymentId), {
            checkoutId: dodoResponse.payment_id || dodoResponse.id,
            checkoutUrl: dodoResponse.payment_link || dodoResponse.checkout_url,
            status: PaymentStatus.Processing,
            updatedAt: serverTimestamp(),
        });

        const checkoutUrl = dodoResponse.payment_link || dodoResponse.checkout_url;

        if (!checkoutUrl) {
            throw new Error('No checkout URL received from payment gateway');
        }

        return {
            checkoutUrl,
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
    metadata?: Record<string, string>,
    billingAddress?: BillingAddress
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
        billingAddress,
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
    returnUrl: string,
    billingAddress?: BillingAddress
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
        billingAddress,
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
 * Webhook signature verification
 * 
 * IMPORTANT: This function is a placeholder for client-side documentation.
 * Actual webhook verification MUST be done server-side (Firebase Cloud Functions).
 * 
 * For production, create a Cloud Function that:
 * 1. Receives the webhook POST request from Dodo
 * 2. Extracts the signature from headers (usually 'x-dodo-signature' or similar)
 * 3. Computes HMAC-SHA256 of the raw body using your webhook secret
 * 4. Compares the computed signature with the received signature
 * 5. Only processes the webhook if signatures match
 * 
 * Example Cloud Function implementation:
 * 
 * ```typescript
 * import * as functions from 'firebase-functions';
 * import * as crypto from 'crypto';
 * 
 * export const dodoWebhook = functions.https.onRequest(async (req, res) => {
 *     const signature = req.headers['x-dodo-signature'] as string;
 *     const webhookSecret = functions.config().dodo.webhook_secret;
 *     const payload = JSON.stringify(req.body);
 *     
 *     const expectedSignature = crypto
 *         .createHmac('sha256', webhookSecret)
 *         .update(payload)
 *         .digest('hex');
 *     
 *     if (!crypto.timingSafeEqual(
 *         Buffer.from(signature),
 *         Buffer.from(expectedSignature)
 *     )) {
 *         res.status(401).send('Invalid signature');
 *         return;
 *     }
 *     
 *     // Process the verified webhook...
 *     const { payment_id, status, metadata } = req.body;
 *     await updatePaymentStatus(metadata.payment_id, status);
 *     
 *     res.status(200).send('OK');
 * });
 * ```
 * 
 * DO NOT USE THIS FUNCTION FOR ACTUAL VERIFICATION IN PRODUCTION.
 */
export const verifyWebhookSignature = (
    payload: string,
    signature: string,
    secret: string
): boolean => {
    // This is intentionally not implemented client-side for security reasons
    // Webhook verification MUST happen on the server
    console.error(
        '[SECURITY WARNING] Webhook verification must be done server-side. ' +
        'Deploy a Firebase Cloud Function to handle Dodo webhooks securely. ' +
        'See the function documentation above for implementation details.'
    );

    // Always return false to prevent client-side webhook processing
    return false;
};

/**
 * Check and update payment status by polling (fallback when webhooks aren't set up)
 * This is less reliable than webhooks but works for development
 */
export const pollPaymentStatus = async (paymentId: string): Promise<PaymentRecord | null> => {
    // For now, just return the stored status
    // In production, you might call Dodo's API to get current status
    return getPaymentStatus(paymentId);
};
