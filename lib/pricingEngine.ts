/**
 * DYNAMIC MANDI PRICE ENGINE
 * 
 * This module contains the core pricing logic that:
 * 1. Calculates floor/target/stretch prices based on mandi data
 * 2. Classifies buyer offers as invalid/low/fair/generous
 * 3. Protects farmers from predatory lowball offers
 */

import { 
  MandiPrice, 
  PricingEngineResult, 
  QualityGrade, 
  OfferClassification, 
  OfferAnalysis,
  ProductCategory 
} from '../types';

// ============================================
// CONSTANTS
// ============================================

/** Standard logistics deduction per kg (₹) */
const STANDARD_LOGISTICS_DEDUCTION = 1.5;

/** Target price margin (15% above floor for farmer profit) */
const TARGET_MARGIN_MULTIPLIER = 1.15;

/** Stretch price margin (30% above floor for generous offers) */
const STRETCH_MARGIN_MULTIPLIER = 1.30;

/** Quality grade multipliers */
const GRADE_MULTIPLIERS: Record<QualityGrade, number> = {
  'A': 1.10,  // Premium quality gets 10% bonus
  'B': 1.00,  // Standard quality
  'C': 0.90,  // Lower quality gets 10% reduction
};

/** 
 * National average prices per quintal (fallback when no mandi data)
 * These are conservative estimates based on typical Indian mandi prices
 */
const NATIONAL_AVERAGES: Record<string, number> = {
  // Grains
  'wheat': 2500,
  'rice': 2800,
  'maize': 2100,
  'bajra': 2400,
  'jowar': 2600,
  // Vegetables
  'tomato': 3500,
  'potato': 1800,
  'onion': 2200,
  'cabbage': 1500,
  'cauliflower': 2500,
  'brinjal': 2800,
  'ladyfinger': 3200,
  'cucumber': 2000,
  'carrot': 2500,
  'beans': 4500,
  'capsicum': 4000,
  'spinach': 2000,
  // Fruits
  'apple': 8000,
  'banana': 3000,
  'mango': 6000,
  'orange': 4500,
  'grapes': 7000,
  'papaya': 2500,
  'watermelon': 1500,
  'pomegranate': 8500,
  'guava': 3500,
  // Default
  'default': 2500,
};

/** Category-based fallback averages */
const CATEGORY_AVERAGES: Record<ProductCategory, number> = {
  [ProductCategory.Grain]: 2500,
  [ProductCategory.Vegetable]: 2800,
  [ProductCategory.Fruit]: 5000,
  [ProductCategory.Other]: 2500,
};

// ============================================
// CORE PRICING FUNCTIONS
// ============================================

/**
 * Normalize commodity name for matching
 */
function normalizeCommodityName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Get national average price for a commodity
 */
