// Service Worker for TechX Expedition: Cache-first for static fonts and textures, network-first for navigation
const CACHE_NAME = 'techx-expedition-v3';

const STATIC_PRECACHE = [
  '/site.webmanifest',
  '/favicon.ico',
  '/assets/images/worn-parchment-bg.webp',
  '/assets/images/avery-pirate-coin.webp',
  '/assets/images/review-card.webp',
  '/assets/images/journal-spread-lab1.webp',
  '/assets/images/journal-spread-lab2.webp',
  '/assets/images/journal-spread-lab3.webp',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_PRECACHE).catch((err) => {
          console.warn('[SW] Pre-cache partial fail:', err);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Bypass non-GET, API calls, and Next.js internal/HMR requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    return;
  }

  // 2. Video streams should not be cached in SW cache (they use HTTP range requests)
  if (url.pathname.endsWith('.mp4') || url.pathname.includes('/videos/')) {
    return;
  }

  // 3. Static public assets (fonts, WebP images): Network-first with cache fallback
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg');

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. Page navigation / HTML: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
  }
});
