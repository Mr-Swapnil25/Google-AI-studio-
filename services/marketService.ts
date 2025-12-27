/**
 * MARKET SERVICE
 * 
 * Handles fetching and caching of mandi prices from Firestore.
 * Provides location-aware price lookups with smart fallbacks.
 * Uses Google Maps API for accurate reverse geocoding.
 */

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MandiPrice, GeoLocation, ProductCategory } from '../types';
import { calculatePricing, parseGradeLabel } from '../lib/pricingEngine';
import type { PricingEngineResult, QualityGrade } from '../types';

// ============================================
// API KEYS
// ============================================
const GOOGLE_MAPS_API_KEY = "AIzaSyCGGq8VUFMbE6KTzrzxIRjtxu7AI8os1O4";

// ============================================
// CACHE MANAGEMENT
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const priceCache = new Map<string, CacheEntry<MandiPrice | null>>();
const locationCache = new Map<string, CacheEntry<GeoLocation>>();

function getCacheKey(state: string, district: string, commodity: string): string {
  return `${state.toLowerCase()}_${district.toLowerCase()}_${commodity.toLowerCase()}`.replace(/\s+/g, '_');
}

function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// ============================================
// FIRESTORE HELPERS
// ============================================

function mapDocToMandiPrice(doc: any): MandiPrice {
  const data = doc.data();
  return {
    id: doc.id,
    commodityName: data.commodityName || '',
    state: data.state || '',
    district: data.district || '',
    marketName: data.marketName || data.mandiName || '',
    minPrice: Number(data.minPrice) || 0,
    maxPrice: Number(data.maxPrice) || 0,
    modalPrice: Number(data.modalPrice) || 0,
    updatedAt: data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate() 
      : new Date(data.updatedAt || Date.now()),
    source: data.source || 'fallback',
    isStale: isDataStale(data.updatedAt),
  };
}

function isDataStale(updatedAt: any): boolean {
  if (!updatedAt) return true;
  const date = updatedAt instanceof Timestamp ? updatedAt.toDate() : new Date(updatedAt);
  const hoursSince = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return hoursSince > 48;
}

// ============================================
// GEOLOCATION SERVICE
// ============================================

/**
 * Get user's current location using browser geolocation API
 */
export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get State and District
 * Uses Google Maps Geocoding API for accurate Indian location data
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoLocation> {
  // Check cache first
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const cached = locationCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached!.data;
  }

  try {
    // Use Google Maps Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Google Maps Geocoding service unavailable');
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    // Extract address components from Google Maps response
    let state = '';
    let district = '';
    let pincode = '';
    
    // Find the most detailed result
    const result = data.results[0];
    const components = result.address_components || [];
    
    for (const component of components) {
      const types = component.types || [];
      
      // administrative_area_level_1 = State (e.g., "West Bengal")
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      
      // administrative_area_level_2 = District (e.g., "Kolkata")
      if (types.includes('administrative_area_level_2')) {
        district = component.long_name;
      }
      
      // Fallback to locality if district not found
      if (!district && types.includes('locality')) {
        district = component.long_name;
      }
      
      // postal_code for pincode
      if (types.includes('postal_code')) {
        pincode = component.long_name;
      }
    }

    const location: GeoLocation = {
      state: normalizeIndianState(state),
      district: normalizeDistrict(district),
      pincode,
      latitude: lat,
      longitude: lng,
      isAutoDetected: true,
    };

    // Cache the result
    locationCache.set(cacheKey, { data: location, timestamp: Date.now() });

    return location;
  } catch (error) {
    console.error('Google Maps reverse geocoding failed:', error);
    
    // Fallback to OpenStreetMap Nominatim (free backup)
    return reverseGeocodeNominatim(lat, lng);
  }
}

/**
 * Fallback reverse geocoding using OpenStreetMap Nominatim
 */
async function reverseGeocodeNominatim(lat: number, lng: number): Promise<GeoLocation> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'AnnaBazaar/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim geocoding service unavailable');
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      state: normalizeIndianState(address.state || address.region || ''),
      district: normalizeDistrict(address.county || address.state_district || address.city || ''),
      pincode: address.postcode,
      latitude: lat,
      longitude: lng,
      isAutoDetected: true,
    };
  } catch (error) {
    console.error('Nominatim fallback also failed:', error);
    throw error;
  }
}

/**
 * Normalize Indian state names to match mandi data format
 */
function normalizeIndianState(state: string): string {
  const stateMap: Record<string, string> = {
    'maharashtra': 'Maharashtra',
    'karnataka': 'Karnataka',
    'gujarat': 'Gujarat',
    'rajasthan': 'Rajasthan',
    'madhya pradesh': 'Madhya Pradesh',
    'uttar pradesh': 'Uttar Pradesh',
    'punjab': 'Punjab',
    'haryana': 'Haryana',
    'tamil nadu': 'Tamil Nadu',
    'andhra pradesh': 'Andhra Pradesh',
    'telangana': 'Telangana',
    'west bengal': 'West Bengal',
    'bihar': 'Bihar',
    'odisha': 'Odisha',
    'kerala': 'Kerala',
    'assam': 'Assam',
    'jharkhand': 'Jharkhand',
    'chhattisgarh': 'Chhattisgarh',
    'uttarakhand': 'Uttarakhand',
    'himachal pradesh': 'Himachal Pradesh',
    'goa': 'Goa',
  };

  const normalized = state.toLowerCase().trim();
  return stateMap[normalized] || state;
}

function normalizeDistrict(district: string): string {
  // Remove common suffixes
  return district
    .replace(/\s*(district|tehsil|taluk|mandal)$/i, '')
    .trim();
}

/**
 * Auto-detect user location with fallback
 */
