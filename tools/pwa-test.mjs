// Comprueba la aplicación instalable en un Chromium sin ventana (con el servidor en marcha):
// manifiesto e instalabilidad, arranque sin conexión y el paso de una versión a la siguiente.
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const cache = homedir() + '/Library/Caches/ms-playwright/';
const dir = readdirSync(cache).find((d) => /^chromium-\d+$/.test(d));
const sub = readdirSync(cache + dir).find((d) => d.startsWith('chrome-mac'));
const appName = readdirSync(`${cache}${dir}/${sub}`).find((d) => d.endsWith('.app'));
const browser = await chromium.launch({ executablePath: `${cache}${dir}/${sub}/${appName}/Contents/MacOS/${appName.replace('.app', '')}`, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const URL0 = 'http://localhost:8766/?pwa=prod';
const version = () => page.evaluate(async () => (await import('/src/version.js')).VERSION);
const ok = (label, pass, extra = '') => console.log(`${pass ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);

await page.goto(URL0); await page.waitForFunction(() => window.game);
await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(600);
await page.reload(); await page.waitForFunction(() => window.game);
ok('service worker registrado y controlando la página', await page.evaluate(() => !!navigator.serviceWorker.controller));

const cdp = await ctx.newCDPSession(page);
const man = await cdp.send('Page.getAppManifest');
ok('manifiesto válido', man.errors.length === 0, man.errors.map((e) => e.message).join('; '));
const inst = await cdp.send('Page.getInstallabilityErrors');
// el navegador de pruebas va siempre en modo incógnito, que por sí solo impide instalar: ese aviso no cuenta
const real = inst.installabilityErrors.filter((e) => e.errorId !== 'in-incognito');
ok('cumple los requisitos para instalarse', real.length === 0, real.map((e) => e.errorId).join(', '));

const v1 = await version();
await ctx.setOffline(true); await page.reload();
const offline = await page.waitForFunction(() => window.game, null, { timeout: 8000 }).then(() => true).catch(() => false);
ok('arranca sin conexión', offline, `versión ${v1}`);
if (offline) { await page.evaluate(() => { game.startGame(); for (let i = 0; i < 400; i++) game.update(0.03); }); ok('y se puede jugar sin conexión', await page.evaluate(() => ['cine', 'intro', 'play'].includes(game.st.mode))); }
await ctx.setOffline(false);

// publicar una versión nueva: se toca un archivo, se regenera el service worker y se mira si el juego la ofrece
const main = fileURLToPath(new URL('../play/src/main.js', import.meta.url)), src = readFileSync(main, 'utf8');
try {
  writeFileSync(main, src + '\n// prueba de actualización\n');
  execFileSync('node', [fileURLToPath(new URL('./pwa.mjs', import.meta.url))]);
  await page.reload(); await page.waitForFunction(() => window.game);
  ok('con la versión nueva publicada, sigue sirviendo la instalada', (await version()) === v1);
  await page.evaluate(() => game.app.reg.update());
  const offered = await page.waitForFunction(() => !!game.app.update, null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok('detecta la versión nueva y la ofrece', offered);
  if (offered) {
    await Promise.all([page.waitForNavigation({ timeout: 8000 }), page.evaluate(() => game.applyUpdate())]);
    await page.waitForFunction(() => window.game);
    const v2 = await version();
    ok('al aceptar, recarga con la versión nueva', v2 !== v1, `${v1} → ${v2}`);
    ok('y borra la caché antigua', (await page.evaluate(() => caches.keys())).length === 1);
  }
} finally { writeFileSync(main, src); execFileSync('node', [fileURLToPath(new URL('./pwa.mjs', import.meta.url))]); }
ok('sin errores de JavaScript', errors.length === 0, errors.join('; '));
await browser.close();
