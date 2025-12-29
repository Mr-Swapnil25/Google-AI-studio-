export enum UserRole {
  Buyer = 'Buyer',
  Farmer = 'Farmer',
}

export enum ProductCategory {
  Fruit = 'Fruit',
  Vegetable = 'Vegetable',
  Grain = 'Grain',
  Other = 'Other',
}

export enum ProductType {
  /** @deprecated Platform is B2B bulk-only. Kept for legacy data compatibility. */
  Retail = 'Retail',
  Bulk = 'Bulk',
}

/** Bulk lot size units for B2B trading */
export enum BulkUnit {
  Kg = 'kg',
  Quintal = 'quintal',   // 100 kg
  Ton = 'ton',           // 1000 kg
}

/** Minimum bulk order quantity in kg (1 quintal) */
export const MIN_BULK_QUANTITY_KG = 100;

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: ProductCategory;
  imageUrl: string;
  farmerId: string;
  type: ProductType;
  isVerified: boolean;
  verificationFeedback?: string;
  // Dynamic pricing data from location-aware price engine
  farmerLocation?: {
    state: string;
    district: string;
  };
  priceEngineData?: {
    floorPrice: number;
    targetPrice: number;
    priceSource: 'district-mandi' | 'state-average' | 'national-fallback';
    isVerified: boolean;
  };
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export enum NegotiationStatus {
  Pending = 'Pending',
  /** @deprecated Use CounterByFarmer or CounterByBuyer instead. Kept for legacy Firestore data compatibility. */
  CounterOffer = 'Counter-Offer',
  CounterByFarmer = 'Counter-By-Farmer',
  CounterByBuyer = 'Counter-By-Buyer',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

export enum OrderStatus {
  Processing = 'Processing',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
}

/** Call status for 1-on-1 voice/video calls */
export enum CallStatus {
  Idle = 'idle',
  Ringing = 'ringing',
  Ongoing = 'ongoing',
  Ended = 'ended',
  Declined = 'declined',
  Missed = 'missed',
}

export interface Negotiation {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  buyerId: string;
  farmerId: string;
  initialPrice: number;
  offeredPrice: number;
  counterPrice?: number;
  quantity: number; // in kg
  status: NegotiationStatus;
  notes: string;
  lastUpdated: Date;
  // Dynamic pricing fields
  floorPrice?: number;      // Minimum acceptable price (per kg)
  targetPrice?: number;     // Suggested fair price (per kg)
  priceSource?: string;     // Where the floor/target came from
  priceVerified?: boolean;  // Whether mandi data was available
  qualityGrade?: string;    // AI-assessed grade (A, B, C)
  farmerLocation?: {        // For price calculation
    state?: string;
    district?: string;
  };
  // Voice/Video call fields
  callStatus?: CallStatus;
  callerId?: string;
  callerName?: string;
  callStartedAt?: Date;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  id: string;
  negotiationId: string;
  senderId: string; // e.g., 'b1' for buyer, 'f1' for farmer
  recipientId?: string; // The other participant in the conversation
  text: string;
  timestamp: Date;
  status?: MessageStatus; // Optional for backward compatibility
  read?: boolean; // Track if message has been read
}

export interface BotChatMessage {
  role: 'user' | 'model' | 'error';
  text: string;
}

export interface Farmer {
  id: string;
  name: string;
  profileImageUrl: string;
  isVerified: boolean;
  rating: number;
  bio: string;
  yearsFarming: number;
  location: string;
  verificationFeedback?: string;
}

export interface User {
  uid: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  location?: string;
  role: UserRole;
}

export interface LiveTranscript {
    role: 'user' | 'model';
    text: string;
}

export type MarketTrend = 'up' | 'flat' | 'down';

export interface MarketRate {
  id: string;
  crop: string;
  pricePerQuintal: number;
  changePct: number;
  trend: MarketTrend;
  updatedAt: Date;
}

export interface FarmerDashboardWeather {
  locationLabel: string;
  temperatureC: number;
  conditionLabel: string;
  weatherIcon: string;
  humidityPct: number;
  windKmh: number;
  rainPct: number;
  updatedAt: Date;
}

export enum TransactionType {
  Payment = 'Payment',
  Withdrawal = 'Withdrawal',
  TopUp = 'TopUp',
  Subsidy = 'Subsidy',
}

export enum TransactionStatus {
  Completed = 'Completed',
  Pending = 'Pending',
  Failed = 'Failed',
}

export interface Transaction {
  id: string;
  farmerId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  timestamp: Date;
  relatedId?: string; // negotiationId for payments, etc.
  metadata?: Record<string, any>;
}

export interface FarmerWallet {
  farmerId: string;
  totalBalance: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANDI PRICE DATA (Synced from Agmarknet via Scraper)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mandi price document structure - synced from Agmarknet government portal
 * Document ID format: {state}_{district}_{market}_{commodity}
 */
export interface MandiPriceDoc {
  /** State name (e.g., "West Bengal") */
  state: string;
  /** District name (e.g., "Kolkata") */
  district: string;
  /** Market/Mandi name (e.g., "Sealdah") */
  market: string;
  /** Commodity name (e.g., "Rice", "Wheat", "Potato") */
  commodity: string;
  /** Variety of the commodity (e.g., "Basmati", "Common") */
  variety: string;
  /** Quality grade (e.g., "FAQ", "Grade-A") */
  grade: string;
  /** Minimum price in ₹ per quintal */
  minPrice: number | null;
  /** Maximum price in ₹ per quintal */
  maxPrice: number | null;
  /** Modal (most common) price in ₹ per quintal */
  modalPrice: number | null;
  /** Date when this price was reported (ISO string) */
  reportDate: string;
  /** Data source identifier */
  source: 'agmarknet' | 'manual' | 'api';
  /** Original source URL */
  sourceUrl?: string;
  /** When this record was last synced/updated (ISO string) */
  lastUpdated: string;
  /** Whether this data has been verified/validated */
  isVerified: boolean;
  /** Price unit for display (e.g., "INR/Quintal") */
  priceUnit: string;
}

/**
 * Simplified mandi rate for display in widgets
 */
export interface MandiRateDisplay {
  commodity: string;
  market: string;
  pricePerQuintal: number;
  pricePerKg: number;
  change24h?: number;
  trend: MarketTrend;
  lastUpdated: Date;
  isVerified: boolean;
}

/**
 * Convert MandiPriceDoc to per-kg pricing for app usage
 */
export function mandiDocToRateDisplay(doc: MandiPriceDoc): MandiRateDisplay {
  const pricePerQuintal = doc.modalPrice ?? doc.maxPrice ?? doc.minPrice ?? 0;
  return {
    commodity: doc.commodity,
    market: doc.market,
    pricePerQuintal,
    pricePerKg: Math.round((pricePerQuintal / 100) * 100) / 100, // Quintal = 100kg
    trend: 'flat', // Would need historical data to calculate
    lastUpdated: new Date(doc.lastUpdated),
    isVerified: doc.isVerified,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DODO PAYMENTS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dodo payment status enum
 */
export enum DodoPaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Dodo payment record stored in Firestore (dodo_payments collection)
 */
export interface DodoPaymentRecord {
  /** Dodo payment ID */
  paymentId: string;
  /** Our internal order ID */
  orderId: string;
  /** Buyer user ID */
  buyerId: string;
  /** Amount in paise (smallest currency unit) */
  amount: number;
  /** Currency code */
  currency: string;
  /** Product/order description */
  productName: string;
  /** Dodo checkout URL */
  checkoutUrl: string;
  /** Payment status */
  status: DodoPaymentStatus;
  /** Order items */
  items: Array<{
    productId: string;
    farmerId: string;
    quantity: number;
    price: number; // in paise
  }>;
  /** Raw Dodo API response */
  dodoResponse?: Record<string, unknown>;
  /** Whether webhook has been received */
  webhookReceived?: boolean;
  /** Raw webhook data */
  webhookData?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTANCE & DELIVERY PRICING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Coordinates for GPS location
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Stored location with metadata for Farmer/Buyer profiles
 */
export interface StoredLocation {
  /** GPS coordinates */
  coordinates: Coordinates;
  /** State name */
  state: string;
  /** District name */
  district: string;
  /** City/Town name */
  city?: string;
  /** Locality/Area name */
  locality?: string;
  /** Country */
  country?: string;
  /** Postal/PIN code */
  postalCode?: string;
  /** Full formatted address */
  formattedAddress?: string;
  /** Location accuracy in meters */
  accuracy?: number;
  /** When location was captured */
  timestamp: number;
  /** Source of location data */
  source: 'gps' | 'manual' | 'ip-fallback';
}

/**
 * Distance Matrix API result
 */
export interface DistanceResult {
  /** Distance in meters (raw API value) */
  distanceMeters: number;
  /** Distance in kilometers */
  distanceKm: number;
  /** Human-readable distance */
  distanceText: string;
  /** Duration in seconds (without traffic) */
  durationSeconds: number;
  /** Duration in minutes */
  durationMinutes: number;
  /** Human-readable duration */
  durationText: string;
  /** Traffic-adjusted duration in seconds */
  durationInTrafficSeconds?: number;
  /** Traffic-adjusted duration in minutes */
  durationInTrafficMinutes?: number;
  /** Traffic-adjusted duration text */
  durationInTrafficText?: string;
  /** API status */
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'INVALID_REQUEST';
  /** Origin coordinates */
  origin: Coordinates;
  /** Destination coordinates */
  destination: Coordinates;
  /** Whether from cache */
  fromCache: boolean;
  /** Calculation timestamp */
  calculatedAt: number;
}

/**
 * Delivery pricing tier configuration
 */
export interface DeliveryPricingTier {
  /** Minimum distance for this tier (km) */
  minKm: number;
  /** Maximum distance for this tier (km) */
  maxKm: number;
  /** Base delivery fee (₹) */
  baseFee: number;
  /** Rate per km (₹/km) */
  ratePerKm: number;
}

/**
 * Complete delivery quote with pricing breakdown
 */
export interface DeliveryQuote {
  /** Total delivery fee in ₹ */
  deliveryFee: number;
  /** Distance in km */
  distanceKm: number;
  /** Estimated delivery time in minutes */
  estimatedMinutes: number;
  /** Traffic-adjusted delivery time */
  trafficAdjustedMinutes?: number;
  /** Pricing tier name */
  tier: string;
  /** Price breakdown */
  breakdown: {
    baseFee: number;
    distanceCharge: number;
    trafficPremium: number;
  };
  /** Whether delivery is possible */
  isDeliverable: boolean;
  /** Reason if not deliverable */
  unavailableReason?: string;
  /** Price lock expiry timestamp */
  priceLockExpiresAt: number;
}

/**
 * Order with delivery pricing
 */
export interface OrderWithDelivery {
  /** Order ID */
  orderId: string;
  /** Product subtotal in ₹ */
  productSubtotal: number;
  /** Delivery fee in ₹ */
  deliveryFee: number;
  /** Total amount in ₹ */
  totalAmount: number;
  /** Distance between farmer and buyer */
  distanceKm: number;
  /** Estimated delivery time in minutes */
  estimatedDeliveryMinutes: number;
  /** Farmer coordinates */
  farmerCoordinates: Coordinates;
  /** Buyer coordinates */
  buyerCoordinates: Coordinates;
  /** When distance was calculated */
  distanceCalculatedAt: number;
  /** Delivery quote details */
  deliveryQuote: DeliveryQuote;
}

/**
 * Farmer profile with location data
 */
export interface FarmerLocationProfile {
  farmerId: string;
  farmerName: string;
  /** Current stored location */
  location: StoredLocation;
  /** Whether location is verified */
  isLocationVerified: boolean;
  /** Last location update */
  lastLocationUpdate: number;
}

/**
 * Buyer session location (current session only)
 */
export interface BuyerSessionLocation {
  buyerId: string;
  /** Current session location */
  location: StoredLocation;
  /** Session start time */
  sessionStartedAt: number;
  /** Whether location was manually entered */
  isManualEntry: boolean;
}