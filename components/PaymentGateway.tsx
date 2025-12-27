import React, { useState, useEffect, useCallback } from 'react';
import { XIcon, CheckCircleIcon, ShieldCheckIcon } from './icons';
import { firebaseService } from '../services/firebaseService';
import { CartItem } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failure';
type PaymentMethod = 'upi' | 'kcc' | 'card' | 'netbanking';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  orderId?: string;
  productName?: string;
  deliveryFee?: number;
  buyerId?: string;
  cartItems?: CartItem[];
  onPaymentComplete: (success: boolean, transactionId?: string) => void;
}

interface OrderItem {
  name: string;
  price: number;
}

// ============================================================================
// PAYMENT METHOD ICONS
// ============================================================================

const UPIIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#5B40EC"/>
    <path d="M5 8h3l2 8h-3l-2-8z" fill="white"/>
    <path d="M11 8h3l2 8h-3l-2-8z" fill="white"/>
    <path d="M17 8h2l-1 8h-2l1-8z" fill="#5B40EC" stroke="white" strokeWidth="1.5"/>
  </svg>
);

const QRCodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
    <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
    <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
    <path d="M14 14h3v3h-3v-3z" fill="currentColor"/>
    <path d="M18 14h3v3h-3v-3z" fill="currentColor"/>
    <path d="M14 18h3v3h-3v-3z" fill="currentColor"/>
    <path d="M18 18h3v3h-3v-3z" fill="currentColor"/>
  </svg>
);

const TractorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="17" r="3" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 17h5M4 14l2-5h6l2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 9V6h4l2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 14v-2h4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const BankIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShoppingBagIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HeadphonesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 18v-6a9 9 0 0118 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PaymentMethodCardProps {
  method: PaymentMethod;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isSelected: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  title,
  subtitle,
  icon,
  isSelected,
  isRecommended,
  onSelect,
}) => (
  <button
    onClick={onSelect}
    className={`
      w-full p-4 rounded-xl border-2 transition-all duration-300
      flex items-center justify-between text-left
      hover:border-primary/50 hover:bg-primary/5
      ${isSelected 
        ? 'border-primary bg-primary/5 shadow-md' 
        : 'border-stone-200 bg-white'
      }
    `}
  >
    <div className="flex items-center gap-4">
      <div className={`
        w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${isSelected ? 'border-primary' : 'border-stone-300'}
      `}>
        {isSelected && <div className="w-3 h-3 rounded-full bg-primary" />}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          {isRecommended && (
            <span className="px-2 py-0.5 text-xs font-bold text-primary bg-primary/10 rounded-full">
              RECOMMENDED
            </span>
          )}
        </div>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
    </div>
    <div className="w-10 h-10 flex items-center justify-center text-stone-600">
      {icon}
    </div>
  </button>
);

// ============================================================================
// SELECT METHOD SCREEN
// ============================================================================

interface SelectMethodScreenProps {
  selectedMethod: PaymentMethod;
  onMethodSelect: (method: PaymentMethod) => void;
  onPay: () => void;
  totalAmount: number;
  productName?: string;
  orderId: string;
  deliveryFee: number;
  onCancel: () => void;
}

