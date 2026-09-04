import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: [
          'favicon.ico', 
          'icon-192.png',
          'icon-512.png',
          'manifest.webmanifest',
          'manifest.json',
          'icons/icon-*.png'
        ],
        manifest: {
          name: 'Mikayla – Application de couple intime et privée',
          short_name: 'Mikayla',
          description: 'Application de couple intime et privée : chat, appels, jeux, coffre-fort, cycle & mood care.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          display_override: ['window-controls-overlay'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Ouvrir le chat',
              short_name: 'Chat',
              url: '/chat',
              icons: [
                {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            },
            {
              name: 'Ouvrir les jeux',
              short_name: 'Jeux',
              url: '/games',
              icons: [
                {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png'
                }
              ]
            }
          ],
          categories: ['lifestyle', 'social'],
          lang: 'fr',
          dir: 'ltr'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react'],
            'vendor-motion': ['motion'],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
