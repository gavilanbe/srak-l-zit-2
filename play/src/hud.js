// HUD a la misma resolución que el juego: texto con fuente de píxeles propia, marcos de latón
// con relieve, cintas, medidores e iconos. Los marcos se pintan una vez y se guardan.
import { measure, drawGlyphs, CELL_H } from './font.js';

export const INK = '#0b0b12', GOLD = '#ffd23f', CREAM = '#fdf6e3', PANEL = '#1d1642', BORDER = '#e9c46a';
const BR_HI = '#fff3b0', BR = '#e9c46a', BR_LO = '#a8782a', BR_DK = '#5e3d10';

const ICONS = {
  star: ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XXXXX..', '.XXX.XXX.', '.X.....X.'],
  wing: ['.XXXXXX', 'XXXXXXX', '.XXXXXX', '..XXXXX', '...XXX.', '....X..'],
  clock: ['.XXXXX.', 'X..X..X', 'X..X..X', 'X..XX.X', 'X.....X', 'X.....X', '.XXXXX.'],
  eye: ['..XXXXX..', '.X.....X.', 'X..XXX..X', 'X..XXX..X', '.X.....X.', '..XXXXX..'],
  heart: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  skull: ['.XXXXX.', 'XXXXXXX', 'X.XXX.X', 'XXXXXXX', '.XX.XX.', '.XXXXX.', '.X.X.X.'],
};

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.cache = new Map(); this.frames = new Map();
    this.W = 0; this.H = 0;
  }

  resize(W, H, scale) {
    this.W = W; this.H = H;
    this.c.width = W; this.c.height = H;
    this.c.style.width = W * scale + 'px'; this.c.style.height = H * scale + 'px';
    this.g.imageSmoothingEnabled = false;
  }

  clear() { this.g.clearRect(0, 0, this.W, this.H); }
  rect(x, y, w, h, color) { this.g.fillStyle = color; this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---- texto ----
  _tint(mask, color) {
    const c = document.createElement('canvas'); c.width = mask.width; c.height = mask.height;
    const q = c.getContext('2d'); q.drawImage(mask, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = color; q.fillRect(0, 0, c.width, c.height);
    return c;
  }

  _outlined(mask, color, outline) {
    const s = document.createElement('canvas'); s.width = mask.width + 2; s.height = mask.height + 2;
    const o = s.getContext('2d');
    if (outline) { const dark = this._tint(mask, outline); for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2], [0, 0], [2, 0], [0, 2], [2, 2]]) o.drawImage(dark, dx, dy); }
    o.drawImage(this._tint(mask, color), 1, 1);
    return s;
  }

  sprite(str, color, outline) {
    const key = color + '|' + outline + '|' + str;
    let s = this.cache.get(key);
    if (s) return s;
    if (this.cache.size > 700) this.cache.clear();
    const m = document.createElement('canvas'); m.width = Math.max(1, measure(str)); m.height = CELL_H;
    const g = m.getContext('2d'); g.fillStyle = '#fff'; drawGlyphs(g, str, 0, 0);
    s = this._outlined(m, color, outline);
    this.cache.set(key, s);
    return s;
  }

  width(str, scale = 1) { return measure(String(str)) * scale; }

  // y es el centro vertical de las mayúsculas; shadow dibuja una copia desplazada debajo
  text(str, x, y, { scale = 1, color = '#fff', align = 'center', outline = INK, shadow = null } = {}) {
    str = String(str);
    if (shadow) this.text(str, x, y + scale, { scale, color: shadow, align, outline: null });
    const s = this.sprite(str, color, outline), w = s.width * scale;
    const dx = align === 'center' ? x - w / 2 : align === 'right' ? x - w + scale : x - scale;
    this.g.drawImage(s, Math.round(dx), Math.round(y - 6.5 * scale), w, s.height * scale);
    return (s.width - 2) * scale;
  }

  wrap(str, maxW, scale = 1) {
    const lines = []; let line = '';
    for (const word of str.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (line && measure(next) * scale > maxW) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  // texto con fuente del sistema recortada a píxeles duros (solo para el título en árabe)
  sysText(str, x, y, size, color, font) {
    const key = 'sys|' + size + '|' + color + '|' + str;
    let s = this.cache.get(key);
    if (!s) {
      const f = font.replace('{s}', size), m = document.createElement('canvas'); let g = m.getContext('2d', { willReadFrequently: true });
      g.font = f;
      const w = Math.ceil(g.measureText(str).width) + 6, h = Math.ceil(size * 1.7) + 4;
      m.width = w; m.height = h; g = m.getContext('2d', { willReadFrequently: true });
      g.font = f; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(str, 3, h / 2);
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] > 95 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a; }
      g.putImageData(img, 0, 0);
      s = this._outlined(m, color, INK); this.cache.set(key, s);
    }
    this.g.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
  }

  icon(name, x, y, color, outline = INK) {
    const rows = ICONS[name]; x = Math.round(x); y = Math.round(y);
    const pass = (c, ox, oy) => { this.g.fillStyle = c; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') this.g.fillRect(x + i + ox, y + j + oy, 1, 1); }); };
    if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) pass(outline, ox, oy);
    pass(color, 0, 0);
  }

  // ---- marcos ----
  // Marco de latón con relieve, fondo añil con tramado y remaches de zellige en las esquinas.
  // thin: versión fina para las placas del HUD. Se pinta una vez por tamaño.
  _frame(w, h, thin, tone) {
    const key = w + 'x' + h + (thin ? 't' : 'p') + tone;
    let c = this.frames.get(key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = w + 3; c.height = h + 4;
    const g = c.getContext('2d'), R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    const rr = (x, y, ww, hh, col) => { R(x + 2, y, ww - 4, hh, col); R(x, y + 2, ww, hh - 4, col); R(x + 1, y + 1, ww - 2, hh - 2, col); };
    rr(3, 4, w, h, 'rgba(4,3,14,0.5)');                                   // sombra
    rr(0, 0, w, h, INK); rr(1, 1, w - 2, h - 2, BR);                       // contorno y latón
    R(3, 1, w - 6, 1, BR_HI); R(1, 3, 1, h - 6, BR_HI); R(3, h - 2, w - 6, 1, BR_LO); R(w - 2, 3, 1, h - 6, BR_LO);
    const b = thin ? 2 : 4;
    if (!thin) { rr(2, 2, w - 4, h - 4, BR_LO); R(4, 2, w - 8, 1, BR); R(2, 4, 1, h - 8, BR); rr(3, 3, w - 6, h - 6, BR_DK); }
    else rr(2, 2, w - 4, h - 4, BR_DK);
    const ix = b + (thin ? 1 : 0), iw = w - ix * 2, ih = h - ix * 2;      // fondo en tres bandas tramadas
    const cols = tone === 'red' ? ['#4a1220', '#3a0e1a', '#2a0a14'] : ['#2b2160', '#1f1848', '#150f30'];
    for (let j = 0; j < ih; j++) {
      const t = j / ih * 3, i = Math.min(2, Math.floor(t)), edge = t - i > 0.82 && i < 2;
      R(ix, ix + j, iw, 1, cols[i]);
      if (edge) { g.fillStyle = cols[i + 1]; for (let x = (j & 1); x < iw; x += 2) g.fillRect(ix + x, ix + j, 1, 1); }
    }
    R(ix, ix, iw, 1, tone === 'red' ? '#7a2434' : '#4a3f8e');             // brillo interior arriba
    if (!thin && h > 44) { g.fillStyle = tone === 'red' ? '#42101c' : '#261d56'; for (let y = ix + 7; y < h - ix - 4; y += 9) for (let x = ix + 6 + ((y - ix) % 18 ? 5 : 0); x < w - ix - 4; x += 10) { g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1); } }
    if (!thin) for (const [cx, cy] of [[1, 1], [w - 8, 1], [1, h - 8], [w - 8, h - 8]]) { R(cx, cy, 7, 7, INK); R(cx + 1, cy + 1, 5, 5, BR); R(cx + 1, cy + 1, 5, 1, BR_HI); R(cx + 2, cy + 2, 3, 3, '#1f7a5c'); R(cx + 3, cy + 3, 1, 1, '#7fe0c0'); }
    this.frames.set(key, c);
    return c;
  }

  panel(x, y, w, h, { tone = 'blue' } = {}) { this.g.drawImage(this._frame(Math.round(w), Math.round(h), false, tone), Math.round(x), Math.round(y)); }
  plate(x, y, w, h, { tone = 'blue' } = {}) { this.g.drawImage(this._frame(Math.round(w), Math.round(h), true, tone), Math.round(x), Math.round(y)); }

  // cinta con las puntas dobladas; (cx, y) es el centro del borde superior
  ribbon(str, cx, y, { scale = 1, color = '#b3121d', dark = '#6e0a12', light = '#ff5a5a', text = CREAM } = {}) {
    const tw = measure(str) * scale, w = tw + 18 * scale, h = 9 * scale + 6, x = Math.round(cx - w / 2); y = Math.round(y);
    const t = 5 * scale + 2;
    this.rect(x - t, y + 3, t + 4, h, INK); this.rect(x + w - 4, y + 3, t + 4, h, INK);           // puntas
    this.rect(x - t + 1, y + 4, t + 2, h - 2, dark); this.rect(x + w - 3, y + 4, t + 2, h - 2, dark);
    this.rect(x - t + 1, y + 4 + ((h - 2) >> 1) - 1, 3, 3, INK); this.rect(x + w + t - 4, y + 4 + ((h - 2) >> 1) - 1, 3, 3, INK);
    this.rect(x - 1, y - 1, w + 2, h + 2, INK); this.rect(x, y, w, h, color);
    this.rect(x, y, w, 1, light); this.rect(x, y + h - 1, w, 1, dark); this.rect(x + 2, y + 2, w - 4, 1, BR); this.rect(x + 2, y + h - 3, w - 4, 1, BR);
    this.text(str, cx, y + h / 2 + (scale > 1 ? 0.5 : 0), { scale, color: text, outline: null, shadow: dark });
  }

  divider(cx, y, w) { // greca de rombos
    this.rect(cx - w / 2, y, w, 1, BR_LO);
    for (let i = -3; i <= 3; i++) { const x = Math.round(cx + i * 10); this.rect(x - 2, y - 1, 5, 3, INK); this.rect(x - 1, y - 1, 3, 3, i % 2 ? '#2a9d8f' : BR); this.rect(x, y - 2, 1, 5, i % 2 ? '#2a9d8f' : BR); }
  }

  bar(x, y, w, h, k, color, bg = '#120d2a') {
    x = Math.round(x); y = Math.round(y); const f = Math.round(w * Math.max(0, Math.min(1, k)));
    this.rect(x - 1, y - 1, w + 2, h + 2, INK); this.rect(x, y, w, h, bg);
    if (f > 0) { this.rect(x, y, f, h, color); if (h > 2) { this.rect(x, y, f, 1, 'rgba(255,255,255,0.55)'); this.rect(x, y + h - 1, f, 1, 'rgba(0,0,0,0.3)'); } }
  }

  // bocadillo con rabito hacia (ax, ay)
  bubble(lines, ax, ay, { bg = CREAM, color = INK, border = INK, shake = 0 } = {}) {
    const w = Math.max(...lines.map((l) => measure(l))) + 12, h = lines.length * 10 + 8;
    let x = Math.round(ax - w / 2 + (Math.random() - 0.5) * shake), y = Math.round(ay - h - 8 + (Math.random() - 0.5) * shake);
    x = Math.max(4, Math.min(this.W - w - 4, x)); y = Math.max(4, y);
    this.rect(x + 3, y + 3, w, h, 'rgba(4,3,14,0.4)');
    this.rect(x + 2, y - 1, w - 4, h + 2, border); this.rect(x - 1, y + 2, w + 2, h - 4, border); this.rect(x, y, w, h, border);
    this.rect(x + 2, y, w - 4, h, bg); this.rect(x, y + 2, w, h - 4, bg); this.rect(x + 1, y + 1, w - 2, h - 2, bg);
    this.rect(x + 2, y + h - 2, w - 4, 1, 'rgba(0,0,0,0.12)');
    const tx = Math.max(x + 6, Math.min(x + w - 10, Math.round(ax) - 2));
    for (let i = 0; i < 4; i++) { this.rect(tx + i - 1, y + h + i, 8 - i * 2, 1, border); this.rect(tx + i, y + h + i - 1, 6 - i * 2, 1, bg); }
    lines.forEach((l, i) => this.text(l, x + w / 2, y + 9 + i * 10, { color, outline: null }));
  }

  // tecla con relieve; down la hunde un píxel
  keycap(label, x, y, on = true, down = false) {
    const w = measure(label) + 8, d = down ? 1 : 0; x = Math.round(x); y = Math.round(y);
    this.rect(x + 1, y, w - 2, 14, INK); this.rect(x, y + 1, w, 12, INK);
    this.rect(x + 1, y + 11, w - 2, 2, on ? '#8f876c' : '#3a3650');
    this.rect(x + 1, y + 1 + d, w - 2, 10, on ? '#f4eedc' : '#6f6a84'); this.rect(x + 2, y + 1 + d, w - 4, 1, on ? '#ffffff' : '#8f8aa6'); this.rect(x + 1, y + 10 + d, w - 2, 1, on ? '#cfc7ac' : '#55506a');
    this.text(label, x + w / 2, y + 6 + d, { color: on ? '#2a2540' : '#2a2540', outline: null });
    return w;
  }

  // ---- iconos ----
  drop(x, y, color = GOLD, dim = false) {
    const rows = [1, 1, 3, 5, 5, 5, 3];
    x = Math.round(x); y = Math.round(y);
    rows.forEach((w, i) => this.rect(x - (w + 2 >> 1), y + i - 1, w + 2, 3, INK));
    rows.forEach((w, i) => this.rect(x - (w >> 1), y + i, w, 1, dim ? '#3d3760' : color));
    if (!dim) { this.rect(x - 1, y + 4, 1, 1, '#fff6d6'); this.rect(x + 1, y + 5, 1, 1, '#c98a00'); }
  }

  // hueco redondo para una gota cargada
  socket(x, y, full, t = 0) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x + 2, y, 7, 11, INK); this.rect(x, y + 2, 11, 7, INK); this.rect(x + 1, y + 1, 9, 9, INK);
    this.rect(x + 2, y + 1, 7, 9, '#0f0b26'); this.rect(x + 1, y + 2, 9, 7, '#0f0b26'); this.rect(x + 2, y + 9, 7, 1, '#2f2766');
    if (full) this.drop(x + 5, y + 2 + (Math.sin(t * 5 + x) > 0.6 ? -1 : 0));
  }

  // botella que se llena con el zit robado
  bottle(x, y, k, t) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x + 4, y, 6, 6, INK); this.rect(x + 1, y + 5, 12, 21, INK); this.rect(x, y + 7, 14, 17, INK);
    this.rect(x + 5, y + 1, 4, 2, '#8a5a2b'); this.rect(x + 5, y + 3, 4, 3, '#3f8f68');             // corcho y cuello
    this.rect(x + 2, y + 6, 10, 19, '#143d2e'); this.rect(x + 1, y + 8, 12, 15, '#143d2e');
    const fill = Math.round(17 * Math.max(0, Math.min(1, k)));
    if (fill > 0) {
      const top = y + 24 - fill;
      this.rect(x + 2, top, 10, fill, '#f2b705'); if (fill > 2) this.rect(x + 1, Math.max(top, y + 8), 12, Math.min(fill, y + 23 - Math.max(top, y + 8)), '#f2b705');
      this.rect(x + 2 + (Math.floor(t * 4) % 2 ? 0 : 5), top, 5, 1, '#ffe98a'); this.rect(x + 9, top + 2, 2, Math.max(0, fill - 3), '#c98a00');
      if (fill > 6) this.rect(x + 4 + Math.floor(t * 3) % 5, top + 3 + Math.floor(t * 7) % (fill - 4), 1, 1, '#fff6d6');
    }
    this.rect(x + 3, y + 9, 1, 11, 'rgba(255,255,255,0.45)'); this.rect(x + 2, y + 6, 10, 1, '#3f8f68');
  }

  wing(x, y, on) {
    this.icon('wing', x, y, on ? '#7dd3fc' : '#3d3760'); if (on) { this.rect(x + 2, y + 1, 4, 1, '#e0f6ff'); }
  }

  // medidor de ruido: altavoz y de 0 a 3 barras
  noise(x, y, level) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x - 1, y + 2, 4, 6, INK); this.rect(x + 2, y, 4, 10, INK); this.rect(x, y + 3, 2, 4, CREAM); this.rect(x + 3, y + 1, 2, 8, CREAM);
    for (let i = 0; i < 3; i++) { const h = 4 + i * 3, c = i < level ? (level >= 3 ? '#ff5a5a' : level === 2 ? '#ffb347' : '#9be7a0') : '#3d3760'; this.rect(x + 7 + i * 4, y + 9 - h, 4, h + 2, INK); this.rect(x + 8 + i * 4, y + 10 - h, 2, h, c); }
  }

  // ojo de detección: k = 0 cerrado … 1 abierto del todo
  eye(x, y, k, hunt) {
    x = Math.round(x); y = Math.round(y);
    const h = k < 0.15 ? 1 : k < 0.55 ? 3 : 5, c = hunt ? '#ff3b3b' : k > 0.55 ? '#ffb347' : '#fdf6e3';
    this.rect(x - 6, y - (h >> 1) - 1, 12, h + 2, INK); this.rect(x - 7, y - 1, 14, 3, INK);
    this.rect(x - 5, y - (h >> 1), 10, h, c); this.rect(x - 6, y, 12, 1, c);
    if (h > 1) { this.rect(x - 1, y - 1, 3, 3, INK); this.rect(x, y - 1, 1, 1, '#ffffff'); }
  }

  arrow(cx, cy, ang, color, size = 5) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (const [col, grow] of [[INK, 1.6], [color, 0]]) {
      this.g.fillStyle = col;
      for (let y = -size - 2; y <= size + 2; y++) for (let x = -size - 2; x <= size + 2; x++) {
        const u = x * c + y * s, v = -x * s + y * c; // u: a lo largo de la flecha
        if (u <= size + grow && u >= -size - grow && Math.abs(v) <= (size + grow - u) * 0.55) this.g.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1);
      }
    }
  }

  // la noche de un vistazo: cielo que va de la madrugada al amanecer, con la luna avanzando hacia el sol
  skybar(x, y, w, k, t) {
    x = Math.round(x); y = Math.round(y); const h = 9;
    this.rect(x - 2, y - 2, w + 4, h + 4, INK); this.rect(x - 1, y - 1, w + 2, h + 2, BR); this.rect(x - 1, y - 1, w + 2, 1, BR_HI); this.rect(x - 1, y + h, w + 2, 1, BR_LO);
    const cols = ['#0d0b2e', '#1a1048', '#2e1660', '#4f1f70', '#7d2f72', '#c4526a', '#ff9a5a', '#ffd27a'];
    for (let i = 0; i < w; i++) { const q = i / w * (cols.length - 1), a = Math.floor(q), next = q - a > ((i * 7) % 5) / 5; this.rect(x + i, y, 1, h, cols[Math.min(cols.length - 1, a + (next ? 1 : 0))]); }
    for (const [sx, sy] of [[0.06, 2], [0.14, 5], [0.24, 1], [0.33, 6], [0.43, 3], [0.52, 6]]) if (Math.sin(t * 2 + sx * 40) > -0.5) this.rect(x + Math.round(sx * w), y + sy, 1, 1, '#ffffff');
    for (let i = 0; i < w; i += 5) this.rect(x + i, y + h - 2 - ((i * 13) % 3), 4, 3 + ((i * 13) % 3), '#0b0b12');     // tejados
    const sx = x + w - 7; this.rect(sx, y + 3, 7, 4, '#fff6d6'); this.rect(sx + 1, y + 2, 5, 1, '#fff6d6'); this.rect(sx + 2, y + 1, 3, 1, '#ffe98a'); // sol asomando
    this.rect(x, y, Math.round(w * k), h, 'rgba(255,255,255,0.08)');
    const mx = x + Math.round((w - 9) * Math.max(0, Math.min(1, k)));
    this.rect(mx - 1, y - 3, 9, 9, INK); this.rect(mx, y - 2, 7, 7, '#e9edff'); this.rect(mx + 3, y - 2, 4, 4, INK); this.rect(mx + 1, y + 2, 2, 2, '#c9d0f2');
  }

  disc(cx, cy, r, color) { this.g.fillStyle = color; cx = Math.round(cx); cy = Math.round(cy); for (let dy = -r; dy <= r; dy++) { const dx = Math.round(Math.sqrt(r * r - dy * dy)); this.g.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1); } }
  ring(cx, cy, r, color, k = 1) { // circunferencia de un píxel; k < 1 dibuja solo esa fracción, desde arriba y en el sentido del reloj
    this.g.fillStyle = color; cx = Math.round(cx); cy = Math.round(cy); const n = Math.ceil(r * 7);
    for (let i = 0; i < n * k; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; this.g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
  }

  // botón redondo de pantalla táctil, con relieve; down lo hunde
  button(cx, cy, r, { color, light, dark, down = false }) {
    cx = Math.round(cx); cy = Math.round(cy) + (down ? 1 : 0);
    this.disc(cx + 1, cy + 3, r, 'rgba(4,3,14,0.45)'); this.disc(cx, cy, r, INK); this.disc(cx, cy, r - 1, dark); this.disc(cx, cy - (down ? 0 : 2), r - 2, color);
    this.g.fillStyle = light; for (let dy = -(r - 3); dy < -(r >> 1); dy++) { const dx = Math.round(Math.sqrt((r - 3) ** 2 - dy * dy) * 0.7); this.g.fillRect(cx - dx, cy + dy - (down ? 0 : 2), dx * 2, 1); }
  }

  // cortinilla de iris: todo negro menos un círculo de radio r
  iris(cx, cy, r) {
    const { W, H, g } = this; g.fillStyle = INK; cx = Math.round(cx);
    for (let y = 0; y < H; y++) {
      const dy = y - cy;
      if (Math.abs(dy) >= r) { g.fillRect(0, y, W, 1); continue; }
      const dx = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(0, y, Math.max(0, cx - dx), 1); g.fillRect(cx + dx, y, Math.max(0, W - cx - dx), 1);
    }
  }
}
