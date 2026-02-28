'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

export function CapacitorInit() {
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform()) return;

    document.documentElement.classList.add('capacitor');

    async function init() {
      const [{ StatusBar, Style }, { SplashScreen }, { Browser }] =
        await Promise.all([
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/browser'),
        ]);

      const platform = window.Capacitor?.getPlatform();

      try {
        // setOverlaysWebView is Android-only; calling it on iOS triggers
        // a native "not implemented" log before JS can catch the error.
        if (platform === 'android') {
          await StatusBar.setOverlaysWebView({ overlay: true });
        }
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        // StatusBar methods may not be available on all platforms
      }

      // Best-effort: hide splash if it hasn't auto-hidden yet
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {
        // SplashScreen.hide may not be implemented
      }

      // Intercept external links → open in system browser
      document.addEventListener('click', (e) => {
        const anchor = (e.target as HTMLElement).closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href) return;

        try {
          const url = new URL(href, window.location.origin);
          if (url.host !== window.location.host) {
            e.preventDefault();
            Browser.open({ url: url.toString() });
          }
        } catch {
          // invalid URL, let default handling take over
        }
      });
    }

    init();
  }, []);

  return null;
}
