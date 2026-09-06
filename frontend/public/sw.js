const CACHE_VERSION = "netrai-pwa-v4";
const APP_CACHE = `${CACHE_VERSION}-app`;
const MODEL_CACHE = `${CACHE_VERSION}-model`;

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/NetrAI_Image.png"
];

const OPTIONAL_OFFLINE_ASSETS = [
  "/offline-models/dr_classifier.onnx",
  "/ort/ort-wasm-simd-threaded.mjs",
  "/ort/ort-wasm-simd-threaded.wasm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => caches.open(MODEL_CACHE))
      .then((cache) => Promise.all(
        OPTIONAL_OFFLINE_ASSETS.map((asset) =>
          cache.add(asset).catch(() => undefined)
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("netrai-pwa-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isOfflineModelRequest = url.pathname.endsWith("/dr_classifier.onnx");

  if (isOfflineModelRequest) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_CACHE, "/index.html"));
    return;
  }

  if (url.pathname.startsWith("/offline-models/") || url.pathname.startsWith("/ort/")) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, APP_CACHE));
});

async function networkFirst(request, cacheName, fallbackPath) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || cache.match(fallbackPath);
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || refresh;
}
