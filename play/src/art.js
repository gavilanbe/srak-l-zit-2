// Ilustraciones 2D dibujadas por código a la resolución del juego: la medina de noche y al amanecer
// (portada, apertura y final), el logotipo de aceite y el plano de la casa entre capítulos.
import { GLYPHS } from './font.js';

function rng(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const PAL = {
  night: { sky: ['#07061c', '#0d0b2e', '#1a1048', '#2e1660', '#4f1f70', '#7d2f72', '#b04a6c'], mount: '#231650', snow: '#6f66b0', far: '#2c1a58', mid: '#1c1040', near: '#0f0826', lit: '#ffd27a', dim: '#b9793f', star: 1 },
  dawn: { sky: ['#2a1a5e', '#5a2a78', '#a03f78', '#e0626a', '#ff9a5a', '#ffc77a', '#ffe9b0'], mount: '#7a4a8a', snow: '#ffd9c0', far: '#8a4a7a', mid: '#5a2a5a', near: '#2a1436', lit: '#ffe9b0', dim: '#c98a6a', star: 0 },
};

const cache = new Map();
function scene(W, H, key) {
  const id = key + W + 'x' + H;
  if (cache.has(id)) return cache.get(id);
  const P = PAL[key], hz = Math.round(H * 0.74), WW = W + 90, r = rng(11);

  // cielo en bandas con tramado
  const sky = canvas(W, H), sg = sky.getContext('2d'), img = sg.createImageData(W, H), cols = P.sky.map(hex);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = Math.min(0.999, y / (hz + 6)) * (cols.length - 1), i = Math.floor(t);
    const c = cols[Math.min(cols.length - 1, i + ((t - i) > (BAYER[(x & 3) + (y & 3) * 4] + 0.5) / 16 ? 1 : 0))], o = (y * W + x) * 4;
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  sg.putImageData(img, 0, 0);

  const stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: r() * W | 0, y: r() * (hz - 30) | 0, p: r() * 6, big: r() < 0.12 });

  // el Atlas al fondo, con nieve
  const mount = canvas(WW, H), mg = mount.getContext('2d');
  for (let x = 0; x < WW; x++) {
    const h = 20 + Math.sin(x * 0.019 + 1) * 10 + Math.sin(x * 0.053 + 2) * 6 + Math.sin(x * 0.13) * 2.5, top = Math.round(hz - 14 - h);
    mg.fillStyle = P.mount; mg.fillRect(x, top, 1, H - top);
    if (h > 26) { mg.fillStyle = P.snow; mg.fillRect(x, top, 1, Math.round((h - 26) * 0.7) + 1); }
  }

  const wins = [];
  function block(g, x, top, w, color, layer, lit) { // un edificio con almenas, a veces cúpula o torrecilla
    g.fillStyle = color; g.fillRect(x, top, w, H - top);
    for (let i = 0; i < w; i += 4) g.fillRect(x + i, top - 2, 2, 2);
    const k = r();
    if (k < 0.22) { const rr = Math.max(3, w * 0.28 | 0); for (let dy = 0; dy <= rr; dy++) { const dx = Math.round(Math.sqrt(rr * rr - dy * dy)); g.fillRect(x + (w >> 1) - dx, top - dy, dx * 2, 1); } g.fillRect(x + (w >> 1), top - rr - 3, 1, 3); }
    else if (k < 0.38) g.fillRect(x + (w >> 1) - 2, top - 9, 5, 9);
    for (let wy = top + 5; wy < H - 6 && lit > 0; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (r() < lit) wins.push({ x: wx, y: wy, layer, flick: r() < 0.25, p: r() * 9, arch: r() < 0.4 });
  }
  const layerOf = (color, top0, top1, wMin, wMax, layer, lit) => {
    const c = canvas(WW, H), g = c.getContext('2d');
    for (let x = -6; x < WW;) { const w = wMin + (r() * (wMax - wMin) | 0); block(g, x, Math.round(top0 + r() * (top1 - top0)), w, color, layer, lit); x += w + (r() * 3 | 0) - 1; }
    return { c, g };
  };
  const far = layerOf(P.far, hz - 26, hz - 8, 10, 24, 0, 0.05);
  const mid = layerOf(P.mid, hz - 12, hz + 12, 16, 34, 1, 0.16);

  // la Kutubía y unas palmeras, en la capa media
  const mx = Math.round(WW * 0.8), g = mid.g, mt = hz - 66;
  g.fillStyle = P.mid; g.fillRect(mx, mt, 15, H); for (let i = 0; i < 15; i += 4) g.fillRect(mx + i, mt - 3, 2, 3);
  g.fillRect(mx + 4, mt - 17, 7, 17); g.fillRect(mx + 3, mt - 19, 9, 2);
  for (let dy = 0; dy <= 4; dy++) g.fillRect(mx + 7 - Math.round(Math.sqrt(16 - dy * dy)), mt - 19 - dy, Math.round(Math.sqrt(16 - dy * dy)) * 2 + 1, 1);
  g.fillRect(mx + 7, mt - 31, 1, 8); for (const y of [mt - 25, mt - 28, mt - 31]) g.fillRect(mx + 6, y, 3, 2);
  g.fillStyle = P.far; for (let y = mt + 8; y < mt + 56; y += 12) { g.fillRect(mx + 4, y, 2, 5); g.fillRect(mx + 9, y, 2, 5); } // ventanas ciegas
  for (const px of [WW * 0.16, WW * 0.33, WW * 0.62, WW * 0.93]) {
    const bx = Math.round(px), top = hz - 30 - (r() * 12 | 0);
    g.fillStyle = P.mid;
    for (let y = top; y < H; y++) g.fillRect(bx + Math.round(Math.sin((y - top) * 0.05) * 2), y, 2, 1);
    for (let a = 0; a < 7; a++) { const ang = -2.9 + a * 0.45; for (let d = 0; d < 13; d++) g.fillRect(bx + Math.round(Math.cos(ang) * d), top + Math.round(Math.sin(ang) * d * 0.6 + d * d * 0.03), 2, 1); }
  }

  const near = layerOf(P.near, hz + 22, hz + 44, 26, 54, 2, 0.22);
  const ng = near.g; ng.fillStyle = P.near;
  for (const ax of [WW * 0.12, WW * 0.47, WW * 0.7]) { // antenas, parabólicas y ropa tendida
    const x = Math.round(ax), y = hz + 18;
    ng.fillRect(x, y - 14, 1, 20); ng.fillRect(x - 3, y - 12, 7, 1); ng.fillRect(x - 2, y - 9, 5, 1);
    for (let d = 0; d < 5; d++) ng.fillRect(x + 10 + d, y - 4 - d, 1, d * 2 + 1);
    ng.fillRect(x + 24, y - 6, 1, 12); ng.fillRect(x + 50, y - 6, 1, 12);
    for (let d = 0; d <= 26; d++) ng.fillRect(x + 24 + d, y - 6 + Math.round(Math.sin(d / 26 * Math.PI) * 2), 1, 1);
  }
  const cloth = [WW * 0.12, WW * 0.47, WW * 0.7].flatMap((ax) => [[28, '#7a2a4a'], [34, '#2a4a7a'], [41, '#5a6a3a']].map(([o, c]) => ({ x: Math.round(ax) + o, y: hz + 14, c })));

  const s = { P, hz, WW, sky, stars, mount, far: far.c, mid: mid.c, near: near.c, wins, cloth };
  cache.set(id, s);
  return s;
}

