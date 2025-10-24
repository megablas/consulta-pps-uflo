// sw.js para /consulta-pps-uflo/

const CACHE_NAME = 'mi-panel-academico-cache-v11';
const FILES_TO_CACHE = [
  '/consulta-pps-uflo/index.html',
  '/consulta-pps-uflo/manifest.json',
];

// Instala y precachea el shell mínimo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .catch((err) => {
        // Precarga parcial: no fallar la instalación por un asset faltante
        console.warn('[SW] Precarga parcial', err);
      })
  );
  self.skipWaiting();
});

// Activa y purga caches viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: Network-first con fallback a caché
self.addEventListener('fetch', (event) => {
  // Ignora métodos no-GET y extensiones del navegador
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Intento de red primero
        const networkResponse = await fetch(event.request);
        // Cachea copia si es OK
        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          // No bloquea la respuesta
          cache.put(event.request, copy).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        // Sin red: intenta caché
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Para navegaciones, sirve el index como fallback de SPA
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/consulta-pps-uflo/index.html');
          if (fallback) return fallback;
        }

        // Último recurso: 404 vacía
        return new Response(null, { status: 404, statusText: 'Not Found' });
      }
    })()
  );
});