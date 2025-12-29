/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNA BAZAAR - GEOLOCATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Provides automatic location detection using Browser Geolocation API
 * and Google Maps Reverse Geocoding for State/District extraction.
 * 
 * Features:
 * - Browser Geolocation API with high accuracy GPS
 * - Google Maps Reverse Geocoding for address extraction
 * - 5-minute location caching to prevent repeated API calls
 * - Watch position for real-time location updates
 * - Comprehensive error handling for all failure scenarios
 * 
 * @author Anna Bazaar Team - Calcutta Hacks 2025
 */

// Declare google namespace for TypeScript
declare global {
  interface Window {
    google?: {
      maps?: {
        Geocoder: new () => {
          geocode: (
            request: { location: { lat: number; lng: number } },
            callback: (
              results: Array<{
                address_components: Array<{
                  long_name: string;
                  short_name: string;
                  types: string[];
                }>;
                formatted_address: string;
              }> | null,
              status: string
            ) => void
          ) => void;
        };
        GeocoderStatus: {
          OK: string;
          ZERO_RESULTS: string;
          OVER_QUERY_LIMIT: string;
          REQUEST_DENIED: string;
          INVALID_REQUEST: string;
          UNKNOWN_ERROR: string;
        };
        Map: new (element: HTMLElement, options: Record<string, unknown>) => {
          setCenter: (pos: { lat: number; lng: number }) => void;
          getCenter: () => { lat: () => number; lng: () => number };
        };
        Marker: new (options: Record<string, unknown>) => {
          setPosition: (pos: { lat: number; lng: number }) => void;
          setMap: (map: unknown) => void;
        };
        InfoWindow: new (options?: Record<string, unknown>) => {
          open: (map: unknown, marker: unknown) => void;
          close: () => void;
        };
      };
    };
    initGoogleMapsCallback?: () => void;
  }
}

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCGGq8VUFMbE6KTzrzxIRjtxu7AI8os1O4';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Geolocation timeout in ms (27 seconds as per requirements) */
const GEOLOCATION_TIMEOUT = 27000;

/** Maximum age of cached position in ms (30 seconds) */
const GEOLOCATION_MAX_AGE = 30000;

/** Cache validity period in ms (5 minutes) */
const LOCATION_CACHE_VALIDITY = 5 * 60 * 1000;

/** Minimum loading spinner display time in ms */
const MIN_LOADING_TIME = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface LocationCache {
  location: GeoLocation;
  cachedAt: number;
}

let locationCache: LocationCache | null = null;

/**
 * Get cached location if still valid (within 5 minutes)
 */
export function getCachedLocation(): GeoLocation | null {
  if (!locationCache) return null;
  
  const now = Date.now();
  if (now - locationCache.cachedAt > LOCATION_CACHE_VALIDITY) {
    console.log('[Geolocation] Cache expired, clearing...');
    locationCache = null;
    return null;
  }
  
  console.log('[Geolocation] Returning cached location');
  return locationCache.location;
}

/**
 * Store location in cache
 */
function cacheLocation(location: GeoLocation): void {
  locationCache = {
    location,
    cachedAt: Date.now(),
  };
  console.log('[Geolocation] Location cached');
}

/**
 * Clear the location cache
 */
export function clearLocationCache(): void {
  locationCache = null;
  console.log('[Geolocation] Cache cleared');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeoLocation {
  state: string;
  district: string;
  locality?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  accuracy?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'GEOCODING_FAILED' | 'NOT_SUPPORTED' | 'UNKNOWN';
  message: string;
  originalCode?: number;
}

/**
 * Check if Geolocation API is available in the browser
 */
export function isGeolocationSupported(): boolean {
  const supported = 'geolocation' in navigator;
  console.log(`[Geolocation] API supported: ${supported}`);
  return supported;
}

/**
 * Get user-friendly error message based on error code
 */
export function getLocationErrorMessage(error: GeolocationError): string {
  switch (error.code) {
    case 'PERMISSION_DENIED':
      return 'Location permission denied. Please enable location access in your browser settings to auto-fill your address.';
    case 'POSITION_UNAVAILABLE':
      return 'Unable to determine your location. Please ensure GPS is enabled or enter your address manually.';
    case 'TIMEOUT':
      return 'Location request timed out. Please try again or enter your address manually.';
    case 'GEOCODING_FAILED':
      return 'Unable to determine your address from coordinates. Please enter your address manually.';
    case 'NOT_SUPPORTED':
      return 'Location services are not supported by your browser. Please enter your address manually.';
    default:
      return 'An error occurred while detecting your location. Please enter your address manually.';
  }
}

/**
 * Load Google Maps API dynamically
 */
export function loadGoogleMapsAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.Geocoder) {
      console.log('[Geolocation] Google Maps API already loaded');
      resolve();
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    // Create callback function
    window.initGoogleMapsCallback = () => {
      console.log('[Geolocation] Google Maps API loaded successfully via callback');
      resolve();
    };

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geocoding&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.error('[Geolocation] Failed to load Google Maps API');
      reject(new Error('Failed to load Google Maps API. Please check your API key and network connection.'));
    };

    document.head.appendChild(script);
  });
}

    document.head.appendChild(script);
  });
}

