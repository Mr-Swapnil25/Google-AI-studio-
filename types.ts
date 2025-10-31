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
  CounterOffer = 'Counter-Offer',
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
  role: UserRole;
}

export interface LiveTranscript {
    role: 'user' | 'model';
    text: string;
}