// La medina. key: 'night' | 'dawn'. scroll desplaza las capas (paralaje).
export function drawCity(g, W, H, t, key = 'night', scroll = 0) {
  const s = scene(W, H, key), P = s.P, off = (k) => -Math.round(20 + scroll * k + Math.sin(t * 0.12) * 4 * k);
  g.drawImage(s.sky, 0, 0);
  if (P.star) {
    for (const st of s.stars) {
      const b = Math.sin(t * 1.7 + st.p * 3);
      if (b < -0.55) continue;
      g.fillStyle = b > 0.6 ? '#ffffff' : '#b9b6e6'; g.fillRect(st.x, st.y, 1, 1);
      if (st.big && b > 0.2) { g.fillRect(st.x - 1, st.y, 3, 1); g.fillRect(st.x, st.y - 1, 1, 3); }
    }
    const sh = (t % 9) / 0.7; // estrella fugaz
    if (sh < 1) { g.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) if (i / 9 < 1 - sh * 0.5) g.fillRect(Math.round(W * 0.15 + sh * 90 - i * 2), Math.round(18 + sh * 34 - i * 0.8), 1, 1); }
  } else { // el sol asomando tras el Atlas
    const sx = Math.round(W * 0.3), sy = Math.round(s.hz - 26 - Math.min(18, t * 2.2)), R = 15;
    for (const [rr, c] of [[R + 9, 'rgba(255,233,176,0.25)'], [R + 4, 'rgba(255,233,176,0.45)'], [R, '#fff6d6']]) { g.fillStyle = c; for (let dy = -rr; dy <= rr; dy++) { const dx = Math.round(Math.sqrt(rr * rr - dy * dy)); g.fillRect(sx - dx, sy + dy, dx * 2, 1); } }
  }
  g.drawImage(s.mount, off(0.25), 0); g.drawImage(s.far, off(0.5), 0); g.drawImage(s.mid, off(0.8), 0); g.drawImage(s.near, off(1.2), 0);
  for (const w of s.wins) {
    if (!P.star && w.layer < 2) continue;
    if (w.flick && Math.sin(t * 2.3 + w.p) > 0.8) continue;
    const x = w.x + off([0.5, 0.8, 1.2][w.layer]);
    g.fillStyle = w.layer === 0 ? P.dim : P.lit; g.fillRect(x, w.y, 2, 3); if (w.arch) g.fillRect(x, w.y - 1, 2, 1);
  }
  for (const c of s.cloth) { g.fillStyle = c.c; g.fillRect(c.x + off(1.2), c.y + Math.round(Math.sin(t * 2 + c.x) * 0.6), 4, 6); }
}

