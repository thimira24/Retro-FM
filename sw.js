/* Retro FM service worker — required for installability; caches the app shell
   so it opens offline. The radio API and audio streams are never cached. */
const CACHE = "retro-fm-v1";
const SHELL = ["./", "index.html", "favicon.svg", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle same-origin app-shell requests (cache-first, fall back to network).
  // Cross-origin requests (Radio Browser API, audio streams) go straight to the network.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});
