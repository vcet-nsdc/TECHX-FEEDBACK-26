'use client';

import { useEffect } from 'react';
import { initOfflineQueueAutoSync } from '@/lib/offline-queue';

export default function AppServiceWorker() {
  useEffect(() => {
    // 1. Initialize offline feedback auto-sync on mount
    initOfflineQueueAutoSync();

    // 2. In development or local testing, unregister service worker and clear caches to prevent stale bundles
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (process.env.NODE_ENV === 'development' || isLocalhost) {
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key);
            }
          });
        }
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
        return;
      }

      // In production, register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] ServiceWorker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.debug('[SW] Registration notice:', err);
          });
      });
    }
  }, []);

  return null;
}
