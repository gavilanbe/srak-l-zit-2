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
// La casa en corte: fachada, azotea, calle y cuatro interiores dibujados con sombreado y tramado.
// Lo que no se mueve se pinta una vez en un lienzo; personajes, luces y agua van encima cada fotograma.
const STORY = [
  'Una casa cualquiera de la medina. En un agujero de la cocina vive una familia.',
  'En la cocina ya no queda ni gota. Por la grieta, al salón.',
  'Jeddi se ha quedado sin argán. Tubería abajo, al patio.',
  'Queda el premio gordo: la tienda de Si Brahim, a pie de calle.',
];
const THREATS = ['la jadda', 'jeddi · Mchicha', 'las gallinas · la jadda', 'Si Brahim · los cepos'];
const ROOM_NAMES = ['COCINA', 'SALÓN', 'PATIO', 'HANOUT'];
const K = '#0b0b12', RH = 72, WALL = 8, FY = 61; // alto de habitación, grosor de muro y altura del suelo

function tools(hud) {
  const R = (x, y, w, h, c) => hud.rect(x, y, w, h, c);
  const T = {
    R,
    box(x, y, w, h, base, hi, sh) { R(x - 1, y - 1, w + 2, h + 2, K); R(x, y, w, h, base); R(x, y, w, 1, hi); R(x, y, 1, h, hi); R(x, y + h - 1, w, 1, sh); R(x + w - 1, y, 1, h, sh); },
    dith(x, y, w, h, c, odd = 0) { for (let j = 0; j < h; j++) for (let i = (j + odd) & 1; i < w; i += 2) R(x + i, y + j, 1, 1, c); },
    grad(x, y, w, h, cols) { // bandas con una fila tramada entre cada dos
      const bh = h / cols.length;
      cols.forEach((c, i) => { const y0 = Math.round(y + i * bh), y1 = Math.round(y + (i + 1) * bh); R(x, y0, w, y1 - y0, c); if (i) T.dith(x, y0 - 2, w, 2, c); });
    },
    disc(cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const dx = Math.round(Math.sqrt(r * r - dy * dy)); R(cx - dx, cy + dy, dx * 2 + 1, 1, c); } },
    arch(x, y, w, h, c) { const r = w >> 1; for (let dy = 0; dy <= r; dy++) { const dx = Math.round(Math.sqrt(r * r - (r - dy) * (r - dy))); R(x + r - dx, y + dy, dx * 2 + (w & 1), 1, c); } R(x, y + r, w, h - r, c); },
    glow(cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const dx = Math.round(Math.sqrt(r * r - dy * dy)); T.dith(cx - dx, cy + dy, dx * 2 + 1, 1, c, dy & 1); } },
    bricks(x, y, w, h) {
      R(x, y, w, h, '#7a4a2c');
      for (let j = 0, row = 0; j < h; j += 4, row++) {
        R(x, y + j + 3, w, 1, '#4e2c1a');
        for (let i = (row % 2) * 5; i < w; i += 10) { R(x + i, y + j, 1, Math.min(3, h - j), '#4e2c1a'); if (i + 2 < w) R(x + i + 1, y + j, Math.min(7, w - i - 2), 1, '#96603a'); }
      }
    },
    zellige(x, y, w, h, a, b, dot) { for (let i = 0; i < w; i += 6) { R(x + i, y, Math.min(6, w - i), h, (i / 6) % 2 ? a : b); if (i + 3 < w) { R(x + i + 2, y + (h >> 1) - 1, 2, 2, dot); } } R(x, y, w, 1, K); R(x, y + 1, w, 1, '#ffffff55'); },
    floor(x, y, w, a, b, hi) { R(x, y, w, RH - FY, a); for (let i = 0; i < w; i += 12) { R(x + i, y + 1, Math.min(6, w - i), 4, b); if (i + 6 < w) R(x + i + 6, y + 6, Math.min(6, w - i - 6), 5, b); } R(x, y, w, 1, hi); },
    jar(x, y, c, hi, sh) { T.disc(x + 5, y + 8, 6, K); R(x + 2, y - 1, 7, 4, K); T.disc(x + 5, y + 8, 5, c); R(x + 3, y, 5, 3, c); R(x + 2, y - 1, 7, 1, sh); R(x + 2, y + 5, 2, 5, hi); R(x + 8, y + 6, 2, 6, sh); },
  };
  return T;
}

// personajillo de pie, 12x22: túnica, cabeza y tocado
function person(R, x, y, robe, shade, top, extra) {
  x = Math.round(x); y = Math.round(y);
  R(x, y + 7, 12, 15, K); R(x + 1, y - 1, 10, 9, K);
  R(x + 1, y + 8, 10, 13, robe); R(x + 8, y + 8, 3, 13, shade); R(x + 1, y + 19, 10, 1, '#e9c46a');
  R(x + 3, y + 2, 6, 6, '#c68a5b'); R(x + 7, y + 4, 1, 1, K); R(x + 3, y + 6, 6, 1, '#a86d44');
  if (top === 'scarf') { R(x + 2, y, 8, 3, '#d62828'); R(x + 2, y + 3, 2, 4, '#d62828'); R(x + 3, y, 5, 1, '#ff6b6b'); }
  if (top === 'fez') { R(x + 3, y - 1, 6, 3, '#c1121f'); R(x + 3, y + 5, 6, 3, '#f4f1ea'); }
  if (top === 'cap') { R(x + 2, y, 8, 2, '#f4f1ea'); R(x + 5, y + 6, 4, 1, K); }
  if (extra === 'belgha') { R(x + 10, y + 5, 5, 4, K); R(x + 11, y + 6, 3, 2, '#f4c20d'); R(x + 10, y + 9, 2, 5, robe); }
  if (extra === 'broom') { R(x + 12, y + 2, 1, 19, '#8a5a2b'); R(x + 11, y + 18, 3, 4, '#e9c46a'); }
}

