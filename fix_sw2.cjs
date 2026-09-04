const fs = require('fs');
let content = fs.readFileSync('src/sw.js', 'utf8');

const fetchReplacement = `self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
      
  const url = new URL(event.request.url);
  
  // Limiter au même domaine et ignorer Supabase et l'API
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
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

content = content.replace(/self\.addEventListener\('fetch', \(event\) => \{[\s\S]*\}\);/, fetchReplacement);
fs.writeFileSync('src/sw.js', content);
console.log('Fixed fetch handler in src/sw.js');
