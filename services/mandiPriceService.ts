/**
 * MANDI PRICE SERVICE
 * 
 * Provides dynamic price calculations for B2B bulk negotiations.
 * Computes floor prices, target prices, and offer classifications
 * based on real-time mandi data from Firestore.
 */

import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

/** National average fallback prices per quintal (₹) when mandi data unavailable */
const NATIONAL_FALLBACK_PRICES: Record<string, number> = {
  // Vegetables
  'tomato': 2500,
  'potato': 1500,
  'onion': 2000,
  'cabbage': 1200,
  'cauliflower': 2000,
  'brinjal': 1800,
  'capsicum': 3000,
  'carrot': 2200,
  // Fruits
  'apple': 8000,
  'banana': 2500,
  'mango': 6000,
  'orange': 4000,
  'grapes': 5000,
  'papaya': 2000,
  // Grains
  'wheat': 2500,
  'rice': 3500,
  'maize': 2000,
  // Default
  'default': 2500,
};

/** Quality factor multipliers based on AI-assessed grade */
const QUALITY_FACTORS: Record<string, number> = {
  'A': 1.0,      // Premium quality
  'B': 0.85,    // Standard quality
  'C': 0.70,    // Economy quality
  'default': 0.85,
};

/** Per-quintal logistics cost estimates by region (₹) */
const LOGISTICS_PER_QUINTAL: Record<string, number> = {
  'local': 50,      // Same district
  'regional': 150,  // Same state
  'national': 300,  // Cross-state
  'default': 150,
};

/** Margin percentages for target price calculation */
const GRADE_MARGINS: Record<string, number> = {
  'A': 0.15,  // 15% margin for Grade A
  'B': 0.10,  // 10% margin for Grade B
  'C': 0.05,  // 5% margin for Grade C
  'default': 0.10,
};

// ============================================
// INTERFACES
// ============================================

export interface MandiPrice {
  commodityName: string;
  state: string;
  district: string;
  marketName: string;
  minPrice: number;   // per quintal
  maxPrice: number;   // per quintal
  modalPrice: number; // per quintal (most common price)
  updatedAt: Date;
  source: string;
}

export interface PriceBand {
  floorPrice: number;      // Minimum acceptable price (per kg)
  targetPrice: number;     // Suggested fair price (per kg)
  stretchPrice: number;    // Above-market price (per kg)
  baseMandiPrice: number;  // Reference mandi modal price (per quintal)
  qualityFactor: number;   // Applied quality multiplier
  isVerified: boolean;     // Whether mandi data was available
  priceSource: string;     // Description of price source
  updatedAt: Date | null;
}

export interface OfferClassification {
  status: 'INVALID' | 'LOW' | 'FAIR' | 'GENEROUS';
  colorClass: string;
  bgClass: string;
  message: string;
  percentDiff: number;
}

