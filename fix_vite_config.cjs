const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

// I will just replace the whole VitePWA block to be safe.
const newVitePWA = `VitePWA({
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: [
          'favicon.ico', 
          'icons/icon-*.png'
        ],
        manifest: {
          name: 'Mikayla',
          short_name: 'Mikayla',
          description: 'Application de couple intime et privée Mikayla',
          theme_color: '#130f26',
          background_color: '#0f0c1d',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/icon-purple-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icons/icon-purple-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icons/icon-purple-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })`;

content = content.replace(/VitePWA\(\{[\s\S]*?\}\)/, newVitePWA);
fs.writeFileSync('vite.config.ts', content);
console.log('Fixed vite.config.ts');
