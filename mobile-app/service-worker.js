/**
 * SPARKX Service Worker
 * Ensures offline resilience and reliable timer state caching.
 */

const CACHE_NAME = 'sparkx-wellbeing-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/interventions.css',
  '/js/app.js',
  '/js/session-timer.js',
  '/js/distraction-detector.js',
  '/js/intervention-manager.js',
  '/js/task-manager.js',
  '/js/gamification.js',
  '/js/group-sync.js',
  '/js/api-client.js',
  '/js/sound-effects.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Soft fail if any assets aren't yet available
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network first for API, cache first for static files
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline mode active' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => cachedResponse);
      })
    );
  }
});
