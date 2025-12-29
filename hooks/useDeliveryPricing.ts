/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNA BAZAAR - useDeliveryPricing Hook
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * React hook for real-time distance calculation and delivery pricing.
 * Automatically recalculates when buyer location changes.
 * 
 * Features:
 * - Auto-detection of buyer location on mount
 * - Real-time price updates when location changes
 * - Loading states and error handling
 * - Price lock tracking (15-minute validity)
 * - Cached results for performance
 * 
 * @author Anna Bazaar Team - Calcutta Hacks 2025
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  calculateDistance,
  getDeliveryQuote,
  calculateDeliveryFee,
  calculateHaversineDistance,
  estimateRoadDistance,
  type Coordinates,
  type DistanceResult,
} from '../services/distanceMatrixService';
import { detectUserLocation, getCachedLocation, type GeoLocation } from '../services/geolocationService';
import { calculateTotalOrderPrice, type TotalOrderPricing } from '../lib/pricingEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeliveryPricingState {
  /** Distance calculation result */
  distanceResult: DistanceResult | null;
  /** Complete delivery quote */
  deliveryQuote: {
    deliveryFee: number;
    distanceKm: number;
    estimatedMinutes: number;
    trafficAdjustedMinutes?: number;
    tier: string;
    isDeliverable: boolean;
    unavailableReason?: string;
    breakdown: {
      baseFee: number;
      distanceCharge: number;
      trafficPremium: number;
    };
    priceLockExpiresAt: number;
  } | null;
  /** Whether calculation is in progress */
  loading: boolean;
  /** Error message if calculation failed */
  error: string | null;
  /** Buyer's current location */
  buyerLocation: GeoLocation | null;
  /** Whether buyer location is being detected */
  detectingLocation: boolean;
  /** Price lock remaining time in seconds */
  priceLockRemainingSeconds: number | null;
}

export interface UseDeliveryPricingOptions {
  /** Farmer's coordinates (required) */
  farmerCoords: Coordinates | null;
  /** Whether to auto-detect buyer location on mount */
  autoDetectLocation?: boolean;
  /** Whether to use cached buyer location */
  useCache?: boolean;
  /** Callback when price is calculated */
  onPriceCalculated?: (quote: DeliveryPricingState['deliveryQuote']) => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
}

export interface UseDeliveryPricingReturn extends DeliveryPricingState {
  /** Manually set buyer coordinates */
  setBuyerCoords: (coords: Coordinates) => void;
  /** Refresh buyer location from GPS */
  refreshBuyerLocation: () => Promise<void>;
  /** Recalculate delivery pricing */
  recalculate: () => Promise<void>;
  /** Get quick estimate (no API call) */
  getQuickEstimate: (buyerCoords: Coordinates) => { estimatedFee: number; estimatedDistanceKm: number; tier: string } | null;
  /** Check if price lock is still valid */
  isPriceLockValid: () => boolean;
  /** Calculate total order price including products */
  calculateOrderTotal: (pricePerKg: number, quantityKg: number) => Promise<TotalOrderPricing | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useDeliveryPricing(options: UseDeliveryPricingOptions): UseDeliveryPricingReturn {
  const {
    farmerCoords,
    autoDetectLocation = true,
    useCache = true,
    onPriceCalculated,
    onError,
  } = options;

  // State
  const [distanceResult, setDistanceResult] = useState<DistanceResult | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryPricingState['deliveryQuote']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyerLocation, setBuyerLocation] = useState<GeoLocation | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [priceLockRemainingSeconds, setPriceLockRemainingSeconds] = useState<number | null>(null);

  // Refs
  const buyerCoordsRef = useRef<Coordinates | null>(null);
  const priceLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICE LOCK TIMER
  // ═══════════════════════════════════════════════════════════════════════════