/**
 * Get current position from Browser Geolocation API
 * Uses high accuracy mode with configured timeout and maximumAge
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('[Geolocation] Geolocation API not supported');
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser',
      } as GeolocationError);
      return;
    }

    console.log('[Geolocation] Requesting current position...');
    console.log(`[Geolocation] Options: enableHighAccuracy=true, timeout=${GEOLOCATION_TIMEOUT}ms, maximumAge=${GEOLOCATION_MAX_AGE}ms`);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(`[Geolocation] Position obtained: lat=${position.coords.latitude.toFixed(6)}, lng=${position.coords.longitude.toFixed(6)}`);
        console.log(`[Geolocation] Accuracy: ${position.coords.accuracy?.toFixed(0)}m`);
        resolve(position);
      },
      (error) => {
        let code: GeolocationError['code'] = 'UNKNOWN';
        console.error(`[Geolocation] Error code: ${error.code}, message: ${error.message}`);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            code = 'PERMISSION_DENIED';
            console.error('[Geolocation] User denied location permission');
            break;
          case error.POSITION_UNAVAILABLE:
            code = 'POSITION_UNAVAILABLE';
            console.error('[Geolocation] Position unavailable - GPS may be disabled');
            break;
          case error.TIMEOUT:
            code = 'TIMEOUT';
            console.error('[Geolocation] Request timed out');
            break;
        }
        
        reject({
          code,
          message: error.message || 'Failed to get location',
          originalCode: error.code,
        } as GeolocationError);
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT,
        maximumAge: GEOLOCATION_MAX_AGE,
      }
    );
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WATCH POSITION - Real-time Location Updates
// ═══════════════════════════════════════════════════════════════════════════════

let watchId: number | null = null;

export interface WatchPositionCallbacks {
  onPositionUpdate: (position: GeolocationPosition) => void;
  onError: (error: GeolocationError) => void;
}

/**
 * Start watching user's position for real-time updates
 * Returns a cleanup function to stop watching
 */
export function startWatchingPosition(callbacks: WatchPositionCallbacks): () => void {
  if (!navigator.geolocation) {
    callbacks.onError({
      code: 'NOT_SUPPORTED',
      message: 'Geolocation is not supported by this browser',
    });
    return () => {};
  }

  // Clear any existing watch
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  console.log('[Geolocation] Starting position watch...');

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      console.log(`[Geolocation] Position update: lat=${position.coords.latitude.toFixed(6)}, lng=${position.coords.longitude.toFixed(6)}`);
      callbacks.onPositionUpdate(position);
    },
    (error) => {
      let code: GeolocationError['code'] = 'UNKNOWN';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          code = 'PERMISSION_DENIED';
          break;
        case error.POSITION_UNAVAILABLE:
          code = 'POSITION_UNAVAILABLE';
          break;
        case error.TIMEOUT:
          code = 'TIMEOUT';
          break;
      }
      callbacks.onError({
        code,
        message: error.message || 'Failed to get location',
        originalCode: error.code,
      });
    },
    {
      enableHighAccuracy: true,
      timeout: GEOLOCATION_TIMEOUT,
      maximumAge: GEOLOCATION_MAX_AGE,
    }
  );

  // Return cleanup function
  return () => {
    if (watchId !== null) {
      console.log('[Geolocation] Stopping position watch');
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}

/**
 * Stop watching position (alternative to using the returned cleanup function)
 */
export function stopWatchingPosition(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    console.log('[Geolocation] Position watch stopped');
  }
}

