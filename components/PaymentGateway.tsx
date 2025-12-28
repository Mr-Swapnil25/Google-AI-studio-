/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNA BAZAAR - PAYMENT GATEWAY (DodoPayments Integration)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Real payment integration using DodoPayments overlay checkout
 * Replaces mock payment simulation with actual payment processing
 * 
 * @author Anna Bazaar Team - Calcutta Hacks 2025
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DodoPayments } from 'dodopayments-checkout';
import { QRCodeSVG } from 'qrcode.react';
import { XIcon, CheckCircleIcon, ShieldCheckIcon } from './icons';
import { firebaseService } from '../services/firebaseService';
import { CartItem } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failure' | 'waiting';
type PaymentStep = 1 | 2 | 3 | 4; // 1: Summary, 2: Method Select, 3: Details, 4: Confirm
type PaymentMethod = 'upi' | 'card' | 'kcc' | 'cod' | null;

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  orderId?: string;
  productName?: string;
  deliveryFee?: number;
  buyerId?: string;
  buyerEmail?: string;
  cartItems?: CartItem[];
  onPaymentComplete: (success: boolean, transactionId?: string) => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DODO_API_KEY = import.meta.env.VITE_DODO_API_KEY || '';
const DODO_MODE: 'test' | 'live' = import.meta.env.VITE_DODO_MODE === 'live' ? 'live' : 'test';

// ============================================================================
// ICONS
// ============================================================================

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const TractorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
    <path d="M10 17h5M4 14l2-5h6l2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 9V6h4l2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 14v-2h4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShoppingBagIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeadphonesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 18v-6a9 9 0 0118 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Payment Method Icons
const UPIIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 10l3-3 4 4 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7" cy="15" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
    <circle cx="17" cy="15" r="1.5" fill="currentColor"/>
  </svg>
);

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const FarmerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 12h.01M18 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ============================================================================
// MAIN PAYMENT GATEWAY COMPONENT
// ============================================================================

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  isOpen,
  onClose,
  totalAmount,
  orderId: initialOrderId,
  productName = 'Anna Bazaar Order',
  deliveryFee = 0,
  buyerId,
  buyerEmail,
  cartItems,
  onPaymentComplete,
}) => {
  // Core payment state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [transactionId, setTransactionId] = useState('');
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [error, setError] = useState<string | null>(null);
  const [isDodoInitialized, setIsDodoInitialized] = useState(false);
  
  // Multi-step flow state
  const [currentStep, setCurrentStep] = useState<PaymentStep>(1);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  
  // UPI state
  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  
  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // KCC state
  const [kccNumber, setKccNumber] = useState('');
  const [kccFarmerName, setKccFarmerName] = useState('');
  const [kccBankName, setKccBankName] = useState('');

  // Generate order ID
  useEffect(() => {
    if (isOpen && !orderId) {
      setOrderId(`AB-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    }
  }, [isOpen, orderId]);

  // Initialize DodoPayments SDK
  useEffect(() => {
    if (!isOpen || isDodoInitialized) return;

    try {
      DodoPayments.Initialize({
        mode: DODO_MODE,
        onEvent: (event) => {
          console.log('[PaymentGateway] Dodo event:', event);

          switch (event.event_type) {
            case 'checkout.opened':
              setPaymentStatus('processing');
              break;

            case 'checkout.customer_details_submitted':
              console.log('[PaymentGateway] Customer details submitted');
              break;

            case 'checkout.payment_page_opened':
              console.log('[PaymentGateway] Payment page opened');
              break;

            case 'checkout.closed':
              // User closed the checkout - could be success or cancellation
              // Show waiting state so user can check status or retry
              if (paymentStatus === 'processing') {
                // Don't assume success - show waiting state
                setPaymentStatus('waiting');
              }
              break;

            case 'checkout.redirect':
              // User is being redirected (likely for payment completion)
              // On return, URL params will indicate success/failure
              console.log('[PaymentGateway] Checkout redirecting - payment may be processing');
              break;

            case 'checkout.error':
              console.error('[PaymentGateway] Checkout error:', event.data?.message);
              setError(String(event.data?.message || 'Payment error occurred'));
              setPaymentStatus('failure');
              break;
              
            case 'checkout.breakdown':
              // Checkout breakdown data received
              console.log('[PaymentGateway] Checkout breakdown:', event.data);
              break;
              
            case 'checkout.resize':
              // Iframe resize event
              break;
          }
        },
      });
      setIsDodoInitialized(true);
    } catch (err) {
      console.error('[PaymentGateway] Failed to initialize DodoPayments:', err);
      setError('Failed to initialize payment system. Please refresh and try again.');
      setPaymentStatus('failure');
    }
  }, [isOpen, isDodoInitialized, paymentStatus]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentStatus('idle');
      setTransactionId('');
      setError(null);
      setOrderId(initialOrderId || `AB-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
      // Reset multi-step flow
      setCurrentStep(1);
      setSelectedMethod(null);
      setUpiId('');
      setUpiVerified(false);
      setCardNumber('');
      setCardName('');
      setCardExpiry('');
      setCardCvv('');
      setKccNumber('');
      setKccFarmerName('');
      setKccBankName('');
    }
  }, [isOpen, initialOrderId]);

  // Handle successful payment
  const handlePaymentSuccess = useCallback(async () => {
    const newTransactionId = `TXN_${orderId}_${Date.now()}`;
    setTransactionId(newTransactionId);
    setPaymentStatus('success');

    // Record payment in Firebase
    try {
      const items = cartItems?.map(item => ({
        productId: item.id,
        farmerId: item.farmerId,
        quantity: item.cartQuantity,
        price: item.price,
      }));

      await firebaseService.recordOrderPayment({
        orderId,
        buyerId: buyerId || 'anonymous',
        totalAmount,
        transactionId: newTransactionId,
        paymentMethod: 'dodo_payments',
        productName,
        items,
      });
    } catch (err) {
      console.error('[PaymentGateway] Failed to record payment in Firebase:', err);
    }

    onPaymentComplete(true, newTransactionId);
  }, [orderId, buyerId, totalAmount, productName, cartItems, onPaymentComplete]);

  // Start Dodo checkout
  const startDodoCheckout = useCallback(async () => {
    setPaymentStatus('processing');
    setError(null);

    // Check if API key is configured
    if (!DODO_API_KEY) {
      console.error('[PaymentGateway] DodoPayments API key not configured');
      setError('Payment service not configured. Please contact support.');
      setPaymentStatus('failure');
      return;
    }

    try {
      // Create checkout session via API
      const response = await fetch('https://api.dodopayments.com/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DODO_API_KEY}`,
        },
        body: JSON.stringify({
          customer: buyerEmail ? { email: buyerEmail } : undefined,
          return_url: `${window.location.origin}?payment=success&order=${orderId}`,
          metadata: {
            order_id: orderId,
            buyer_id: buyerId || 'anonymous',
            total_amount: String(totalAmount),
            product_name: productName,
          },
          billing_currency: 'INR',
          allowed_payment_method_types: ['credit', 'debit', 'upi_collect', 'upi_intent', 'google_pay'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.checkout_url) {
        // Open DodoPayments overlay checkout
        await DodoPayments.Checkout.open({
          checkoutUrl: data.checkout_url,
        });
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('[PaymentGateway] Failed to start checkout:', err);
      
      // Show meaningful error to user
      const errorMessage = err?.message || 'Payment service error. Please try again.';
      setError(errorMessage);
      setPaymentStatus('failure');
    }
  }, [buyerEmail, orderId, buyerId, totalAmount, productName, handlePaymentSuccess]);

  // Generate UPI payment string for QR code
  const generateUPIString = useCallback(() => {
    const upiParams = new URLSearchParams({
      pa: 'annabazaar@ybl', // UPI VPA
      pn: 'Anna Bazaar',
      am: String(totalAmount),
      cu: 'INR',
      tn: `Order ${orderId}`,
    });
    return `upi://pay?${upiParams.toString()}`;
  }, [totalAmount, orderId]);

  // Handle method selection and proceed
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setCurrentStep(3);
  };

  // Handle payment based on selected method
  const handleProceedPayment = useCallback(async () => {
    if (selectedMethod === 'cod') {
      // COD - directly mark as success (pending delivery)
      setPaymentStatus('processing');
      setTimeout(() => {
        handlePaymentSuccess();
      }, 1500);
      return;
    }
    
    // For UPI/Card/KCC - use Dodo checkout
    startDodoCheckout();
  }, [selectedMethod, startDodoCheckout, handlePaymentSuccess]);

  // Handle download receipt
  const handleDownloadReceipt = () => {
    const itemsList = cartItems?.map(item =>
      `  - ${item.name} x${item.cartQuantity} @ ₹${item.price} = ₹${(item.price * item.cartQuantity).toLocaleString('en-IN')}`
    ).join('\n') || `  - ${productName}`;

    const receiptContent = `
╔══════════════════════════════════════════════════════════════╗
║                    ANNA BAZAAR                                ║
║              OFFICIAL PAYMENT RECEIPT                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Transaction ID: ${transactionId.padEnd(42)}║
║  Order ID:       ${orderId.padEnd(42)}║
║  Date:           ${new Date().toLocaleString().padEnd(42)}║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  ITEMS                                                        ║
╠══════════════════════════════════════════════════════════════╣
${itemsList}
╠══════════════════════════════════════════════════════════════╣
║  TOTAL AMOUNT:   ₹${totalAmount.toLocaleString('en-IN').padEnd(41)}║
║  STATUS:         PAYMENT SUCCESSFUL                           ║
║  POWERED BY:     DodoPayments                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Thank you for shopping with Anna Bazaar!                     ║
║  Empowering Rural Commerce                                    ║
║                                                               ║
║  Support: 1800-123-4567                                       ║
║  Email: support@annabazaar.com                                ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // ============================================================================
  // RENDER: SUCCESS STATE
  // ============================================================================
  if (paymentStatus === 'success') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
          {/* Header */}
          <header className="bg-white border-b border-stone-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Anna Bazaar" className="h-10 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3" /> PAID via DodoPayments
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-2xl mx-auto px-4 py-12">
            <div className="bg-white rounded-lg border border-green-200 shadow-lg p-8 sm:p-12 text-center relative overflow-hidden">
              {/* Success gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 to-transparent pointer-events-none" />

              {/* Checkmark */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h1 className="relative text-3xl font-bold text-stone-800 mb-2">Payment Successful!</h1>
              <p className="relative text-stone-500 mb-8">
                Your purchase of <span className="font-semibold text-stone-700">{productName}</span> has been confirmed.
              </p>

              {/* Amount Card */}
              <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 mb-8 border border-primary/20">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Total Amount Paid</p>
                <p className="text-4xl font-bold text-primary">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Transaction Details Grid */}
              <div className="relative grid grid-cols-2 gap-4 text-left mb-8">
                <div className="p-4 bg-stone-50 rounded-2xl">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Transaction ID</p>
                  <p className="font-mono font-semibold text-stone-800 text-sm truncate">{transactionId}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Date & Time</p>
                  <p className="font-semibold text-stone-800 text-sm">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Payment Method</p>
                  <p className="font-semibold text-stone-800 text-sm">DodoPayments</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Order ID</p>
                  <p className="font-semibold text-stone-800 text-sm">{orderId}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="relative flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadReceipt}
                  className="flex-1 py-3 px-6 border-2 border-stone-200 rounded-2xl font-semibold text-stone-700
                           hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="h-5 w-5" />
                  Download Receipt
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 bg-primary text-white rounded-2xl font-semibold
                           hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBagIcon className="h-5 w-5" />
                  Return to Marketplace
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: FAILURE STATE
  // ============================================================================
  if (paymentStatus === 'failure') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-stone-50 to-rose-50/50">
          {/* Header */}
          <header className="bg-white border-b border-red-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Anna Bazaar" className="h-10 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                  <XIcon className="h-3 w-3" />
                  Payment Failed
                </div>
              </div>
            </div>
          </header>

          {/* Error gradient bar */}
          <div className="h-1 bg-gradient-to-r from-red-400 via-rose-500 to-red-400" />

          {/* Main Content */}
          <main className="max-w-md mx-auto px-4 py-12">
            <div className="bg-white rounded-lg border border-red-200 shadow-lg p-8 text-center relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-100/50 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-100/50 rounded-full blur-3xl pointer-events-none" />

              {/* X Icon with animation */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-xl">
                  <XIcon className="w-12 h-12 text-white" />
                </div>
              </div>

              <h1 className="relative text-2xl font-bold text-stone-800 mb-2">Payment Failed</h1>
              <p className="relative text-stone-500 mb-6">
                {error || `We couldn't process your payment. Please try again or use a different payment method.`}
              </p>

              {/* Amount Card */}
              <div className="relative bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 mb-6 border border-red-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Amount</p>
                <p className="text-2xl font-bold text-red-600 font-mono">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Common Issues */}
              <div className="relative text-left mb-6">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Common Reasons</p>
                <div className="space-y-2">
                  {['Insufficient balance', 'Network timeout', 'Bank declined transaction'].map((reason, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-stone-600">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="relative space-y-3">
                <button
                  onClick={() => {
                    setPaymentStatus('idle');
                    setError(null);
                    setCurrentStep(2);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-2xl font-semibold
                           hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 border-2 border-stone-200 rounded-2xl font-semibold text-stone-700
                           hover:bg-stone-50 transition-colors"
                >
                  Return to Cart
                </button>
              </div>

              <p className="relative text-sm text-stone-500 mt-6">
                Need help?{' '}
                <a href="#" className="text-primary font-semibold hover:underline">Contact Support</a>
                {' '}or call <span className="font-semibold">1800-XXX-XXXX</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PROCESSING STATE
  // ============================================================================
  if (paymentStatus === 'processing') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-stone-50 to-blue-50/50 flex items-center justify-center">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8 sm:p-12 max-w-md w-full mx-4 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Animated spinner with multiple rings */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-stone-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-secondary/30 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <LockIcon className="h-8 w-8 text-primary" />
              </div>
            </div>

            <h1 className="relative text-2xl font-bold text-stone-800 mb-2">Processing Payment</h1>
            <p className="relative text-stone-500 text-sm mb-8">
              Please complete the payment in the DodoPayments window.
              <br />
              <span className="text-red-500 font-medium">Do not close or refresh this page.</span>
            </p>

            {/* Amount Card */}
            <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 mb-6 border border-primary/10">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Processing Amount</p>
              <p className="text-3xl font-bold text-primary font-mono">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Security indicators */}
            <div className="relative flex items-center justify-center gap-6 text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <LockIcon className="h-4 w-4 text-primary" />
                <span>256-bit SSL</span>
              </div>
              <div className="w-1 h-1 bg-stone-300 rounded-full" />
              <div className="flex items-center gap-1.5">
                <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                <span>PCI Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: WAITING STATE (Waiting for confirmation)
  // ============================================================================
  if (paymentStatus === 'waiting') {
    return (
      <div className="fixed inset-0 z-50 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-stone-50 to-orange-50/50 flex items-center justify-center">
          <div className="bg-white rounded-lg border border-amber-200 shadow-lg p-8 sm:p-12 max-w-md w-full mx-4 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-100/50 rounded-full blur-3xl pointer-events-none" />

            {/* Animated waiting indicator */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 border-4 border-orange-300/50 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">⏳</span>
              </div>
            </div>

            <h1 className="relative text-2xl font-bold text-stone-800 mb-2">Confirming Payment</h1>
            <p className="relative text-stone-500 text-sm mb-6">
              Your payment is being verified by the bank. This usually takes a few moments.
            </p>

            {/* Order Info */}
            <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 mb-4 border border-amber-200">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Order ID</p>
              <p className="text-lg font-bold text-stone-800 font-mono">{orderId}</p>
            </div>

            {/* Status timeline */}
            <div className="relative text-left mb-6 px-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-stone-600">Order created</span>
              </div>
              <div className="ml-3 h-4 w-0.5 bg-amber-300" />
              <div className="flex items-center gap-3 mt-3">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span className="text-sm text-amber-600 font-medium">Waiting for bank confirmation...</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-semibold
                         hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Check Status Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 border-2 border-stone-200 rounded-2xl font-semibold text-stone-700
                         hover:bg-stone-50 transition-colors"
              >
                Close
              </button>
            </div>

            <p className="relative text-xs text-stone-500 mt-6">
              If you completed the payment, please wait or check your email for confirmation.
              <br />
              <span className="text-amber-600 font-medium">Do not pay again</span> — your money is safe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: IDLE STATE (Multi-Step Premium Payment Flow)
  // ============================================================================
  
  // Step Progress Bar Component
  const StepProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 ${
            currentStep >= step 
              ? 'bg-primary text-white shadow-lg' 
              : 'bg-stone-200 text-stone-500'
          }`}>
            {currentStep > step ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : step}
          </div>
          {step < 3 && (
            <div className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300 ${
              currentStep > step ? 'bg-primary' : 'bg-stone-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Payment Method Card Component
  const PaymentMethodCard = ({ 
    method, 
    icon: Icon, 
    title, 
    subtitle, 
    badge,
    badgeColor = 'green'
  }: { 
    method: PaymentMethod; 
    icon: React.FC<{ className?: string }>; 
    title: string; 
    subtitle: string; 
    badge?: string;
    badgeColor?: 'green' | 'amber';
  }) => (
    <button
      onClick={() => handleMethodSelect(method)}
      className={`relative p-6 rounded-lg border-2 transition-all duration-200 text-left group
        ${selectedMethod === method 
          ? 'border-[#15803D] bg-[#15803D]/5 shadow-md' 
          : 'border-gray-200 bg-white hover:border-[#15803D]/50 hover:shadow-md'
        }`}
    >
      {badge && (
        <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded-full ${
          badgeColor === 'green' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
        }`}>
          {badge}
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl transition-colors ${
          selectedMethod === method ? 'bg-primary text-white' : 'bg-stone-100 text-stone-600 group-hover:bg-primary/10'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-stone-800 text-lg">{title}</h3>
          <p className="text-sm text-stone-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selectedMethod === method ? 'border-primary bg-primary' : 'border-stone-300'
        }`}>
          {selectedMethod === method && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-auto">
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-green-50/30">
        {/* Premium Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Anna Bazaar" className="h-10 w-auto object-contain" />
                <div>
                  <span className="font-bold text-lg text-stone-800">Secure Checkout</span>
                  <p className="text-xs text-stone-500">Anna Bazaar</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                  <LockIcon className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">SSL Secured</span>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <XIcon className="h-5 w-5 text-stone-500" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StepProgressBar />
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              
              {/* ═══════════════════════════════════════════════════════════════
                  STEP 1: Order Summary
              ═══════════════════════════════════════════════════════════════ */}
              {currentStep === 1 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2">Confirm Your Order</h2>
                  <p className="text-stone-500 mb-6">Review your items before payment</p>
                  
                  {/* Cart Items */}
                  <div className="space-y-4 mb-6">
                    {cartItems && cartItems.length > 0 ? (
                      cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-stone-50/80 rounded-2xl">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🥬</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-stone-800 truncate">{item.name}</h4>
                            <p className="text-sm text-stone-500">Qty: {item.cartQuantity} × ₹{item.price.toLocaleString('en-IN')}</p>
                          </div>
                          <span className="font-bold text-stone-800 font-mono">
                            ₹{(item.price * item.cartQuantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-4 p-4 bg-stone-50/80 rounded-2xl">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-green-100 rounded-xl flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-stone-800">{productName}</h4>
                          <p className="text-sm text-stone-500">Your order</p>
                        </div>
                        <span className="font-bold text-stone-800 font-mono">
                          ₹{(totalAmount - deliveryFee).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Subtotals */}
                  <div className="border-t border-stone-200 pt-4 space-y-3">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal</span>
                      <span className="font-mono">₹{(totalAmount - deliveryFee).toLocaleString('en-IN')}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>Logistics (Est.)</span>
                        <span className="font-mono">₹{deliveryFee.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-stone-800 pt-3 border-t border-stone-200">
                      <span>Total</span>
                      <span className="text-primary font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-2xl font-bold text-lg
                             hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Proceed to Payment
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STEP 2: Payment Method Selection
              ═══════════════════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8">
                  <button 
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#15803D] transition-colors mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2">Choose Payment Method</h2>
                  <p className="text-stone-500 mb-6">Select your preferred way to pay</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PaymentMethodCard
                      method="upi"
                      icon={UPIIcon}
                      title="UPI"
                      subtitle="PhonePe, Google Pay, Paytm"
                      badge="Fastest"
                      badgeColor="green"
                    />
                    <PaymentMethodCard
                      method="card"
                      icon={CreditCardIcon}
                      title="Debit / Credit Card"
                      subtitle="Visa, Mastercard, RuPay"
                    />
                    <PaymentMethodCard
                      method="kcc"
                      icon={FarmerIcon}
                      title="Kisan Credit Card"
                      subtitle="Instant EMI available"
                      badge="Farmer Friendly"
                      badgeColor="amber"
                    />
                    <PaymentMethodCard
                      method="cod"
                      icon={CashIcon}
                      title="Pay on Delivery"
                      subtitle="Pay when goods arrive"
                    />
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STEP 3: Payment Details (Based on Selected Method)
              ═══════════════════════════════════════════════════════════════ */}
              {currentStep === 3 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8">
                  <button 
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#15803D] transition-colors mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Change Method
                  </button>
                  
                  {/* UPI Payment */}
                  {selectedMethod === 'upi' && (
                    <div>
                      <h2 className="text-2xl font-bold text-stone-800 mb-2">Pay with UPI</h2>
                      <p className="text-stone-500 mb-6">Scan the QR code or enter UPI ID</p>
                      
                      {/* QR Code */}
                      <div className="flex flex-col items-center mb-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-stone-200">
                          <QRCodeSVG 
                            value={generateUPIString()} 
                            size={200}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <p className="text-sm text-stone-500 mt-4">Scan with any UPI app</p>
                        <p className="text-xs text-gray-500 mt-1">Valid for 10 minutes</p>
                      </div>
                      
                      {/* Manual UPI ID */}
                      <div className="border-t border-stone-200 pt-6">
                        <p className="text-sm font-medium text-stone-600 mb-3">Or enter UPI ID manually</p>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="yourname@upi"
                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/20 outline-none transition-all"
                          />
                          <button
                            onClick={() => setUpiVerified(true)}
                            className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleProceedPayment}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-2xl font-bold text-lg
                                 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <LockIcon className="h-5 w-5" />
                        Pay ₹{totalAmount.toLocaleString('en-IN')}
                      </button>
                    </div>
                  )}

                  {/* Card Payment */}
                  {selectedMethod === 'card' && (
                    <div>
                      <h2 className="text-2xl font-bold text-stone-800 mb-2">Card Details</h2>
                      <p className="text-stone-500 mb-6">Enter your card information</p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-2">Card Number</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-2">Cardholder Name</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-600 mb-2">Expiry</label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="MM/YY"
                              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-600 mb-2">CVV</label>
                            <input
                              type="password"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                              placeholder="•••"
                              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleProceedPayment}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-2xl font-bold text-lg
                                 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <LockIcon className="h-5 w-5" />
                        Pay ₹{totalAmount.toLocaleString('en-IN')}
                      </button>
                    </div>
                  )}

                  {/* KCC Payment */}
                  {selectedMethod === 'kcc' && (
                    <div>
                      <h2 className="text-2xl font-bold text-stone-800 mb-2">Kisan Credit Card</h2>
                      <p className="text-stone-500 mb-6">Enter your KCC details</p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-2">KCC Number</label>
                          <input
                            type="text"
                            value={kccNumber}
                            onChange={(e) => setKccNumber(e.target.value)}
                            placeholder="Enter KCC Number"
                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-2">Farmer Name (as on KCC)</label>
                          <input
                            type="text"
                            value={kccFarmerName}
                            onChange={(e) => setKccFarmerName(e.target.value)}
                            placeholder="Enter name as on card"
                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-2">Bank Name</label>
                          <select
                            value={kccBankName}
                            onChange={(e) => setKccBankName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white/90 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          >
                            <option value="">Select Bank</option>
                            <option value="sbi">State Bank of India</option>
                            <option value="pnb">Punjab National Bank</option>
                            <option value="bob">Bank of Baroda</option>
                            <option value="canara">Canara Bank</option>
                            <option value="uco">UCO Bank</option>
                            <option value="other">Other Regional Bank</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleProceedPayment}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-2xl font-bold text-lg
                                 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <LockIcon className="h-5 w-5" />
                        Pay ₹{totalAmount.toLocaleString('en-IN')}
                      </button>
                    </div>
                  )}

                  {/* COD Confirmation */}
                  {selectedMethod === 'cod' && (
                    <div>
                      <h2 className="text-2xl font-bold text-stone-800 mb-2">Pay on Delivery</h2>
                      <p className="text-stone-500 mb-6">Pay when your order arrives</p>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CashIcon className="h-6 w-6 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-800">Cash on Delivery</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              Your order will be delivered in 3-5 business days. 
                              Pay the farmer directly upon delivery.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 mb-6">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-700">No advance payment required</span>
                      </div>
                      
                      <button
                        onClick={handleProceedPayment}
                        className="w-full mt-2 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-2xl font-bold text-lg
                                 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Confirm Order
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Order Summary Sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#0F172A]">Order Summary</h3>
                  <ShoppingBagIcon className="h-5 w-5 text-[#15803D]" />
                </div>
                <p className="text-xs text-gray-500 font-mono mb-4">#{orderId}</p>
                
                <div className="space-y-3 pb-4 border-b border-stone-200">
                  {cartItems && cartItems.length > 0 ? (
                    cartItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-stone-600 truncate max-w-[120px]">{item.name} ×{item.cartQuantity}</span>
                        <span className="text-sm font-semibold text-stone-800 font-mono">₹{(item.price * item.cartQuantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-stone-600 truncate">{productName}</span>
                      <span className="text-sm font-semibold text-stone-800 font-mono">₹{(totalAmount - deliveryFee).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {cartItems && cartItems.length > 3 && (
                    <p className="text-xs text-gray-500">+{cartItems.length - 3} more items</p>
                  )}
                </div>
                
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{(totalAmount - deliveryFee).toLocaleString('en-IN')}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-stone-500">
                      <span>Delivery</span>
                      <span className="font-mono">₹{deliveryFee.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-stone-200">
                  <span className="font-semibold text-stone-800">Total</span>
                  <span className="text-2xl font-bold text-primary font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                
                {/* Trust Badges */}
                <div className="mt-6 pt-4 border-t border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <LockIcon className="h-3.5 w-3.5 text-primary" />
                    <span>SSL Encrypted & Secure</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <ShieldCheckIcon className="h-3.5 w-3.5 text-primary" />
                    <span>100% Purchase Protection</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <HeadphonesIcon className="h-3.5 w-3.5 text-primary" />
                    <span>24/7 Customer Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-[#F9FAFB] mt-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
              <p>© 2025 Anna Bazaar. Payments powered by DodoPayments.</p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-[#15803D] transition-colors">Privacy</a>
                <a href="#" className="hover:text-[#15803D] transition-colors">Terms</a>
                <a href="#" className="hover:text-[#15803D] transition-colors">Refunds</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PaymentGateway;
