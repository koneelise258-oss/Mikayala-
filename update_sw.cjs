const fs = require('fs');
const filePath = 'public/sw.js';
let content = fs.readFileSync(filePath, 'utf8');

// Update CACHE_NAME to avoid conflicts
content = content.replace(/const CACHE_NAME = 'mikayala-pwa-v\d+';/, "const CACHE_NAME = 'mikayala-pwa-v3';");

// Inject Workbox manifest placeholder if not present
if (!content.includes('self.__WB_MANIFEST')) {
  content = `import { precacheAndRoute } from 'workbox-precaching';\n\n// Prevent vite-plugin-pwa injectManifest error\nprecacheAndRoute(self.__WB_MANIFEST || []);\n\n` + content;
}

// Rewrite fetch handler
const fetchRegex = /self\.addEventListener\('fetch', \(event\) => \{[\s\S]*?\}\);/;
const newFetch = `self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
    
  // Ignore Supabase and external API requests from Service Worker cache
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    return;
  }
  
  console.log(\`SW: handling fetch for \${event.request.url}\`);

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
        console.log(\`SW: error while serving \${event.request.url}: \${err.message}\`);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log(\`SW: cache hit for \${event.request.url}\`);
            return cachedResponse;
          }
          console.log(\`SW: cache miss for \${event.request.url}\`);
          
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
            return caches.match('/index.html');
          }
          
          // Return empty response instead of undefined which breaks the page
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
  );
});`;

content = content.replace(fetchRegex, newFetch);
fs.writeFileSync(filePath, content);
console.log('public/sw.js updated');
