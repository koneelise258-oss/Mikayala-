const CACHE_NAME = 'mikayla-v2';

const PRECACHE_STATIC = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-chat.png',
  '/screenshot-jeux.png'
];

// Installation : mise en cache des assets statiques de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_STATIC).catch((err) => {
        console.warn('[SW] Precache static error:', err);
      });
    })
  );
});

// Activation : nettoyage des anciens caches sans recharger la page brutalement
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
});

// Stratégie de fetch intelligente
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Uniquement les requêtes GET HTTP/HTTPS
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // NE JAMAIS intercepter ni mettre en cache Supabase, WebSockets, WebRTC, API, ou scripts dynamiques de dev
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('@vite') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('hot-update') ||
    request.headers.get('accept')?.includes('text/event-stream') ||
    request.headers.get('upgrade') === 'websocket'
  ) {
    return;
  }

  // Pour la navigation de page (HTML) : Network-First avec fallback cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          return fallback || Response.error();
        })
    );
    return;
  }

  // Pour les images, icônes et polices statiques : Cache-First avec mise à jour en tâche de fond
  const isStaticAsset =
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.json');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error());
      })
    );
    return;
  }

  // Pour le reste : Network-First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Mikayla', body: 'Nouveau message reçu' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data = { title: 'Mikayla', body: event.data ? event.data.text() : 'Nouveau message' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Mikayla', {
      body: data.body || 'Tu as une nouvelle activité sur Mikayla.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: data.data || { url: '/' }
    })
  );
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: event.notification.data
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