/**
 * Reverse geocode coordinates to get full address details
 * Uses Google Maps Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  state: string;
  district: string;
  locality?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}> {
  console.log(`[Geolocation] Starting reverse geocoding for: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  
  await loadGoogleMapsAPI();

  return new Promise((resolve, reject) => {
    if (!window.google?.maps?.Geocoder) {
      console.error('[Geolocation] Google Maps Geocoder not available');
      reject({
        code: 'GEOCODING_FAILED',
        message: 'Google Maps API not loaded',
      } as GeolocationError);
      return;
    }

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        console.log(`[Geolocation] Geocoding status: ${status}`);
        
        if (status !== 'OK' || !results || results.length === 0) {
          console.error(`[Geolocation] Geocoding failed with status: ${status}`);
          reject({
            code: 'GEOCODING_FAILED',
            message: `Geocoding failed: ${status}`,
          } as GeolocationError);
          return;
        }

        // Extract address components
        let state = '';
        let district = '';
        let locality = '';
        let city = '';
        let country = '';
        let postalCode = '';
        let formattedAddress = results[0]?.formatted_address || '';

        for (const result of results) {
          for (const component of result.address_components) {
            const types = component.types;

            // State (administrative_area_level_1)
            if (types.includes('administrative_area_level_1') && !state) {
              state = component.long_name;
            }

            // District (administrative_area_level_2)
            if (types.includes('administrative_area_level_2') && !district) {
              district = component.long_name;
            }

            // Fallback: administrative_area_level_3 for district
            if (types.includes('administrative_area_level_3') && !district) {
              district = component.long_name;
            }

            // Locality (sublocality or locality)
            if ((types.includes('sublocality') || types.includes('sublocality_level_1')) && !locality) {
              locality = component.long_name;
            }

            // City
            if (types.includes('locality') && !city) {
              city = component.long_name;
            }

            // Country
            if (types.includes('country') && !country) {
              country = component.long_name;
            }

            // Postal Code
            if (types.includes('postal_code') && !postalCode) {
              postalCode = component.long_name;
            }
          }

          // Stop if we have all required data
          if (state && district && country && postalCode) break;
        }

        // Validate we got the minimum required data
        if (!state) {
          state = 'Unknown State';
        }
        if (!district) {
          district = locality || city || 'Unknown District';
        }
        if (!country) {
          country = 'India'; // Default for Anna Bazaar
        }

        console.log('[Geolocation] Reverse geocoding result:', { 
          state, district, locality, city, country, postalCode, formattedAddress 
        });

        resolve({
          state,
          district,
          locality,
          city,
          country,
          postalCode,
          formattedAddress,
        });
      }
    );
  });
}

/**
 * Full geolocation flow: Get position + Reverse geocode
 * Uses cache if available and valid (within 5 minutes)
 */
export async function detectUserLocation(useCache: boolean = true): Promise<GeoLocation> {
  console.log('[Geolocation] Starting location detection...');
  
  // Check cache first
  if (useCache) {
    const cached = getCachedLocation();
    if (cached) {
      console.log('[Geolocation] Using cached location');
      return cached;
    }
  }

  // Record start time for minimum loading duration
  const startTime = Date.now();

  try {
    // Step 1: Get coordinates
    const position = await getCurrentPosition();
    const { latitude: lat, longitude: lng } = position.coords;

    console.log(`[Geolocation] Location fetched: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // Step 2: Reverse geocode to get full address
    const geocodeResult = await reverseGeocode(lat, lng);

    const location: GeoLocation = {
      state: geocodeResult.state,
      district: geocodeResult.district,
      locality: geocodeResult.locality,
      city: geocodeResult.city,
      country: geocodeResult.country,
      postalCode: geocodeResult.postalCode,
      formattedAddress: geocodeResult.formattedAddress,
      coordinates: { lat, lng },
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };

    // Cache the location
    cacheLocation(location);

    // Ensure minimum loading time for better UX
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_LOADING_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
    }

    console.log('[Geolocation] Location detection complete:', location);
    return location;
  } catch (error) {
    console.error('[Geolocation] Location detection failed:', error);
    throw error;
  }
}

/**
 * Detect location with fallback to IP-based geolocation
 * This is a best-effort function that won't throw errors
 */
export async function detectLocationWithFallback(): Promise<GeoLocation | null> {
  try {
    return await detectUserLocation();
  } catch (error) {
    console.warn('[Geolocation] Primary location detection failed, trying fallback...');
    
    // Attempt IP-based geolocation as fallback
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        console.log('[Geolocation] IP-based location:', data);
        
        return {
          state: data.region || 'Unknown State',
          district: data.city || 'Unknown District',
          city: data.city,
          country: data.country_name || 'India',
          postalCode: data.postal,
          formattedAddress: `${data.city}, ${data.region}, ${data.country_name}`,
          coordinates: {
            lat: data.latitude,
            lng: data.longitude,
          },
          accuracy: 10000, // IP-based location is less accurate
          timestamp: Date.now(),
        };
      }
    } catch (fallbackError) {
      console.error('[Geolocation] IP fallback also failed:', fallbackError);
    }
    
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE MAPS DISPLAY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a map with a marker at the user's location
 */
export async function createLocationMap(
  containerElement: HTMLElement,
  location: GeoLocation,
  options?: { zoom?: number; showInfoWindow?: boolean }
): Promise<{ map: unknown; marker: unknown }> {
  await loadGoogleMapsAPI();

  if (!window.google?.maps?.Map || !window.google?.maps?.Marker) {
    throw new Error('Google Maps not loaded');
  }

  const zoom = options?.zoom ?? 15;
  const pos = { lat: location.coordinates.lat, lng: location.coordinates.lng };

  const map = new window.google.maps.Map(containerElement, {
    center: pos,
    zoom,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  const marker = new window.google.maps.Marker({
    position: pos,
    map,
    title: 'Your Location',
    animation: 2, // DROP animation
  });

  if (options?.showInfoWindow && window.google?.maps?.InfoWindow) {
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; color: #16a34a; margin-bottom: 4px;">
            ✓ Location detected
          </div>
          <div style="font-size: 12px; color: #666;">
            ${location.formattedAddress || `${location.district}, ${location.state}`}
          </div>
        </div>
      `,
    });
    infoWindow.open(map, marker);
  }

  console.log('[Geolocation] Map created with marker at user location');
  return { map, marker };
}

