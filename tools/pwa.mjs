// Prepara la aplicación instalable.
//   node tools/pwa.mjs            → recalcula la versión y escribe play/sw.js y play/src/version.js
//   node tools/pwa.mjs --assets   → además regenera iconos, pantallas de arranque y capturas (necesita el servidor en marcha)
// La versión es la fecha más una huella del contenido: si no cambia ningún archivo, no cambia la versión.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAY = fileURLToPath(new URL('../play/', import.meta.url));
export const SPLASH = [[2532, 1170, 844, 390, 3], [2556, 1179, 852, 393, 3], [2796, 1290, 932, 430, 3], [2778, 1284, 926, 428, 3], [2436, 1125, 812, 375, 3], [2688, 1242, 896, 414, 3], [1792, 828, 896, 414, 2], [1334, 750, 667, 375, 2]];

if (process.argv.includes('--assets')) await assets();

// lo que se guarda para jugar sin conexión: todo menos lo que solo sirve para instalar
const skip = (f) => f === 'sw.js' || f === 'src/version.js' || f.startsWith('splash/') || f.startsWith('screenshots/') || f.includes('.DS_Store');
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [relative(PLAY, p)]; });
const files = walk(PLAY).filter((f) => !skip(f)).sort();
const hash = createHash('sha256');
for (const f of files) { hash.update(f); hash.update(readFileSync(join(PLAY, f))); }
const version = `${new Date().toISOString().slice(0, 10).replaceAll('-', '.')}-${hash.digest('hex').slice(0, 7)}`;
let old = ''; try { old = readFileSync(join(PLAY, 'src/version.js'), 'utf8'); } catch { /* primera vez */ }
const same = old.match(/-([0-9a-f]{7})'/)?.[1] === version.split('-')[1];
const final = same ? old.match(/'([^']+)'/)[1] : version; // misma huella: se conserva la versión anterior
writeFileSync(join(PLAY, 'src/version.js'), `// Generado por tools/pwa.mjs. No editar.\nexport const VERSION = '${final}';\n`);
writeFileSync(join(PLAY, 'sw.js'), `// Generado por tools/pwa.mjs. No editar: cambia tools/pwa.mjs y vuelve a ejecutarlo.
// Service worker de Srak l zit: guarda el juego entero para abrirlo sin conexión y gestiona las versiones.
const VERSION = '${final}';
const CACHE = 'srak-l-zit-' + VERSION;
const FILES = ${JSON.stringify(['./', 'src/version.js', ...files.filter((f) => f !== 'index.html')].concat('index.html'))};
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
`);
console.log(`versión ${final} · ${files.length + 1} archivos para jugar sin conexión`);

async function assets() {
  const { chromium } = await import('playwright-core');
  const cache = homedir() + '/Library/Caches/ms-playwright/';
  const dir = readdirSync(cache).find((d) => /^chromium-\d+$/.test(d));
  const sub = readdirSync(cache + dir).find((d) => d.startsWith('chrome-mac'));
  const appName = readdirSync(`${cache}${dir}/${sub}`).find((d) => d.endsWith('.app'));
  const browser = await chromium.launch({ executablePath: `${cache}${dir}/${sub}/${appName}/Contents/MacOS/${appName.replace('.app', '')}`, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const save = (name, dataUrl) => writeFileSync(join(PLAY, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
  for (const d of ['splash', 'screenshots']) mkdirSync(join(PLAY, d), { recursive: true });

  const page = await browser.newPage();
  await page.goto('http://localhost:8766/');
  await page.waitForFunction(() => window.game);
  const out = await page.evaluate(async (splash) => {
    const { drawRoachSprite, drawMoon } = await import('/src/art.js');
    const art = document.createElement('canvas'); art.width = art.height = 48; // el icono, a 48 píxeles
    const g = art.getContext('2d');
    g.fillStyle = '#0d0b2e'; g.fillRect(0, 0, 48, 48); g.fillStyle = '#2e1660'; g.fillRect(0, 26, 48, 22); g.fillStyle = '#7d2f72'; g.fillRect(0, 36, 48, 12);
    for (const [x, y] of [[5, 6], [40, 9], [11, 17], [36, 22], [24, 4], [43, 30]]) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
    drawMoon(g, 24, 20, 13);
    g.fillStyle = '#0f0826'; g.fillRect(0, 40, 48, 8); for (let x = 0; x < 48; x += 6) g.fillRect(x, 38, 4, 2);
    g.save(); g.translate(4, 14); g.scale(2, 2); drawRoachSprite((a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); }, 0, 0, 1, 0, true); g.restore();
    const make = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d'); q.imageSmoothingEnabled = false; draw(q); return c.toDataURL('image/png'); };
    const res = {};
    for (const n of [32, 180, 192, 512]) res[n === 32 ? 'favicon-32.png' : n === 180 ? 'apple-touch-icon.png' : `icon-${n}.png`] = make(n, n, (q) => q.drawImage(art, 0, 0, n, n));
    // adaptables: el dibujo ocupa el 72 % central para que ningún recorte del sistema lo corte
    for (const n of [192, 512]) res[`icon-maskable-${n}.png`] = make(n, n, (q) => { q.fillStyle = '#0d0b2e'; q.fillRect(0, 0, n, n); const s = Math.round(n * 0.72 / 48) * 48, o = (n - s) >> 1; q.fillStyle = '#7d2f72'; q.fillRect(0, o + s * 0.75, n, n); q.drawImage(art, o, o, s, s); });
    for (const [w, h] of splash) res[`splash/${w}x${h}.png`] = make(w, h, (q) => { q.fillStyle = '#07061c'; q.fillRect(0, 0, w, h); const s = Math.round(h * 0.34 / 48) * 48; q.drawImage(art, (w - s) >> 1, (h - s) >> 1, s, s); });
    return res;
  }, SPLASH);
  for (const [name, data] of Object.entries(out)) save(name, data);
  await page.close();

  // capturas para la ficha de instalación: la portada en ancho y una partida en el móvil
  const wide = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await wide.goto('http://localhost:8766/'); await wide.waitForFunction(() => window.game);
  await wide.evaluate(() => { for (let i = 0; i < 230; i++) game.update(0.03); }); await wide.waitForTimeout(200);
  await wide.screenshot({ path: join(PLAY, 'screenshots/portada.png') }); await wide.close();
  const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await phone.goto('http://localhost:8766/'); await phone.waitForFunction(() => window.game);
  await phone.evaluate(() => { const g = game; g.st.introSeen = true; g.startGame(); g.startNight(2); g.st.mode = 'play'; g.R.inv = 0; g.R.carry = 2; g.R.wings = 2; Object.assign(g.R, { x: -6, z: 4 }); for (let i = 0; i < 40; i++) g.update(0.03); g.R.inv = 0; localStorage.clear(); });
  await phone.waitForTimeout(200);
  await phone.screenshot({ path: join(PLAY, 'screenshots/partida.png') }); await phone.close();
  await browser.close();
  console.log('iconos, pantallas de arranque y capturas regenerados');
}
