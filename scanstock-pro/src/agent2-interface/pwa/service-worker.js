// ScanStock Pro Service Worker
// Agent 2 - PWA offline capabilities

const CACHE_NAME = 'scanstock-v1';
const OFFLINE_URL = '/offline';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/scanner',
  '/products',
  '/count',
  '/history',
  '/profile',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files when they exist
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/inventory/,
  /\/api\/business/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached page or offline page
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(request)
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for failed requests
            if (request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Handle API requests with specific caching strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    // For GET requests, try cache first, then network
    if (method === 'GET') {
      const cachedResponse = await caches.match(request);
      
      try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
          // Update cache with fresh data
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
        
        // Return cached version if network failed
        return cachedResponse || new Response(
          JSON.stringify({ error: 'Network unavailable', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        // Network failed, return cache or error
        return cachedResponse || new Response(
          JSON.stringify({ error: 'Network unavailable', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // For POST/PUT/DELETE requests, try network first
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      try {
        const response = await fetch(request);
        
        // If successful, clear relevant cache entries
        if (response.ok) {
          await invalidateRelatedCache(url);
        }
        
        return response;
      } catch (error) {
        // Network failed, queue for background sync
        await queueFailedRequest(request);
        
        return new Response(
          JSON.stringify({ 
            error: 'Request queued for sync', 
            offline: true,
            queued: true
          }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Default: try network first, fallback to cache
    return await fetch(request);
    
  } catch (error) {
    console.error('API request failed:', error);
    
    return new Response(
      JSON.stringify({ error: 'Request failed', offline: true }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Invalidate cache entries related to a URL
async function invalidateRelatedCache(url) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const relatedKeys = keys.filter((key) => {
    const keyUrl = new URL(key.url);
    return keyUrl.pathname.startsWith(url.pathname.split('/').slice(0, -1).join('/'));
  });

  await Promise.all(relatedKeys.map(key => cache.delete(key)));
}

// Queue failed requests for background sync
async function queueFailedRequest(request) {
  // Store in IndexedDB for background sync
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now(),
  };

  // This would integrate with the useOffline hook's queue
  self.postMessage({
    type: 'QUEUE_REQUEST',
    data: requestData,
  });
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

// Sync offline requests when connection is restored
async function syncOfflineRequests() {
  try {
    // This would work with the offline queue from useOffline hook
    self.postMessage({
      type: 'SYNC_OFFLINE_QUEUE',
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: data.image,
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        }
      ],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'ScanStock Pro', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
  // 'dismiss' action just closes the notification
});

// Message event - communicate with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Utility: Check if request should be cached
function shouldCacheRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache auth requests
  if (url.pathname.includes('/auth/')) {
    return false;
  }
  
  // Don't cache real-time endpoints
  if (url.pathname.includes('/realtime/')) {
    return false;
  }
  
  return true;
}