function getNationalAveragePrice(commodityName: string, category?: ProductCategory): number {
  const normalized = normalizeCommodityName(commodityName);
  
  // Try exact match first
  if (NATIONAL_AVERAGES[normalized]) {
    return NATIONAL_AVERAGES[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(NATIONAL_AVERAGES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Fall back to category average
  if (category) {
    return CATEGORY_AVERAGES[category];
  }
  
  return NATIONAL_AVERAGES['default'];
}

/**
 * Calculate the quality multiplier based on grade
 */
export function getQualityMultiplier(grade: QualityGrade): number {
  return GRADE_MULTIPLIERS[grade] || GRADE_MULTIPLIERS['B'];
}

/**
 * Convert grade label to QualityGrade type
 */
export function parseGradeLabel(gradeLabel: string): QualityGrade {
  const normalized = gradeLabel.toUpperCase().trim();
  if (normalized === 'A' || normalized.includes('PREMIUM')) return 'A';
  if (normalized === 'C' || normalized.includes('LOW') || normalized.includes('STANDARD')) return 'C';
  return 'B';
}

/**
 * MAIN PRICING ENGINE
 * 
 * Calculates floor, target, and stretch prices based on:
 * - Mandi modal price (or national average fallback)
 * - Quality grade (A/B/C)
 * - Standard logistics deduction
 * 
 * Formula:
 * 1. BaseKgPrice = ModalPrice / 100 (quintal to kg conversion)
 * 2. AdjustedPrice = BaseKgPrice * QualityMultiplier
 * 3. FloorPrice = AdjustedPrice - LogisticsDeduction
 * 4. TargetPrice = FloorPrice * 1.15 (15% farmer margin)
 * 5. StretchPrice = FloorPrice * 1.30 (30% premium)
 */
export function calculatePricing(
  mandiPrice: MandiPrice | null,
  commodityName: string,
  grade: QualityGrade = 'B',
  category?: ProductCategory
): PricingEngineResult {
  
  const qualityMultiplier = getQualityMultiplier(grade);
  let modalPricePerQuintal: number;
  let isFallback = false;
  let fallbackReason: string | undefined;
  let mandiReference: PricingEngineResult['mandiReference'] = null;

  if (mandiPrice && mandiPrice.modalPrice > 0) {
    // Use real mandi data
    modalPricePerQuintal = mandiPrice.modalPrice;
    mandiReference = {
      marketName: mandiPrice.marketName,
      modalPricePerQuintal: mandiPrice.modalPrice,
      modalPricePerKg: mandiPrice.modalPrice / 100,
      priceDate: mandiPrice.updatedAt,
    };
  } else {
    // Fallback to national average
    modalPricePerQuintal = getNationalAveragePrice(commodityName, category);
    isFallback = true;
    fallbackReason = mandiPrice 
      ? 'Mandi price data is unavailable or zero'
      : 'No mandi data found for your location';
  }

  // Step 1: Convert quintal to kg
  const baseKgPrice = modalPricePerQuintal / 100;

  // Step 2: Apply quality multiplier
  const adjustedPrice = baseKgPrice * qualityMultiplier;

  // Step 3: Calculate floor (deduct logistics)
  const floorPrice = Math.max(1, adjustedPrice - STANDARD_LOGISTICS_DEDUCTION);

  // Step 4: Calculate target (15% margin)
  const targetPrice = floorPrice * TARGET_MARGIN_MULTIPLIER;

  // Step 5: Calculate stretch (30% margin)
  const stretchPrice = floorPrice * STRETCH_MARGIN_MULTIPLIER;

  return {
    floorPrice: Math.round(floorPrice * 100) / 100,
    targetPrice: Math.round(targetPrice * 100) / 100,
    stretchPrice: Math.round(stretchPrice * 100) / 100,
    qualityMultiplier,
    logisticsDeduction: STANDARD_LOGISTICS_DEDUCTION,
    mandiReference,
    isFallback,
    fallbackReason,
  };
}

// ============================================
// OFFER CLASSIFICATION
// ============================================

/**
 * Classify a buyer's offer against the pricing engine result
 * 
 * - INVALID: offer < floorPrice (blocked)
 * - LOW: floorPrice <= offer < targetPrice * 0.95 (warning)
 * - FAIR: targetPrice * 0.95 <= offer <= targetPrice * 1.05
 * - GENEROUS: offer > targetPrice * 1.05
 */
export function classifyOffer(
  offerPrice: number,
  pricing: PricingEngineResult
): OfferClassification {
  const { floorPrice, targetPrice } = pricing;

  if (offerPrice < floorPrice) {
    return 'invalid';
  }

  if (offerPrice < targetPrice * 0.95) {
    return 'low';
  }

  if (offerPrice <= targetPrice * 1.05) {
    return 'fair';
  }

  return 'generous';
}

/**
 * Get detailed offer analysis with UI-ready properties
 */
export function analyzeOffer(
  offerPrice: number,
  pricing: PricingEngineResult,
  district?: string
): OfferAnalysis {
  const { floorPrice, targetPrice, mandiReference } = pricing;
  const classification = classifyOffer(offerPrice, pricing);
  
  // Calculate percentage difference from target
  const percentageDiff = ((offerPrice - targetPrice) / targetPrice) * 100;
  const diffText = Math.abs(percentageDiff).toFixed(1);
  
  const marketName = mandiReference?.marketName || district || 'your region';

  switch (classification) {
    case 'invalid':
      return {
        classification,
        colorClass: 'text-red-600 bg-red-50 border-red-200',
        icon: 'block',
        message: `Offer Rejected: Minimum fair market price for this quality in ${marketName} is ₹${floorPrice.toFixed(2)}/kg.`,
        percentageDiff,
        canSubmit: false,
      };

    case 'low':
      return {
        classification,
        colorClass: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: 'warning',
        message: `Low offer: ${diffText}% below market rate. Consider offering closer to ₹${targetPrice.toFixed(2)}/kg.`,
        percentageDiff,
        canSubmit: true,
      };

    case 'fair':
      return {
        classification,
        colorClass: 'text-green-600 bg-green-50 border-green-200',
        icon: 'check_circle',
        message: `Fair offer! This aligns with current market rates in ${marketName}.`,
        percentageDiff,
        canSubmit: true,
      };

    case 'generous':
      return {
        classification,
        colorClass: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: 'thumb_up',
        message: `Generous offer! ${diffText}% above market rate. Farmers will appreciate this.`,
        percentageDiff,
        canSubmit: true,
      };
  }
}

/**
 * Format price for display in INR
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Get color class for price badge based on comparison to target
 */
export function getPriceComparisonColor(price: number, targetPrice: number): string {
  const ratio = price / targetPrice;
  if (ratio < 0.9) return 'text-red-600';
  if (ratio < 0.98) return 'text-orange-500';
  if (ratio <= 1.05) return 'text-green-600';
  return 'text-blue-600';
}