/**
 * Update marker position on an existing map
 */
export function updateMarkerPosition(
  marker: unknown,
  map: unknown,
  lat: number,
  lng: number
): void {
  const pos = { lat, lng };
  (marker as { setPosition: (pos: { lat: number; lng: number }) => void }).setPosition(pos);
  (map as { setCenter: (pos: { lat: number; lng: number }) => void }).setCenter(pos);
  console.log(`[Geolocation] Marker updated to: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
}

/**
 * React hook for location detection
 */
export function useGeolocation(): {
  location: GeoLocation | null;
  loading: boolean;
  error: GeolocationError | null;
  refresh: () => void;
} {
  // This is a placeholder - actual hook implementation will be in the component
  // due to React import requirements
  throw new Error('Use useGeolocationHook from components instead');
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE NAME MAPPINGS (for normalization)
// ═══════════════════════════════════════════════════════════════════════════════

const STATE_NAME_MAPPINGS: Record<string, string> = {
  // Common variations
  'andhra pradesh': 'Andhra Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
  'assam': 'Assam',
  'bihar': 'Bihar',
  'chhattisgarh': 'Chhattisgarh',
  'goa': 'Goa',
  'gujarat': 'Gujarat',
  'haryana': 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  'jharkhand': 'Jharkhand',
  'karnataka': 'Karnataka',
  'kerala': 'Kerala',
  'madhya pradesh': 'Madhya Pradesh',
  'maharashtra': 'Maharashtra',
  'manipur': 'Manipur',
  'meghalaya': 'Meghalaya',
  'mizoram': 'Mizoram',
  'nagaland': 'Nagaland',
  'odisha': 'Odisha',
  'orissa': 'Odisha', // Old name
  'punjab': 'Punjab',
  'rajasthan': 'Rajasthan',
  'sikkim': 'Sikkim',
  'tamil nadu': 'Tamil Nadu',
  'telangana': 'Telangana',
  'tripura': 'Tripura',
  'uttar pradesh': 'Uttar Pradesh',
  'uttarakhand': 'Uttarakhand',
  'uttaranchal': 'Uttarakhand', // Old name
  'west bengal': 'West Bengal',
  // Union Territories
  'andaman and nicobar islands': 'Andaman and Nicobar Islands',
  'chandigarh': 'Chandigarh',
  'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'jammu and kashmir': 'Jammu and Kashmir',
  'ladakh': 'Ladakh',
  'lakshadweep': 'Lakshadweep',
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry', // Old name
};

/**
 * Normalize state name to standard format
 */
export function normalizeStateName(state: string): string {
  const lower = state.toLowerCase().trim();
  return STATE_NAME_MAPPINGS[lower] || state;
}
