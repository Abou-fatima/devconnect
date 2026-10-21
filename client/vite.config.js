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
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
        runtimeCaching: [
          {
            // F-42 : lecture hors-ligne des contenus déjà consultés
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-get', networkTimeoutSeconds: 4, expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true }
    }
  }
});
