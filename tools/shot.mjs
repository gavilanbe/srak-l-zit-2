// Captura el juego en un Chromium sin ventana: node tools/shot.mjs <salida.png> "<js a ejecutar antes>" [ms de espera]
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
const cache = homedir() + '/Library/Caches/ms-playwright/';
const dir = readdirSync(cache).find((d) => /^chromium-\d+$/.test(d));
const sub = readdirSync(cache + dir).find((d) => d.startsWith('chrome-mac'));
const app = readdirSync(`${cache}${dir}/${sub}`).find((d) => d.endsWith('.app'));
const executablePath = `${cache}${dir}/${sub}/${app}/Contents/MacOS/${app.replace('.app', '')}`;
const [out = '/tmp/srak.png', js = '', wait = '800'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
// MOBILE=1 emula un teléfono apaisado con pantalla táctil; MOBILE=portrait, en vertical
const mob = process.env.MOBILE;
const page = await browser.newPage(mob ? { viewport: mob === 'portrait' ? { width: 390, height: 844 } : { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8766/');
await page.waitForFunction(() => window.game, null, { timeout: 8000 }).catch(() => console.log('[sin game]')); await page.waitForTimeout(300);
if (js) console.log('→', JSON.stringify(await page.evaluate(js)));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
await browser.close();
