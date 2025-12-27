/**
 * Weather Service for Anna Bazaar Farmer Dashboard
 * 
 * This service handles weather data fetching from WeatherAPI.com
 * and caching in Firestore. For production, the API call should be
 * made via Firebase Cloud Functions to keep the API key secure.
 * 
 * Current implementation: Direct API call (for development)
 * Production: Should migrate to Cloud Function endpoint
 */

import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { FarmerDashboardWeather } from '../types';

// Cache validity duration in milliseconds (30 minutes)
const CACHE_DURATION_MS = 30 * 60 * 1000;

// WeatherAPI endpoint
const WEATHER_API_BASE = 'https://api.weatherapi.com/v1';

/**
 * Weather API response interfaces (mapped from WeatherAPI.com)
 */
interface WeatherAPIResponse {
    location: {
        name: string;
        region: string;
        country: string;
    };
    current: {
        temp_c: number;
        condition: {
            text: string;
            icon: string;
        };
        humidity: number;
        wind_kph: number;
    };
    forecast?: {
        forecastday: Array<{
            day: {
                daily_chance_of_rain: number;
            };
        }>;
    };
}

/**
 * Normalize WeatherAPI response to FarmerDashboardWeather format
 */
const normalizeWeatherResponse = (data: WeatherAPIResponse): Omit<FarmerDashboardWeather, 'updatedAt'> => {
    return {
        locationLabel: data.location.name,
        temperatureC: data.current.temp_c,
        conditionLabel: data.current.condition.text,
        weatherIcon: data.current.condition.icon.startsWith('//')
            ? `https:${data.current.condition.icon}`
            : data.current.condition.icon,
        humidityPct: data.current.humidity,
        windKmh: data.current.wind_kph,
        rainPct: data.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain ?? 0,
    };
};

/**
 * Check if cached weather data is still fresh
 */
const isCacheFresh = (updatedAt: Date | null): boolean => {
    if (!updatedAt) return false;
    const now = Date.now();
    const cacheTime = updatedAt.getTime();
    return now - cacheTime < CACHE_DURATION_MS;
};

/**
 * Fetch weather data from WeatherAPI.com
 * 
 * @param location - City/village name or coordinates (lat,lng)
 * @param apiKey - WeatherAPI key
 * @returns Normalized weather data
 */
export const fetchWeatherFromAPI = async (
    location: string,
    apiKey: string
): Promise<Omit<FarmerDashboardWeather, 'updatedAt'>> => {
    // Use forecast endpoint to get rain chance
    const url = `${WEATHER_API_BASE}/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=1&aqi=no&alerts=no`;

    const response = await fetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('WeatherAPI error:', errorText);
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data: WeatherAPIResponse = await response.json();
    return normalizeWeatherResponse(data);
};

/**
 * Get weather for a farmer, using cache if fresh
 * 
 * @param farmerId - Farmer's user ID
 * @param location - Location to fetch weather for
 * @param apiKey - WeatherAPI key (should come from secure source)
 * @param forceRefresh - Skip cache check and fetch new data
 */
export const getWeatherForFarmer = async (
    farmerId: string,
    location: string,
    apiKey: string,
    forceRefresh = false
): Promise<FarmerDashboardWeather> => {
    const farmerRef = doc(db, 'farmers', farmerId);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        try {
            const farmerSnap = await getDoc(farmerRef);
            if (farmerSnap.exists()) {
                const data = farmerSnap.data();
                const cached = data?.dashboardWeather;

                if (cached) {
                    const updatedAt = cached.updatedAt?.toDate?.() ?? new Date(0);

                    if (isCacheFresh(updatedAt)) {
                        console.log('[WeatherService] Using cached weather data');
                        return {
                            locationLabel: cached.locationLabel ?? location,
                            temperatureC: cached.temperatureC ?? 0,
                            conditionLabel: cached.conditionLabel ?? '—',
                            weatherIcon: cached.weatherIcon ?? '',
                            humidityPct: cached.humidityPct ?? 0,
                            windKmh: cached.windKmh ?? 0,
                            rainPct: cached.rainPct ?? 0,
                            updatedAt,
                        };
                    }
                }
            }
        } catch (err) {
            console.warn('[WeatherService] Cache check failed:', err);
        }
    }

    // Fetch fresh data
    console.log('[WeatherService] Fetching fresh weather data for:', location);
    const freshData = await fetchWeatherFromAPI(location, apiKey);
    const now = new Date();

    // Cache the result in Firestore
    try {
        await setDoc(
            farmerRef,
            {
                dashboardWeather: {
                    ...freshData,
                    updatedAt: Timestamp.fromDate(now),
                },
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
        console.log('[WeatherService] Weather data cached successfully');
    } catch (err) {
        console.warn('[WeatherService] Failed to cache weather:', err);
    }

    return {
        ...freshData,
        updatedAt: now,
    };
};

/**
 * Update weather for a farmer (callable from UI refresh button)
 * This is the main entry point for manual refresh
 */
export const refreshWeatherForFarmer = async (
    farmerId: string,
    location: string,
    apiKey: string
): Promise<FarmerDashboardWeather> => {
    return getWeatherForFarmer(farmerId, location, apiKey, true);
};

/**
 * Get weather using browser geolocation
 * Returns coordinates as "lat,lng" string for WeatherAPI
 */
export const getLocationFromGPS = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                resolve(`${latitude},${longitude}`);
            },
            (error) => {
                reject(new Error(`Geolocation error: ${error.message}`));
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        );
    });
};
