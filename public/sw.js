// Define the cache name and files to cache.
// Using a versioned cache name is a best practice to manage updates.
const CACHE_NAME = 'mi-panel-academico-cache-v2';
// Note: The base path '/consulta-pps-uflo/' from vite.config.ts must be prepended.
const FILES_TO_CACHE = [
  '/consulta-pps-uflo/',
  '/consulta-pps-uflo/index.html',
  '/consulta-pps-uflo/index.tsx', // This will be the bundled JS in production
  '/consulta-pps-uflo/src/index.css',
  '/consulta-pps-uflo/icons/icon-192x192.png',
  '/consulta-pps-uflo/icons/icon-512x512.png'
];

// The install event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  // We wait until the cache is populated before completing the installation.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// The activate event is fired when the service worker is activated.
// It's a good place to clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Ensures that any pages controlled by this service worker will be refreshed.
  self.clients.claim();
});

// The fetch event is fired for every network request.
// We implement a "cache-first" strategy.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For navigation requests, we use a network-first strategy to get the latest HTML.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/consulta-pps-uflo/index.html');
      })
    );
    return;
  }

  // For all other requests (CSS, JS, images), we use a cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If we have a match in the cache, return it.
      if (response) {
        return response;
      }
      // Otherwise, fetch from the network.
      return fetch(event.request).then((networkResponse) => {
        // OPTIONAL: You could add the new response to the cache here if desired.
        // For dynamic data, it's often better not to cache it automatically.
        return networkResponse;
      });
    }).catch(error => {
      // This is a fallback for when both cache and network fail.
      // You could return a generic offline fallback page or image here.
      console.error('[ServiceWorker] Fetch failed:', error);
    })
  );
});