/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNA BAZAAR - USE GEOLOCATION HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * React hook for browser/device location detection with automatic location
 * population during account registration.
 * 
 * Features:
 * - Automatic location detection on mount
 * - Loading states with minimum display time
 * - Comprehensive error handling
 * - Location caching (5 minutes)
 * - Manual refresh capability
 * 
 * @author Anna Bazaar Team - Calcutta Hacks 2025
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GeoLocation,
  GeolocationError,
  detectUserLocation,
  detectLocationWithFallback,
  isGeolocationSupported,
  getLocationErrorMessage,
  getCachedLocation,
  clearLocationCache,
} from '../services/geolocationService';

export interface UseGeolocationOptions {
  /** Whether to auto-detect location on mount (default: true) */
  autoDetect?: boolean;
  /** Whether to use cached location if available (default: true) */
  useCache?: boolean;
  /** Callback when location is successfully detected */
  onSuccess?: (location: GeoLocation) => void;
  /** Callback when location detection fails */
  onError?: (error: GeolocationError) => void;
  /** Whether to try IP-based fallback on failure (default: true) */
  useFallback?: boolean;
  /** Timeout for permission prompt in ms (default: 10000) */
  permissionTimeout?: number;
}

export interface UseGeolocationReturn {
  /** Detected location or null */
  location: GeoLocation | null;
  /** Whether location detection is in progress */
  loading: boolean;
  /** Error if location detection failed */
  error: GeolocationError | null;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether geolocation is supported by the browser */
  isSupported: boolean;
  /** Whether location was auto-detected (vs manual entry) */
  isAutoDetected: boolean;
  /** Refresh/retry location detection */
  refresh: () => Promise<void>;
  /** Clear location and error state */
  clear: () => void;
  /** Manually set location (for manual entry mode) */
  setManualLocation: (location: Partial<GeoLocation>) => void;
}

/**
 * React hook for location detection with auto-fill support
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    autoDetect = true,
    useCache = true,
    onSuccess,
    onError,
    useFallback = true,
    permissionTimeout = 10000,
  } = options;

  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(autoDetect);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);
  
  const isSupported = isGeolocationSupported();
  const mountedRef = useRef(true);
  const detectionAttemptedRef = useRef(false);

  // Detect location
  const detectLocation = useCallback(async (skipCache: boolean = false) => {
    if (!mountedRef.current) return;

    console.log('[useGeolocation] Starting location detection...');
    setLoading(true);
    setError(null);

    // Check cache first if allowed
    if (!skipCache && useCache) {
      const cached = getCachedLocation();
      if (cached) {
        console.log('[useGeolocation] Using cached location');
        setLocation(cached);
        setIsAutoDetected(true);
        setLoading(false);
        onSuccess?.(cached);
        return;
      }
    }

    // Set up permission timeout
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject({
          code: 'TIMEOUT',
          message: 'Location permission prompt timed out. Please respond to the permission request or enter your address manually.',
        } as GeolocationError);
      }, permissionTimeout);
    });

    try {
      // Race between location detection and timeout
      let detectedLocation: GeoLocation | null;
      
      if (useFallback) {
        // Use the fallback version that won't throw
        detectedLocation = await Promise.race([
          detectLocationWithFallback(),
          timeoutPromise,
        ]);
      } else {
        detectedLocation = await Promise.race([
          detectUserLocation(!skipCache && useCache),
          timeoutPromise,
        ]);
      }

      if (timeoutId) clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (detectedLocation) {
        console.log('[useGeolocation] Location detected successfully:', detectedLocation);
        setLocation(detectedLocation);
        setIsAutoDetected(true);
        setError(null);
        onSuccess?.(detectedLocation);
      } else {
        throw {
          code: 'POSITION_UNAVAILABLE',
          message: 'Unable to detect location',
        } as GeolocationError;
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!mountedRef.current) return;

      const geoError = err as GeolocationError;
      console.error('[useGeolocation] Location detection failed:', geoError);
      setError(geoError);
      onError?.(geoError);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [useCache, useFallback, permissionTimeout, onSuccess, onError]);

  // Refresh location (skip cache)
  const refresh = useCallback(async () => {
    clearLocationCache();
    await detectLocation(true);
  }, [detectLocation]);

  // Clear all state
  const clear = useCallback(() => {
    setLocation(null);
    setError(null);
    setIsAutoDetected(false);
    setLoading(false);
  }, []);

  // Manually set location (for manual entry mode)
  const setManualLocation = useCallback((manualLocation: Partial<GeoLocation>) => {
    const fullLocation: GeoLocation = {
      state: manualLocation.state || '',
      district: manualLocation.district || '',
      locality: manualLocation.locality,
      city: manualLocation.city,
      country: manualLocation.country || 'India',
      postalCode: manualLocation.postalCode,
      formattedAddress: manualLocation.formattedAddress,
      coordinates: manualLocation.coordinates || { lat: 0, lng: 0 },
      accuracy: manualLocation.accuracy,
      timestamp: Date.now(),
    };
    setLocation(fullLocation);
    setIsAutoDetected(false);
    setError(null);
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    mountedRef.current = true;

    if (autoDetect && !detectionAttemptedRef.current) {
      detectionAttemptedRef.current = true;
      
      if (!isSupported) {
        console.warn('[useGeolocation] Geolocation not supported');
        setLoading(false);
        setError({
          code: 'NOT_SUPPORTED',
          message: 'Geolocation is not supported by this browser',
        });
        return;
      }

      detectLocation();
    } else if (!autoDetect) {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoDetect, isSupported, detectLocation]);

  // Get user-friendly error message
  const errorMessage = error ? getLocationErrorMessage(error) : null;

  return {
    location,
    loading,
    error,
    errorMessage,
    isSupported,
    isAutoDetected,
    refresh,
    clear,
    setManualLocation,
  };
}

export default useGeolocation;