export async function autoDetectLocation(): Promise<GeoLocation> {
  try {
    const position = await getCurrentPosition();
    const location = await reverseGeocode(
      position.coords.latitude,
      position.coords.longitude
    );
    return location;
  } catch (error) {
    console.warn('Auto-detect location failed:', error);
    // Return empty location - UI should show manual input
    return {
      state: '',
      district: '',
      isAutoDetected: false,
    };
  }
}

// ============================================
// MANDI PRICE SERVICE
// ============================================

/**
 * Fetch mandi price for a specific commodity and location
 * 
 * Fallback hierarchy:
 * 1. Exact match: state + district + commodity
 * 2. State average: state + commodity
 * 3. Returns null (engine will use national average)
 */
export async function getMandiPrice(
  commodityName: string,
  state: string,
  district?: string
): Promise<MandiPrice | null> {
  // Normalize inputs
  const normalizedCommodity = commodityName.toLowerCase().trim();
  const normalizedState = state.trim();
  const normalizedDistrict = (district || '').trim();

  // Check cache
  const cacheKey = getCacheKey(normalizedState, normalizedDistrict, normalizedCommodity);
  const cached = priceCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached!.data;
  }

  try {
    // Try exact match first (state + district + commodity)
    if (normalizedDistrict) {
      const exactQuery = query(
        collection(db, 'mandiPrices'),
        where('state', '==', normalizedState),
        where('district', '==', normalizedDistrict),
        where('commodityName', '==', normalizedCommodity),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );

      const exactSnap = await getDocs(exactQuery);
      if (!exactSnap.empty) {
        const price = mapDocToMandiPrice(exactSnap.docs[0]);
        priceCache.set(cacheKey, { data: price, timestamp: Date.now() });
        return price;
      }
    }

    // Fallback to state-level search
    const stateQuery = query(
      collection(db, 'mandiPrices'),
      where('state', '==', normalizedState),
      where('commodityName', '==', normalizedCommodity),
      orderBy('updatedAt', 'desc'),
      limit(5)
    );

    const stateSnap = await getDocs(stateQuery);
    if (!stateSnap.empty) {
      // Calculate average of available prices
      const prices = stateSnap.docs.map(mapDocToMandiPrice);
      const avgModal = prices.reduce((sum, p) => sum + p.modalPrice, 0) / prices.length;
      
      const avgPrice: MandiPrice = {
        id: 'state_avg',
        commodityName: normalizedCommodity,
        state: normalizedState,
        district: 'State Average',
        marketName: `${normalizedState} Average`,
        minPrice: Math.min(...prices.map(p => p.minPrice)),
        maxPrice: Math.max(...prices.map(p => p.maxPrice)),
        modalPrice: Math.round(avgModal),
        updatedAt: new Date(),
        source: 'fallback',
        isStale: false,
      };

      priceCache.set(cacheKey, { data: avgPrice, timestamp: Date.now() });
      return avgPrice;
    }

    // No data found - cache null to avoid repeated queries
    priceCache.set(cacheKey, { data: null, timestamp: Date.now() });
    return null;

  } catch (error) {
    console.error('Error fetching mandi price:', error);
    return null;
  }
}

/**
 * Get multiple mandi prices for a list of commodities
 */
export async function getMandiPricesForCommodities(
  commodities: string[],
  state: string,
  district?: string
): Promise<Map<string, MandiPrice | null>> {
  const results = new Map<string, MandiPrice | null>();
  
  // Fetch in parallel
  await Promise.all(
    commodities.map(async (commodity) => {
      const price = await getMandiPrice(commodity, state, district);
      results.set(commodity.toLowerCase(), price);
    })
  );

  return results;
}

// ============================================
// COMBINED MARKET SERVICE
// ============================================

export interface MarketPricingRequest {
  commodityName: string;
  category?: ProductCategory;
  grade: string;        // 'A', 'B', 'C' or label like 'Premium'
  location: GeoLocation;
}

export interface MarketPricingResponse {
  pricing: PricingEngineResult;
  mandiPrice: MandiPrice | null;
  location: GeoLocation;
}

/**
 * Main entry point: Get complete pricing for a product
 * 
 * This combines:
 * 1. Mandi price lookup
 * 2. Pricing engine calculation
 * 3. Location context
 */
export async function getMarketPricing(
  request: MarketPricingRequest
): Promise<MarketPricingResponse> {
  const { commodityName, category, grade, location } = request;

  // Fetch mandi price
  const mandiPrice = await getMandiPrice(
    commodityName,
    location.state,
    location.district
  );

  // Parse grade
  const qualityGrade: QualityGrade = parseGradeLabel(grade);

  // Calculate pricing
  const pricing = calculatePricing(mandiPrice, commodityName, qualityGrade, category);

  return {
    pricing,
    mandiPrice,
    location,
  };
}

/**
 * Clear all cached data (useful for testing or force refresh)
 */
export function clearMarketCache(): void {
  priceCache.clear();
  locationCache.clear();
}

// ============================================
// INDIAN STATES & DISTRICTS (for manual selection fallback)
// ============================================

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const MAJOR_DISTRICTS: Record<string, string[]> = {
  'Maharashtra': ['Nashik', 'Pune', 'Nagpur', 'Ahmednagar', 'Aurangabad', 'Kolhapur', 'Sangli', 'Solapur'],
  'Karnataka': ['Bangalore', 'Mysore', 'Belgaum', 'Hubli', 'Mangalore', 'Gulbarga', 'Davangere'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Rajkot', 'Vadodara', 'Junagadh', 'Mehsana', 'Anand'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Hisar', 'Karnal', 'Panipat', 'Rohtak', 'Sonipat'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy', 'Tirunelveli'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Burdwan'],
};
