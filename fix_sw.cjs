const fs = require('fs');
let content = fs.readFileSync('src/sw.js', 'utf8');

// Replace top logic
const topReplacement = `// Prevent vite-plugin-pwa injectManifest error by referencing the manifest
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
          cache.add(url).catch(err => console.warn(\`[SW] Failed to cache \${url}:\`, err))
        )
      );
    })
  );
  self.skipWaiting();
});`;

content = content.replace(/\/\/ Prevent vite-plugin-pwa[\s\S]*?self\.skipWaiting\(\);\n\}\);/, topReplacement);
fs.writeFileSync('src/sw.js', content);
console.log('Fixed src/sw.js');