function chicken(R, x, y, peck) {
  x = Math.round(x); y = Math.round(y);
  const hy = peck ? 4 : 0, hx = peck ? 2 : 0;
  R(x - 1, y + 2, 9, 7, K); R(x, y + 3, 7, 5, '#f6f1e4'); R(x, y + 2, 2, 2, '#f6f1e4'); R(x + 1, y + 6, 5, 1, '#d9d2bd');
  R(x + 5 + hx, y - 2 + hy, 5, 6, K); R(x + 6 + hx, y - 1 + hy, 3, 4, '#f6f1e4'); R(x + 6 + hx, y - 2 + hy, 2, 1, '#d62828'); R(x + 9 + hx, y + hy + 1, 2, 1, '#f4a20d'); R(x + 8 + hx, y + hy, 1, 1, K);
  R(x + 2, y + 8, 1, 2, '#f4a20d'); R(x + 4, y + 8, 1, 2, '#f4a20d');
}

const ROOM_PAINT = [
  // ---- cocina ----
  (T, x, y, rw) => {
    const { R, box } = T, fy = y + FY;
    T.grad(x, y, rw, FY, ['#f3ddb0', '#e9cc96', '#dcb97d']);
    T.zellige(x, fy - 15, rw, 15, '#1f7a5c', '#e9d8a6', '#1d3557');
    T.floor(x, fy, rw, '#b98a58', '#d4a874', '#f1d6a3');
    R(x, fy - 10, 9, 10, K); T.arch(x, fy - 11, 8, 11, '#1a0c06'); R(x, fy - 9, 2, 9, '#ffb347'); R(x + 2, fy - 7, 1, 7, '#b9793f'); // el agujero
    box(x + 18, fy - 46, 22, 46, '#e9e9e2', '#ffffff', '#b4b4aa'); R(x + 18, fy - 31, 22, 1, '#9a9a94'); R(x + 36, fy - 41, 2, 7, '#8a8a84'); R(x + 36, fy - 27, 2, 10, '#8a8a84');
    R(x + 22, fy - 42, 3, 3, '#d62828'); R(x + 27, fy - 39, 3, 2, '#2a9d8f'); R(x + 23, fy - 24, 4, 3, '#e9c46a');
    const wx = x + 50; // ventana con la luna
    box(wx, y + 6, 30, 22, '#101c4a', '#1a2a66', '#0b1436'); T.disc(wx + 21, y + 14, 5, '#e9edff'); R(wx + 19, y + 12, 3, 2, '#c9d0f2'); R(wx + 5, y + 10, 1, 1, '#ffffff'); R(wx + 10, y + 20, 1, 1, '#ffffff'); R(wx + 13, y + 9, 1, 1, '#b9b6e6');
    R(wx + 14, y + 6, 2, 22, '#6b3f1d'); R(wx, y + 16, 30, 1, '#6b3f1d'); R(wx - 2, y + 5, 34, 2, '#8a5a2b'); R(wx - 2, y + 28, 34, 2, '#6b3f1d');
    R(wx - 2, y + 7, 4, 20, '#c1121f'); R(wx + 28, y + 7, 4, 20, '#c1121f'); R(wx - 1, y + 7, 1, 20, '#ff5a5a');
    for (let i = 0; i < 20; i++) T.dith(wx + 4 + i, y + 30 + i, 22, 1, '#fff6d6', i & 1); // rayo de luna
    box(x + 46, fy - 20, 54, 20, '#2a9d8f', '#4cc7b8', '#1c6f66'); box(x + 44, fy - 23, 58, 3, '#f4e6c0', '#ffffff', '#c9b88a');
    for (let i = 0; i < 4; i++) { R(x + 59 + i * 13, fy - 19, 1, 18, '#1c6f66'); R(x + 53 + i * 13, fy - 12, 2, 3, '#e9c46a'); }
    R(x + 52, fy - 27, 12, 4, K); R(x + 53, fy - 26, 10, 3, '#b5562b'); R(x + 55, fy - 31, 6, 5, K); R(x + 56, fy - 30, 4, 4, '#c4622d'); R(x + 57, fy - 32, 2, 2, '#c4622d'); // tajín
    R(x + 80, fy - 30, 2, 7, '#b8bcc4'); R(x + 80, fy - 30, 6, 2, '#b8bcc4'); // grifo
    R(x + 46, y + 36, 40, 1, '#5e3b1e'); for (const [o, c] of [[4, '#b8bcc4'], [14, '#c67a3c'], [24, '#b8bcc4']]) { R(x + 48 + o, y + 37, 1, 3, K); R(x + 46 + o, y + 40, 6, 4, c); R(x + 46 + o, y + 40, 6, 1, '#ffffff88'); }
    box(x + 106, fy - 22, 22, 22, '#d9d9d2', '#f6f6f2', '#9a9a94'); R(x + 109, fy - 14, 16, 10, '#23262d'); R(x + 109, fy - 14, 16, 1, '#4a4f58'); R(x + 108, fy - 19, 3, 2, '#d62828'); R(x + 113, fy - 19, 3, 2, K); R(x + 118, fy - 19, 3, 2, K);
    R(x + 110, fy - 28, 12, 6, K); R(x + 111, fy - 27, 10, 5, '#8a8f98'); R(x + 111, fy - 27, 10, 1, '#c8ccd4');
    box(x + 134, fy - 17, 10, 17, '#2f6fd0', '#7fb0ff', '#1d4a96'); R(x + 137, fy - 21, 4, 3, K); R(x + 138, fy - 20, 2, 2, '#c8c8c8');
    const tx = x + rw - 62; // mesa con el té
    box(tx, fy - 18, 36, 3, '#9a6a36', '#c48f55', '#5e3b1e'); R(tx + 3, fy - 15, 3, 15, K); R(tx + 4, fy - 15, 1, 15, '#7a4f26'); R(tx + 30, fy - 15, 3, 15, K); R(tx + 31, fy - 15, 1, 15, '#7a4f26');
    R(tx + 8, fy - 20, 20, 2, '#cfd6dc'); R(tx + 12, fy - 26, 7, 6, K); R(tx + 13, fy - 25, 5, 5, '#cfd6dc'); R(tx + 14, fy - 28, 3, 3, '#cfd6dc'); R(tx + 19, fy - 24, 3, 1, '#cfd6dc'); R(tx + 13, fy - 25, 1, 4, '#ffffff');
    R(tx + 22, fy - 23, 2, 3, '#2a9d8f'); R(tx + 25, fy - 23, 2, 3, '#e76f51');
    const bx = x + rw - 20; // el bidón
    R(bx - 4, fy - 1, 22, 2, '#f2b705'); box(bx, fy - 18, 13, 18, '#d9ac12', '#ffe36e', '#9a7708'); R(bx + 2, fy - 13, 9, 8, '#2d6a4f'); R(bx + 3, fy - 11, 7, 3, '#f1faee'); R(bx + 2, fy - 21, 4, 3, K); R(bx + 3, fy - 20, 2, 2, '#2d6a4f');
    R(x + (rw >> 1), y, 1, 9, K); R(x + (rw >> 1) - 5, y + 9, 11, 5, K); R(x + (rw >> 1) - 4, y + 10, 9, 3, '#c1440e'); R(x + (rw >> 1) - 4, y + 10, 9, 1, '#ff8a4c'); R(x + (rw >> 1) - 2, y + 13, 5, 2, '#ffe9a8'); // lámpara
  },
  // ---- salón ----
  (T, x, y, rw) => {
    const { R, box } = T, fy = y + FY, L = rw - 78;
    T.grad(x, y, rw, FY, ['#c4664c', '#b0503e', '#983f33']);
    T.zellige(x, fy - 13, rw, 13, '#2b5fa8', '#e9dcc0', '#e9c46a');
    T.floor(x, fy, rw, '#6e3528', '#8a4636', '#b8664e');
    R(x + 22, fy + 2, rw - 60, 8, '#1d3557'); R(x + 22, fy + 2, rw - 60, 1, '#e9c46a'); R(x + 22, fy + 9, rw - 60, 1, '#e9c46a'); for (let i = 28; i < rw - 44; i += 10) { R(x + i, fy + 5, 4, 2, '#e9c46a'); R(x + i + 1, fy + 4, 2, 4, '#8f1d2c'); } // alfombra
    box(x + 12, fy - 25, L, 13, '#e9c46a', '#fff3b0', '#b8963a'); for (let i = 0; i < L; i += 18) R(x + 12 + i, fy - 25, 1, 13, '#b8963a');
    box(x + 10, fy - 13, L + 4, 10, '#1d7a80', '#35aab0', '#124a4d'); R(x + 12, fy - 3, 3, 3, K); R(x + L + 8, fy - 3, 3, 3, K);
    for (const o of [8, L - 22]) { box(x + 12 + o, fy - 19, 10, 7, '#c1440e', '#ff7a45', '#8a2f0a'); R(x + 16 + o, fy - 16, 2, 2, '#e9c46a'); }
    box(x + 22, y + 8, 16, 18, '#3b2a1a', '#6b4a2e', '#1f150c'); R(x + 24, y + 10, 12, 14, '#e9dcc0'); R(x + 28, y + 12, 4, 9, '#2b5fa8'); R(x + 26, y + 15, 8, 3, '#2b5fa8'); R(x + 29, y + 16, 2, 2, '#e9c46a'); // cuadro: jamsa
    const lx = x + (rw >> 1) + 6; R(lx, y, 1, 8, K); T.glow(lx, y + 14, 12, '#ffd27a'); R(lx - 4, y + 8, 9, 11, K); R(lx - 3, y + 9, 7, 9, '#d4a017'); R(lx - 2, y + 11, 2, 5, '#ff6b6b'); R(lx + 1, y + 11, 2, 5, '#7dd3fc'); R(lx - 1, y + 6, 3, 3, '#d4a017'); R(lx - 2, y + 19, 5, 2, '#d4a017'); // farol
    const tx = x + L + 22; R(tx - 9, fy - 9, 19, 3, K); R(tx - 8, fy - 8, 17, 2, '#d4a017'); R(tx - 8, fy - 8, 17, 1, '#ffe98a'); R(tx - 1, fy - 6, 3, 6, '#6b4a16'); R(tx - 4, fy - 1, 9, 1, '#6b4a16'); // mesita
    R(tx - 3, fy - 15, 7, 6, K); R(tx - 2, fy - 14, 5, 5, '#cfd6dc'); R(tx - 1, fy - 17, 3, 3, '#cfd6dc'); R(tx - 2, fy - 14, 1, 4, '#ffffff');
    box(x + rw - 50, fy - 14, 40, 14, '#3b2a1a', '#6b4a2e', '#1f150c'); R(x + rw - 46, fy - 9, 14, 5, '#2a1c10'); R(x + rw - 28, fy - 9, 14, 5, '#2a1c10');
    box(x + rw - 46, fy - 38, 32, 23, '#15151c', '#3a3a48', '#000000'); R(x + rw - 32, fy - 15, 6, 2, '#15151c');
    T.jar(x + rw - 12, fy - 15, '#c98a3a', '#f0b868', '#8a5a1c'); R(x + rw - 14, fy - 1, 14, 2, '#f2b705');
  },
  // ---- patio ----
  (T, x, y, rw) => {
    const { R, box } = T, fy = y + FY, cx = x + (rw >> 1);
    T.grad(x, y, rw, 30, ['#0c1438', '#14224f', '#1d3168']);
    for (const [sx, sy] of [[10, 6], [34, 14], [62, 5], [88, 17], [120, 8], [150, 13], [22, 20], [104, 4]]) if (sx < rw - 4) R(x + sx, y + sy, 1, 1, sx % 3 ? '#ffffff' : '#b9b6e6');
    T.disc(x + rw - 26, y + 12, 6, '#e9edff'); T.disc(x + rw - 23, y + 10, 5, '#14224f'); // luna creciente
    R(x, y + 24, rw, FY - 24, '#efe4cc'); T.dith(x, y + 44, rw, FY - 44, '#d9c9a3'); R(x, y + 24, rw, 1, K);
    for (let i = 0; i < rw; i += 8) R(x + i, y + 21, 5, 3, '#efe4cc'); T.zellige(x, y + 27, rw, 5, '#2b5fa8', '#f1faee', '#1f7a5c');
    const n = Math.max(3, Math.floor(rw / 44)), gap = rw / n;
    for (let i = 0; i < n; i++) { const ax = Math.round(x + i * gap + gap / 2 - 13); T.arch(ax - 1, y + 34, 28, FY - 34, K); T.arch(ax, y + 35, 26, FY - 35, '#22335f'); T.dith(ax, y + 46, 26, FY - 46, '#16224a'); R(ax - 3, y + 46, 3, FY - 46, '#d9c9a3'); R(ax + 26, y + 46, 3, FY - 46, '#c4b48c'); R(ax - 4, y + 44, 5, 2, '#fff8e6'); R(ax + 25, y + 44, 5, 2, '#fff8e6'); }
    T.floor(x, fy, rw, '#1f6a50', '#2f8a6a', '#7fc9a8');
    box(cx - 22, fy - 7, 44, 7, '#d9d2bd', '#ffffff', '#a39c86'); R(cx - 20, fy - 7, 40, 2, '#3fa7d6'); R(cx - 3, fy - 19, 6, 12, K); R(cx - 2, fy - 19, 4, 12, '#d9d2bd'); R(cx - 2, fy - 19, 1, 12, '#ffffff');
    R(cx - 10, fy - 22, 20, 4, K); R(cx - 9, fy - 21, 18, 2, '#d9d2bd'); R(cx - 8, fy - 22, 16, 1, '#3fa7d6');
    const tx = x + rw - 44; // naranjo
    box(tx - 6, fy - 9, 13, 9, '#b5562b', '#e07a45', '#7a3414'); R(tx - 1, fy - 26, 3, 17, K); R(tx, fy - 26, 1, 17, '#7a4f26');
    for (const [dx, dy, r] of [[0, -36, 10], [-9, -30, 7], [9, -30, 7]]) T.disc(tx + dx, fy + dy, r + 1, K);
    for (const [dx, dy, r, c] of [[0, -36, 10, '#2d6a4f'], [-9, -30, 7, '#2d6a4f'], [9, -30, 7, '#245a42'], [-3, -39, 5, '#3f8f68']]) T.disc(tx + dx, fy + dy, r, c);
    for (const [dx, dy] of [[-6, -34], [4, -40], [8, -29], [-11, -27], [1, -30]]) { R(tx + dx, fy + dy, 3, 3, '#ff9f1c'); R(tx + dx, fy + dy, 1, 1, '#ffd27a'); }
    T.jar(x + rw - 14, fy - 15, '#b5562b', '#e07a45', '#7a3414'); R(x + rw - 18, fy - 1, 16, 2, '#f2b705');
    T.glow(x + 16, fy - 8, 9, '#ffd27a'); R(x + 13, fy - 12, 7, 12, K); R(x + 14, fy - 11, 5, 10, '#d4a017'); R(x + 15, fy - 9, 3, 6, '#ffe9a8'); R(x + 15, fy - 14, 3, 2, '#d4a017'); // farol
  },
  // ---- hanout ----
  (T, x, y, rw) => {
    const { R, box } = T, fy = y + FY, r = rng(5), cols = ['#d62828', '#f4c20d', '#2a9d8f', '#e76f51', '#f1faee', '#2b5fa8', '#6a994e', '#e9c46a', '#c1440e'];
    T.grad(x, y, rw, FY, ['#d9e4cf', '#c6d4bc', '#b1c2a6']);
    T.floor(x, fy, rw, '#8a8578', '#d8d2c0', '#f4efe0');
    const sw = rw - 62;
    box(x + 6, y + 6, sw, 40, '#5e3b1e', '#8a5a2b', '#3b2412');
    for (let s = 0; s < 3; s++) { // estantes con género
      const sy = y + 8 + s * 13; R(x + 7, sy + 11, sw - 2, 2, '#8a5a2b'); R(x + 7, sy + 11, sw - 2, 1, '#b07a40');
      for (let i = 2; i < sw - 6;) { const pw = 3 + (r() * 4 | 0), ph = 5 + (r() * 6 | 0), c = cols[r() * cols.length | 0]; R(x + 7 + i, sy + 11 - ph, pw, ph, c); R(x + 7 + i, sy + 11 - ph, 1, ph, '#ffffff66'); if (pw > 3) R(x + 8 + i, sy + 13 - ph, pw - 2, 2, '#ffffffaa'); i += pw + 1; }
    }
    for (let i = 10; i < rw - 8; i += 7) { R(x + i, y + 2 + Math.round(Math.sin(i * 0.25) * 1.5), 2, 3, i % 3 ? '#f1ede0' : '#8f1d2c'); } R(x, y + 1, rw, 1, '#5e3b1e'); // ristras
    box(x + 14, fy - 16, 46, 16, '#9a6a36', '#c48f55', '#5e3b1e'); box(x + 12, fy - 19, 50, 3, '#f1e3bd', '#ffffff', '#c9b88a'); R(x + 24, fy - 12, 26, 8, '#7a4f26');
    R(x + 20, fy - 27, 1, 8, '#b8bcc4'); R(x + 14, fy - 27, 13, 1, '#b8bcc4'); R(x + 13, fy - 26, 4, 2, '#e9c46a'); R(x + 24, fy - 26, 4, 2, '#e9c46a'); // balanza
    R(x + 44, fy - 28, 9, 9, K); R(x + 45, fy - 27, 7, 8, '#9cc4ff'); R(x + 46, fy - 24, 2, 2, '#d62828'); R(x + 49, fy - 22, 2, 2, '#f4c20d'); R(x + 45, fy - 27, 1, 8, '#ffffff');
    for (const [o, c, hi] of [[70, '#c1121f', '#ff5a5a'], [86, '#e9b21a', '#ffe36e'], [102, '#6a994e', '#a3cf86']]) { if (o > rw - 70) continue; box(x + o, fy - 9, 13, 9, '#c79a5b', '#e6c08a', '#8a6a36'); R(x + o + 1, fy - 12, 11, 3, c); R(x + o + 3, fy - 14, 7, 2, c); R(x + o + 5, fy - 15, 3, 1, c); R(x + o + 3, fy - 14, 2, 1, hi); }
    for (const o of [44, 24]) { const dx = x + rw - o; box(dx, fy - 26, 17, 26, '#2f6fd0', '#7fb0ff', '#1d4a96'); R(dx, fy - 19, 17, 2, '#1d3557'); R(dx, fy - 8, 17, 2, '#1d3557'); R(dx + 3, fy - 16, 11, 6, '#f1faee'); R(dx + 5, fy - 14, 7, 2, '#2d6a4f'); }
    R(x + rw - 27, fy - 6, 3, 2, '#e9c46a'); R(x + rw - 30, fy - 1, 12, 2, '#f2b705');
    const lx = x + (rw >> 1); R(lx, y, 1, 6, K); R(lx - 4, y + 6, 9, 3, K); R(lx - 3, y + 7, 7, 2, '#ffe9a8'); T.glow(lx, y + 12, 9, '#fff6d6');
  },
];

