/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNA BAZAAR - DISTANCE MATRIX SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Calculates accurate road distance, travel time, and traffic-adjusted duration
 * between Farmer and Buyer locations using Google Distance Matrix API.
 * 
 * Features:
 * - Real-time distance calculation (road distance, not straight-line)
 * - Traffic-aware travel time estimation
 * - 5-minute result caching for same origin-destination pairs
 * - Haversine formula fallback when API fails
 * - Comprehensive error handling with retry logic
 * 
 * API Requirements (must be enabled in Google Cloud Console):
 * - Distance Matrix API
 * - Geocoding API
 * - Directions API (optional for route display)
 * 
 * @author Anna Bazaar Team - Calcutta Hacks 2025
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE MAPS API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const GOOGLE_MAPS_API_KEY = 'AIzaSyCGGq8VUFMbE6KTzrzxIRjtxu7AI8os1O4';

/** Cache validity period for distance results (5 minutes) */
const DISTANCE_CACHE_VALIDITY = 5 * 60 * 1000;

/** Maximum retries for API requests */
const MAX_RETRIES = 3;

/** Retry delay in milliseconds */
const RETRY_DELAY = 2000;

/** Maximum delivery distance in km */
const MAX_DELIVERY_DISTANCE_KM = 200;

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  /** Distance in meters (raw API value) */
  distanceMeters: number;
  /** Distance in kilometers */
  distanceKm: number;
  /** Human-readable distance (e.g., "15.3 km") */
  distanceText: string;
  /** Duration in seconds (without traffic) */
  durationSeconds: number;
  /** Duration in minutes */
  durationMinutes: number;
  /** Human-readable duration (e.g., "25 mins") */
  durationText: string;
  /** Traffic-adjusted duration in seconds (real-time) */
  durationInTrafficSeconds?: number;
  /** Traffic-adjusted duration in minutes */
  durationInTrafficMinutes?: number;
  /** Traffic-adjusted human-readable duration */
  durationInTrafficText?: string;
  /** API status code */
  status: DistanceMatrixStatus;
  /** Origin coordinates used */
  origin: Coordinates;
  /** Destination coordinates used */
  destination: Coordinates;
  /** Whether result is from cache */
  fromCache: boolean;
  /** Timestamp when result was calculated */
  calculatedAt: number;
}

export interface DistanceError {
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'ZERO_RESULTS' | 'INVALID_COORDINATES' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'MAX_DISTANCE_EXCEEDED' | 'UNKNOWN';
  message: string;
  status?: string;
}

export type DistanceMatrixStatus = 
  | 'OK'
  | 'NOT_FOUND'
  | 'ZERO_RESULTS'
  | 'MAX_ROUTE_LENGTH_EXCEEDED'
  | 'INVALID_REQUEST';

export interface DeliveryPricingTier {
  minKm: number;
  maxKm: number;
  baseFee: number;    // ₹
  ratePerKm: number;  // ₹/km
}

export interface DeliveryQuote {
  /** Delivery fee in ₹ */
  deliveryFee: number;
  /** Distance in km */
  distanceKm: number;
  /** Estimated delivery time in minutes */
  estimatedMinutes: number;
  /** Traffic-adjusted delivery time in minutes */
  trafficAdjustedMinutes?: number;
  /** Pricing tier applied */
  tier: string;
  /** Price breakdown for display */
  breakdown: {
    baseFee: number;
    distanceCharge: number;
    trafficPremium: number;
  };
  /** Whether delivery is available */
  isDeliverable: boolean;
  /** Reason if not deliverable */
  unavailableReason?: string;
  /** Price lock expiry (15 minutes from calculation) */
  priceLockExpiresAt: number;
}