const SelectMethodScreen: React.FC<SelectMethodScreenProps> = ({
  selectedMethod,
  onMethodSelect,
  onPay,
  totalAmount,
  productName,
  orderId,
  deliveryFee,
  onCancel,
}) => {
  const subtotal = totalAmount - deliveryFee;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <TractorIcon className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-stone-800">Anna Bazaar</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-stone-600">
              <button className="hover:text-primary transition-colors">Help</button>
              <button onClick={onCancel} className="hover:text-primary transition-colors">Cancel Order</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold">
                <LockIcon className="h-4 w-4" />
                Secure Checkout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-800">Complete Your Payment</h1>
          <p className="text-stone-500 mt-1">Please select a secure payment method to confirm your order.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCardIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-stone-800">Select Payment Method</h2>
              </div>

              <div className="space-y-3">
                <PaymentMethodCard
                  method="upi"
                  title="UPI / QR Code"
                  subtitle="GooglePay, PhonePe, Paytm, BHIM"
                  icon={<QRCodeIcon className="h-7 w-7" />}
                  isSelected={selectedMethod === 'upi'}
                  isRecommended={true}
                  onSelect={() => onMethodSelect('upi')}
                />

                <PaymentMethodCard
                  method="kcc"
                  title="Kisan Credit Card (KCC)"
                  subtitle="Pay using your KCC limit. Special interest rates apply."
                  icon={<TractorIcon className="h-7 w-7" />}
                  isSelected={selectedMethod === 'kcc'}
                  onSelect={() => onMethodSelect('kcc')}
                />

                <PaymentMethodCard
                  method="card"
                  title="Credit / Debit Card"
                  subtitle="Visa, Mastercard, RuPay"
                  icon={<CreditCardIcon className="h-7 w-7" />}
                  isSelected={selectedMethod === 'card'}
                  onSelect={() => onMethodSelect('card')}
                />

                <PaymentMethodCard
                  method="netbanking"
                  title="Net Banking"
                  subtitle="All major Indian banks supported (SBI, HDFC, ICICI, etc.)"
                  icon={<BankIcon className="h-7 w-7" />}
                  isSelected={selectedMethod === 'netbanking'}
                  onSelect={() => onMethodSelect('netbanking')}
                />
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-stone-200">
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <LockIcon className="h-4 w-4 text-primary" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <ShieldCheckIcon className="h-4 w-4 text-primary" />
                  <span>100% Secure</span>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <HeadphonesIcon className="h-4 w-4 text-primary" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-stone-800">Order Summary</h2>
                <ShoppingBagIcon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-stone-500 mb-4">#{orderId}</p>

              <div className="space-y-3 pb-4 border-b border-stone-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-stone-600">{productName || 'Order Items'}</span>
                  </div>
                  <span className="font-semibold text-stone-800">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-stone-600">Delivery Fee</span>
                  </div>
                  <span className="font-semibold text-stone-800">₹{deliveryFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-stone-600">Taxes</span>
                  </div>
                  <span className="font-semibold text-primary">Free</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-4">
                <span className="text-stone-600">Total Payable</span>
                <span className="text-3xl font-bold text-stone-800">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={onPay}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg
                         hover:bg-primary-dark transition-all duration-300 transform hover:scale-[1.02]
                         flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <LockIcon className="h-5 w-5" />
                Pay ₹{totalAmount.toLocaleString('en-IN')} Securely
              </button>

              <p className="text-xs text-center text-stone-500 mt-3">
                By proceeding, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>.
              </p>

              {/* Help Box */}
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <PhoneIcon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-stone-800 text-sm">Need help with payment?</span>
                </div>
                <p className="text-xs text-stone-600">
                  Call our farmer support line at{' '}
                  <span className="font-bold text-primary">1800-123-4567</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-stone-500">
            <p>© 2023 Anna Bazaar Agri-Tech Pvt Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-primary transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// PROCESSING SCREEN
// ============================================================================

interface ProcessingScreenProps {
  totalAmount: number;
  orderId: string;
  progress: number;
  onCancel: () => void;
}

const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  totalAmount,
  orderId,
  progress,
  onCancel,
}) => {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-stone-50 to-blue-50/50 relative overflow-hidden">
      {/* Blurred background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1920')] bg-cover bg-center opacity-20 blur-sm" />
      
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md border-b border-stone-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🌱</span>
              </div>
              <span className="font-bold text-xl text-stone-800">Anna Bazaar</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-lg text-sm text-stone-600">
              <LockIcon className="h-4 w-4" />
              <span className="font-medium">SECURE PAYMENT</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl p-8 sm:p-12 max-w-md w-full text-center">
          {/* Animated spinner */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e7e5e4"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#2E7D32"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.83} 283`}
                transform="rotate(-90 50 50)"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <LockIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-stone-800 mb-2">Processing Payment...</h1>
          <p className="text-stone-500 text-sm mb-8">
            Please do not refresh the page or click the back button. This may take a few seconds.
          </p>

          {/* Amount Card */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 mb-6">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Total Amount</p>
            <p className="text-4xl font-bold text-primary">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 text-left mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">Merchant</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-stone-800">Anna Bazaar</span>
                <CheckCircleIcon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">Order ID</span>
              <span className="font-semibold text-stone-800">#{orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">Date</span>
              <span className="font-semibold text-stone-800">{formattedDate}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Verifying details...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-red-500 font-semibold hover:text-red-600 transition-colors"
          >
            Cancel Transaction
          </button>

          <p className="text-xs text-stone-500 mt-4 hover:text-primary cursor-pointer">
            Need help with this transaction?
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative text-center py-6">
        <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
          <LockIcon className="h-4 w-4" />
          <span>100% Secure Payment • 256-bit Encryption</span>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="w-10 h-6 bg-stone-300 rounded" />
          <div className="w-10 h-6 bg-stone-300 rounded" />
          <div className="w-10 h-6 bg-stone-300 rounded" />
        </div>
        <p className="text-xs text-stone-400 mt-4">© 2023 Anna Bazaar. Empowering Rural Commerce.</p>
      </footer>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// SUCCESS SCREEN
// ============================================================================

interface SuccessScreenProps {
  totalAmount: number;
  transactionId: string;
  productName?: string;
  paymentMethod: PaymentMethod;
  onDownloadReceipt: () => void;
  onReturnToMarketplace: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  totalAmount,
  transactionId,
  productName,
  paymentMethod,
  onDownloadReceipt,
  onReturnToMarketplace,
}) => {
  const formattedDateTime = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ', ' + new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const getPaymentMethodDisplay = () => {
    switch (paymentMethod) {
      case 'upi': return 'UPI Payment';
      case 'kcc': return 'Kisan Credit Card';
      case 'card': return '💳 Visa ending in 4242';
      case 'netbanking': return 'Net Banking';
      default: return 'Online Payment';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <span className="font-bold text-xl text-stone-800">Anna Bazaar</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <span>🧪</span> SIMULATION MODE
              </span>
              <button className="p-2 hover:bg-stone-100 rounded-lg">
                <svg className="h-5 w-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-stone-200 rounded-full overflow-hidden">
                <img src="https://i.pravatar.cc/40?u=user" alt="User" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-stone-50 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-stone-500">
            <a href="#" className="hover:text-primary">Home</a>
            <span>›</span>
            <a href="#" className="hover:text-primary">Checkout</a>
            <span>›</span>
            <span className="text-stone-800 font-medium">Payment Status</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-green-200 shadow-xl p-8 sm:p-12 text-center relative overflow-hidden">
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
            Your purchase of <span className="font-semibold text-stone-700">{productName || 'your order'}</span> has been confirmed and processed.
          </p>

          {/* Amount Card */}
          <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 mb-8 border border-primary/20">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Total Amount Paid</p>
            <p className="text-4xl font-bold text-primary">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>

          {/* Transaction Details Grid */}
          <div className="relative grid grid-cols-2 gap-4 text-left mb-8">
            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Transaction ID</p>
              <p className="font-mono font-semibold text-stone-800 text-sm">{transactionId}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Date & Time</p>
              <p className="font-semibold text-stone-800 text-sm">{formattedDateTime}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Payment Method</p>
              <p className="font-semibold text-stone-800 text-sm">{getPaymentMethodDisplay()}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Recipient</p>
              <p className="font-semibold text-stone-800 text-sm">Anna Bazaar Merchants Ltd.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative flex flex-col sm:flex-row gap-3">
            <button
              onClick={onDownloadReceipt}
              className="flex-1 py-3 px-6 border-2 border-stone-200 rounded-xl font-semibold text-stone-700
                       hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
            >
              <DownloadIcon className="h-5 w-5" />
              Download Receipt
            </button>
            <button
              onClick={onReturnToMarketplace}
              className="flex-1 py-3 px-6 bg-primary text-white rounded-xl font-semibold
                       hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              Return to Marketplace
            </button>
          </div>

          <p className="relative text-sm text-stone-500 mt-6">
            Need help with this transaction?{' '}
            <a href="#" className="text-primary font-semibold hover:underline">Contact Support</a>
          </p>
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// FAILURE SCREEN
// ============================================================================

interface FailureScreenProps {
  totalAmount: number;
  transactionId: string;
  paymentMethod: PaymentMethod;
  onRetry: () => void;
  onUseDifferentMethod: () => void;
}

const FailureScreen: React.FC<FailureScreenProps> = ({
  totalAmount,
  transactionId,
  paymentMethod,
  onRetry,
  onUseDifferentMethod,
}) => {
  const formattedDateTime = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ', ' + new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const getPaymentMethodDisplay = () => {
    switch (paymentMethod) {
      case 'upi': return 'UPI Payment';
      case 'kcc': return 'Kisan Credit Card';
      case 'card': return '💳 •••• 1234';
      case 'netbanking': return 'Net Banking';
      default: return 'Online Payment';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <TractorIcon className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-stone-800">Anna Bazaar</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 hover:text-primary transition-colors cursor-pointer">
              <HeadphonesIcon className="h-5 w-5" />
              <span className="font-medium">Help Center</span>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      <div className="bg-red-500 h-1" />

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center relative overflow-hidden">
          {/* X Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <XIcon className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-stone-800 mb-2">Payment Failed</h1>
          <p className="text-stone-500 mb-8">
            We couldn't process your payment of{' '}
            <span className="font-bold text-stone-700">₹{totalAmount.toLocaleString('en-IN')}</span>.{' '}
            Your bank declined the transaction.
          </p>

          {/* Transaction Details */}
          <div className="bg-stone-50 rounded-2xl p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">TRANSACTION ID</span>
              <span className="font-mono font-semibold text-stone-800">{transactionId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">MERCHANT</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-stone-800">Anna Bazaar Seeds</span>
                <CheckCircleIcon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">DATE</span>
              <span className="font-semibold text-stone-800">{formattedDateTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">PAYMENT METHOD</span>
              <span className="font-semibold text-stone-800">{getPaymentMethodDisplay()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onRetry}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold
                       hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <RefreshIcon className="h-5 w-5" />
              Retry Payment
            </button>
            <button
              onClick={onUseDifferentMethod}
              className="w-full py-4 border-2 border-stone-200 rounded-xl font-semibold text-stone-700
                       hover:bg-stone-50 transition-colors"
            >
              Use Different Method
            </button>
          </div>

          <p className="text-sm text-stone-500 mt-6">
            Need help?{' '}
            <a href="#" className="text-primary font-semibold hover:underline">Contact Support</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
          <LockIcon className="h-4 w-4" />
          <span>Secure 256-bit SSL</span>
          <span>•</span>
          <span>PCI DSS Compliant</span>
        </div>
        <p className="text-xs text-stone-400 mt-2">© 2023 Anna Bazaar Technologies Pvt Ltd.</p>
      </footer>
    </div>
  );
};

// ============================================================================
// MAIN PAYMENT GATEWAY COMPONENT
// ============================================================================

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  isOpen,
  onClose,
  totalAmount,
  orderId: initialOrderId,
  productName = 'Premium Organic Seeds (5kg)',
  deliveryFee = 300,
  buyerId,
  cartItems,
  onPaymentComplete,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [progress, setProgress] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const [orderId, setOrderId] = useState(initialOrderId || '');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentStatus('idle');
      setSelectedMethod('upi');
      setProgress(0);
      setTransactionId('');
      // Generate deterministic order ID based on timestamp
      const timestamp = Date.now();
      const orderSuffix = (timestamp % 100000).toString().padStart(5, '0');
      setOrderId(initialOrderId || `AB-${orderSuffix}`);
    }
  }, [isOpen, initialOrderId]);

  // Simulate payment processing with Firebase integration
  const startPayment = useCallback(async () => {
    setPaymentStatus('processing');
    setProgress(0);
    const newTransactionId = `TXN_${Date.now()}`;
    setTransactionId(newTransactionId);

    // Simulate progress with deterministic increments
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10; // Deterministic 10% increment
      });
    }, 300);

    // Determine outcome after 2.5 seconds
    setTimeout(async () => {
      clearInterval(progressInterval);
      setProgress(100);
      
      // In production, payment success is verified by payment gateway webhook
      // For development, always succeed (real verification happens server-side)
      const isSuccess = true;
      
      setTimeout(async () => {
        if (isSuccess) {
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
              paymentMethod: selectedMethod,
              productName,
              items,
            });
          } catch (error) {
            console.error('Failed to record payment in Firebase:', error);
            // Continue anyway - payment was successful, just logging failed
          }

          setPaymentStatus('success');
          onPaymentComplete(true, newTransactionId);
        } else {
          setPaymentStatus('failure');
          onPaymentComplete(false);
        }
      }, 500);
    }, 2500);
  }, [onPaymentComplete, orderId, totalAmount, selectedMethod, productName, buyerId, cartItems]);

  const handleDownloadReceipt = () => {
    // Generate detailed receipt
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
║  METHOD:         ${selectedMethod.toUpperCase().padEnd(42)}║
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

  const handleReturnToMarketplace = () => {
    onClose();
  };

  const handleRetry = () => {
    startPayment();
  };

  const handleUseDifferentMethod = () => {
    setPaymentStatus('idle');
    setProgress(0);
  };

  const handleCancel = () => {
    if (paymentStatus === 'processing') {
      setPaymentStatus('idle');
      setProgress(0);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Render based on payment status
  switch (paymentStatus) {
    case 'processing':
      return (
        <div className="fixed inset-0 z-50">
          <ProcessingScreen
            totalAmount={totalAmount}
            orderId={orderId}
            progress={Math.min(progress, 100)}
            onCancel={handleCancel}
          />
        </div>
      );
    
    case 'success':
      return (
        <div className="fixed inset-0 z-50 overflow-auto">
          <SuccessScreen
            totalAmount={totalAmount}
            transactionId={transactionId}
            productName={productName}
            paymentMethod={selectedMethod}
            onDownloadReceipt={handleDownloadReceipt}
            onReturnToMarketplace={handleReturnToMarketplace}
          />
        </div>
      );
    
    case 'failure':
      return (
        <div className="fixed inset-0 z-50 overflow-auto">
          <FailureScreen
            totalAmount={totalAmount}
            transactionId={transactionId}
            paymentMethod={selectedMethod}
            onRetry={handleRetry}
            onUseDifferentMethod={handleUseDifferentMethod}
          />
        </div>
      );
    
    default:
      return (
        <div className="fixed inset-0 z-50 overflow-auto">
          <SelectMethodScreen
            selectedMethod={selectedMethod}
            onMethodSelect={setSelectedMethod}
            onPay={startPayment}
            totalAmount={totalAmount}
            productName={productName}
            orderId={orderId}
            deliveryFee={deliveryFee}
            onCancel={handleCancel}
          />
        </div>
      );
  }
};

export default PaymentGateway;
