/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const sw = self;
const CACHE_VERSION = 'break-rush-v2024_05_25';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    sw.caches.open(STATIC_CACHE).then((cache) => cache.add(new URL('./', sw.location.href))).catch(() => undefined)
  );
  void sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    sw.caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.includes(CACHE_VERSION)).map((key) => sw.caches.delete(key))))
  );
  void sw.clients.claim();
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) {
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});

const networkFirst = async (request: Request): Promise<Response> => {
  const cache = await sw.caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await sw.caches.match(new URL('./', sw.location.href));
    if (fallback) return fallback;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
};

const cacheFirst = async (request: Request): Promise<Response> => {
  const cache = await sw.caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
};

export {}; // keep module scope