  const startPriceLockTimer = useCallback((expiresAt: number) => {
    // Clear existing timer
    if (priceLockTimerRef.current) {
      clearInterval(priceLockTimerRef.current);
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setPriceLockRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        if (priceLockTimerRef.current) {
          clearInterval(priceLockTimerRef.current);
          priceLockTimerRef.current = null;
        }
      }
    };

    updateRemaining();
    priceLockTimerRef.current = setInterval(updateRemaining, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (priceLockTimerRef.current) {
        clearInterval(priceLockTimerRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  const refreshBuyerLocation = useCallback(async () => {
    console.log('[useDeliveryPricing] Refreshing buyer location...');
    setDetectingLocation(true);
    setError(null);

    try {
      const location = await detectUserLocation(useCache);
      setBuyerLocation(location);
      buyerCoordsRef.current = location.coordinates;
      console.log('[useDeliveryPricing] Buyer location detected:', location);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to detect location';
      console.error('[useDeliveryPricing] Location detection failed:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setDetectingLocation(false);
    }
  }, [useCache, onError]);

  // Auto-detect location on mount
  useEffect(() => {
    if (autoDetectLocation) {
      // Check cache first
      const cached = getCachedLocation();
      if (cached) {
        setBuyerLocation(cached);
        buyerCoordsRef.current = cached.coordinates;
      } else {
        refreshBuyerLocation();
      }
    }
  }, [autoDetectLocation, refreshBuyerLocation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTANCE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  const recalculate = useCallback(async () => {
    if (!farmerCoords || !buyerCoordsRef.current) {
      console.log('[useDeliveryPricing] Cannot calculate - missing coordinates');
      return;
    }

    console.log('[useDeliveryPricing] Calculating delivery pricing...');
    setLoading(true);
    setError(null);

    try {
      // Get distance
      const distance = await calculateDistance(farmerCoords, buyerCoordsRef.current);
      setDistanceResult(distance);

      // Get delivery quote
      const quote = await getDeliveryQuote(farmerCoords, buyerCoordsRef.current);
      setDeliveryQuote(quote);

      // Start price lock timer
      startPriceLockTimer(quote.priceLockExpiresAt);

      // Callback
      onPriceCalculated?.(quote);

      console.log('[useDeliveryPricing] Pricing calculated:', {
        distance: `${quote.distanceKm}km`,
        fee: `₹${quote.deliveryFee}`,
        tier: quote.tier,
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to calculate delivery';
      console.error('[useDeliveryPricing] Calculation failed:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [farmerCoords, onPriceCalculated, onError, startPriceLockTimer]);

  // Recalculate when buyer location changes
  useEffect(() => {
    if (buyerLocation && farmerCoords) {
      recalculate();
    }
  }, [buyerLocation, farmerCoords, recalculate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  const setBuyerCoords = useCallback((coords: Coordinates) => {
    console.log('[useDeliveryPricing] Setting buyer coordinates manually');
    buyerCoordsRef.current = coords;
    
    // Create a minimal location object
    setBuyerLocation({
      state: 'Manual Entry',
      district: 'Manual Entry',
      coordinates: coords,
      timestamp: Date.now(),
    });
  }, []);

  const getQuickEstimate = useCallback((buyerCoords: Coordinates) => {
    if (!farmerCoords) return null;
    
    // Calculate straight-line distance and estimate road distance
    const straightLineKm = calculateHaversineDistance(farmerCoords, buyerCoords);
    const estimatedRoadKm = estimateRoadDistance(straightLineKm);
    const { fee, tier } = calculateDeliveryFee(estimatedRoadKm);
    
    return {
      estimatedFee: fee,
      estimatedDistanceKm: Math.round(estimatedRoadKm * 100) / 100,
      tier,
    };
  }, [farmerCoords]);

  const isPriceLockValid = useCallback(() => {
    if (!deliveryQuote) return false;
    return Date.now() < deliveryQuote.priceLockExpiresAt;
  }, [deliveryQuote]);

  const calculateOrderTotal = useCallback(async (
    pricePerKg: number,
    quantityKg: number
  ): Promise<TotalOrderPricing | null> => {
    if (!farmerCoords || !buyerCoordsRef.current) {
      console.warn('[useDeliveryPricing] Cannot calculate total - missing coordinates');
      return null;
    }

    try {
      return await calculateTotalOrderPrice(
        pricePerKg,
        quantityKg,
        farmerCoords,
        buyerCoordsRef.current
      );
    } catch (err) {
      console.error('[useDeliveryPricing] Order total calculation failed:', err);
      return null;
    }
  }, [farmerCoords]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    distanceResult,
    deliveryQuote,
    loading,
    error,
    buyerLocation,
    detectingLocation,
    priceLockRemainingSeconds,
    
    // Methods
    setBuyerCoords,
    refreshBuyerLocation,
    recalculate,
    getQuickEstimate,
    isPriceLockValid,
    calculateOrderTotal,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLIFIED HOOK FOR DISTANCE ONLY
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseDistanceOptions {
  farmerCoords: Coordinates | null;
  buyerCoords: Coordinates | null;
}

export function useDistance(options: UseDistanceOptions) {
  const { farmerCoords, buyerCoords } = options;
  
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmerCoords || !buyerCoords) return;

    const calculate = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await calculateDistance(farmerCoords, buyerCoords);
        setDistance(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate distance');
      } finally {
        setLoading(false);
      }
    };

    calculate();
  }, [farmerCoords, buyerCoords]);

  return { distance, loading, error };
}

export default useDeliveryPricing;
