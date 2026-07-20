/* FBC Pinedale — network-first service worker (auth-safe) + web push */

const CACHE_NAME = 'fbc-static-v2';

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

/** Admin / membership alerts (and future push types). */
self.addEventListener('push', (event) => {
  let data = {
    title: 'First Baptist Pinedale',
    body: 'You have a new notification.',
    url: '/',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'First Baptist Pinedale', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';
  const absolute = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(absolute);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absolute);
      }
    })
  );
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