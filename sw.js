const CACHE_NAME = "bk-auto-admin-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg"
];

// Install Event: Catch essential shell files and store offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[PWA Service Worker] Membuka cache dan menyimpan aset utama...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clear obsolete assets
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[PWA Service Worker] Menghapus cache usang:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor: Work offline gracefully, fallback on cached items
self.addEventListener("fetch", (event) => {
  // Ignore non-GET requests (e.g. POST requests to backend APIs or Firebase auth operations)
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Disable caching for Firebase Auth or third party cloud queries
  if (url.origin !== self.location.origin) return;

  // Static content or dynamic caching
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Run stale revalidation in background to fetch latest edits if available
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch((err) => console.log("[PWA SW] Offline mode: dynamic sync skipped", err));

        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Navigating root page fallback
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
