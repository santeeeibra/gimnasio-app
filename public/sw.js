// Service worker — Web Push nativo + Cache de Shell/Estáticos para Modo Offline.
// Servido desde la raíz del origin => scope "/".

const CACHE_NAME = "sysgym-shell-v2";
const STATIC_ASSETS = [
  "/checkin",
  "/icon-192.png",
  "/icon-512.png",
  "/badge-72.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Cache inteligente para Shell y Estáticos sin romper peticiones dinámicas/API
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptar peticiones GET del mismo origen
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Omitir endpoints API, Supabase, websockets e HMR
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Navegaciones (Páginas HTML): Network-First con fallback a Cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Sin conexión - SysGym</title><style>body{font-family:system-ui,sans-serif;background:#0d1117;color:#f0f6fc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:1rem}h1{font-size:1.25rem;margin-bottom:0.5rem;color:#10e7a0}p{font-size:0.875rem;color:#8b949e}button{margin-top:1rem;padding:0.5rem 1rem;border-radius:6px;border:1px solid #30363d;background:#161b22;color:#fff;cursor:pointer}</style></head><body><div><h1>Sin conexión a internet</h1><p>Revisá tu conexión para continuar operando.</p><button onclick='location.reload()'>Reintentar</button></div></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
    );
    return;
  }

  // Estáticos (_next/static, imágenes, fuentes): Cache-First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        });
      }),
    );
    return;
  }
});

// Handlers de Web Push Nativo
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Aviso", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Aviso del gimnasio";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/mi" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/mi";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