export interface PriceValidationResult {
  isValid: boolean;
  classification: OfferClassification;
  priceBand: PriceBand;
  errorMessage?: string;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Fetch mandi price from Firestore for a specific commodity and location
 */
export async function fetchMandiPrice(
  commodityName: string,
  state?: string,
  district?: string
): Promise<MandiPrice | null> {
  try {
    const normalizedCommodity = commodityName.toLowerCase().trim();
    
    // Try exact match first (commodity + district)
    if (state && district) {
      const exactDocId = `${state.toLowerCase()}_${district.toLowerCase()}_${normalizedCommodity}`
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      const exactDoc = await getDoc(doc(db, 'mandiPrices', exactDocId));
      if (exactDoc.exists()) {
        const data = exactDoc.data();
        return {
          commodityName: data.commodityName,
          state: data.state,
          district: data.district,
          marketName: data.marketName,
          minPrice: Number(data.minPrice || 0),
          maxPrice: Number(data.maxPrice || 0),
          modalPrice: Number(data.modalPrice || 0),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          source: data.source || 'mandi',
        };
      }
    }
    
    // Fallback: Query by commodity and state
    if (state) {
      const stateQuery = query(
        collection(db, 'mandiPrices'),
        where('state', '==', state),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      
      const stateSnap = await getDocs(stateQuery);
      for (const docSnap of stateSnap.docs) {
        const data = docSnap.data();
        if (data.commodityName?.toLowerCase().includes(normalizedCommodity)) {
          return {
            commodityName: data.commodityName,
            state: data.state,
            district: data.district,
            marketName: data.marketName,
            minPrice: Number(data.minPrice || 0),
            maxPrice: Number(data.maxPrice || 0),
            modalPrice: Number(data.modalPrice || 0),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            source: data.source || 'mandi',
          };
        }
      }
    }
    
    // Fallback: Any matching commodity nationally
    const nationalQuery = query(
      collection(db, 'mandiPrices'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    
    const nationalSnap = await getDocs(nationalQuery);
    for (const docSnap of nationalSnap.docs) {
      const data = docSnap.data();
      if (data.commodityName?.toLowerCase().includes(normalizedCommodity)) {
        return {
          commodityName: data.commodityName,
          state: data.state,
          district: data.district,
          marketName: data.marketName,
          minPrice: Number(data.minPrice || 0),
          maxPrice: Number(data.maxPrice || 0),
          modalPrice: Number(data.modalPrice || 0),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          source: data.source || 'mandi',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('fetchMandiPrice error:', error);
    return null;
  }
}

/**
 * Get national fallback price for a commodity (per quintal)
 */
export function getFallbackPrice(commodityName: string): number {
  const normalized = commodityName.toLowerCase().trim();
  
  // Check for partial matches
  for (const [key, price] of Object.entries(NATIONAL_FALLBACK_PRICES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return price;
    }
  }
  
  return NATIONAL_FALLBACK_PRICES['default'];
}

/**
 * Compute complete price band for a product
 * 
 * @param commodityName - Name of the crop/product
 * @param grade - AI-assessed quality grade (A, B, C)
 * @param state - Farmer's state
 * @param district - Farmer's district
 * @param logisticsType - 'local' | 'regional' | 'national'
 */
export async function computePriceBand(
  commodityName: string,
  grade: string = 'B',
  state?: string,
  district?: string,
  logisticsType: 'local' | 'regional' | 'national' = 'regional'
): Promise<PriceBand> {
  // Fetch mandi price
  const mandiPrice = await fetchMandiPrice(commodityName, state, district);
  
  // Determine base price (per quintal)
  let baseMandiPrice: number;
  let isVerified: boolean;
  let priceSource: string;
  let updatedAt: Date | null = null;
  
  if (mandiPrice && mandiPrice.modalPrice > 0) {
    baseMandiPrice = mandiPrice.modalPrice;
    isVerified = true;
    priceSource = `${mandiPrice.marketName} (${mandiPrice.district}, ${mandiPrice.state})`;
    updatedAt = mandiPrice.updatedAt;
  } else {
    baseMandiPrice = getFallbackPrice(commodityName);
    isVerified = false;
    priceSource = 'National average (mandi data unavailable)';
  }
  
  // Get quality factor
  const qualityFactor = QUALITY_FACTORS[grade.toUpperCase()] || QUALITY_FACTORS['default'];
  
  // Get logistics cost per quintal
  const logisticsCost = LOGISTICS_PER_QUINTAL[logisticsType] || LOGISTICS_PER_QUINTAL['default'];
  
  // Get margin for target price
  const margin = GRADE_MARGINS[grade.toUpperCase()] || GRADE_MARGINS['default'];
  
  // Calculate floor price per quintal: (BasePrice × QualityFactor) + Logistics
  const floorPerQuintal = (baseMandiPrice * qualityFactor) + logisticsCost;
  
  // Calculate target price per quintal: BasePrice × (1 + Margin) × QualityFactor
  const targetPerQuintal = baseMandiPrice * (1 + margin) * qualityFactor;
  
  // Calculate stretch price: Target × 1.1
  const stretchPerQuintal = targetPerQuintal * 1.1;
  
  // Convert to per kg (1 quintal = 100 kg)
  const floorPrice = Math.round(floorPerQuintal / 100 * 100) / 100; // Round to 2 decimals
  const targetPrice = Math.round(targetPerQuintal / 100 * 100) / 100;
  const stretchPrice = Math.round(stretchPerQuintal / 100 * 100) / 100;
  
  return {
    floorPrice,
    targetPrice,
    stretchPrice,
    baseMandiPrice,
    qualityFactor,
    isVerified,
    priceSource,
    updatedAt,
  };
}

/**
 * Classify a buyer's offer relative to the price band
 */
export function classifyOffer(
  offerPrice: number,
  priceBand: PriceBand
): OfferClassification {
  const { floorPrice, targetPrice, stretchPrice } = priceBand;
  
  // Calculate percentage difference from target
  const percentDiff = Math.round(((offerPrice - targetPrice) / targetPrice) * 100);
  
  if (offerPrice < floorPrice) {
    return {
      status: 'INVALID',
      colorClass: 'text-red-600',
      bgClass: 'bg-red-100 border-red-300',
      message: `Offer is ₹${(floorPrice - offerPrice).toFixed(2)}/kg below minimum floor price`,
      percentDiff,
    };
  }
  
  if (offerPrice < targetPrice) {
    return {
      status: 'LOW',
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-100 border-orange-300',
      message: `Offer is ${Math.abs(percentDiff)}% below fair market price`,
      percentDiff,
    };
  }
  
  if (offerPrice <= stretchPrice) {
    return {
      status: 'FAIR',
      colorClass: 'text-green-600',
      bgClass: 'bg-green-100 border-green-300',
      message: `Offer is at fair market value`,
      percentDiff,
    };
  }
  
  return {
    status: 'GENEROUS',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-100 border-blue-300',
    message: `Offer is ${percentDiff}% above market price`,
    percentDiff,
  };
}

/**
 * Validate a price offer against the floor price
 * Returns full validation result with classification
 */
export async function validateOfferPrice(
  offerPrice: number,
  commodityName: string,
  grade: string = 'B',
  state?: string,
  district?: string
): Promise<PriceValidationResult> {
  const priceBand = await computePriceBand(commodityName, grade, state, district);
  const classification = classifyOffer(offerPrice, priceBand);
  
  const isValid = classification.status !== 'INVALID';
  
  return {
    isValid,
    classification,
    priceBand,
    errorMessage: isValid ? undefined : `Offer cannot be below the minimum fair mandi-adjusted price of ₹${priceBand.floorPrice}/kg`,
  };
}

/**
 * Synchronous floor price check (for server-side validation)
 * Uses cached price band from negotiation document
 */
export function checkPriceFloor(
  offerPrice: number,
  floorPrice: number
): { isValid: boolean; errorMessage?: string } {
  if (offerPrice < floorPrice) {
    return {
      isValid: false,
      errorMessage: `Offer of ₹${offerPrice}/kg is below the floor price of ₹${floorPrice}/kg`,
    };
  }
  return { isValid: true };
}

// ============================================
// BULK QUANTITY VALIDATION
// ============================================

/** Minimum bulk order quantity in kg (1 quintal) */
export const MIN_BULK_QUANTITY_KG = 100;

/** Validate bulk order quantity */
export function validateBulkQuantity(quantityKg: number): { isValid: boolean; errorMessage?: string } {
  if (quantityKg < MIN_BULK_QUANTITY_KG) {
    return {
      isValid: false,
      errorMessage: `Minimum bulk order is ${MIN_BULK_QUANTITY_KG}kg (1 quintal). Current: ${quantityKg}kg`,
    };
  }
  return { isValid: true };
}

/**
 * Format quantity for display in bulk context
 */
export function formatBulkQuantity(quantityKg: number): string {
  if (quantityKg >= 1000) {
    const tons = quantityKg / 1000;
    return `${tons.toFixed(1)} ton${tons > 1 ? 's' : ''}`;
  }
  const quintals = quantityKg / 100;
  if (quintals >= 1) {
    return `${quintals.toFixed(1)} quintal${quintals > 1 ? 's' : ''} (${quantityKg}kg)`;
  }
  return `${quantityKg}kg`;
}
