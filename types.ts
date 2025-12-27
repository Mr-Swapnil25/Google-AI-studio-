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
  Retail = 'Retail',
  Bulk = 'Bulk',
}

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
  quantity: number;
  status: NegotiationStatus;
  notes: string;
  lastUpdated: Date;
}

export interface ChatMessage {
  id: string;
  negotiationId: string;
  senderId: string; // e.g., 'b1' for buyer, 'f1' for farmer
  text: string;
  timestamp: Date;
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

// ============================================
// DYNAMIC MANDI PRICE ENGINE TYPES
// ============================================

/** Represents a live mandi (market) price record */
export interface MandiPrice {
  id: string;
  commodityName: string;
  state: string;
  district: string;
  marketName: string;
  minPrice: number;      // ₹ per quintal
  maxPrice: number;      // ₹ per quintal
  modalPrice: number;    // ₹ per quintal (most common price)
  updatedAt: Date;
  source: 'agmarknet' | 'datagov' | 'state_portal' | 'fallback';
  isStale: boolean;      // True if data > 48 hours old
}

/** Result from the pricing engine calculations */
export interface PricingEngineResult {
  floorPrice: number;       // ₹/kg - absolute minimum (buyer cannot go below)
  targetPrice: number;      // ₹/kg - recommended fair price
  stretchPrice: number;     // ₹/kg - premium/generous price
  qualityMultiplier: number;
  logisticsDeduction: number;
  mandiReference: {
    marketName: string;
    modalPricePerQuintal: number;
    modalPricePerKg: number;
    priceDate: Date;
  } | null;
  isFallback: boolean;      // True if using national average
  fallbackReason?: string;
}

/** Classification of a buyer's offer */
export type OfferClassification = 
  | 'invalid'    // Below floor - blocked
  | 'low'        // Above floor but below target - orange warning
  | 'fair'       // Around target - green
  | 'generous';  // Above target - blue/premium

/** Detailed offer analysis result */
export interface OfferAnalysis {
  classification: OfferClassification;
  colorClass: string;
  icon: string;
  message: string;
  percentageDiff: number;  // vs target price (negative = below)
  canSubmit: boolean;
}

/** Location data extracted from geolocation */
export interface GeoLocation {
  state: string;
  district: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isAutoDetected: boolean;
}

/** Quality grade for pricing calculations */
export type QualityGrade = 'A' | 'B' | 'C';