// La luna grande de la portada.
export function drawMoon(g, cx, cy, R) {
  for (const [rr, c] of [[R + 13, 'rgba(180,190,255,0.08)'], [R + 7, 'rgba(190,200,255,0.14)'], [R + 3, 'rgba(210,220,255,0.25)'], [R, '#e9edff']]) {
    g.fillStyle = c;
    for (let dy = -rr; dy <= rr; dy++) { const dx = Math.round(Math.sqrt(rr * rr - dy * dy)); g.fillRect(cx - dx, cy + dy, dx * 2, 1); }
  }
  g.fillStyle = '#c9d0f2';
  for (const [x, y, r] of [[-0.35, -0.3, 0.2], [0.3, 0.1, 0.26], [-0.1, 0.45, 0.15], [0.45, -0.45, 0.1], [-0.55, 0.2, 0.09]]) {
    const rr = Math.round(r * R);
    for (let dy = -rr; dy <= rr; dy++) { const dx = Math.round(Math.sqrt(rr * rr - dy * dy)); g.fillRect(Math.round(cx + x * R) - dx, Math.round(cy + y * R) + dy, dx * 2, 1); }
  }
}

// Siluetas en la azotea del primer plano: el pretil, el gato y la cucaracha cargando su gota.
export function drawRoof(g, W, H, t, withRoach = true) {
  g.fillStyle = '#070414'; g.fillRect(0, H - 13, W, 13);
  for (let x = 0; x < W; x += 10) g.fillRect(x, H - 17, 6, 4);
  const cx = Math.round(W * 0.84), cy = H - 17, tail = Math.round(Math.sin(t * 2) * 2); // el gato, sentado
  g.fillRect(cx, cy - 12, 9, 12); g.fillRect(cx + 1, cy - 18, 8, 7); g.fillRect(cx + 1, cy - 20, 2, 2); g.fillRect(cx + 7, cy - 20, 2, 2);
  for (let i = 0; i < 9; i++) g.fillRect(cx - 1 - i, cy - 2 - Math.round(Math.sin(i * 0.4) * (2 + tail)), 2, 2);
  if (Math.floor(t * 0.6) % 5) { g.fillStyle = '#b6ff5c'; g.fillRect(cx + 3, cy - 15, 1, 2); g.fillRect(cx + 6, cy - 15, 1, 2); }
  if (!withRoach) return;
  const x = Math.round(((t * 22) % (W + 60)) - 30), y = H - 24, f = Math.floor(t * 10) % 2;
  g.fillStyle = '#070414'; g.fillRect(x - 1, y, 16, 7);
  g.fillStyle = '#a8521c'; g.fillRect(x, y + 1, 12, 4); g.fillRect(x + 1, y, 10, 6);
  g.fillStyle = '#64260c'; g.fillRect(x + 1, y + 1, 7, 3);
  g.fillStyle = '#431808'; g.fillRect(x + 11, y + 1, 3, 4);
  g.fillStyle = '#d00000'; g.fillRect(x + 10, y - 3, 3, 3);
  g.fillStyle = '#fffbe8'; g.fillRect(x + 13, y + 2, 1, 1);
  g.fillStyle = '#ffd23f'; g.fillRect(x + 3, y - 4, 4, 4); g.fillRect(x + 4, y - 5, 2, 1); g.fillStyle = '#fff6d6'; g.fillRect(x + 4, y - 3, 1, 1);
  g.fillStyle = '#2b0f05';
  for (let i = 0; i < 3; i++) g.fillRect(x + 2 + i * 4 + ((i + f) % 2), y + 6, 1, 2);
  g.fillRect(x + 14, y - 1 - f, 3, 1); g.fillRect(x + 16, y - 2 - f, 2, 1);
}

