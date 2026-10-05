// Genera los iconos de la app (play/icon-192.png y play/icon-512.png) dibujándolos con el propio arte del juego.
import { chromium } from 'playwright-core';
import { readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const cache = homedir() + '/Library/Caches/ms-playwright/';
const dir = readdirSync(cache).find((d) => /^chromium-\d+$/.test(d));
const sub = readdirSync(cache + dir).find((d) => d.startsWith('chrome-mac'));
const app = readdirSync(`${cache}${dir}/${sub}`).find((d) => d.endsWith('.app'));
const browser = await chromium.launch({ executablePath: `${cache}${dir}/${sub}/${app}/Contents/MacOS/${app.replace('.app', '')}` });
const page = await browser.newPage();
await page.goto('http://localhost:8766/');
const icons = await page.evaluate(async () => {
  const { drawRoachSprite, drawMoon } = await import('/src/art.js');
  const small = document.createElement('canvas'); small.width = small.height = 48;
  const g = small.getContext('2d');
  g.fillStyle = '#0d0b2e'; g.fillRect(0, 0, 48, 48); g.fillStyle = '#2e1660'; g.fillRect(0, 26, 48, 22); g.fillStyle = '#7d2f72'; g.fillRect(0, 36, 48, 12);
  for (const [x, y] of [[5, 6], [40, 9], [11, 17], [36, 22], [24, 4], [43, 30]]) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
  drawMoon(g, 24, 20, 13);
  g.fillStyle = '#0f0826'; g.fillRect(0, 40, 48, 8); for (let x = 0; x < 48; x += 6) g.fillRect(x, 38, 4, 2);
  g.save(); g.translate(4, 14); g.scale(2, 2); drawRoachSprite((a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); }, 0, 0, 1, 0, true); g.restore();
  return [192, 512].map((n) => { const c = document.createElement('canvas'); c.width = c.height = n; const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(small, 0, 0, n, n); return c.toDataURL('image/png'); });
});
[192, 512].forEach((n, i) => writeFileSync(new URL(`../play/icon-${n}.png`, import.meta.url), Buffer.from(icons[i].split(',')[1], 'base64')));
await browser.close();
console.log('iconos generados');
