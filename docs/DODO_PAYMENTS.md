# Dodo Payments Integration

This document explains the Dodo Payments integration for Anna Bazaar.

## Overview

Dodo Payments is integrated to handle online payments for:
- Cart checkout (buyers purchasing products)
- Negotiation payments (buyers paying agreed negotiated amounts)
- Future subscription features

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PAYMENT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │  PaymentButton   │    │  PaymentModal    │                      │
│   │  (Quick Pay)     │    │  (Full Checkout) │                      │
│   └────────┬─────────┘    └────────┬─────────┘                      │
│            │                       │                                 │
│            └───────────┬───────────┘                                │
│                        ▼                                             │
│            ┌──────────────────────┐                                 │
│            │ dodoPaymentService   │                                 │
│            │ - createCheckoutSession                                │
│            │ - createCartPayment                                    │
│            │ - getPaymentStatus                                     │
│            └───────────┬──────────┘                                 │
│                        │                                             │
│         ┌──────────────┼──────────────┐                             │
│         ▼              ▼              ▼                             │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                       │
│   │ Firestore│   │ Dodo API │   │ Redirect │                       │
│   │ payments │   │ checkout │   │ to Dodo  │                       │
│   └──────────┘   └──────────┘   └──────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Files Structure

```
├── types/
│   └── payment.ts              # Payment types & interfaces
├── services/
│   └── dodoPaymentService.ts   # Dodo API wrapper & Firestore ops
├── components/
│   ├── PaymentButton.tsx       # Quick payment button component
│   └── PaymentModal.tsx        # Full checkout modal with flow
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env.local`:

```env
# Dodo Payments Configuration
VITE_DODO_API_KEY="hLasVMqHo0e3Qi6U.1-ZDhy0n8yzNvoQlkPGFcc8tmv9qKBAyK4kevsf3wUcAMVP1"
VITE_DODO_API_URL="https://test.dodopayments.com"
```

For production, change to:
```env
VITE_DODO_API_URL="https://live.dodopayments.com"
```

### 2. Dodo Dashboard Setup

1. Log in to [Dodo Payments Dashboard](https://dashboard.dodopayments.com)
2. Create a product called "Dynamic Payment" with ID `prod_dynamic`
3. Configure webhooks under Developer > Webhooks
4. Add your webhook URL: `https://your-domain.com/api/payments/webhook`

### 3. Firebase Setup

The integration uses Firestore to store payment records. The schema:

```typescript
// Collection: payments
{
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;          // in paise
  currency: string;        // "INR"
  status: PaymentStatus;   // pending, processing, succeeded, failed
  paymentType: PaymentType; // cart_checkout, negotiation_payment
  items: PaymentItem[];
  metadata: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  checkoutId?: string;     // Dodo checkout ID
  dodoPaymentId?: string;  // After completion
  completedAt?: Timestamp;
  failureReason?: string;
}
```

## Usage Examples

### Using PaymentButton

```tsx
import { PaymentButton } from './components/PaymentButton';
import { PaymentType } from './types/payment';

<PaymentButton
  customerId={user.uid}
  customerName={user.name}
  customerEmail={user.email}
  amount={1500}  // ₹1500
  items={[{
    productId: 'prod_123',
    productName: 'Organic Tomatoes',
    quantity: 5,
    unitPrice: 30000, // ₹300 in paise
  }]}
  paymentType={PaymentType.CartCheckout}
  label="Buy Now"
  variant="primary"
  onPaymentInitiated={(paymentId) => console.log('Payment started:', paymentId)}
/>
```

### Using PaymentModal

```tsx
import { PaymentModal } from './components/PaymentModal';

<PaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  customerId={user.uid}
  customerName={user.name}
  items={cartItems}
  totalAmount={1500}
  onPaymentSuccess={(paymentId) => {
    console.log('Payment successful:', paymentId);
    clearCart();
  }}
  onPaymentFailure={(error) => {
    console.error('Payment failed:', error);
  }}
/>
```

## Payment Flow

1. **User clicks "Pay"**
   - Payment record created in Firestore with status `pending`

2. **Checkout session created**
   - API call to Dodo Payments
   - Firestore updated with `checkoutId`
   - Status changed to `processing`

3. **User redirected to Dodo**
   - Secure checkout page
   - User completes payment

4. **User returns to app**
   - Return URL includes `?payment_status=complete`
   - App checks payment status in Firestore

5. **Webhook updates status** (production)
   - Dodo sends webhook notification
   - Server verifies signature
   - Firestore updated with final status

## Security Considerations

### Current Implementation (Development)

⚠️ **Warning**: The current implementation exposes the API key in the frontend for development purposes only.

### Production Recommendations

1. **Move API calls to Firebase Cloud Functions**
   ```typescript
   // functions/src/payments/createPayment.ts
   export const createPayment = functions.https.onCall(async (data, context) => {
     // Validate user
     if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
     
     // Use secret from environment
     const apiKey = functions.config().dodo.api_key;
     
     // Make secure API call
     // ...
   });
   ```

2. **Implement webhook verification**
   ```typescript
   import crypto from 'crypto';
   
   function verifyWebhook(payload: string, signature: string, secret: string) {
     const hmac = crypto.createHmac('sha256', secret);
     hmac.update(payload);
     const digest = hmac.digest('hex');
     return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
   }
   ```

3. **Validate payment amounts server-side**
   - Always verify the expected amount matches
   - Don't trust client-provided amounts

## Testing

### Test Mode

The integration uses `https://test.dodopayments.com` by default.

Test card numbers:
- Success: Use test cards provided by Dodo
- Failure: Check Dodo docs for test failure scenarios

### Verifying Payments

```typescript
import { getPaymentStatus } from './services/dodoPaymentService';

const payment = await getPaymentStatus(paymentId);
if (payment?.status === PaymentStatus.Succeeded) {
  // Payment complete
}
```

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Add `VITE_DODO_API_KEY` to `.env.local`
   - Restart dev server

2. **"Payment creation failed: 401"**
   - Check API key is correct
   - Verify you're using test/live key for correct environment

3. **"Product not found"**
   - Create `prod_dynamic` product in Dodo dashboard
   - Or use existing product IDs from your dashboard

## Future Enhancements

- [ ] Firebase Cloud Functions for secure API calls
- [ ] Webhook handler for payment status updates
- [ ] Subscription support
- [ ] Refund handling
- [ ] Payment analytics dashboard
