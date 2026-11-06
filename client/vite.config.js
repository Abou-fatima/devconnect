import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'DevConnect',
        short_name: 'DevConnect',
        description: 'La communauté des développeurs africains',
        theme_color: '#1F3864',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        importScripts: ['push-sw.js'], // notifications push (public/push-sw.js)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/uploads/],
        runtimeCaching: [
          {
            // F-42 : lecture hors-ligne des contenus déjà consultés
            // Jamais en cache : tout ce qui est propre à la personne connectée (sur un téléphone partagé, la suivante ne doit rien retrouver).
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/')
              && !/^\/api\/(auth|notifications|chat|admin|mentorat\/mes|users\/me)(\/|$)/.test(url.pathname)
              && !/\/(taches|candidatures)(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-get', networkTimeoutSeconds: 4, expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 } }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Bibliothèques stables séparées du code de l'application : elles restent en cache entre deux versions du site.
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], i18n: ['i18next', 'react-i18next'], temps_reel: ['socket.io-client', 'axios'] }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true }
    }
  }
});
