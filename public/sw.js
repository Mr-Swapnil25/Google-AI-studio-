/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNA BAZAAR - SERVICE WORKER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PWA Service Worker for offline support and asset caching
 * 
 * Caching Strategy:
 * - Static Assets (JS, CSS, HTML): Cache-First
 * - Google Fonts & Material Icons: Stale-While-Revalidate
 * - API Calls (Firebase, Gemini, etc.): Network-Only
 * - Images from external CDNs: Network-Only
 * 
 * @version 1.0.0
 * @author Anna Bazaar Team
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `anna-bazaar-static-${CACHE_VERSION}`;
const FONT_CACHE_NAME = `anna-bazaar-fonts-${CACHE_VERSION}`;
const ASSET_CACHE_NAME = `anna-bazaar-assets-${CACHE_VERSION}`;

// Files to pre-cache during install (App Shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo.png',
  '/manifest.json'
];

// URL patterns for different caching strategies
const CACHE_STRATEGIES = {
  // Cache-First: Static assets
  cacheFirst: [
    /\.(?:js|css|woff2?|ttf|eot)$/,
    /\/icons\//,
    /\/logo\.png$/,
    /\/manifest\.json$/
  ],
  
  // Stale-While-Revalidate: Fonts and icon fonts
  staleWhileRevalidate: [
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/
  ],
  
  // Network-Only: APIs and dynamic content (NEVER cache)
  networkOnly: [
    /firestore\.googleapis\.com/,
    /firebase/,
    /firebaseio\.com/,
    /googleapis\.com\/identitytoolkit/,
    /securetoken\.googleapis\.com/,
    /googleapis\.com\/maps/,
    /maps\.googleapis\.com/,
    /ipapi\.co/,
    /cloudfunctions\.net/,
    /dodopayments/,
    /zegocloud/,
    /zego/,
    /generativelanguage\.googleapis\.com/,
    /\/api\//,
    /chrome-extension:/,
    /webpack/,
    /__vite/,
    /\.hot-update\./,
    /sockjs-node/,
    /ws:/,
    /wss:/
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a URL matches any pattern in an array
 */
function matchesPattern(url, patterns) {
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Get the appropriate cache name for a request
 */
function getCacheName(url) {
  if (matchesPattern(url, CACHE_STRATEGIES.staleWhileRevalidate)) {
    return FONT_CACHE_NAME;
  }
  return STATIC_CACHE_NAME;
}

/**
 * Determine the caching strategy for a request
 */
function getStrategy(url) {
  if (matchesPattern(url, CACHE_STRATEGIES.networkOnly)) {
    return 'network-only';
  }
  if (matchesPattern(url, CACHE_STRATEGIES.staleWhileRevalidate)) {
    return 'stale-while-revalidate';
  }
  if (matchesPattern(url, CACHE_STRATEGIES.cacheFirst)) {
    return 'cache-first';
  }
  // Default: Network-first for everything else
  return 'network-first';
}

/**
 * Clean old caches on activation
 */
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE_NAME, FONT_CACHE_NAME, ASSET_CACHE_NAME];
  
  return Promise.all(
    cacheNames
      .filter(name => name.startsWith('anna-bazaar-') && !validCaches.includes(name))
      .map(name => {
        console.log('[SW] Deleting old cache:', name);
        return caches.delete(name);
      })
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHING STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache-First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheName(request.url));
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first fetch failed:', request.url);
    throw error;
  }
}

/**
 * Network-First Strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale-While-Revalidate Strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(getCacheName(request.url));
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.log('[SW] Background fetch failed for:', request.url);
      return cachedResponse;
    });
  
  // Return cached version immediately if available
  return cachedResponse || fetchPromise;
}

/**
 * Network-Only Strategy
 * Always fetch from network, never cache
 */
async function networkOnly(request) {
  return fetch(request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE WORKER LIFECYCLE EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INSTALL EVENT
 * Pre-cache essential app shell files
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching app shell...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Pre-cache failed:', error);
      })
  );
});

/**
 * ACTIVATE EVENT
 * Clean up old caches and take control of clients
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      cleanOldCaches(),
      // Take control of all open clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated and controlling clients');
    })
  );
});

/**
 * FETCH EVENT
 * Intercept network requests and apply caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.startsWith('http')) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          console.log('[SW] Navigation failed, serving offline page');
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // Determine and apply the appropriate strategy
  const strategy = getStrategy(url);
  
  switch (strategy) {
    case 'network-only':
      // Don't intercept - let it pass through to network
      return;
      
    case 'cache-first':
      event.respondWith(
        cacheFirst(request).catch(() => caches.match('/offline.html'))
      );
      break;
      
    case 'stale-while-revalidate':
      event.respondWith(
        staleWhileRevalidate(request).catch(() => caches.match('/offline.html'))
      );
      break;
      
    case 'network-first':
    default:
      event.respondWith(
        networkFirst(request).catch(() => caches.match('/offline.html'))
      );
      break;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then(names => 
          Promise.all(names.map(name => caches.delete(name)))
        ).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND SYNC (Future Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════

// Placeholder for background sync functionality
// Can be implemented later for offline-first features like queuing negotiations

self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  // Future: Handle background sync for offline actions
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS (Future Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════

// Placeholder for push notification functionality
// Can be implemented later for negotiation updates, order alerts, etc.

self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  // Future: Handle push notifications
});

console.log('[SW] Service worker script loaded');
