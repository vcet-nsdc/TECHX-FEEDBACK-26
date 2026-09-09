'use client';

import { useEffect } from 'react';
import { initOfflineQueueAutoSync } from '@/lib/offline-queue';

export default function AppServiceWorker() {
  useEffect(() => {
    // 1. Initialize offline feedback auto-sync on mount
    initOfflineQueueAutoSync();

    // 2. In development mode, unregister any service worker and wipe caches so dev changes are never stale
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key);
            }
          });
        }
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
            // Non-fatal if service workers are disabled
            console.debug('[SW] Registration notice:', err);
          });
      });
    }
  }, []);

  return null;
}
