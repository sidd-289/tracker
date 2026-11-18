// Jans Desk Service Worker - v2.0.0
// Offline-first PWA proxy & proactive asset precaching
const CACHE_NAME = 'jans-cache-v2';

const CORE_ASSETS = [
  '/',
  '/?source=pwa',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.svg',
  '/favicon.png',
];

// 1. Install Phase: Cache App Shell & parse subresources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache known static assets
      await cache.addAll(CORE_ASSETS);

      // Pre-fetch HTML shell and proactively discover and cache CSS / JS chunks
      try {
        const pageRes = await fetch('/');
        if (pageRes && pageRes.ok) {
          const html = await pageRes.clone().text();
          await cache.put('/', pageRes.clone());
          await cache.put('/?source=pwa', pageRes.clone());

          const subresources = [];
          const regex = /(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g;
          let match;
          while ((match = regex.exec(html)) !== null) {
            subresources.push(match[1]);
          }

          if (subresources.length > 0) {
            await Promise.allSettled(
              subresources.map((url) =>
                fetch(url)
                  .then((res) => (res.ok ? cache.put(url, res) : null))
                  .catch(() => {})
              )
            );
          }
        }
      } catch (err) {
        console.warn('[SW] Pre-caching HTML subresources:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Phase: Clean up old cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Evicting old cache generation:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Phase: Programmable Proxy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST /api/sync)
  if (request.method !== 'GET') {
    return;
  }

  // A. Navigation requests (Opening or refreshing the app)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              cache.put('/', clone);
              cache.put('/?source=pwa', clone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // OFFLINE FALLBACK: Ignore query params (?source=pwa)
          const cachedRequest = await caches.match(request, { ignoreSearch: true });
          if (cachedRequest) return cachedRequest;

          const rootCached = await caches.match('/', { ignoreSearch: true });
          if (rootCached) return rootCached;

          const pwaCached = await caches.match('/?source=pwa', { ignoreSearch: true });
          if (pwaCached) return pwaCached;

          return new Response(
            '<!DOCTYPE html><html><body style="background:#f3efe3;font-family:monospace;padding:2rem;"><h2>Jans Desk Offline</h2><p>Please connect to the network to refresh.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // B. Next.js Static Chunks, Images, Fonts (Cache-First / Stale-While-Revalidate)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C. API Calls (Network-First with Cached Fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true, error: 'Network unavailable' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        })
    );
    return;
  }

  // Default: Cache with Network Fallback
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).catch(() => new Response('', { status: 408 }))
      );
    })
  );
});