// ---------- logotipo ----------
function epx(src) { // Scale2x: dobla el tamaño redondeando las diagonales
  const h = src.length, w = src[0].length, out = [];
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? 0 : src[y][x]);
  for (let y = 0; y < h; y++) {
    const r0 = [], r1 = [];
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      r0.push(C === A && C !== D && A !== B ? A : P, A === B && A !== C && B !== D ? B : P);
      r1.push(D === C && D !== B && C !== A ? C : P, B === D && B !== A && D !== C ? D : P);
    }
    out.push(r0, r1);
  }
  return out;
}

const logos = {};
function buildLogo(text, passes) {
  const m = 2 ** passes, top = m, bot = 8 * m - 1, pad = 3;
  let grid = Array.from({ length: 9 }, () => [0]);
  for (const ch of text) {
    if (ch === ' ') { grid.forEach((r) => r.push(0, 0)); continue; }
    const gl = GLYPHS[ch];
    for (let y = 0; y < 9; y++) { for (let x = 0; x < gl.w; x++) grid[y].push(y >= 1 && y <= 7 && gl.rows[y - 1][x] === 'X' ? 1 : 0); grid[y].push(0); }
  }
  for (let i = 0; i < passes; i++) grid = epx(grid);
  const h = grid.length, w = grid[0].length;
  const c = canvas(w + pad * 2, h + pad * 2), g = c.getContext('2d');
  const on = (x, y) => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] === 1;
  const near = (x, y, d) => { for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (on(x + dx, y + dy)) return true; return false; };
  const bands = ['#fff6c2', '#ffe066', '#ffc93c', '#f2a516', '#dd7d14'];
  for (let y = -pad; y < h + pad; y++) for (let x = -pad; x < w + pad; x++) {
    let col = null;
    if (on(x, y)) {
      const t = (y - top) / (bot - top) * (bands.length - 1);
      col = bands[Math.max(0, Math.min(bands.length - 1, Math.floor(t + ((x + y) % 2 ? 0.25 : -0.25) + 0.5)))];
      if (!on(x, y - 1)) col = '#ffffff'; else if (!on(x - 1, y)) col = '#fff6c2'; else if (!on(x, y + 1) || !on(x + 1, y)) col = '#a8540c';
    } else if (near(x, y, 1)) col = '#3a1205';
    else if (on(x - 2, y - 2) || on(x - 1, y - 2) || on(x - 2, y - 1)) col = '#0b0b12'; // sombra
    if (col) { g.fillStyle = col; g.fillRect(x + pad, y + pad, 1, 1); }
  }
  const drips = [], stepX = Math.round(2.25 * m); // columnas del borde inferior de las letras, de donde gotea el aceite
  for (let x = m; x < w; x += stepX) { for (let dx = 0; dx < stepX && x + dx < w; dx++) if (on(x + dx, bot) && on(x + dx + 1, bot)) { drips.push(x + dx + pad); break; } }
  return { c, w: c.width, h: c.height, drips, base: bot + 1 + pad, half: 3.5 * m, tmp: canvas(c.width, c.height) };
}

