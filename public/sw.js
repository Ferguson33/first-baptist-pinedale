/* FBC Pinedale — network-first service worker (auth-safe) */

const CACHE_NAME = 'fbc-static-v1';

const NEVER_CACHE = (url) => {
  if (url.pathname.startsWith('/api/')) return true;
  if (url.hostname.includes('supabase.co')) return true;
  if (url.pathname === '/sw.js') return true;
  return false;
};

// Uploads use POST/PUT to /api/* or cross-origin Supabase storage — never intercepted below.

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never touch mutations (uploads, sign-in, deletes) or third-party storage APIs.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE(url)) return;

  // HTML navigations: always prefer the network so auth and content stay fresh.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/');
        return cached || Response.error();
      })
    );
    return;
  }

  // Immutable Next.js build assets: cache for speed, revalidate in background.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        const networkResponse = await network;
        return networkResponse || cached || Response.error();
      })
    );
  }
});