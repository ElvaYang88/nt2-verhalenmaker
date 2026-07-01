const CACHE_NAME = "nt2-groningen-v65-theme8-vocab-polish-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./NT2-Verhalenmaker-Fixed.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/storybook-photo-v1/3-gerrit-rietveld/page-04.jpg",
  "./assets/audio/1-gelukkig-zijn/page-01.mp3",
  "./assets/word-audio/blijken.mp3",
  "./assets/word-audio/aarzelen.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (response.ok) cache.put(event.request, copy);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (response.ok) cache.put(event.request, copy);
        });
        return response;
      });
    })
  );
});
