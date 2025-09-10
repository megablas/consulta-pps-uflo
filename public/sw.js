// Define the cache name and files to cache.
// Using a versioned cache name is a best practice to manage updates.
const CACHE_NAME = 'mi-panel-academico-cache-v4';
// This list now uses relative paths, making it more robust and independent of the base path.
// Icons have been removed from this list, as the browser will fetch them via the manifest.
const FILES_TO_CACHE = [
  './',
  './manifest.json',
];

// The install event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  // We wait until the cache is populated before completing the installation.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching app shell');
      // Use addAll with a catch to prevent installation failure if an asset (like an icon) is missing.
      return cache.addAll(FILES_TO_CACHE).catch(error => {
        console.warn('[ServiceWorker] Failed to cache all initial assets. The app will still work offline, but some resources might be missing until fetched.', error);
      });
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
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Strategy: Network falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the fetch is successful, clone it and cache it for future offline use.
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network fails, try to serve from the cache.
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If the request is for a page and it's not in the cache, return the main index.html as a fallback (for SPA).
          if (event.request.mode === 'navigate') {
            return caches.match('./'); // Use the relative path to the root
          }
          return new Response(null, { status: 404, statusText: "Not Found" });
        });
      })
  );
});