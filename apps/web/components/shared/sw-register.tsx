'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // On Capacitor native: prompt SW to update for fresh cache
      if (window.Capacitor?.isNativePlatform() && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }).catch(() => {
      // SW registration failed silently
    });
  }, []);

  return null;
}
