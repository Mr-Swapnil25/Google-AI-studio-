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
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  id: string;
  negotiationId: string;
  senderId: string; // e.g., 'b1' for buyer, 'f1' for farmer
  text: string;
  timestamp: Date;
  status?: MessageStatus; // Optional for backward compatibility
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