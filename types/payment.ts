// Payment-related types for Dodo Payments integration

export enum PaymentStatus {
    Pending = 'pending',
    Processing = 'processing',
    Succeeded = 'succeeded',
    Failed = 'failed',
    Cancelled = 'cancelled',
    Refunded = 'refunded',
}

export enum PaymentType {
    CartCheckout = 'cart_checkout',
    NegotiationPayment = 'negotiation_payment',
    Subscription = 'subscription',
}

export interface PaymentCustomer {
    name: string;
    email?: string;
    phone?: string;
}

export interface PaymentItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number; // in smallest currency unit (paise for INR)
}

export interface CreatePaymentRequest {
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    amount: number; // in smallest currency unit (paise for INR)
    currency: string;
    paymentType: PaymentType;
    items: PaymentItem[];
    metadata?: {
        negotiationId?: string;
        farmerId?: string;
        orderId?: string;
        [key: string]: string | undefined;
    };
    returnUrl: string;
}

export interface DodoCheckoutResponse {
    checkout_id: string;
    checkout_url: string;
    expires_at: string;
    status: string;
}

export interface PaymentRecord {
    id: string;
    checkoutId: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paymentType: PaymentType;
    items: PaymentItem[];
    metadata?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    dodoPaymentId?: string;
    failureReason?: string;
}

export interface PaymentWebhookEvent {
    event_type: string;
    payment_id: string;
    checkout_id: string;
    status: string;
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
    timestamp: string;
}
