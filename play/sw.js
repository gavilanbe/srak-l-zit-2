// Generado por tools/pwa.mjs. No editar: cambia tools/pwa.mjs y vuelve a ejecutarlo.
// Service worker de Srak l zit: guarda el juego entero para abrirlo sin conexión y gestiona las versiones.
const VERSION = '2026.10.05-f3f0d9e';
const CACHE = 'srak-l-zit-' + VERSION;
const FILES = ["./","src/version.js","apple-touch-icon.png","favicon-32.png","icon-192.png","icon-512.png","icon-maskable-192.png","icon-maskable-512.png","manifest.json","src/actors.js","src/art.js","src/audio.js","src/font.js","src/gfx.js","src/hud.js","src/main.js","src/world.js","vendor/three.core.js","vendor/three.module.js","index.html"];
// En el ordenador de desarrollo se pide siempre a la red (para ver los cambios al recargar);
// publicado, se sirve la copia guardada: carga al instante, sin conexión y sin mezclar versiones.
const DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname) && !self.location.search.includes('prod');

self.addEventListener('install', (e) => {
  // no se activa sola: espera a que el jugador acepte actualizar (o a que no quede ninguna pestaña abierta)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('srak-l-zit-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'VERSION') e.source?.postMessage({ version: VERSION });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(DEV ? networkFirst(req) : cacheFirst(req));
});

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('index.html') : undefined);
}

async function cacheFirst(req) {
  const hit = await fromCache(req);
  if (hit) return hit;
  try { return await fetch(req); } catch { return Response.error(); }
}

async function networkFirst(req) {
  try {
    const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 3000, new Error('lento')))]);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    return (await fromCache(req)) || Response.error();
  }
}
