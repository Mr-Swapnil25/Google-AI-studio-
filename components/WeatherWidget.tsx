import React, { useState, useCallback, useMemo } from 'react';
import { FarmerDashboardWeather } from '../types';
import { refreshWeatherForFarmer, getLocationFromGPS } from '../services/weatherService';
import { useToast } from '../context/ToastContext';

interface WeatherWidgetProps {
    weather: FarmerDashboardWeather | null;
    farmerId: string;
    farmerLocation: string;
    isLoading?: boolean;
}

// Get weather icon based on condition (fallback when no API icon available)
const getWeatherIcon = (condition: string): string => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return 'rainy';
    if (lower.includes('cloud') || lower.includes('overcast')) return 'cloud';
    if (lower.includes('thunder') || lower.includes('storm')) return 'thunderstorm';
    if (lower.includes('snow') || lower.includes('sleet')) return 'ac_unit';
    if (lower.includes('fog') || lower.includes('mist')) return 'foggy';
    if (lower.includes('clear') || lower.includes('sunny')) return 'sunny';
    if (lower.includes('partly')) return 'partly_cloudy_day';
    return 'sunny';
};

// Get gradient colors based on weather condition
const getWeatherGradient = (condition: string): string => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return 'from-blue-400/30 to-slate-500/20';
    if (lower.includes('cloud') || lower.includes('overcast')) return 'from-slate-400/30 to-slate-500/20';
    if (lower.includes('thunder')) return 'from-purple-500/30 to-slate-600/20';
    if (lower.includes('snow')) return 'from-cyan-200/30 to-white/20';
    return 'from-secondary/40 to-primary/20';
};

