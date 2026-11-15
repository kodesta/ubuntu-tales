/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { RangeRequestsPlugin } from 'workbox-range-requests';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

interface PrecacheEntry {
  url: string;
  revision?: string | null;
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// Images: cache-first, bounded (production plan 06 §6).
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' || url.pathname.startsWith('/covers/'),
  new CacheFirst({
    cacheName: 'ut-images-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// Catalogue GETs: stale-while-revalidate so the archive stays readable offline.
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/v1/'),
  new StaleWhileRevalidate({
    cacheName: 'ut-api-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
  }),
);

// Downloaded narration audio: serve cached full files and satisfy Range requests (seeking offline).
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/media/narrations/'),
  new CacheFirst({
    cacheName: 'offline-media-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 }), new RangeRequestsPlugin()],
  }),
);

registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/media/soundscapes/'),
  new CacheFirst({
    cacheName: 'offline-media-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 60 })],
  }),
);

// Navigation fallback: the SPA shell is precached, so deep links work offline.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode !== 'navigate') return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        return response;
      } catch {
        const cache = await caches.open('workbox-precache-v2');
        const keys = await cache.keys();
        const shell = keys.find((key) => key.url.endsWith('/index.html'));
        if (shell) {
          const cached = await cache.match(shell);
          if (cached) return cached;
        }
        throw new Error('offline');
      }
    })(),
  );
});

// Allow the page to request that a waiting worker activate immediately after an update toast.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});
