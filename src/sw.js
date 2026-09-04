// Prevent vite-plugin-pwa injectManifest error by referencing the manifest
const MANIFEST_ASSETS = self.__WB_MANIFEST || [];

const CACHE_NAME = 'mikayala-pwa-v4';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  ...MANIFEST_ASSETS.map(entry => {
    if (typeof entry === 'string') return entry;
    if (entry && entry.url) return entry.url;
    return null;
  }).filter(Boolean)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets:', ASSETS_TO_CACHE);
      // Fallback on individual caching so one missing file doesn't crash the whole install
      return Promise.all(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Web Push notification handler for incoming messages and alerts
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Mikayla 💌';
  const options = {
    body: data.body || 'Nouveau message reçu',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    tag: data.tag || `push-${Date.now()}`,
    renotify: true
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Inform client windows if active
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: data
          });
        });
      })
    ])
  );
});

// Notification click event handler - opens or focuses the web application window and switches to the proper view
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Network-First with Cache fallback for seamless updates between User 1 & User 2
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
      
  const url = new URL(event.request.url);
  
  // Limiter au même domaine et ignorer Supabase et l'API
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  
  console.log(`SW: handling fetch for ${event.request.url}`);

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch((err) => {
        console.log(`SW: error while serving ${event.request.url}: ${err.message}`);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log(`SW: cache hit for ${event.request.url}`);
            return cachedResponse;
          }
          console.log(`SW: cache miss for ${event.request.url}`);
          
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
            return caches.match('/index.html');
          }
          
          // Return empty response instead of undefined which breaks the page
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
  );
});
