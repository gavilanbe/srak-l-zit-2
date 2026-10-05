// Ilustraciones 2D dibujadas por código a la resolución del juego: la medina de noche y al amanecer
// (portada, apertura y final), el logotipo de aceite y el plano de la casa entre capítulos.
import { GLYPHS } from './font.js';
import { Hud } from './hud.js';

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
// reveal 0..1 hace subir las capas desde abajo; behind() se dibuja entre el cielo y los edificios.
export function drawCity(g, W, H, t, key = 'night', scroll = 0, { reveal = 1, behind = null } = {}) {
  const s = scene(W, H, key), P = s.P, off = (k) => -Math.round(20 + scroll * k + Math.sin(t * 0.12) * 4 * k);
  const yo = (i) => (reveal >= 1 ? 0 : Math.round((1 - (1 - (1 - Math.max(0, Math.min(1, reveal * 1.5 - i * 0.12))) ** 3)) * (30 + i * 34)));
  g.drawImage(s.sky, 0, 0);
  if (reveal < 0.5) { g.fillStyle = `rgba(7,6,28,${1 - reveal * 2})`; g.fillRect(0, 0, W, H); }
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
  behind?.();
  g.drawImage(s.mount, off(0.25), yo(0)); g.drawImage(s.far, off(0.5), yo(1)); g.drawImage(s.mid, off(0.8), yo(2)); g.drawImage(s.near, off(1.2), yo(3));
  for (const w of s.wins) {
    if (!P.star && w.layer < 2) continue;
    if (w.flick && Math.sin(t * 2.3 + w.p) > 0.8) continue;
    const x = w.x + off([0.5, 0.8, 1.2][w.layer]);
    const wy = w.y + yo(w.layer + 1);
    g.fillStyle = w.layer === 0 ? P.dim : P.lit; g.fillRect(x, wy, 2, 3); if (w.arch) g.fillRect(x, wy - 1, 2, 1);
  }
  for (const c of s.cloth) { g.fillStyle = c.c; g.fillRect(c.x + off(1.2), c.y + yo(3) + Math.round(Math.sin(t * 2 + c.x) * 0.6), 4, 6); }
  if (P.star) { // guirnalda de farolillos entre dos azoteas
    const x0 = Math.round(s.WW * 0.22) + off(1.2), y0 = s.hz + 16 + yo(3), n = 11;
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * 7, y = y0 + Math.round(Math.sin(i / n * Math.PI) * 6);
      g.fillStyle = '#0f0826'; g.fillRect(x, y - 1, 7, 1);
      if (i % 2 || Math.sin(t * 3 + i * 1.7) < -0.6) continue;
      g.fillStyle = ['#ffb347', '#ff6b6b', '#7dd3fc', '#b6ff5c'][(i >> 1) % 4]; g.fillRect(x, y, 2, 3);
      g.fillStyle = 'rgba(255,220,150,0.25)'; g.fillRect(x - 1, y - 1, 4, 5);
    }
  }
}

