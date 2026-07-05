// Liftify service worker — enables install + fast loads.
// Liftify is online-first (auth + Convex realtime), so this only caches the app
// shell and immutable static assets. Everything else passes straight through.
const CACHE = "liftify-v8";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // App navigations: network-first, fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match("/")) || Response.error()),
    );
    return;
  }

  // Fingerprinted build assets are immutable — safe to serve cache-first
  // forever. Their filenames change on every deploy, so they never go stale.
  const isImmutable = url.pathname.startsWith("/_next/static/");

  // Brand + manifest files (icons, logo, splash, manifest) live at STABLE
  // paths, so cache-first would pin an old icon across a rebrand — exactly the
  // bug where the install prompt / "app installed" toast kept the old logo.
  // Serve these network-first (revalidate online, fall back to cache offline).
  const isBrandAsset =
    /\.(?:png|jpe?g|svg|webp|avif|ico|webmanifest)$/.test(url.pathname);

  if (isImmutable) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => cached || Response.error());
      }),
    );
    return;
  }

  if (isBrandAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error())),
    );
    return;
  }

  // Everything else (RSC, data, dynamic routes) passes straight through so we
  // never break a live request.
});

// ---- Web Push ----
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* non-JSON payload */
  }
  const title = data.title || "Liftify";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If the app is open and on-screen, the in-app alert already covers it
        // — unless this push asked to be forced (e.g. the "Send test" button).
        const focused = clients.some(
          (c) => c.focused || c.visibilityState === "visible",
        );
        if (focused && !data.force) return;
        return self.registration.showNotification(title, {
          body: data.body || "",
          icon: "/icon-192.png", // large color icon (Android)
          badge: "/badge-96.png", // small monochrome status-bar icon (Android)
          data: { url: data.url || "/" },
        });
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