export interface ProximityRankedFarmer {
  farmerId: string;
  farmerName: string;
  distanceKm: number;
  durationMinutes: number;
  deliveryFee: number;
  coordinates: Coordinates;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY PRICING TIERS (Per Requirements)
// ═══════════════════════════════════════════════════════════════════════════════

export const DELIVERY_PRICING_TIERS: DeliveryPricingTier[] = [
  { minKm: 0, maxKm: 10, baseFee: 0, ratePerKm: 0 },           // Free delivery
  { minKm: 11, maxKm: 25, baseFee: 20, ratePerKm: 2 },         // ₹20 + ₹2/km
  { minKm: 26, maxKm: 50, baseFee: 50, ratePerKm: 3 },         // ₹50 + ₹3/km
  { minKm: 51, maxKm: MAX_DELIVERY_DISTANCE_KM, baseFee: 100, ratePerKm: 5 }, // ₹100 + ₹5/km
];

/** Traffic premium rate per minute of delay */
const TRAFFIC_PREMIUM_RATE = 0.50; // ₹0.50 per minute of traffic delay

/** Price lock duration in milliseconds (15 minutes) */
const PRICE_LOCK_DURATION = 15 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// DISTANCE RESULT CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  result: DistanceResult;
  cachedAt: number;
}

const distanceCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from origin-destination pair
 */
