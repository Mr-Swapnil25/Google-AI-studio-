import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Enable CORS
const corsHandler = cors({ origin: true });

// =============================================================================
// DODO PAYMENTS CONFIGURATION
// =============================================================================

const DODO_CONFIG = {
  // Sandbox configuration
  BASE_URL: 'https://test.dfrnt.com/api/v1',
  MERCHANT_ID: 'bus_0NV0u2UnrCTyGqUPJEAm6',
  API_KEY: 'Yx7FZhOceclb9c8T.EqjqSZsYv8rp0GqZaG8X6lH1741-J6QkAibixsVtKxpeJemS',
};

// =============================================================================
// TYPES
// =============================================================================

interface DodoPaymentRequest {
  orderId: string;
  amount: number; // Amount in smallest unit (paise for INR)
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  productName: string;
  buyerId: string;
  returnUrl: string;
  webhookUrl: string;
  items?: Array<{
    productId: string;
    farmerId: string;
    quantity: number;
    price: number;
  }>;
}

interface DodoPaymentResponse {
  success: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  error?: string;
}

// =============================================================================
// CREATE PAYMENT ORDER
// =============================================================================

export const createDodoPaymentOrder = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    try {
      const payload: DodoPaymentRequest = req.body;
      
      // Validate required fields
      if (!payload.orderId || !payload.amount || !payload.productName) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: orderId, amount, productName',
        });
        return;
      }

      console.log(`Creating Dodo payment for order: ${payload.orderId}, amount: ${payload.amount}`);

      // Create payment order with Dodo Payments API
      const dodoPayload = {
        billing: {
          city: 'Kolkata',
          country: 'IN',
          state: 'WB',
          street: 'Anna Bazaar Marketplace',
          zipcode: '700001',
        },
        customer: {
          email: payload.customerEmail || 'customer@annabazaar.com',
          name: `Buyer ${payload.buyerId}`,
          phone_number: payload.customerPhone || '+919999999999',
        },
        payment_link: true,
        product_cart: [
          {
            name: payload.productName,
            price: payload.amount, // Amount in paise
            quantity: 1,
          },
        ],
        return_url: payload.returnUrl,
        webhook_url: payload.webhookUrl,
        metadata: {
          orderId: payload.orderId,
          buyerId: payload.buyerId,
          items: JSON.stringify(payload.items || []),
        },
      };

      const response = await fetch(`${DODO_CONFIG.BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DODO_CONFIG.API_KEY}`,
        },
        body: JSON.stringify(dodoPayload),
      });

      const responseData = await response.json() as any;

      if (!response.ok) {
        console.error('Dodo API error:', responseData);
        
        // Store failed attempt in Firestore
        await admin.firestore().collection('payment_attempts').add({
          orderId: payload.orderId,
          status: 'api_error',
          error: responseData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(response.status).json({
          success: false,
          error: responseData.message || 'Failed to create payment',
        });
        return;
      }

      // Store payment order in Firestore for tracking
      const paymentId = responseData.payment_id || responseData.id;
      await admin.firestore().collection('dodo_payments').doc(paymentId).set({
        orderId: payload.orderId,
        buyerId: payload.buyerId,
        amount: payload.amount,
        currency: payload.currency || 'INR',
        productName: payload.productName,
        paymentId,
        checkoutUrl: responseData.payment_link || responseData.url,
        status: 'pending',
        items: payload.items || [],
        dodoResponse: responseData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Return success with checkout URL
      const result: DodoPaymentResponse = {
        success: true,
        paymentId,
        checkoutUrl: responseData.payment_link || responseData.url,
      };

      console.log(`Payment order created successfully: ${paymentId}`);
      res.status(200).json(result);

    } catch (error) {
      console.error('Error creating Dodo payment:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
});

// =============================================================================
// DODO WEBHOOK HANDLER
// =============================================================================

export const dodoWebhookHandler = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Received Dodo webhook:', JSON.stringify(req.body));

    const webhookData = req.body;
    const paymentId = webhookData.payment_id || webhookData.id;
    const status = webhookData.status?.toLowerCase();
    const metadata = webhookData.metadata || {};

    if (!paymentId) {
      console.error('Webhook missing payment_id');
      res.status(400).json({ error: 'Missing payment_id' });
      return;
    }

    // Update dodo_payments collection
    const paymentRef = admin.firestore().collection('dodo_payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      console.warn(`Payment document not found for ID: ${paymentId}`);
      // Still acknowledge the webhook
      res.status(200).json({ received: true });
      return;
    }

    const paymentData = paymentDoc.data()!;
    const orderId = paymentData.orderId || metadata.orderId;
    const buyerId = paymentData.buyerId || metadata.buyerId;
    const items = paymentData.items || [];

    // Update payment status
    await paymentRef.update({
      status: status === 'succeeded' || status === 'completed' ? 'completed' : status,
      webhookReceived: true,
      webhookData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If payment succeeded, update order and farmer wallets
    if (status === 'succeeded' || status === 'completed') {
      const transactionId = `DODO_${paymentId}`;
      
      // Update/create order document
      await admin.firestore().collection('orders').doc(orderId).set({
        orderId,
        buyerId,
        totalAmount: paymentData.amount / 100, // Convert from paise to rupees
        transactionId,
        paymentMethod: 'dodo',
        productName: paymentData.productName,
        status: 'Paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        dodoPaymentId: paymentId,
      }, { merge: true });

      // Distribute payments to farmers
      if (items && items.length > 0) {
        for (const item of items) {
          const amount = (item.price * item.quantity) / 100; // Convert from paise
          
          // Create transaction record
          await admin.firestore().collection('transactions').add({
            farmerId: item.farmerId,
            type: 'Payment',
            status: 'Completed',
            amount,
            description: `Payment for order #${orderId}`,
            relatedId: orderId,
            metadata: {
              orderId,
              buyerId,
              productId: item.productId,
              quantity: item.quantity,
              transactionId,
              dodoPaymentId: paymentId,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update farmer wallet balance
          const walletRef = admin.firestore().collection('wallets').doc(item.farmerId);
          const walletDoc = await walletRef.get();
          const currentBalance = walletDoc.exists ? (walletDoc.data()?.totalBalance || 0) : 0;
          
          await walletRef.set({
            farmerId: item.farmerId,
            totalBalance: currentBalance + amount,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }

      console.log(`Payment ${paymentId} completed successfully, order ${orderId} updated`);
    }

    // Acknowledge webhook receipt
    res.status(200).json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Error processing Dodo webhook:', error);
    // Still return 200 to prevent webhook retries
    res.status(200).json({ 
      received: true, 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// =============================================================================
// GET PAYMENT STATUS (for polling from frontend)
// =============================================================================

// =============================================================================
// WEATHER API PROXY
// =============================================================================

export const getWeather = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const location = req.query.q as string;
    
    if (!location) {
      res.status(400).json({ error: 'Missing location parameter "q"' });
      return;
    }

    try {
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        console.error('WEATHER_API_KEY is not set in environment');
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }

      // Using forecast.json to get rain chance data as well
      const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=1&aqi=no&alerts=no`;
      
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error('WeatherAPI error:', weatherResponse.status, errorText);
        
        if (weatherResponse.status === 401) {
          res.status(500).json({ error: 'Weather service authentication failed' });
        } else if (weatherResponse.status === 400) {
          res.status(400).json({ error: 'Invalid location' });
        } else if (weatherResponse.status === 429) {
          res.status(429).json({ error: 'Weather service rate limit exceeded' });
        } else {
          res.status(502).json({ error: 'Weather service unavailable' });
        }
        return;
      }

      const data = await weatherResponse.json();
      
      // Return the full weather data (frontend will normalize it)
      res.status(200).json(data);

    } catch (error) {
      console.error('Error fetching weather:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });
});

// =============================================================================
// PAYMENT STATUS
// =============================================================================

export const getPaymentStatus = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const paymentId = req.query.paymentId as string;
    const orderId = req.query.orderId as string;

    if (!paymentId && !orderId) {
      res.status(400).json({ error: 'Missing paymentId or orderId' });
      return;
    }

    try {
      let paymentDoc;
      
      if (paymentId) {
        paymentDoc = await admin.firestore().collection('dodo_payments').doc(paymentId).get();
      } else {
        const snapshot = await admin.firestore()
          .collection('dodo_payments')
          .where('orderId', '==', orderId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          paymentDoc = snapshot.docs[0];
        }
      }

      if (!paymentDoc || !paymentDoc.exists) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      const data = paymentDoc.data()!;
      res.status(200).json({
        paymentId: paymentDoc.id,
        orderId: data.orderId,
        status: data.status,
        amount: data.amount,
        transactionId: data.status === 'completed' ? `DODO_${paymentDoc.id}` : null,
      });

    } catch (error) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});