let house = null;
function houseBase(W, H) {
  if (house && house.W === W && house.H === H) return house;
  const hud = new Hud(canvas(W, H)); hud.resize(W, H, 1);
  const T = tools(hud), { R } = T, cx = W / 2;
  const rw = Math.max(126, Math.min(176, (W - 44) / 2 | 0)), hw = rw * 2 + WALL * 3, hh = RH * 2 + WALL * 3;
  const x0 = Math.round(cx - hw / 2), y0 = Math.round((H - hh) / 2) + 6, gy = y0 + hh;
  // calle adoquinada, palmera y farola
  R(0, gy, W, H - gy, '#14102a'); R(0, gy, W, 1, '#3a2f5e');
  for (let j = 0, row = 0; gy + 3 + j < H; j += 5, row++) for (let i = (row % 2) * 6; i < W; i += 12) { R(i, gy + 3 + j, 9, 3, '#1f1840'); R(i, gy + 3 + j, 9, 1, '#2c2356'); }
  const px0 = x0 - 26;
  for (let y = gy - 58; y < gy; y++) { const bx = px0 + Math.round(Math.sin((y - gy) * 0.045) * 3); R(bx - 1, y, 5, 1, K); R(bx, y, 3, 1, (y & 3) ? '#5e3b1e' : '#3b2412'); R(bx, y, 1, 1, '#8a5a2b'); }
  for (let a = 0; a < 8; a++) { const ang = -3.0 + a * 0.42; for (let d = 0; d < 17; d++) { const fx = px0 + Math.round(Math.cos(ang) * d), fy2 = gy - 58 + Math.round(Math.sin(ang) * d * 0.6 + d * d * 0.035); R(fx - 1, fy2 - 1, 4, 3, K); } }
  for (let a = 0; a < 8; a++) { const ang = -3.0 + a * 0.42; for (let d = 0; d < 17; d++) { const fx = px0 + Math.round(Math.cos(ang) * d), fy2 = gy - 58 + Math.round(Math.sin(ang) * d * 0.6 + d * d * 0.035); R(fx, fy2, 2, 1, a % 2 ? '#2d6a4f' : '#3f8f68'); } }
  R(px0 - 1, gy - 60, 4, 4, '#b5562b');
  const lx = x0 + hw + 18; R(lx - 1, gy - 44, 4, 44, K); R(lx, gy - 44, 2, 44, '#2a2a3a'); R(lx, gy - 44, 1, 44, '#4a4a5e'); R(lx - 5, gy - 52, 12, 9, K); R(lx - 4, gy - 51, 10, 7, '#2a2a3a'); R(lx - 2, gy - 3, 6, 3, '#2a2a3a');
  // muros en corte (ladrillo), enlucido exterior y azotea
  R(x0 - 3, y0 - 3, hw + 6, hh + 5, K); T.bricks(x0, y0, hw, hh);
  R(x0 - 2, y0 - 2, 3, hh + 3, '#d9b68a'); R(x0 + hw - 1, y0 - 2, 3, hh + 3, '#b8905e'); R(x0 - 2, y0 - 2, hw + 4, 2, '#e8cfa6'); R(x0 - 2, gy, hw + 4, 2, '#5e3b1e');
  for (let x = x0 - 2; x < x0 + hw + 2; x += 9) { R(x - 1, y0 - 10, 8, 9, K); R(x, y0 - 9, 6, 7, '#d9b68a'); R(x, y0 - 9, 6, 1, '#f1dfc0'); R(x + 5, y0 - 9, 1, 7, '#b8905e'); }
  const ax = x0 + 22; R(ax, y0 - 30, 1, 21, K); R(ax - 4, y0 - 28, 9, 1, K); R(ax - 3, y0 - 24, 7, 1, K); R(ax - 2, y0 - 20, 5, 1, K);            // antena
  const dx = x0 + 52; R(dx, y0 - 16, 2, 8, K); T.disc(dx + 5, y0 - 19, 6, K); T.disc(dx + 5, y0 - 19, 5, '#b8bcc4'); T.disc(dx + 4, y0 - 20, 3, '#e4e7ec'); R(dx + 6, y0 - 20, 4, 1, K); // parabólica
  const tk = x0 + hw - 92; T.box(tk, y0 - 23, 18, 14, '#5a7fa8', '#8fb4d9', '#3a5878'); R(tk + 2, y0 - 9, 2, 2, K); R(tk + 14, y0 - 9, 2, 2, K); R(tk, y0 - 18, 18, 1, '#3a5878'); // depósito
  const pt = x0 + hw - 60; T.box(pt, y0 - 14, 8, 6, '#b5562b', '#e07a45', '#7a3414'); R(pt + 3, y0 - 22, 2, 8, '#3f8f68'); R(pt + 1, y0 - 19, 2, 3, '#3f8f68'); R(pt + 5, y0 - 20, 2, 4, '#2d6a4f'); // cactus
  R(x0 + hw - 44, y0 - 24, 1, 16, K); R(x0 + hw - 12, y0 - 24, 1, 16, K);
  // interiores
  const rooms = [0, 1, 2, 3].map((i) => ({ x: x0 + WALL + (i % 2) * (rw + WALL), y: y0 + WALL + (i >> 1) * (RH + WALL) }));
  rooms.forEach((p, i) => {
    R(p.x - 1, p.y - 1, rw + 2, RH + 2, K); ROOM_PAINT[i](T, p.x, p.y, rw);
    T.dith(p.x, p.y, rw, 2, '#00000066'); R(p.x, p.y, 2, RH, '#00000033'); R(p.x + rw - 2, p.y, 2, RH, '#00000033');
  });
  // tuberías de cobre por dentro de los muros
  const mx = x0 + WALL + rw + (WALL >> 1), my = y0 + WALL + RH + (WALL >> 1);
  const pipeV = (x, ya, yb) => { R(x - 2, ya, 4, yb - ya, K); R(x - 1, ya, 2, yb - ya, '#c67a3c'); R(x - 1, ya, 1, yb - ya, '#f0a868'); };
  const pipeH = (xa, xb, y) => { R(xa, y - 2, xb - xa, 4, K); R(xa, y - 1, xb - xa, 2, '#c67a3c'); R(xa, y - 1, xb - xa, 1, '#f0a868'); };
  pipeV(mx, y0 + 2, gy - 2); pipeH(x0 + 2, x0 + hw - 2, my);
  for (const [jx, jy] of [[mx, my], [mx, y0 + 24], [mx, gy - 24], [x0 + 46, my], [x0 + hw - 46, my]]) { R(jx - 3, jy - 3, 6, 6, K); R(jx - 2, jy - 2, 4, 4, '#e9c46a'); R(jx - 2, jy - 2, 2, 1, '#fff3b0'); }
  house = { W, H, c: hud.c, rw, hw, hh, x0, y0, gy, rooms, mx, my, lampX: lx, lineX: x0 + hw - 44 };
  return house;
}