// Nubes finas que cruzan por delante de la luna.
export function drawClouds(g, W, H, t) {
  for (const [y, w, sp, ph] of [[0.2, 90, 5, 0], [0.34, 130, 3.2, 140], [0.44, 70, 6.5, 300], [0.12, 60, 4, 380]]) {
    const x = Math.round(((t * sp + ph) % (W + w * 2)) - w), yy = Math.round(H * y);
    g.fillStyle = 'rgba(150,130,210,0.2)'; g.fillRect(x, yy, w, 2); g.fillRect(x + (w * 0.15 | 0), yy - 2, w * 0.6 | 0, 2); g.fillRect(x + (w * 0.3 | 0), yy + 2, w * 0.55 | 0, 2);
    g.fillStyle = 'rgba(190,175,235,0.14)'; g.fillRect(x + (w * 0.2 | 0), yy - 1, w * 0.4 | 0, 1);
  }
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

// La cucaracha de perfil, 20x12 px. px(x, y, w, h, color) pinta un rectángulo; dir: 1 mira a la derecha, -1 a la izquierda.
export function drawRoachSprite(px, x, y, dir = 1, frame = 0, carry = false) {
  x = Math.round(x); y = Math.round(y);
  const r = (a, b, w, h, c) => px(dir > 0 ? x + a : x + 20 - a - w, y + b, w, h, c), K = '#0b0b12';
  r(1, 4, 14, 6, K); r(2, 3, 12, 8, K); r(13, 4, 5, 6, K); r(12, 0, 5, 5, K);           // contorno
  r(2, 5, 13, 4, '#a8521c'); r(3, 4, 11, 6, '#a8521c');                                  // cuerpo
  r(3, 4, 8, 4, '#64260c'); r(4, 4, 6, 1, '#8a3f18'); r(11, 4, 1, 6, '#431808');          // alas y pronoto
  r(3, 9, 9, 1, '#c26a26');                                                              // vientre
  r(14, 5, 3, 4, '#431808'); r(15, 5, 2, 2, '#fffbe8'); r(16, 6, 1, 1, K); r(17, 8, 2, 1, K); // cabeza, ojo y bigote
  r(13, 1, 3, 3, '#d00000'); r(13, 1, 3, 1, '#ff3b3b'); r(12, 1, 1, 3, K);                // tarbouch con borla
  const w = frame % 2;                                                                    // antenas y patas
  r(17, 3 - w, 1, 1, '#2b0f05'); r(18, 2 - w, 1, 1, '#2b0f05'); r(19, 1 - w, 1, 1, '#2b0f05'); r(18, 4, 1, 1, '#2b0f05'); r(19, 4 + w, 1, 1, '#2b0f05');
  for (let i = 0; i < 3; i++) { const lx = 4 + i * 4, f = (i + frame) % 2; r(lx, 10, 1, 1, '#2b0f05'); r(lx + (f ? 1 : -1), 11, 1, 1, '#2b0f05'); }
  if (carry) { r(5, -1, 5, 6, K); r(6, 0, 3, 4, '#ffd23f'); r(7, -1, 1, 1, K); r(6, 1, 1, 1, '#fff6d6'); }
}

function drawBabySprite(px, x, y, dir, frame) { // cría, 9x6 px
  x = Math.round(x); y = Math.round(y);
  const r = (a, b, w, h, c) => px(dir > 0 ? x + a : x + 9 - a - w, y + b, w, h, c);
  r(0, 1, 9, 4, '#0b0b12'); r(1, 0, 7, 6, '#0b0b12'); r(1, 2, 7, 2, '#cf8436'); r(2, 1, 5, 4, '#cf8436'); r(2, 1, 3, 2, '#9a5520');
  r(6, 1, 2, 2, '#fffbe8'); r(7, 2, 1, 1, '#0b0b12');
  for (let i = 0; i < 2; i++) r(2 + i * 3 + ((i + frame) % 2), 5, 1, 1, '#2b0f05');
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
  drawRoachSprite((a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); }, ((t * 22) % (W + 60)) - 30, H - 29, 1, Math.floor(t * 10), true);
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
  const cols = [];
  for (const ch of text) {
    if (ch === ' ') { grid.forEach((r) => r.push(0, 0)); continue; }
    const gl = GLYPHS[ch], c0 = grid[0].length;
    for (let y = 0; y < 9; y++) { for (let x = 0; x < gl.w; x++) grid[y].push(y >= 1 && y <= 7 && gl.rows[y - 1][x] === 'X' ? 1 : 0); grid[y].push(0); }
    cols.push([c0, grid[0].length - 1]);
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
  // por dónde cortar el lienzo para mover cada letra por separado
  const cuts = cols.map(([a], i) => (i ? Math.round((cols[i - 1][1] + a) / 2 * m) + pad : 0)); cuts.push(c.width);
  return { c, w: c.width, h: c.height, drips, cuts, base: bot + 1 + pad, half: 3.5 * m, tmp: canvas(c.width, c.height) };
}

// Logotipo «SRAK L ZIT» centrado en (cx, cy), con brillo que lo recorre y gotas de aceite.
// appear: segundos desde que empieza a caer (las letras entran una a una rebotando).
// Devuelve la mitad del alto de las letras en pantalla.
const bounce = (k) => { const n = 7.5625, d = 2.75; return k < 1 / d ? n * k * k : k < 2 / d ? n * (k -= 1.5 / d) * k + 0.75 : k < 2.5 / d ? n * (k -= 2.25 / d) * k + 0.9375 : n * (k -= 2.625 / d) * k + 0.984375; };
export function drawLogo(g, cx, cy, W, t, appear = 99) {
  logos.a ??= buildLogo('SRAK L ZIT', 2); logos.b ??= buildLogo('SRAK L ZIT', 1);
  const [logo, s] = logos.a.w * 2 <= W - 4 ? [logos.a, 2] : logos.b.w * 3 <= W - 4 ? [logos.b, 3] : logos.b.w * 2 <= W - 4 ? [logos.b, 2] : [logos.b, 1];
  const tg = logo.tmp.getContext('2d');
  tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, logo.w, logo.h); tg.drawImage(logo.c, 0, 0);
  tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = 'rgba(255,255,255,0.75)';
  const sweep = ((t % 4.5) / 1.1) * (logo.w + 60) - 30;
  for (let yy = 0; yy < logo.h; yy++) tg.fillRect(Math.round(sweep - yy * 0.7), yy, Math.max(3, logo.h / 6 | 0), 1);
  const x0 = Math.round(cx - logo.w * s / 2), y = Math.round(cy - logo.h * s / 2), n = logo.cuts.length - 1;
  if (appear < n * 0.09 + 0.6) { // todavía cayendo
    for (let i = 0; i < n; i++) {
      const lt = appear - i * 0.09; if (lt < 0) continue;
      const a = logo.cuts[i], w = logo.cuts[i + 1] - a, dy = Math.round((1 - bounce(Math.min(1, lt / 0.55))) * (y + logo.h * s + 10));
      g.drawImage(logo.c, a, 0, w, logo.h, x0 + a * s, y - dy, w * s, logo.h * s);
    }
    return logo.half * s;
  }
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

const STORY = [
  'Una casa cualquiera de la medina. En un agujero de la cocina vive una familia.',
  'En la cocina ya no queda ni gota. Por la grieta, al salón.',
  'Jeddi se ha quedado sin argán. Tubería abajo, al patio.',
  'Queda el premio gordo: la tienda de Si Brahim, a pie de calle.',
];
const THREATS = ['la jadda · Mchicha', 'jeddi · Mchicha', 'las gallinas · la jadda', 'Si Brahim · los cepos'];

function sprite(hud, x, y, robe, head, top) { // personajillo de 6x12
  hud.rect(x, y + 5, 6, 8, robe); hud.rect(x + 1, y + 1, 4, 4, head); hud.rect(x + 1, y, 4, 2, top);
}

// La casa en corte, dibujada en un lienzo aparte para poder acercar la cámara a una habitación.
let mapHud = null;
function drawHouse(hud, t, from, to, k) {
  const { W, H } = hud, cx = W / 2;
  hud.clear();
  const rw = Math.min(126, (W - 40) / 2 | 0), rh = 56, wall = 5, x0 = Math.round(cx - rw - wall * 1.5), y0 = Math.round(H / 2 - rh - wall * 1.5) + 4;
  const hw = rw * 2 + wall * 3, hh = rh * 2 + wall * 3, gy = y0 + hh;
  // calle, palmera y farola
  hud.rect(0, gy, W, H - gy, '#0d0a1e'); hud.rect(0, gy, W, 2, '#2a1f45');
  const palm = x0 - 26; for (let y = gy - 46; y < gy; y++) hud.rect(palm + Math.round(Math.sin((y - gy) * 0.05) * 2), y, 2, 1, '#1c1040');
  for (let a = 0; a < 7; a++) { const ang = -2.9 + a * 0.45; for (let d = 0; d < 13; d++) hud.rect(palm + Math.cos(ang) * d, gy - 46 + Math.sin(ang) * d * 0.6 + d * d * 0.03, 2, 1, '#1c1040'); }
  const lx = x0 + hw + 16; hud.rect(lx, gy - 34, 2, 34, '#1c1040'); hud.rect(lx - 3, gy - 38, 8, 5, '#1c1040'); hud.rect(lx - 2, gy - 37, 6, 3, Math.sin(t * 9) > -0.8 ? '#ffd27a' : '#b9793f');
  hud.rect(lx - 9, gy - 30, 20, 30, 'rgba(255,210,122,0.06)');
  // fachada, azotea y tejadillo del hanout
  hud.rect(x0 - 3, y0 - 3, hw + 6, hh + 3, '#0b0b12'); hud.rect(x0, y0, hw, hh, '#4a2f1c');
  for (let x = x0 - 3; x < x0 + hw + 3; x += 8) hud.rect(x, y0 - 8, 5, 5, '#4a2f1c');
  hud.rect(x0 + 14, y0 - 20, 1, 12, '#2a1a10'); hud.rect(x0 + 11, y0 - 18, 7, 1, '#2a1a10'); // antena
  hud.rect(x0 + hw - 40, y0 - 18, 1, 10, '#2a1a10'); hud.rect(x0 + hw - 12, y0 - 18, 1, 10, '#2a1a10');
  for (let d = 0; d <= 28; d++) hud.rect(x0 + hw - 40 + d, y0 - 18 + Math.sin(d / 28 * Math.PI) * 3, 1, 1, '#2a1a10');
  for (const [d, c] of [[5, '#8f1d2c'], [12, '#1d6f73'], [19, '#e9c46a']]) hud.rect(x0 + hw - 40 + d, y0 - 16 + Math.sin(t * 2 + d) * 0.6, 4, 6, c);
  const pos = (i) => ({ x: x0 + wall + (i % 2) * (rw + wall), y: y0 + wall + (i >> 1) * (rh + wall) });
  const ctr = (i) => { const p = pos(i); return { x: p.x + rw / 2, y: p.y + rh - 16 }; };
  const looped = from !== null && from > to;
  ROOMS.forEach((room, i) => {
    const p = pos(i), seen = i <= to || looped;
    roomArt(hud, i, p.x, p.y, rw, rh, t);
    const fy = p.y + rh - 10, walk = Math.round(Math.sin(t * 0.9 + i) * 14);
    if (i === 0) sprite(hud, p.x + 62 + walk, fy - 13, '#7d3c98', '#c68a5b', '#d62828');
    if (i === 3) sprite(hud, p.x + 34 + walk, fy - 13, '#2b5fa8', '#c68a5b', '#f4f1ea');
    if (i !== to) hud.rect(p.x, p.y, rw, rh, seen ? 'rgba(8,6,20,0.45)' : 'rgba(8,6,20,0.9)');
    if (!seen) hud.text('?', p.x + rw / 2, p.y + rh / 2, { scale: 2, color: '#6a6f9a' });
    else hud.text(room.name, p.x + 4, p.y + 7, { align: 'left', color: i === to ? '#ffd23f' : '#fdf6e3' });
    if (seen && i < to && !looped) { hud.rect(p.x + rw - 46, p.y + 3, 43, 11, '#0b0b12'); hud.rect(p.x + rw - 45, p.y + 4, 41, 9, '#ffd23f'); hud.text('ROBADO', p.x + rw - 24, p.y + 9, { color: '#5a0a10', outline: null }); }
  });
  // tuberías por dentro de los muros
  const mid = { x: x0 + hw / 2, y: y0 + hh / 2 };
  hud.rect(mid.x - 1, y0 + 2, 2, hh - 4, '#7a7f87'); hud.rect(x0 + 2, mid.y - 1, hw - 4, 2, '#7a7f87');
  for (const [jx, jy] of [[mid.x, mid.y], [mid.x, y0 + 18], [mid.x, y0 + hh - 18], [x0 + 40, mid.y], [x0 + hw - 40, mid.y]]) hud.rect(jx - 2, jy - 2, 4, 4, '#b8bcc4');
  const px = (a, b, w, h, c) => hud.rect(a, b, w, h, c), fr = Math.floor(t * 10);
  if (from === null) { // el principio: la familia en su agujero de la cocina
    const p0 = pos(0), hx = p0.x, hy = p0.y + rh - 10;
    hud.rect(hx, hy - 10, 12, 10, '#0b0b12'); hud.rect(hx + 2, hy - 12, 8, 2, '#0b0b12'); hud.rect(hx, hy - 10, 2, 10, '#ffb347'); hud.rect(hx + 2, hy - 8, 1, 8, '#b9793f');
    drawRoachSprite(px, hx + 14, hy - 12, 1, Math.floor(t * 3) % 2 ? 0 : 1);
    drawBabySprite(px, hx + 3, hy - 6, 1, fr); if (Math.sin(t * 5) > 0) drawBabySprite(px, hx + 37, hy - 6 - Math.abs(Math.sin(t * 9)) * 3, -1, fr);
    if (k > 0.25) { const by = hy - 22 - Math.abs(Math.sin(t * 6)) * 2; hud.rect(hx + 21, by, 5, 5, '#0b0b12'); hud.rect(hx + 22, by + 1, 3, 2, '#ffd23f'); hud.rect(hx + 23, by + 3, 1, 1, '#ffd23f'); hud.text('la familia', hx + 31, by + 2, { align: 'left', color: '#ffd23f' }); }
    const spot = { x: hx + 26, y: hy - 8 };
    return { room: spot, focus: spot };
  }
  // la mudanza: la cucaracha por las tuberías, con las crías detrás
  const b = ctr(to), a = ctr(from);
  const pts = (from >> 1) === (to >> 1) ? [a, { x: mid.x, y: a.y }, b]
    : (from % 2) === (to % 2) ? [a, { x: a.x, y: mid.y }, b] : [a, { x: mid.x, y: a.y }, { x: mid.x, y: b.y }, b];
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = segs.reduce((s, v) => s + v, 0);
  const at = (d) => { d = Math.max(0, d); for (let i = 0; i < segs.length; i++) { if (d <= segs[i] || i === segs.length - 1) { const q = Math.min(1, d / segs[i]); return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * q, y: pts[i].y + (pts[i + 1].y - pts[i].y) * q }; } d -= segs[i]; } };
  const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, done = e * total, moving = k > 0 && k < 1;
  for (let d = 0; d < done - 30; d += 7) { const p = at(d); hud.rect(p.x - 1, p.y + 2, 3, 3, '#0b0b12'); hud.rect(p.x, p.y + 3, 1, 1, '#ffd23f'); }
  const p = at(done), q = at(done + 2), dir = q.x < p.x - 0.01 ? -1 : 1;
  for (const [lag, ph] of [[26, 0], [16, 1]]) { const c = at(done - lag); if (done > lag || !moving) drawBabySprite(px, c.x - 4, c.y - 2 - (moving ? Math.abs(Math.sin(t * 13 + ph)) * 2 : 0), dir, fr + ph); }
  if (moving && fr % 2) hud.rect(p.x - dir * 12, p.y + 3, 2, 2, '#d8cfb8');
  drawRoachSprite(px, p.x - 10, p.y - 8 - (moving ? Math.abs(Math.sin(t * 12)) : 0), dir, moving ? fr : 0);
  return { room: { x: b.x, y: b.y - 12 }, focus: p };
}

