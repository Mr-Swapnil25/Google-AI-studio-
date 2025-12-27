/**
 * Dodo Payments Service
 * Handles communication with Firebase Cloud Functions for payment processing
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Cloud Functions base URL - update this after deploying
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_URL || 
  'https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net';

// =============================================================================
// TYPES
// =============================================================================

export interface CreatePaymentRequest {
  orderId: string;
  amount: number; // Amount in rupees (will be converted to paise)
  productName: string;
  buyerId: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{
    productId: string;
    farmerId: string;
    quantity: number;
    price: number; // in rupees
  }>;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  transactionId: string | null;
}

// =============================================================================
// PAYMENT SERVICE
// =============================================================================

class DodoPaymentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FUNCTIONS_BASE_URL;
  }

  /**
   * Create a new payment order and get the Dodo checkout URL
   */
  async createPaymentOrder(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // Convert rupees to paise for the API
      const amountInPaise = Math.round(request.amount * 100);
      
      // Convert item prices to paise
      const itemsInPaise = request.items?.map(item => ({
        ...item,
        price: Math.round(item.price * 100),
      }));

      // Build return URL - redirect back to our app after payment
      const returnUrl = `${window.location.origin}/?payment_status=complete&orderId=${request.orderId}`;
      
      // Webhook URL - must be the deployed Cloud Function URL
      const webhookUrl = `${this.baseUrl}/dodoWebhookHandler`;

      const response = await fetch(`${this.baseUrl}/createDodoPaymentOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          amount: amountInPaise,
          currency: 'INR',
          productName: request.productName,
          buyerId: request.buyerId,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          returnUrl,
          webhookUrl,
          items: itemsInPaise,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to create payment order:', data);
        return {
          success: false,
          error: data.error || 'Failed to create payment order',
        };
      }

      return {
        success: true,
        paymentId: data.paymentId,
        checkoutUrl: data.checkoutUrl,
      };
    } catch (error) {
      console.error('Error creating payment order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Redirect user to Dodo checkout page
   */
  redirectToCheckout(checkoutUrl: string): void {
    window.location.href = checkoutUrl;
  }

  /**
   * Check payment status by paymentId or orderId
   */
  async getPaymentStatus(params: { paymentId?: string; orderId?: string }): Promise<PaymentStatusResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params.paymentId) queryParams.set('paymentId', params.paymentId);
      if (params.orderId) queryParams.set('orderId', params.orderId);

      const response = await fetch(`${this.baseUrl}/getPaymentStatus?${queryParams.toString()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch payment status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment status:', error);
      return null;
    }
  }

  /**
   * Poll for payment completion after returning from checkout
   * Useful when webhook hasn't processed yet
   */
  async pollPaymentStatus(
    orderId: string,
    options: { maxAttempts?: number; intervalMs?: number } = {}
  ): Promise<PaymentStatusResponse | null> {
    const { maxAttempts = 10, intervalMs = 2000 } = options;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getPaymentStatus({ orderId });
      
      if (status && (status.status === 'completed' || status.status === 'failed')) {
        return status;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return null;
  }

  /**
   * Check if the current URL has payment return parameters
   */
  checkPaymentReturn(): { hasPaymentParams: boolean; orderId?: string } {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('orderId');
    
    return {
      hasPaymentParams: paymentStatus === 'complete' && !!orderId,
      orderId: orderId || undefined,
    };
  }

  /**
   * Clear payment return parameters from URL
   */
  clearPaymentParams(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_status');
    url.searchParams.delete('orderId');
    window.history.replaceState({}, '', url.toString());
  }
}

// Export singleton instance
export const dodoPaymentService = new DodoPaymentService();