function getCacheKey(origin: Coordinates, destination: Coordinates): string {
  return `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}_${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
}

/**
 * Get cached distance result if still valid
 */
function getCachedDistance(origin: Coordinates, destination: Coordinates): DistanceResult | null {
  const key = getCacheKey(origin, destination);
  const entry = distanceCache.get(key);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.cachedAt > DISTANCE_CACHE_VALIDITY) {
    console.log('[DistanceMatrix] Cache expired, removing...');
    distanceCache.delete(key);
    return null;
  }
  
  console.log('[DistanceMatrix] Returning cached distance result');
  return { ...entry.result, fromCache: true };
}

/**
 * Cache distance result
 */
function cacheDistance(origin: Coordinates, destination: Coordinates, result: DistanceResult): void {
  const key = getCacheKey(origin, destination);
  distanceCache.set(key, {
    result: { ...result, fromCache: false },
    cachedAt: Date.now(),
  });
  console.log('[DistanceMatrix] Distance result cached');
}

/**
 * Clear distance cache
 */
export function clearDistanceCache(): void {
  distanceCache.clear();
  console.log('[DistanceMatrix] Cache cleared');
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate coordinates are within valid range
 */
export function validateCoordinates(coords: Coordinates): { valid: boolean; error?: string } {
  if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }
  
  if (isNaN(coords.lat) || isNaN(coords.lng)) {
    return { valid: false, error: 'Coordinates cannot be NaN' };
  }
  
  if (coords.lat < -90 || coords.lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (coords.lng < -180 || coords.lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  // Check if coordinates are in ocean (basic check for India)
  if (coords.lat < 6 || coords.lat > 36 || coords.lng < 68 || coords.lng > 98) {
    console.warn('[DistanceMatrix] Coordinates may be outside India bounds');
  }
  
  return { valid: true };
}

/**
 * Check if coordinates represent a valid land location (basic check)
 */
export function isDeliverableLocation(coords: Coordinates): boolean {
  // Basic bounds check for India
  return coords.lat >= 6 && coords.lat <= 36 && coords.lng >= 68 && coords.lng <= 98;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAVERSINE FORMULA (FALLBACK CALCULATION)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate straight-line distance using Haversine formula
 * Used as fallback when Distance Matrix API is unavailable
 */
export function calculateHaversineDistance(origin: Coordinates, destination: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.lat)) * Math.cos(toRadians(destination.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate road distance from straight-line distance
 * Road distance is typically 1.3-1.5x straight-line distance
 */
export function estimateRoadDistance(straightLineKm: number): number {
  const roadFactor = 1.4; // Average road detour factor
  return Math.round(straightLineKm * roadFactor * 100) / 100;
}

/**
 * Estimate travel time from distance
 * Assumes average speed of 30 km/h in mixed traffic
 */
export function estimateTravelTime(distanceKm: number): number {
  const averageSpeedKmh = 30;
  return Math.round((distanceKm / averageSpeedKmh) * 60); // Minutes
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE DISTANCE MATRIX API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate distance and duration using Google Distance Matrix API
 * 
 * @param farmerCoords - Farmer's location (origin)
 * @param buyerCoords - Buyer's location (destination)
 * @param useCache - Whether to use cached results (default: true)
 */
export async function calculateDistance(
  farmerCoords: Coordinates,
  buyerCoords: Coordinates,
  useCache: boolean = true
): Promise<DistanceResult> {
  console.log('[DistanceMatrix] Starting distance calculation...');
  console.log(`[DistanceMatrix] Origin (Farmer): ${farmerCoords.lat.toFixed(6)}, ${farmerCoords.lng.toFixed(6)}`);
  console.log(`[DistanceMatrix] Destination (Buyer): ${buyerCoords.lat.toFixed(6)}, ${buyerCoords.lng.toFixed(6)}`);
  
  // Validate coordinates
  const originValidation = validateCoordinates(farmerCoords);
  if (!originValidation.valid) {
    throw {
      code: 'INVALID_COORDINATES',
      message: `Invalid farmer coordinates: ${originValidation.error}`,
    } as DistanceError;
  }
  
  const destValidation = validateCoordinates(buyerCoords);
  if (!destValidation.valid) {
    throw {
      code: 'INVALID_COORDINATES',
      message: `Invalid buyer coordinates: ${destValidation.error}`,
    } as DistanceError;
  }
  
  // Check cache first
  if (useCache) {
    const cached = getCachedDistance(farmerCoords, buyerCoords);
    if (cached) {
      console.log('[DistanceMatrix] Using cached result');
      return cached;
    }
  }
  
  // Build API URL
  const origin = `${farmerCoords.lat},${farmerCoords.lng}`;
  const destination = `${buyerCoords.lat},${buyerCoords.lng}`;
  
  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: 'driving',
    units: 'metric',
    departure_time: 'now', // For real-time traffic
    key: GOOGLE_MAPS_API_KEY,
  });
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
  
  // Retry logic
  let lastError: DistanceError | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[DistanceMatrix] API request attempt ${attempt}/${MAX_RETRIES}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('[DistanceMatrix] API Response:', JSON.stringify(data, null, 2));
      
      // Check top-level status
      if (data.status !== 'OK') {
        if (data.status === 'OVER_QUERY_LIMIT') {
          throw {
            code: 'OVER_QUERY_LIMIT',
            message: 'API quota exceeded. Using fallback calculation.',
            status: data.status,
          } as DistanceError;
        }
        if (data.status === 'REQUEST_DENIED') {
          throw {
            code: 'REQUEST_DENIED',
            message: 'API request denied. Check API key permissions.',
            status: data.status,
          } as DistanceError;
        }
        throw {
          code: 'API_ERROR',
          message: `Distance Matrix API error: ${data.status}`,
          status: data.status,
        } as DistanceError;
      }
      
      // Check element status
      const element = data.rows?.[0]?.elements?.[0];
      if (!element) {
        throw {
          code: 'API_ERROR',
          message: 'No distance data in API response',
        } as DistanceError;
      }
      
      if (element.status === 'ZERO_RESULTS') {
        throw {
          code: 'ZERO_RESULTS',
          message: 'No route found between locations. Delivery may not be possible.',
          status: element.status,
        } as DistanceError;
      }
      
      if (element.status !== 'OK') {
        throw {
          code: 'API_ERROR',
          message: `Route calculation failed: ${element.status}`,
          status: element.status,
        } as DistanceError;
      }
      
      // Extract distance and duration
      const distanceMeters = element.distance.value;
      const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
      const durationSeconds = element.duration.value;
      const durationMinutes = Math.round(durationSeconds / 60);
      
      // Check max distance
      if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
        throw {
          code: 'MAX_DISTANCE_EXCEEDED',
          message: `Distance (${distanceKm}km) exceeds maximum delivery range (${MAX_DELIVERY_DISTANCE_KM}km)`,
        } as DistanceError;
      }
      
      // Traffic-adjusted duration (if available)
      let durationInTrafficSeconds: number | undefined;
      let durationInTrafficMinutes: number | undefined;
      let durationInTrafficText: string | undefined;
      
      if (element.duration_in_traffic) {
        durationInTrafficSeconds = element.duration_in_traffic.value;
        durationInTrafficMinutes = Math.round(durationInTrafficSeconds / 60);
        durationInTrafficText = element.duration_in_traffic.text;
      }
      
      const result: DistanceResult = {
        distanceMeters,
        distanceKm,
        distanceText: element.distance.text,
        durationSeconds,
        durationMinutes,
        durationText: element.duration.text,
        durationInTrafficSeconds,
        durationInTrafficMinutes,
        durationInTrafficText,
        status: 'OK',
        origin: farmerCoords,
        destination: buyerCoords,
        fromCache: false,
        calculatedAt: Date.now(),
      };
      
      // Cache the result
      cacheDistance(farmerCoords, buyerCoords, result);
      
      console.log('[DistanceMatrix] Distance calculation complete:', {
        distance: `${distanceKm} km`,
        duration: `${durationMinutes} mins`,
        trafficDuration: durationInTrafficMinutes ? `${durationInTrafficMinutes} mins` : 'N/A',
      });
      
      return result;
      
    } catch (error) {
      lastError = error as DistanceError;
      
      // Don't retry for certain errors
      if (
        (error as DistanceError).code === 'ZERO_RESULTS' ||
        (error as DistanceError).code === 'INVALID_COORDINATES' ||
        (error as DistanceError).code === 'REQUEST_DENIED'
      ) {
        throw error;
      }
      
      // Wait before retry
      if (attempt < MAX_RETRIES) {
        console.log(`[DistanceMatrix] Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  // All retries failed, use fallback
  console.warn('[DistanceMatrix] All API attempts failed. Using Haversine fallback.');
  return calculateDistanceFallback(farmerCoords, buyerCoords);
}