// Logotipo «SRAK L ZIT» centrado en (cx, cy), con brillo que lo recorre y gotas de aceite.
// Devuelve la mitad del alto de las letras en pantalla.
export function drawLogo(g, cx, cy, W, t) {
  logos.a ??= buildLogo('SRAK L ZIT', 2); logos.b ??= buildLogo('SRAK L ZIT', 1);
  const [logo, s] = logos.a.w * 2 <= W - 4 ? [logos.a, 2] : logos.b.w * 3 <= W - 4 ? [logos.b, 3] : logos.b.w * 2 <= W - 4 ? [logos.b, 2] : [logos.b, 1];
  const tg = logo.tmp.getContext('2d');
  tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, logo.w, logo.h); tg.drawImage(logo.c, 0, 0);
  tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = 'rgba(255,255,255,0.75)';
  const sweep = ((t % 4.5) / 1.1) * (logo.w + 60) - 30;
  for (let yy = 0; yy < logo.h; yy++) tg.fillRect(Math.round(sweep - yy * 0.7), yy, Math.max(3, logo.h / 6 | 0), 1);
  const x0 = Math.round(cx - logo.w * s / 2), y = Math.round(cy - logo.h * s / 2);
  g.drawImage(logo.tmp, x0, y, logo.w * s, logo.h * s);
  logo.drips.forEach((dx, i) => {
    const ph = (t * 0.32 + i * 0.37) % 1, x = x0 + dx * s, by = y + logo.base * s, d = Math.max(2, s);
    const len = Math.round(Math.min(1, ph * 2.2) * 9);
    g.fillStyle = '#3a1205'; g.fillRect(x - 1, by - 1, d + 2, len + 2); g.fillStyle = '#f2a516'; g.fillRect(x, by - 1, d, len + 1);
    if (ph > 0.45) { const fy = by + len + Math.round(((ph - 0.45) / 0.55) ** 2 * 50); g.fillStyle = '#3a1205'; g.fillRect(x - 1, fy - 1, d + 2, d + 3); g.fillStyle = '#ffd23f'; g.fillRect(x, fy, d, d + 1); g.fillStyle = '#fff6d6'; g.fillRect(x, fy, 1, 1); }
  });
  return logo.half * s;
}

