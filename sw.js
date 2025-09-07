const CACHE_VERSION = 'v1';
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/index.tsx'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    const currentCaches = [CORE_CACHE, RUNTIME_CACHE];
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => !currentCaches.includes(cacheName))
                    .map(cacheName => caches.delete(cacheName))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const { request } = e;
    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        e.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Stale-while-revalidate for assets and CDN content
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        request.destination === 'image' ||
        request.destination === 'audio' ||
        url.hostname.includes('aistudiocdn.com') ||
        url.hostname.includes('drive.google.com') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdn.pixabay.com')
    ) {
        e.respondWith(
            caches.open(RUNTIME_CACHE).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    const fetchPromise = fetch(request).then(networkResponse => {
                        if (networkResponse && networkResponse.ok) {
                           cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(err => {
                        console.warn(`Fetch failed for ${request.url}`, err);
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // For other requests, try network first. This is for things like Gemini API calls that should not be cached.
    e.respondWith(fetch(request));
});