'use client';

import { useEffect } from 'react';
import { initOfflineQueueAutoSync } from '@/lib/offline-queue';

export default function AppServiceWorker() {
  useEffect(() => {
    // 1. Initialize offline feedback auto-sync on mount
    initOfflineQueueAutoSync();

    // 2. Clear caches & unregister in development, or register v2 in production
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Clear all old caches on localhost
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      } else {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
      }
    }
  }, []);

  return null;
}