// ---------- plano de la casa ----------
const ROOMS = [
  { name: 'COCINA', bg: '#c9a877', floor: '#8a6a4a' }, { name: 'SALÓN', bg: '#93402f', floor: '#5e2a22' },
  { name: 'PATIO', bg: '#16224a', floor: '#2d6a4f' }, { name: 'HANOUT', bg: '#a9b8a2', floor: '#77756a' },
];

function roomArt(hud, i, x, y, w, h, t) {
  const r = (a, b, c, d, col) => hud.rect(x + a, y + b, c, d, col), fy = h - 10;
  r(0, 0, w, h, ROOMS[i].bg); r(0, fy, w, 10, ROOMS[i].floor);
  if (i === 0) { // mesa con tajín, nevera y butano
    r(12, 8, 16, fy - 8, '#e4e4dc'); r(12, 22, 16, 1, '#9a9a94'); r(40, fy - 16, 44, 3, '#6b3f1d'); r(43, fy - 13, 3, 13, '#6b3f1d'); r(78, fy - 13, 3, 13, '#6b3f1d');
    r(54, fy - 20, 12, 4, '#b5562b'); r(57, fy - 24, 6, 4, '#c4622d'); r(59, fy - 26, 2, 2, '#c4622d'); r(96, fy - 14, 10, 14, '#2f6fd0'); r(99, fy - 17, 4, 3, '#c8c8c8');
  } else if (i === 1) { // sofá, jeddi y la tele
    r(8, fy - 12, 50, 12, '#1d6f73'); r(8, fy - 20, 50, 8, '#e9c46a'); r(26, fy - 26, 8, 14, '#efe9d8'); r(27, fy - 31, 6, 5, '#c68a5b'); r(27, fy - 34, 6, 3, '#c1121f');
    r(80, fy - 10, 30, 10, '#3b2a1a'); r(82, fy - 28, 26, 17, '#15151c'); r(84, fy - 26, 22, 13, Math.floor(t * 6) % 2 ? '#7fb2ff' : '#9cc4ff');
    hud.text('z', x + 40, y + fy - 34 - (Math.floor(t * 2) % 3), { color: '#fdf6e3', outline: null });
  } else if (i === 2) { // fuente, naranjo y gallina, a cielo abierto
    for (const [sx, sy] of [[10, 8], [40, 14], [70, 6], [100, 12], [58, 22]]) if (Math.sin(t * 2 + sx) > -0.4) r(sx, sy, 1, 1, '#fdf6e3');
    r(46, fy - 6, 34, 6, '#d9d2bd'); r(49, fy - 8, 28, 2, '#3fa7d6'); r(61, fy - 16, 4, 10, '#d9d2bd'); r(57, fy - 18, 12, 2, '#d9d2bd');
    r(98, fy - 22, 3, 22, '#5e3b1e'); r(89, fy - 36, 21, 16, '#2d6a4f'); r(93, fy - 30, 2, 2, '#ff9f1c'); r(103, fy - 26, 2, 2, '#ff9f1c'); r(99, fy - 34, 2, 2, '#ff9f1c');
    r(18, fy - 7, 8, 6, '#f6f1e4'); r(24, fy - 11, 4, 5, '#f6f1e4'); r(25, fy - 13, 2, 2, '#d62828'); r(28, fy - 9, 2, 1, '#f4a20d'); r(20, fy - 1, 1, 1, '#f4a20d'); r(23, fy - 1, 1, 1, '#f4a20d');
  } else { // estanterías, bidones y toldo
    for (let k = 0; k < 4; k++) r(0, k * 6, w, 3, k % 2 ? '#f1faee' : '#c1121f');
    for (let s = 0; s < 3; s++) { r(8, 28 + s * 9, 62, 2, '#4a2f18'); for (let p = 0; p < 12; p++) r(10 + p * 5, 23 + s * 9 + (p * 7 + s * 3) % 3, 3, 5 - (p * 7 + s * 3) % 3, ['#d62828', '#f4c20d', '#2a9d8f', '#2b5fa8', '#e76f51'][(p + s * 2) % 5]); }
    r(82, fy - 22, 14, 22, '#2f6fd0'); r(100, fy - 22, 14, 22, '#2f6fd0'); r(82, fy - 16, 14, 2, '#1d3557'); r(100, fy - 16, 14, 2, '#1d3557'); r(96, fy - 4, 4, 4, '#f2b705');
  }
}