/**
 * Fallback distance calculation using Haversine formula
 * Used when Google API is unavailable or quota exceeded
 */
export function calculateDistanceFallback(
  farmerCoords: Coordinates,
  buyerCoords: Coordinates
): DistanceResult {
  console.log('[DistanceMatrix] Using Haversine fallback calculation');
  
  const straightLineKm = calculateHaversineDistance(farmerCoords, buyerCoords);
  const estimatedRoadKm = estimateRoadDistance(straightLineKm);
  const estimatedMinutes = estimateTravelTime(estimatedRoadKm);
  
  return {
    distanceMeters: Math.round(estimatedRoadKm * 1000),
    distanceKm: estimatedRoadKm,
    distanceText: `~${estimatedRoadKm} km (estimated)`,
    durationSeconds: estimatedMinutes * 60,
    durationMinutes: estimatedMinutes,
    durationText: `~${estimatedMinutes} mins (estimated)`,
    durationInTrafficSeconds: undefined,
    durationInTrafficMinutes: undefined,
    durationInTrafficText: undefined,
    status: 'OK',
    origin: farmerCoords,
    destination: buyerCoords,
    fromCache: false,
    calculatedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY PRICING CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get delivery pricing tier for a given distance
 */
export function getDeliveryTier(distanceKm: number): DeliveryPricingTier | null {
  for (const tier of DELIVERY_PRICING_TIERS) {
    if (distanceKm >= tier.minKm && distanceKm <= tier.maxKm) {
      return tier;
    }
  }
  return null;
}

/**
 * Calculate delivery fee based on distance
 */
export function calculateDeliveryFee(distanceKm: number): { fee: number; tier: string; breakdown: { baseFee: number; distanceCharge: number } } {
  const tier = getDeliveryTier(distanceKm);
  
  if (!tier) {
    return {
      fee: 0,
      tier: 'Out of delivery zone',
      breakdown: { baseFee: 0, distanceCharge: 0 },
    };
  }
  
  // Calculate distance within tier
  const distanceInTier = Math.max(0, distanceKm - tier.minKm);
  const distanceCharge = Math.round(distanceInTier * tier.ratePerKm);
  const totalFee = tier.baseFee + distanceCharge;
  
  let tierName: string;
  if (tier.baseFee === 0) {
    tierName = 'Free Delivery (0-10 km)';
  } else if (tier.maxKm === 25) {
    tierName = 'Local Delivery (11-25 km)';
  } else if (tier.maxKm === 50) {
    tierName = 'Regional Delivery (26-50 km)';
  } else {
    tierName = 'Extended Delivery (51+ km)';
  }
  
  return {
    fee: totalFee,
    tier: tierName,
    breakdown: {
      baseFee: tier.baseFee,
      distanceCharge,
    },
  };
}

/**
 * Calculate traffic premium based on delay
 */
export function calculateTrafficPremium(normalMinutes: number, trafficMinutes: number | undefined): number {
  if (!trafficMinutes || trafficMinutes <= normalMinutes) {
    return 0;
  }
  
  const delayMinutes = trafficMinutes - normalMinutes;
  return Math.round(delayMinutes * TRAFFIC_PREMIUM_RATE);
}

/**
 * Get complete delivery quote with distance-based pricing
 * 
 * @param farmerCoords - Farmer's location
 * @param buyerCoords - Buyer's location
 */
export async function getDeliveryQuote(
  farmerCoords: Coordinates,
  buyerCoords: Coordinates
): Promise<DeliveryQuote> {
  console.log('[DistanceMatrix] Generating delivery quote...');
  
  try {
    // Get distance calculation
    const distanceResult = await calculateDistance(farmerCoords, buyerCoords);
    
    // Check deliverability
    if (distanceResult.distanceKm > MAX_DELIVERY_DISTANCE_KM) {
      return {
        deliveryFee: 0,
        distanceKm: distanceResult.distanceKm,
        estimatedMinutes: distanceResult.durationMinutes,
        trafficAdjustedMinutes: distanceResult.durationInTrafficMinutes,
        tier: 'Out of delivery zone',
        breakdown: { baseFee: 0, distanceCharge: 0, trafficPremium: 0 },
        isDeliverable: false,
        unavailableReason: `Distance (${distanceResult.distanceKm}km) exceeds maximum delivery range (${MAX_DELIVERY_DISTANCE_KM}km). Consider pickup option.`,
        priceLockExpiresAt: Date.now() + PRICE_LOCK_DURATION,
      };
    }
    
    // Calculate delivery fee
    const { fee, tier, breakdown } = calculateDeliveryFee(distanceResult.distanceKm);
    
    // Calculate traffic premium
    const trafficPremium = calculateTrafficPremium(
      distanceResult.durationMinutes,
      distanceResult.durationInTrafficMinutes
    );
    
    const totalFee = fee + trafficPremium;
    
    console.log('[DistanceMatrix] Delivery quote generated:', {
      distance: `${distanceResult.distanceKm} km`,
      fee: `₹${totalFee}`,
      tier,
    });
    
    return {
      deliveryFee: totalFee,
      distanceKm: distanceResult.distanceKm,
      estimatedMinutes: distanceResult.durationMinutes,
      trafficAdjustedMinutes: distanceResult.durationInTrafficMinutes,
      tier,
      breakdown: {
        baseFee: breakdown.baseFee,
        distanceCharge: breakdown.distanceCharge,
        trafficPremium,
      },
      isDeliverable: true,
      priceLockExpiresAt: Date.now() + PRICE_LOCK_DURATION,
    };
    
  } catch (error) {
    const distanceError = error as DistanceError;
    
    // Handle specific errors
    if (distanceError.code === 'ZERO_RESULTS') {
      return {
        deliveryFee: 0,
        distanceKm: 0,
        estimatedMinutes: 0,
        tier: 'No route available',
        breakdown: { baseFee: 0, distanceCharge: 0, trafficPremium: 0 },
        isDeliverable: false,
        unavailableReason: 'No delivery route available to this location. Please try a different address or consider pickup.',
        priceLockExpiresAt: Date.now() + PRICE_LOCK_DURATION,
      };
    }
    
    // Use fallback for other errors
    console.warn('[DistanceMatrix] Using fallback for delivery quote');
    const fallback = calculateDistanceFallback(farmerCoords, buyerCoords);
    const { fee, tier, breakdown } = calculateDeliveryFee(fallback.distanceKm);
    
    return {
      deliveryFee: fee,
      distanceKm: fallback.distanceKm,
      estimatedMinutes: fallback.durationMinutes,
      tier: `${tier} (estimated)`,
      breakdown: {
        baseFee: breakdown.baseFee,
        distanceCharge: breakdown.distanceCharge,
        trafficPremium: 0,
      },
      isDeliverable: fallback.distanceKm <= MAX_DELIVERY_DISTANCE_KM,
      unavailableReason: fallback.distanceKm > MAX_DELIVERY_DISTANCE_KM ? 'Out of delivery zone' : undefined,
      priceLockExpiresAt: Date.now() + PRICE_LOCK_DURATION,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROXIMITY SORTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rank multiple farmers by proximity to buyer location
 * Useful for showing closest suppliers first
 * 
 * @param buyerCoords - Buyer's location
 * @param farmers - Array of farmers with coordinates
 */
export async function rankFarmersByProximity(
  buyerCoords: Coordinates,
  farmers: Array<{ farmerId: string; farmerName: string; coordinates: Coordinates }>
): Promise<ProximityRankedFarmer[]> {
  console.log(`[DistanceMatrix] Ranking ${farmers.length} farmers by proximity`);
  
  const rankedFarmers: ProximityRankedFarmer[] = [];
  
  for (const farmer of farmers) {
    try {
      // Use Haversine for quick sorting (faster than API calls)
      const straightLineKm = calculateHaversineDistance(farmer.coordinates, buyerCoords);
      const estimatedRoadKm = estimateRoadDistance(straightLineKm);
      const estimatedMinutes = estimateTravelTime(estimatedRoadKm);
      
      const { fee } = calculateDeliveryFee(estimatedRoadKm);
      
      rankedFarmers.push({
        farmerId: farmer.farmerId,
        farmerName: farmer.farmerName,
        distanceKm: estimatedRoadKm,
        durationMinutes: estimatedMinutes,
        deliveryFee: fee,
        coordinates: farmer.coordinates,
      });
    } catch (error) {
      console.error(`[DistanceMatrix] Failed to calculate distance for farmer ${farmer.farmerId}:`, error);
    }
  }
  
  // Sort by distance (nearest first)
  rankedFarmers.sort((a, b) => a.distanceKm - b.distanceKm);
  
  console.log('[DistanceMatrix] Farmers ranked by proximity:', rankedFarmers.map(f => ({
    name: f.farmerName,
    distance: `${f.distanceKm}km`,
  })));
  
  return rankedFarmers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION FRESHNESS CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum age for stored location in milliseconds (30 days) */
const MAX_LOCATION_AGE = 30 * 24 * 60 * 60 * 1000;

/** Distance threshold for location refresh in km */
const LOCATION_REFRESH_THRESHOLD_KM = 5;

/**
 * Check if stored location is still fresh
 */
export function isLocationFresh(storedTimestamp: number): boolean {
  const age = Date.now() - storedTimestamp;
  const isFresh = age < MAX_LOCATION_AGE;
  
  if (!isFresh) {
    console.log(`[DistanceMatrix] Location is stale (age: ${Math.round(age / (24 * 60 * 60 * 1000))} days)`);
  }
  
  return isFresh;
}

/**
 * Check if user has moved significantly from last known position
 */
export function hasUserMoved(
  lastPosition: Coordinates,
  currentPosition: Coordinates
): boolean {
  const distance = calculateHaversineDistance(lastPosition, currentPosition);
  const hasMoved = distance > LOCATION_REFRESH_THRESHOLD_KM;
  
  if (hasMoved) {
    console.log(`[DistanceMatrix] User has moved ${distance.toFixed(2)}km from last position`);
  }
  
  return hasMoved;
}

/**
 * Determine if location refresh is needed
 */
export function needsLocationRefresh(
  storedTimestamp: number | undefined,
  storedPosition: Coordinates | undefined,
  currentPosition?: Coordinates
): boolean {
  // No stored location
  if (!storedTimestamp || !storedPosition) {
    return true;
  }
  
  // Location is stale
  if (!isLocationFresh(storedTimestamp)) {
    return true;
  }
  
  // User has moved significantly
  if (currentPosition && hasUserMoved(storedPosition, currentPosition)) {
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUGGING & TESTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log distance calculation details to console (for debugging)
 */
export function logDistanceDebug(result: DistanceResult): void {
  console.group('[DistanceMatrix] Distance Calculation Debug');
  console.log('Origin:', `${result.origin.lat.toFixed(6)}, ${result.origin.lng.toFixed(6)}`);
  console.log('Destination:', `${result.destination.lat.toFixed(6)}, ${result.destination.lng.toFixed(6)}`);
  console.log('Distance:', result.distanceText, `(${result.distanceMeters}m)`);
  console.log('Duration:', result.durationText, `(${result.durationSeconds}s)`);
  if (result.durationInTrafficText) {
    console.log('Duration (with traffic):', result.durationInTrafficText, `(${result.durationInTrafficSeconds}s)`);
  }
  console.log('From Cache:', result.fromCache);
  console.log('Calculated At:', new Date(result.calculatedAt).toISOString());
  console.groupEnd();
}

/**
 * Test distance calculation with sample coordinates
 */
export async function testDistanceCalculation(): Promise<void> {
  console.log('[DistanceMatrix] Running distance calculation tests...');
  
  const testCases = [
    {
      name: 'Same City (Short Distance) - Kolkata',
      farmer: { lat: 22.5726, lng: 88.3639 }, // Park Street
      buyer: { lat: 22.5485, lng: 88.3426 },  // Bhowanipore
      expectedMaxKm: 10,
    },
    {
      name: 'Different Cities (Medium Distance) - Kolkata to Howrah',
      farmer: { lat: 22.5726, lng: 88.3639 }, // Kolkata
      buyer: { lat: 22.5958, lng: 88.2636 },  // Howrah
      expectedMaxKm: 20,
    },
    {
      name: 'Rural Area - Village to City',
      farmer: { lat: 22.8456, lng: 88.4567 }, // Rural West Bengal
      buyer: { lat: 22.5726, lng: 88.3639 },  // Kolkata
      expectedMaxKm: 50,
    },
  ];
  
  for (const test of testCases) {
    console.log(`\n--- Test: ${test.name} ---`);
    try {
      const result = await calculateDistance(test.farmer, test.buyer, false);
      logDistanceDebug(result);
      
      const quote = await getDeliveryQuote(test.farmer, test.buyer);
      console.log('Delivery Quote:', {
        fee: `₹${quote.deliveryFee}`,
        tier: quote.tier,
        isDeliverable: quote.isDeliverable,
      });
      
      // Verify distance is reasonable
      if (result.distanceKm <= test.expectedMaxKm) {
        console.log('✅ Distance within expected range');
      } else {
        console.warn(`⚠️ Distance (${result.distanceKm}km) exceeds expected max (${test.expectedMaxKm}km)`);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
  
  console.log('\n[DistanceMatrix] Tests complete');
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testDistanceCalculation = testDistanceCalculation;
}
