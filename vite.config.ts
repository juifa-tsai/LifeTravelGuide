import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative assets also support user.github.io and renamed repository paths.
const base = process.env.VITE_BASE_PATH || '/LifeTravelGuide/';
export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/*.png', 'icons/*.svg'],
    manifest: {
      name: '名古屋 · 旅の手帖', short_name: '名古屋手帖', lang: 'zh-Hant',
      description: '四天三夜，一個人的名古屋旅行手帖。',
      theme_color: '#A8452B', background_color: '#F5F4F2',
      display: 'standalone', start_url: './', scope: './',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,json,png,svg,webp,woff2}'],
      cleanupOutdatedCaches: true,
      navigateFallback: 'index.html',
      // External Drive documents and map tiles are deliberately never cached.
      runtimeCaching: [{
        urlPattern: ({ url, request }) => request.destination === 'image' && url.origin === self.location.origin,
        handler: 'CacheFirst',
        options: { cacheName: 'trip-images', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      }],
    },
  })],
});
