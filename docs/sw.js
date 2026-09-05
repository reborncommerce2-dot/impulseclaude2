// Service worker de Impulse. Cachea el "app shell" (HTML/CSS/JS/íconos) para
// que la app abra y funcione sin conexión — los datos ya viven en IndexedDB
// (ver src/core/db.ts), así que una vez cacheado el shell, offline-first
// queda cubierto de punta a punta en este prototipo.
const CACHE = "impulse-shell-v4";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // config.json va siempre a la red primero: es donde vive la anon key de
  // Supabase, y si quedara cacheada de una versión vieja (por ej. de antes
  // de cargar la key real) el usuario quedaría trabado en modo local sin
  // entender por qué. Solo se usa la copia cacheada si no hay conexión.
  if (url.pathname.endsWith("/config.json")) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => { caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // El resto del app shell va cache-first con actualización en segundo
  // plano (stale-while-revalidate).
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