// Escena de cambio de sitio. ct: segundos dentro de la escena; info: { chapter, name, sub, loop }.
export function drawTravel(hud, t, ct, dur, from, to, info) {
  const { W, H, g } = hud, cx = W / 2;
  if (!mapHud || mapHud.W !== W || mapHud.H !== H) { mapHud = new Hud(canvas(W, H)); mapHud.resize(W, H, 1); }
  drawCity(g, W, H, t, 'night', 30); hud.rect(0, 0, W, H, 'rgba(7,6,24,0.7)');
  const k = Math.max(0, Math.min(1, (ct - 0.9) / 2.7)), { room, focus } = drawHouse(mapHud, t, from, to, k);
  // la cámara se acerca a la cucaracha, la sigue por las tuberías y acaba en la habitación de destino
  const c01 = (v) => Math.max(0, Math.min(1, v)), eo = (v) => 1 - (1 - v) ** 3;
  const zb = eo(c01((ct - 0.5) / 1.0)), ez = eo(c01((ct - 3.9) / 1.1)), z1 = 1 + zb * 0.6, z = z1 + ez * (2.25 - z1);
  const rise = Math.round((1 - eo(c01(ct / 0.7))) * H), sw = W / z, sh = H / z;
  const f1x = cx + (focus.x - cx) * zb, f1y = H / 2 + (focus.y - H / 2) * zb;
  const fx = f1x + (room.x - f1x) * ez, fy = f1y + (room.y - f1y) * ez;
  g.drawImage(mapHud.c, Math.max(0, Math.min(W - sw, fx - sw / 2)), Math.max(0, Math.min(H - sh, fy - sh / 2)), sw, sh, 0, rise, W, H);
  // rótulos
  if (ct < 3.9) {
    hud.text(`CAPÍTULO ${info.chapter}${info.loop ? ' · OTRA VUELTA' : ''}`, cx, 13, { color: '#b9c8ff' });
    const story = (info.loop ? 'El invierno es largo. Otra vuelta por la casa, y todos más despiertos.' : STORY[to]).slice(0, Math.floor(Math.max(0, ct - 0.5) * 30));
    if (story) hud.wrap(story, W - 30).forEach((l, i) => hud.text(l, cx, H - 18 + i * 10, { color: '#fdf6e3' }));
  } else {
    const st = ct - 3.9, sc = (W > 330 ? 3 : 2) + (st < 0.12 ? 1 : 0), ty = Math.round(H * 0.17);
    hud.rect(0, ty - 20, W, 40, 'rgba(7,6,24,0.78)'); hud.rect(0, ty - 20, W, 1, '#e9c46a'); hud.rect(0, ty + 19, W, 1, '#e9c46a');
    hud.text(`CAPÍTULO ${info.chapter}`, cx, ty - 12, { color: '#b9c8ff', outline: null });
    hud.text(info.name, cx + 2, ty + 6, { scale: sc, color: '#5a0a10', outline: null }); hud.text(info.name, cx, ty + 4, { scale: sc, color: '#ffd23f', outline: null });
    hud.rect(0, H - 40, W, 40, 'rgba(7,6,24,0.78)'); hud.rect(0, H - 40, W, 1, '#e9c46a');
    const sub = info.sub.slice(0, Math.floor(Math.max(0, st - 0.3) * 32));
    if (sub) hud.text(sub, cx, H - 28, { color: '#fdf6e3', outline: null });
    if (st > 1.2) hud.text(`CUIDADO CON: ${THREATS[to]}`, cx, H - 13, { color: '#ff7a7a', outline: null });
  }
}
