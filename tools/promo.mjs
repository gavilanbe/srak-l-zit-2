// Monta el reel promocional (promo/out/srak-l-zit-reel.mp4, 1080×1920 a 30 fps) a partir de promo/reel.html.
//   node tools/promo.mjs                 → vídeo completo con la banda sonora (necesita ffmpeg)
//   node tools/promo.mjs --still 3.2,15  → solo fotos de esos segundos, en promo/out/still-*.png
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url)), OUT = join(ROOT, 'promo/out'), PORT = 8777;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const server = createServer(async (req, res) => { // sirve el proyecto entero, sin caché
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (path.endsWith('/')) path += 'index.html';
  try { const data = await readFile(join(ROOT, path)); res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
}).listen(PORT, '127.0.0.1');

const cache = homedir() + '/Library/Caches/ms-playwright/';
const dir = readdirSync(cache).find((d) => /^chromium-\d+$/.test(d));
const sub = readdirSync(cache + dir).find((d) => d.startsWith('chrome-mac'));
const app = readdirSync(`${cache}${dir}/${sub}`).find((d) => d.endsWith('.app'));
const browser = await chromium.launch({ executablePath: `${cache}${dir}/${sub}/${app}/Contents/MacOS/${app.replace('.app', '')}`, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[error]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
await page.goto(`http://localhost:${PORT}/promo/reel.html`);
await page.waitForFunction(() => window.reel);
await page.evaluate(() => window.reel.init());
const info = await page.evaluate(() => ({ frames: window.reel.frames, fps: window.reel.fps, marks: window.reel.marks }));
mkdirSync(OUT, { recursive: true });

const still = process.argv.indexOf('--still');
if (still > 0) {
  for (const t of process.argv[still + 1].split(',').map(Number)) {
    await page.evaluate((f) => window.reel.seek(f), Math.round(t * info.fps));
    await page.screenshot({ path: join(OUT, `still-${t.toFixed(1).padStart(4, '0')}.png`) });
  }
  console.log('fotos en promo/out', JSON.stringify(info.marks));
} else {
  const frames = join(OUT, 'frames'); rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
  writeFileSync(join(OUT, 'ost.wav'), Buffer.from(await page.evaluate(() => window.reel.audio()), 'base64'));
  console.log('banda sonora renderizada');
  for (let f = 0; f < info.frames; f++) {
    await page.evaluate((n) => window.reel.frame(n), f);
    await page.screenshot({ path: join(frames, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95 });
    if (f % 150 === 0) console.log(`fotograma ${f}/${info.frames}`);
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(info.fps), '-i', join(frames, '%05d.jpg'), '-i', join(OUT, 'ost.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest', join(OUT, 'srak-l-zit-reel.mp4')]);
  rmSync(frames, { recursive: true, force: true });
  console.log('vídeo en promo/out/srak-l-zit-reel.mp4');
}
await browser.close(); server.close();