// Loading skeleton component
const WeatherSkeleton: React.FC = () => (
    <div className="xl:col-span-4 relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/40 to-primary/20 rounded-[2.5rem] blur-xl opacity-20"></div>
        <div className="relative h-full flex flex-col justify-between rounded-[2rem] p-8 overflow-hidden bg-white/50 backdrop-blur-xl border border-white/60 shadow-card animate-pulse">
            <div className="flex justify-between items-start">
                <div className="space-y-3">
                    <div className="h-6 w-32 bg-stone-200 rounded-lg"></div>
                    <div className="h-16 w-24 bg-stone-200 rounded-lg"></div>
                    <div className="h-5 w-28 bg-stone-200 rounded-lg"></div>
                </div>
                <div className="h-24 w-24 bg-stone-200 rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-white/50">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className="h-14 w-14 bg-stone-200 rounded-full"></div>
                        <div className="h-4 w-12 bg-stone-200 rounded"></div>
                        <div className="h-3 w-16 bg-stone-200 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Error state component
const WeatherError: React.FC<{ onRetry: () => void; isRetrying: boolean }> = ({ onRetry, isRetrying }) => (
    <div className="xl:col-span-4 relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-stone-400/20 rounded-[2.5rem] blur-xl opacity-20"></div>
        <div className="relative h-full flex flex-col items-center justify-center rounded-[2rem] p-8 bg-white/50 backdrop-blur-xl border border-white/60 shadow-card text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-red-500">cloud_off</span>
            </div>
            <div>
                <h4 className="text-lg font-bold text-stone-800">Weather Unavailable</h4>
                <p className="text-sm text-stone-500 mt-1">Unable to load weather data</p>
            </div>
            <button
                onClick={onRetry}
                disabled={isRetrying}
                className="px-6 py-2.5 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
                {isRetrying ? (
                    <>
                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                        Retrying...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Try Again
                    </>
                )}
            </button>
        </div>
    </div>
);

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
    weather,
    farmerId,
    farmerLocation,
    isLoading = false,
}) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const { showToast } = useToast();

    // API key from environment (for development - should be Cloud Function in production)
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY || '';

    // Handle manual refresh
    const handleRefresh = useCallback(async (useGPS = false) => {
        if (!apiKey) {
            showToast('Weather API key not configured', 'error');
            return;
        }

        setIsRefreshing(true);
        setHasError(false);

        try {
            let location = farmerLocation || 'India';

            if (useGPS) {
                try {
                    location = await getLocationFromGPS();
                    showToast('Using GPS location', 'info');
                } catch (gpsError) {
                    console.warn('GPS failed, using profile location:', gpsError);
                }
            }

            await refreshWeatherForFarmer(farmerId, location, apiKey);
            showToast('Weather updated!', 'success');
        } catch (error) {
            console.error('Weather refresh failed:', error);
            setHasError(true);
            showToast('Failed to update weather', 'error');
        } finally {
            setIsRefreshing(false);
        }
    }, [farmerId, farmerLocation, apiKey, showToast]);

    // Fallback weather data
    const displayWeather = useMemo<FarmerDashboardWeather>(() => {
        if (weather) return weather;
        return {
            locationLabel: farmerLocation || 'India',
            temperatureC: 32,
            conditionLabel: 'Sunny & Clear',
            weatherIcon: '',
            humidityPct: 45,
            windKmh: 12,
            rainPct: 0,
            updatedAt: new Date(),
        };
    }, [weather, farmerLocation]);

    // Time since last update
    const lastUpdatedText = useMemo(() => {
        if (!displayWeather.updatedAt) return '';
        const mins = Math.round((Date.now() - displayWeather.updatedAt.getTime()) / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
    }, [displayWeather.updatedAt]);

    // Show skeleton while loading
    if (isLoading) {
        return <WeatherSkeleton />;
    }

    // Show error state
    if (hasError && !weather) {
        return <WeatherError onRetry={() => handleRefresh()} isRetrying={isRefreshing} />;
    }

    const conditionGradient = getWeatherGradient(displayWeather.conditionLabel);
    const fallbackIcon = getWeatherIcon(displayWeather.conditionLabel);

    return (
        <div className="xl:col-span-4 relative group">
            <div className={`absolute inset-0 bg-gradient-to-br ${conditionGradient} rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity`}></div>
            <div className="relative h-full flex flex-col justify-between rounded-[2rem] p-8 overflow-hidden bg-white/50 backdrop-blur-xl border border-white/60 shadow-card">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-2xl"></div>

                {/* Header with refresh button */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    {lastUpdatedText && (
                        <span className="text-xs text-stone-400 font-medium">{lastUpdatedText}</span>
                    )}
                    <button
                        onClick={() => handleRefresh(false)}
                        disabled={isRefreshing}
                        className="p-2 rounded-full bg-white/60 hover:bg-white/80 text-stone-600 transition-all hover:scale-105 disabled:opacity-50 border border-white/50"
                        title="Refresh weather"
                    >
                        <span className={`material-symbols-outlined text-xl ${isRefreshing ? 'animate-spin' : ''}`}>
                            {isRefreshing ? 'progress_activity' : 'refresh'}
                        </span>
                    </button>
                </div>

                {/* Main weather info */}
                <div className="flex justify-between items-start z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-red-500 animate-pulse">location_on</span>
                            <span className="text-lg font-bold text-stone-600 drop-shadow-sm">{displayWeather.locationLabel}</span>
                        </div>
                        <h3 className="text-7xl font-display font-bold text-stone-900 tracking-tighter">
                            {Math.round(displayWeather.temperatureC)}°
                        </h3>
                        <p className="text-xl font-medium text-stone-500 mt-1">{displayWeather.conditionLabel}</p>
                    </div>
                    <div className="relative">
                        {displayWeather.weatherIcon ? (
                            <img
                                src={displayWeather.weatherIcon}
                                alt={displayWeather.conditionLabel}
                                className="w-24 h-24 object-contain drop-shadow-lg animate-float"
                            />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[100px] leading-none text-accent animate-float drop-shadow-lg">
                                    {fallbackIcon}
                                </span>
                                <span className="material-symbols-outlined text-[100px] leading-none text-accent/30 absolute top-0 left-0 blur-sm animate-pulse">
                                    {fallbackIcon}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Weather details grid */}
                <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-white/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative h-14 w-14 rounded-full bg-white/60 border border-white/70 flex items-center justify-center shadow-soft">
                            <span className="material-symbols-outlined text-secondary">water_drop</span>
                        </div>
                        <div className="text-center leading-none">
                            <span className="block font-bold text-stone-700">{Math.round(displayWeather.humidityPct)}%</span>
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Humidity</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative h-14 w-14 rounded-full bg-white/60 border border-white/70 flex items-center justify-center shadow-soft">
                            <span className="material-symbols-outlined text-stone-600">air</span>
                        </div>
                        <div className="text-center leading-none">
                            <span className="block font-bold text-stone-700">{Math.round(displayWeather.windKmh)}km</span>
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Wind</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative h-14 w-14 rounded-full bg-white/60 border border-white/70 flex items-center justify-center shadow-soft">
                            <span className="material-symbols-outlined text-blue-600">rainy</span>
                        </div>
                        <div className="text-center leading-none">
                            <span className="block font-bold text-stone-700">{Math.round(displayWeather.rainPct)}%</span>
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Rain</span>
                        </div>
                    </div>
                </div>

                {/* GPS option (hidden by default, shown on hover) */}
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleRefresh(true)}
                        disabled={isRefreshing}
                        className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">my_location</span>
                        Use GPS
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
