const CACHE_NAME = 'mikayla-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Installation : on précache les ressources de base
self.addEventListener('install', (event) => {
  event.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activation : on nettoie les vieux caches
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
  self.clients.claim();
});

// Stratégie : cache-first pour le shell, network-first pour le reste
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que les requêtes GET HTTP
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Si c'est la même origine que l'app
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // On met en cache si c'est une réponse OK
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Pour les ressources externes (CDN, etc.) : network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notifications (structure de base)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Mikayla', body: 'Nouveau message' };

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Mikayla', {
      body: data.body ?? 'Tu as une nouvelle activité sur Mikayla.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
    })
  );
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
