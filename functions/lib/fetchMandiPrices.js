"use strict";
/**
 * MANDI PRICE FETCHER - Cloud Function
 *
 * Fetches daily mandi prices from data.gov.in API and populates Firestore.
 * Runs every 12 hours via Cloud Scheduler.
 *
 * API Source: https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
 *
 * @package firebase-functions
 * @package firebase-admin
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMandiPricesNow = exports.fetchMandiPricesHttp = exports.fetchMandiPrices = exports.PRIORITY_STATES = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ============================================
// CONFIGURATION
// ============================================
/**
 * Data.gov.in API Configuration
 * Get your API key from: https://data.gov.in/user/register
 */
const DATA_GOV_API_KEY = functions.config().datagov?.api_key || process.env.DATA_GOV_API_KEY || '';
const DATA_GOV_BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
// Common agricultural commodities to track
const TRACKED_COMMODITIES = [
    // Vegetables
    'Tomato', 'Potato', 'Onion', 'Cabbage', 'Cauliflower', 'Brinjal',
    'Lady Finger', 'Cucumber', 'Carrot', 'Beans', 'Capsicum', 'Spinach',
    'Peas', 'Radish', 'Bitter Gourd', 'Bottle Gourd', 'Pumpkin',
    // Fruits
    'Apple', 'Banana', 'Mango', 'Orange', 'Grapes', 'Papaya',
    'Watermelon', 'Pomegranate', 'Guava', 'Pineapple', 'Lemon',
    // Grains & Pulses
    'Wheat', 'Rice', 'Maize', 'Bajra', 'Jowar', 'Ragi',
    'Arhar Dal', 'Chana Dal', 'Moong Dal', 'Urad Dal', 'Masoor Dal',
    // Oilseeds
    'Groundnut', 'Mustard', 'Soybean', 'Sunflower', 'Sesame',
    // Spices
    'Chilli', 'Turmeric', 'Ginger', 'Garlic', 'Coriander', 'Cumin',
];
// Major states to prioritize (exported for potential filtering use)
exports.PRIORITY_STATES = [
    'Maharashtra', 'Karnataka', 'Gujarat', 'Rajasthan', 'Madhya Pradesh',
    'Uttar Pradesh', 'Punjab', 'Haryana', 'Tamil Nadu', 'Andhra Pradesh',
    'Telangana', 'West Bengal', 'Bihar', 'Odisha', 'Kerala',
];
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Normalize commodity name for consistent matching
 */
