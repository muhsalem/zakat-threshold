// Service Worker — نِصاب v2
// استراتيجية: stale-while-revalidate للـ app shell، network-first للـ APIs الخارجية

const CACHE_NAME = "nisab-v2";
const STATIC_ASSETS = ["/", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"];
const EXTERNAL_API_HOSTS = [
  "api.gold-api.com",
  "api.metalpriceapi.com",
  "api.coingecko.com",
  "api.frankfurter.app",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // APIs الخارجية: network-first مع fallback 503
  if (EXTERNAL_API_HOSTS.some((h) => url.hostname.includes(h))) {
    e.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ error: "offline", cached: false }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Supabase وأي API داخلي: network-only (لا يُخزَّن)
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) {
    return;
  }

  // navigation + assets: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached ?? new Response("offline", { status: 503 }));
      return cached ?? networkFetch;
    })
  );
});

// إشعارات الحول — يُستدعى من الصفحة عبر postMessage
self.addEventListener("message", (e) => {
  if (e.data?.type === "SCHEDULE_HAWL_REMINDER") {
    const { delayMs, title, body } = e.data;
    if (typeof delayMs === "number" && delayMs > 0) {
      setTimeout(() => {
        self.registration.showNotification(title ?? "تذكير الحول — نِصاب", {
          body: body ?? "حال الحول — احسب زكاتك الآن",
          icon: "/icon-192.svg",
          badge: "/icon-192.svg",
          dir: "rtl",
          lang: "ar",
          tag: "hawl-reminder",
          requireInteraction: true,
        });
      }, delayMs);
    }
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