function drawHouse(hud, t, from, to, k) {
  const B = houseBase(hud.W, hud.H), { rw, rooms, x0, y0, gy, mx, my } = B, T = tools(hud), { R } = T, fr = Math.floor(t * 10);
  hud.clear(); hud.g.drawImage(B.c, 0, 0);
  // cosas que se mueven
  T.glow(B.lampX + 1, gy - 47, 13, 'rgba(255,210,122,0.5)'); R(B.lampX - 3, gy - 50, 8, 5, Math.sin(t * 9) > -0.85 ? '#ffe9a8' : '#b9793f');
  for (let d = 0; d <= 32; d++) R(B.lineX + d, y0 - 23 + Math.round(Math.sin(d / 32 * Math.PI) * 3), 1, 1, K);
  for (const [d, c, hi] of [[5, '#8f1d2c', '#c1440e'], [13, '#1d6f73', '#2a9d8f'], [21, '#e9c46a', '#fff3b0']]) { const sy = y0 - 21 + Math.round(Math.sin(t * 2 + d) * 0.7); R(B.lineX + d - 1, sy - 1, 7, 9, K); R(B.lineX + d, sy, 5, 7, c); R(B.lineX + d, sy, 1, 7, hi); }
  const cat = x0 + 84, tail = Math.round(Math.sin(t * 2) * 2); // el gato en la azotea
  R(cat, y0 - 19, 8, 10, K); R(cat + 1, y0 - 25, 7, 7, K); R(cat + 1, y0 - 27, 2, 2, K); R(cat + 6, y0 - 27, 2, 2, K); for (let i = 0; i < 7; i++) R(cat - 1 - i, y0 - 11 - Math.round(Math.sin(i * 0.5) * (2 + tail)), 2, 2, K);
  if (Math.floor(t * 0.6) % 5) { R(cat + 3, y0 - 22, 1, 2, '#b6ff5c'); R(cat + 6, y0 - 22, 1, 2, '#b6ff5c'); }
  const looped = from !== null && from > to, seen = (i) => i <= to || looped;
  const A = rooms[0], S = rooms[1], P = rooms[2], Hn = rooms[3], walk = (sp, amp, ph = 0) => Math.round(Math.sin(t * sp + ph) * amp);
  if (seen(0)) { // cocina: vapor, destello del bidón y la jadda de ronda
    for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i * 0.33) % 1; R(A.x + 114 + Math.round(Math.sin(q * 6 + i) * 2), A.y + FY - 30 - Math.round(q * 12), 2, 2, q < 0.7 ? '#ffffffaa' : '#ffffff44'); }
    if (fr % 8 < 2) { R(A.x + rw - 12, A.y + FY - 24, 1, 5, '#ffffff'); R(A.x + rw - 14, A.y + FY - 22, 5, 1, '#ffffff'); }
    const jx = A.x + rw * 0.62 + walk(0.7, rw * 0.12); person(R, jx, A.y + FY - 22 - (fr % 4 < 2 ? 1 : 0), '#7d3c98', '#5e2a75', 'scarf', 'belgha');
  }
  if (seen(1)) { // salón: la tele parpadea y jeddi ronca
    const f = Math.floor(t * 5) % 3, tv = ['#7fb2ff', '#a8ccff', '#5f96f0'][f];
    R(S.x + rw - 44, S.y + FY - 36, 28, 19, tv); R(S.x + rw - 44, S.y + FY - 36, 28, 1, '#ffffff88'); R(S.x + rw - 40 + f * 6, S.y + FY - 30, 8, 9, '#ffffff55');
    for (let i = 0; i < 26; i++) T.dith(S.x + rw - 48 - i, S.y + FY - 34 + (i >> 1), 2, 20 - (i >> 2), `rgba(127,178,255,${0.5 - i * 0.017})`, i & 1);
    const sx = S.x + 54; R(sx - 1, S.y + FY - 30, 14, 18, K); R(sx, S.y + FY - 23, 12, 11, '#efe9d8'); R(sx + 9, S.y + FY - 23, 3, 11, '#c9c2ae'); R(sx + 3, S.y + FY - 29, 6, 6, '#c68a5b'); R(sx + 3, S.y + FY - 25, 6, 3, '#f4f1ea'); R(sx + 3, S.y + FY - 32, 6, 3, '#c1121f'); R(sx + 4, S.y + FY - 27, 3, 1, K);
    const z = (t * 0.7) % 1; hud.text('z', sx + 16 + z * 6, S.y + FY - 34 - z * 9, { color: '#fdf6e3' }); if (z > 0.45) hud.text('Z', sx + 24 + z * 4, S.y + FY - 44 - z * 5, { color: '#fdf6e3' });
  }
  if (seen(2)) { // patio: agua de la fuente y gallinas
    const cx = P.x + (rw >> 1), fy = P.y + FY;
    for (let i = 0; i < 6; i++) { const q = (t * 1.6 + i / 6) % 1, sgn = i % 2 ? 1 : -1; R(cx + sgn * Math.round(2 + q * 12), fy - 23 + Math.round(q * q * 15) - Math.round(q * 4), 1, 2, '#bfe9ff'); }
    R(cx - 20 + (fr % 6) * 6, fy - 7, 5, 1, '#bfe9ff'); R(cx - 8 + (fr % 4) * 4, fy - 22, 3, 1, '#bfe9ff');
    chicken(R, P.x + 36 + walk(0.6, 12), fy - 10, Math.sin(t * 3) > 0.5); chicken(R, P.x + rw * 0.68 + walk(0.5, 9, 2), fy - 10, Math.sin(t * 2.3 + 1) > 0.6);
  }
  if (seen(3)) { // hanout: gota del bidón y Si Brahim barriendo
    const q = (t * 0.9) % 1; R(Hn.x + rw - 26, Hn.y + FY - 5 + Math.round(q * 4), 1, 2, '#ffd23f');
    person(R, Hn.x + rw * 0.48 + walk(0.6, rw * 0.1), Hn.y + FY - 22 - (fr % 4 < 2 ? 1 : 0), '#2b5fa8', '#1d4a80', 'cap', 'broom');
  }
  // habitaciones apagadas, rótulos y sellos
  rooms.forEach((p, i) => {
    if (i !== to) { R(p.x, p.y, rw, RH, seen(i) ? 'rgba(10,7,30,0.55)' : 'rgba(8,6,22,0.86)'); }
    if (!seen(i)) { const qx = p.x + (rw >> 1), qy = p.y + (RH >> 1); T.disc(qx, qy, 13, K); T.disc(qx, qy, 12, '#3a3566'); T.disc(qx, qy, 10, '#1a1638'); hud.text('?', qx + 1, qy, { scale: 2, color: '#8f8ac8', outline: null }); return; }
    const w = hud.width(ROOM_NAMES[i]) + 10, on = i === to;
    R(p.x + 3, p.y + 3, w + 2, 13, K); R(p.x + 4, p.y + 4, w, 11, on ? '#b3121d' : '#3a2f6e'); R(p.x + 4, p.y + 4, w, 1, on ? '#ff5a5a' : '#6a5fae'); R(p.x + 4, p.y + 14, w, 1, on ? '#6e0a12' : '#231a4a');
    hud.text(ROOM_NAMES[i], p.x + 9, p.y + 9, { align: 'left', color: on ? '#fff6d6' : '#c9c2f0', outline: null });
    if (i < to && !looped) { const sx = p.x + rw - 54, sy = p.y + 4; R(sx - 1, sy - 1, 52, 15, K); R(sx, sy, 50, 13, '#ffd23f'); R(sx + 2, sy + 2, 46, 9, '#b3121d'); R(sx + 3, sy + 3, 44, 7, '#ffd23f'); hud.text('ROBADO', sx + 25, sy + 6, { color: '#8f1d2c', outline: null }); }
    if (on && k >= 1 && Math.floor(t * 5) % 2) { R(p.x, p.y, rw, 2, '#ffd23f'); R(p.x, p.y + RH - 2, rw, 2, '#ffd23f'); R(p.x, p.y, 2, RH, '#ffd23f'); R(p.x + rw - 2, p.y, 2, RH, '#ffd23f'); }
  });
  const px = R, ctr = (i) => ({ x: rooms[i].x + rw * 0.5, y: rooms[i].y + FY - 4 });
  if (from === null) { // el principio: la familia en su agujero de la cocina
    const hx = A.x, hy = A.y + FY;
    drawRoachSprite(px, hx + 12, hy - 12, 1, Math.floor(t * 3) % 2 ? 0 : 1);
    drawBabySprite(px, hx + 2, hy - 6, 1, fr); drawBabySprite(px, hx + 34, hy - 6 - Math.abs(Math.sin(t * 9)) * 3, -1, fr);
    if (k > 0.25) { const by = hy - 26 - Math.abs(Math.sin(t * 6)) * 2; hud.arrow(hx + 20, by + 4, Math.PI / 2, '#ffd23f', 3); }
    const spot = { x: hx + 24, y: hy - 10 };
    return { room: spot, focus: spot };
  }
  // la mudanza: la cucaracha por las tuberías, con las crías detrás
  const b = ctr(to), a = ctr(from);
  const pts = (from >> 1) === (to >> 1) ? [a, { x: mx, y: a.y }, b]
    : (from % 2) === (to % 2) ? [a, { x: a.x, y: my }, b] : [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = segs.reduce((s, v) => s + v, 0);
  const at = (d) => { d = Math.max(0, d); for (let i = 0; i < segs.length; i++) { if (d <= segs[i] || i === segs.length - 1) { const q = Math.min(1, d / segs[i]); return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * q, y: pts[i].y + (pts[i + 1].y - pts[i].y) * q }; } d -= segs[i]; } };
  const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, done = e * total, moving = k > 0 && k < 1;
  for (let d = 0; d < done - 34; d += 7) { const p = at(d); R(p.x - 1, p.y + 1, 3, 3, K); R(p.x, p.y + 2, 1, 1, '#ffd23f'); }
  const p = at(done), q = at(done + 2), dir = q.x < p.x - 0.01 ? -1 : 1;
  for (const [lag, ph] of [[28, 0], [17, 1]]) { const c = at(done - lag); if (done > lag || !moving) drawBabySprite(px, c.x - 4, c.y - 3 - (moving ? Math.abs(Math.sin(t * 13 + ph)) * 2 : 0), dir, fr + ph); }
  if (moving && fr % 2) R(p.x - dir * 12, p.y + 2, 2, 2, '#e6dcc4');
  drawRoachSprite(px, p.x - 10, p.y - 9 - (moving ? Math.abs(Math.sin(t * 12)) : 0), dir, moving ? fr : 0);
  return { room: { x: b.x, y: b.y - 24 }, focus: { x: p.x, y: p.y - 8 } };
}

let mapHud = null;
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
