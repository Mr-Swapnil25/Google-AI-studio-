# Weather Integration - Setup & Usage Guide

## Overview

The weather integration allows farmers to see real-time weather data on their dashboard, helping them make informed decisions about irrigation, spraying, harvesting, and other farming activities.

## Files Created/Modified

### New Files
- `services/weatherService.ts` - Weather API fetching and caching logic
- `components/WeatherWidget.tsx` - Reusable weather display component

### Modified Files
- `types.ts` - Added `weatherIcon` field to `FarmerDashboardWeather`
- `services/firebaseService.ts` - Updated mapper to include weather icon
- `components/FarmerView.tsx` - Integrated WeatherWidget component
- `.env.example` - Added weather API key variable
- `vite-env.d.ts` - TypeScript type for weather API key

---

## Setup Instructions

### 1. Get a WeatherAPI Key

1. Go to [weatherapi.com](https://www.weatherapi.com/)
2. Sign up for a free account (1 million calls/month free)
3. Copy your API key from the dashboard

### 2. Configure Environment Variable

Add to your `.env.local` file:

```env
VITE_WEATHER_API_KEY="71b1998634474c2a88684457252712"
```

### 3. Restart Dev Server

```bash
npm run dev
```

---

## Weather Parameters Displayed

| Parameter | Source | Description |
|-----------|--------|-------------|
| Location | `location.name` | City/village name |
| Temperature | `current.temp_c` | Temperature in Celsius |
| Condition | `current.condition.text` | Weather description |
| Icon | `current.condition.icon` | Weather icon URL |
| Humidity | `current.humidity` | Humidity percentage |
| Wind Speed | `current.wind_kph` | Wind speed in km/h |
| Rain Chance | `forecast.forecastday[0].day.daily_chance_of_rain` | Chance of rain % |

---

## Features

### ✅ Implemented
- [x] Real-time weather display
- [x] Dynamic weather icons from WeatherAPI
- [x] Fallback icons based on weather condition
- [x] Humidity, wind, and rain chance indicators
- [x] Manual refresh button
- [x] Loading skeleton state
- [x] Error state with retry
- [x] GPS location support (optional)
- [x] 30-minute cache to minimize API calls
- [x] Firestore caching for offline support

### 🔮 Future Enhancements
- [ ] 7-day forecast
- [ ] Weather alerts
- [ ] Crop-specific advice based on weather
- [ ] SMS/Voice notifications

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WeatherWidget                        │
│  (Displays weather, handles refresh, shows loading)     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  weatherService.ts                       │
│  (Fetches from API, validates cache, stores in Firestore)│
└────────────────────────────┬────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────┐         ┌─────────────────────────┐
│   WeatherAPI.com    │         │      Firestore          │
│   (External API)    │         │  (Cache & Real-time)    │
└─────────────────────┘         └─────────────────────────┘
```

---

## Production Recommendations

For production deployment, move the WeatherAPI call to a **Firebase Cloud Function** to:

1. Keep API key secure (not exposed in frontend bundle)
2. Enable server-side caching
3. Add rate limiting
4. Support scheduled updates

Example Cloud Function structure:
```javascript
// functions/src/weather.ts
exports.refreshWeather = functions.https.onCall(async (data, context) => {
  const { farmerId, location } = data;
  const apiKey = functions.config().weather.api_key;
  // ... fetch and cache logic
});
```