function normalizeCommodity(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
/**
 * Fetch data from data.gov.in API with pagination
 */
async function fetchFromDataGov(commodity, offset = 0, limit = 100) {
    if (!DATA_GOV_API_KEY) {
        console.warn('DATA_GOV_API_KEY not configured. Skipping API fetch.');
        return [];
    }
    const params = new URLSearchParams({
        'api-key': DATA_GOV_API_KEY,
        'format': 'json',
        'offset': offset.toString(),
        'limit': limit.toString(),
        'filters[commodity]': commodity,
    });
    try {
        const response = await (0, node_fetch_1.default)(`${DATA_GOV_BASE_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.records || [];
    }
    catch (error) {
        console.error(`Failed to fetch ${commodity} prices:`, error);
        return [];
    }
}
/**
 * Build document ID for consistent lookups
 */
function buildDocId(state, district, commodity) {
    return `${state.toLowerCase()}_${district.toLowerCase()}_${commodity.toLowerCase()}`
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}
/**
 * Process and save mandi prices to Firestore
 */
async function processCommodityPrices(commodity) {
    console.log(`Processing: ${commodity}`);
    const records = await fetchFromDataGov(commodity);
    if (records.length === 0) {
        console.log(`  No records found for ${commodity}`);
        return 0;
    }
    const batch = db.batch();
    let count = 0;
    for (const record of records) {
        // Skip invalid records
        if (!record.state || !record.district || !record.modal_price) {
            continue;
        }
        const docId = buildDocId(record.state, record.district, record.commodity);
        const docRef = db.collection('mandiPrices').doc(docId);
        const priceDoc = {
            commodityName: normalizeCommodity(record.commodity),
            state: record.state,
            district: record.district,
            marketName: record.market || `${record.district} Mandi`,
            minPrice: parseFloat(record.min_price) || 0,
            maxPrice: parseFloat(record.max_price) || 0,
            modalPrice: parseFloat(record.modal_price) || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'data.gov.in',
            arrivalDate: record.arrival_date,
        };
        batch.set(docRef, priceDoc, { merge: true });
        count++;
        // Firestore batch limit is 500
        if (count % 450 === 0) {
            await batch.commit();
            console.log(`  Committed ${count} records...`);
        }
    }
    // Commit remaining
    if (count % 450 !== 0) {
        await batch.commit();
    }
    console.log(`  Saved ${count} records for ${commodity}`);
    return count;
}
// ============================================
// CLOUD FUNCTIONS
// ============================================
/**
 * Scheduled function to fetch mandi prices every 12 hours
 * Deploy with: firebase deploy --only functions
 *
 * Set API key: firebase functions:config:set datagov.api_key="YOUR_KEY"
 */
exports.fetchMandiPrices = functions
    .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB',
})
    .pubsub
    .schedule('every 12 hours')
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
    console.log('=== MANDI PRICE SYNC STARTED ===');
    console.log(`Time: ${new Date().toISOString()}`);
    let totalRecords = 0;
    const startTime = Date.now();
    for (const commodity of TRACKED_COMMODITIES) {
        try {
            const count = await processCommodityPrices(commodity);
            totalRecords += count;
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        catch (error) {
            console.error(`Error processing ${commodity}:`, error);
        }
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('=== MANDI PRICE SYNC COMPLETED ===');
    console.log(`Total records: ${totalRecords}`);
    console.log(`Duration: ${duration}s`);
    return null;
});
/**
 * HTTP endpoint for manual trigger (for testing)
 * URL: https://[region]-[project].cloudfunctions.net/fetchMandiPricesHttp
 */
exports.fetchMandiPricesHttp = functions
    .runWith({
    timeoutSeconds: 540,
    memory: '512MB',
})
    .https
    .onRequest(async (req, res) => {
    // Simple API key check for manual triggers
    const authKey = req.headers['x-api-key'] || req.query.key;
    if (!authKey || authKey !== DATA_GOV_API_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    console.log('=== MANUAL MANDI PRICE SYNC ===');
    let totalRecords = 0;
    const startTime = Date.now();
    // Allow filtering by commodity via query param
    const filterCommodity = req.query.commodity;
    const commoditiesToProcess = filterCommodity
        ? [filterCommodity]
        : TRACKED_COMMODITIES;
    for (const commodity of commoditiesToProcess) {
        try {
            const count = await processCommodityPrices(commodity);
            totalRecords += count;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        catch (error) {
            console.error(`Error processing ${commodity}:`, error);
        }
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    res.json({
        success: true,
        totalRecords,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
    });
});
/**
 * Callable function for frontend-triggered sync (admin only)
 */
exports.syncMandiPricesNow = functions
    .runWith({
    timeoutSeconds: 300,
    memory: '256MB',
})
    .https
    .onCall(async (data, context) => {
    // Verify authenticated admin user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // You can add admin role check here
    // const isAdmin = context.auth.token.admin === true;
    const commodity = data?.commodity;
    if (commodity) {
        const count = await processCommodityPrices(commodity);
        return { success: true, records: count, commodity };
    }
    // Sync first 5 commodities for quick refresh
    const quickSync = TRACKED_COMMODITIES.slice(0, 5);
    let total = 0;
    for (const c of quickSync) {
        total += await processCommodityPrices(c);
    }
    return { success: true, records: total, commodities: quickSync };
});
//# sourceMappingURL=fetchMandiPrices.js.map