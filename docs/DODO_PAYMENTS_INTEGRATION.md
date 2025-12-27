# Dodo Payments Integration Documentation

## Overview

Anna Bazaar now uses **Dodo Payments** for real payment processing instead of mock/simulated payments. This integration uses Firebase Cloud Functions to securely communicate with the Dodo Payments API.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Cloud Functions     │────▶│  Dodo Payments  │
│   (React)       │     │  (Firebase)          │     │  API            │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                        │                           │
        │                        │                           │
        ▼                        ▼                           ▼
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   User clicks   │     │  createDodoPayment   │     │  Payment Link   │
│   "Pay Now"     │     │  Order()             │     │  Generated      │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                                                    │
        │                                                    │
        ▼                                                    ▼
┌─────────────────┐                                 ┌─────────────────┐
│   Redirect to   │◀────────────────────────────────│  Checkout URL   │
│   Dodo Checkout │                                 │  returned       │
└─────────────────┘                                 └─────────────────┘
        │
        │ User completes payment
        ▼
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Redirect back │     │  dodoWebhookHandler  │◀────│  Dodo Webhook   │
│   to App        │     │  ()                  │     │  (async)        │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────────┐
│   Poll payment  │────▶│  Firestore Updated   │
│   status        │     │  (orders, wallets)   │
└─────────────────┘     └──────────────────────┘
```

## Files Created/Modified

### New Files:
- `functions/src/index.ts` - Cloud Functions for Dodo API
- `functions/package.json` - Functions dependencies
- `functions/tsconfig.json` - TypeScript config
- `services/dodoPaymentService.ts` - Frontend payment service
- `firebase.json` - Firebase project config

### Modified Files:
- `components/PaymentGateway.tsx` - Updated to use real payments
- `App.tsx` - Added payment return handler
- `types.ts` - Added Dodo payment types
- `.env.example` - Added `VITE_FUNCTIONS_URL`

## Configuration

### Dodo Payments Credentials (Sandbox)

```javascript
const DODO_CONFIG = {
  BASE_URL: 'https://test.dfrnt.com/api/v1',
  MERCHANT_ID: 'bus_0NV0u2UnrCTyGqUPJEAm6',
  API_KEY: 'Yx7FZhOceclb9c8T.EqjqSZsYv8rp0GqZaG8X6lH1741-J6QkAibixsVtKxpeJemS',
};
```

### Environment Variables

Add to `.env.local`:
```
VITE_FUNCTIONS_URL=https://us-central1-annabazaarhackspire.cloudfunctions.net
```

## Deployment

### 1. Install Functions Dependencies
```bash
cd functions
npm install
```

### 2. Build Functions
```bash
npm run build
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

### 4. Update Frontend Config
After deployment, update `VITE_FUNCTIONS_URL` in `.env.local` with the actual Cloud Functions URL.

## Testing

### Test Card (Sandbox)
- **Card Number:** 4111 1111 1111 1111
- **Expiry:** Any future date
- **CVV:** Any 3 digits

### Test Flow
1. Add products to cart
2. Proceed to checkout
3. Click "Pay Securely"
4. Enter test card details on Dodo checkout page
5. Complete payment
6. Verify redirect back to app
7. Check Firestore for order update

## Cloud Functions

### createDodoPaymentOrder
Creates a payment order with Dodo and returns the checkout URL.

**Endpoint:** `POST /createDodoPaymentOrder`

**Request:**
```json
{
  "orderId": "AB-12345",
  "amount": 50000,
  "currency": "INR",
  "productName": "Fresh Tomatoes",
  "buyerId": "user123",
  "returnUrl": "https://app.annabazaar.com/?payment_status=complete&orderId=AB-12345",
  "webhookUrl": "https://functions.cloudfunctions.net/dodoWebhookHandler"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "pay_abc123",
  "checkoutUrl": "https://checkout.dfrnt.com/pay/..."
}
```

### dodoWebhookHandler
Receives payment status updates from Dodo and updates Firestore.

**Endpoint:** `POST /dodoWebhookHandler`

**Actions on successful payment:**
1. Updates `dodo_payments` collection
2. Creates/updates `orders` document
3. Creates `transactions` for each farmer
4. Updates farmer `wallets` balances

### getPaymentStatus
Returns the current status of a payment.

**Endpoint:** `GET /getPaymentStatus?orderId=AB-12345`

## Firestore Collections

### dodo_payments
Tracks all Dodo payment attempts.
```javascript
{
  paymentId: "pay_abc123",
  orderId: "AB-12345",
  buyerId: "user123",
  amount: 50000, // paise
  status: "completed",
  checkoutUrl: "...",
  webhookReceived: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### orders
Order records with payment status.
```javascript
{
  orderId: "AB-12345",
  buyerId: "user123",
  totalAmount: 500, // rupees
  transactionId: "DODO_pay_abc123",
  status: "Paid",
  paidAt: Timestamp
}
```

## Error Handling

### Frontend Errors
- Network failures show toast: "Network error"
- API errors show toast: "Failed to create payment"
- Timeout shows: "Payment is being processed"

### Cloud Function Errors
- Invalid requests return 400 with error message
- API failures logged and stored in `payment_attempts`
- Webhook errors still return 200 to prevent retries

## Production Checklist

- [ ] Switch Dodo credentials from sandbox to production
- [ ] Update `DODO_CONFIG.BASE_URL` to production URL
- [ ] Secure API keys using Firebase Secret Manager
- [ ] Add rate limiting to Cloud Functions
- [ ] Enable Firestore security rules for payment collections
- [ ] Set up monitoring/alerting for failed payments
- [ ] Test refund flow
- [ ] Document support contact for payment issues
