const CACHE = "form-v2";
const LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
self.addEventListener("install", (event) => {
  self.skipWaiting();
  if (LOCAL) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", "/icon.svg"])),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  );
});
self.addEventListener("fetch", (event) => {
  if (LOCAL) return;
  const url = new URL(event.request.url);
  if (
    url.origin !== location.origin ||
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(CACHE)
                .then((cache) => cache.put(event.request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
