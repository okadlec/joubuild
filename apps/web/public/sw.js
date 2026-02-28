// JouBuild Service Worker - Offline support
const CACHE_NAME = 'joubuild-v2';
const STATIC_ASSETS = [
  '/',
  '/projects',
  '/login',
  '/manifest.json',
  '/pdf.worker.min.mjs',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== 'joubuild-pdfs-offline')
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls and auth endpoints
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/auth')) return;

  // For navigation requests - network first, fallback to cached page or root shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache every visited page so it works offline later
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            // Fallback: serve cached root page — Next.js client-side router
            // will handle routing to the correct page from the app shell
            return caches.match('/');
          })
        )
    );
    return;
  }

  // For Next.js RSC/data requests - cache for offline client navigation
  if (url.pathname.includes('/_next/data/') || url.search.includes('_rsc')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })))
    );
    return;
  }

  // For static assets - cache first (immutable hashed files)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // For image assets - cache first with network update
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // For PDF files from storage - check offline cache first, then general cache
  if (url.pathname.includes('/storage/') && url.pathname.endsWith('.pdf')) {
    event.respondWith(
      (async () => {
        // Try offline PDF cache (may not be available in WKWebView)
        try {
          const offlineCache = await caches.open('joubuild-pdfs-offline');
          const offlineCached = await offlineCache.match(request);
          if (offlineCached) return offlineCached;
        } catch {
          // Cache API not available (iOS WKWebView) — skip, IndexedDB fallback handled in app code
        }

        // Try general cache
        const cached = await caches.match(request);
        try {
          const response = await fetch(request);
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return response;
        } catch {
          if (cached) return cached;
          return new Response('PDF not available offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Default - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