// from/to: índices de habitación (from puede ser null); k: avance 0..1 del recorrido.
export function drawMap(hud, t, from, to, k) {
  const { W, H, g } = hud, cx = W / 2;
  drawCity(g, W, H, t, 'night', 30); hud.rect(0, 0, W, H, 'rgba(7,6,24,0.72)');
  const rw = Math.min(126, (W - 40) / 2 | 0), rh = 56, wall = 4, x0 = Math.round(cx - rw - wall * 1.5), y0 = Math.round(H / 2 - rh - wall * 1.5) + 6;
  const hw = rw * 2 + wall * 3, hh = rh * 2 + wall * 3;
  hud.rect(x0 - 2, y0 - 2, hw + 4, hh + 4, '#0b0b12'); hud.rect(x0, y0, hw, hh, '#3a2414');
  for (let x = x0 - 2; x < x0 + hw + 2; x += 8) hud.rect(x, y0 - 6, 5, 4, '#3a2414'); // almenas
  const pos = (i) => ({ x: x0 + wall + (i % 2) * (rw + wall), y: y0 + wall + (i >> 1) * (rh + wall) });
  const ctr = (i) => { const p = pos(i); return { x: p.x + rw / 2, y: p.y + rh - 16 }; };
  ROOMS.forEach((room, i) => {
    const p = pos(i);
    roomArt(hud, i, p.x, p.y, rw, rh, t);
    if (i > to && !(from !== null && from > to)) { hud.rect(p.x, p.y, rw, rh, 'rgba(8,6,20,0.9)'); hud.text('?', p.x + rw / 2, p.y + rh / 2, { scale: 2, color: '#6a6f9a' }); }
    else hud.text(room.name, p.x + 4, p.y + 7, { align: 'left', color: i === to ? '#ffd23f' : '#fdf6e3' });
    if (i === to && k > 0.85 && Math.floor(t * 5) % 2) { hud.rect(p.x, p.y, rw, 2, '#ffd23f'); hud.rect(p.x, p.y + rh - 2, rw, 2, '#ffd23f'); hud.rect(p.x, p.y, 2, rh, '#ffd23f'); hud.rect(p.x + rw - 2, p.y, 2, rh, '#ffd23f'); }
  });
  // recorrido de la cucaracha por dentro de las paredes
  const b = ctr(to), a = from === null ? { x: x0 - 26, y: b.y } : ctr(from), mid = { x: x0 + hw / 2, y: y0 + hh / 2 };
  const pts = from === null || (from >> 1) === (to >> 1) ? [a, b] : [a, { x: mid.x, y: a.y }, { x: mid.x, y: b.y }, b];
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = segs.reduce((s, v) => s + v, 0);
  const at = (d) => { for (let i = 0; i < segs.length; i++) { if (d <= segs[i] || i === segs.length - 1) { const q = Math.min(1, d / segs[i]); return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * q, y: pts[i].y + (pts[i + 1].y - pts[i].y) * q }; } d -= segs[i]; } };
  const done = Math.min(1, k / 0.8) * total;
  for (let d = 0; d < done; d += 6) { const p = at(d); hud.rect(p.x - 1, p.y - 1, 3, 3, '#0b0b12'); hud.rect(p.x, p.y, 1, 1, '#ffd23f'); }
  const p = at(done); hud.roach(p.x - 5, p.y - 4 - Math.abs(Math.sin(t * 12)) * (k < 0.8 ? 2 : 0));
}
