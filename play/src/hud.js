// HUD a la misma resolución que el juego: texto con fuente de píxeles propia, paneles e iconos.
import { measure, drawGlyphs, CELL_H } from './font.js';

export const INK = '#0b0b12', GOLD = '#ffd23f', CREAM = '#fdf6e3', PANEL = '#17132e', BORDER = '#e9c46a';

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.cache = new Map();
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

  // y es el centro vertical de las mayúsculas
  text(str, x, y, { scale = 1, color = '#fff', align = 'center', outline = INK } = {}) {
    str = String(str);
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

  // ---- paneles ----
  panel(x, y, w, h, { bg = PANEL, border = BORDER } = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    this.rect(x + 1, y, w - 2, h, INK); this.rect(x, y + 1, w, h - 2, INK);
    this.rect(x + 2, y + 1, w - 4, h - 2, border); this.rect(x + 1, y + 2, w - 2, h - 4, border);
    this.rect(x + 3, y + 2, w - 6, h - 4, bg); this.rect(x + 2, y + 3, w - 4, h - 6, bg);
  }

  bar(x, y, w, h, k, color, bg = '#2a2540') {
    this.rect(x - 1, y - 1, w + 2, h + 2, INK); this.rect(x, y, w, h, bg);
    this.rect(x, y, Math.round(w * Math.max(0, Math.min(1, k))), h, color);
  }

  // bocadillo con rabito hacia (ax, ay)
  bubble(lines, ax, ay, { bg = CREAM, color = INK, border = INK, shake = 0 } = {}) {
    const w = Math.max(...lines.map((l) => measure(l))) + 10, h = lines.length * 10 + 7;
    let x = Math.round(ax - w / 2 + (Math.random() - 0.5) * shake), y = Math.round(ay - h - 7 + (Math.random() - 0.5) * shake);
    x = Math.max(3, Math.min(this.W - w - 3, x)); y = Math.max(3, y);
    this.rect(x + 1, y - 1, w - 2, h + 2, border); this.rect(x - 1, y + 1, w + 2, h - 2, border);
    this.rect(x + 1, y, w - 2, h, bg); this.rect(x, y + 1, w, h - 2, bg);
    const tx = Math.max(x + 5, Math.min(x + w - 9, Math.round(ax) - 2));
    for (let i = 0; i < 4; i++) { this.rect(tx + i - 1, y + h + i, 8 - i * 2, 1, border); this.rect(tx + i, y + h + i - 1, 6 - i * 2, 1, bg); }
    lines.forEach((l, i) => this.text(l, x + w / 2, y + 8 + i * 10, { color, outline: null }));
  }

  keycap(label, x, y, on = true) {
    const w = measure(label) + 6;
    this.rect(x, y + 1, w, 11, INK); this.rect(x + 1, y, w - 2, 13, INK);
    this.rect(x + 1, y + 1, w - 2, 9, on ? '#e8e2d0' : '#6a6578'); this.rect(x + 1, y + 10, w - 2, 2, on ? '#a39d8a' : '#45415a');
    this.text(label, x + w / 2, y + 5.5, { color: INK, outline: null });
    return w;
  }

  // ---- iconos ----
  drop(x, y, color = GOLD, dim = false) {
    const rows = [1, 1, 3, 5, 5, 5, 3];
    x = Math.round(x); y = Math.round(y);
    rows.forEach((w, i) => this.rect(x - (w + 2 >> 1), y + i - 1, w + 2, 3, INK));
    rows.forEach((w, i) => this.rect(x - (w >> 1), y + i, w, 1, dim ? '#4a4660' : color));
    if (!dim) this.rect(x - 1, y + 4, 1, 1, '#fff6d6');
  }

  // botella que se llena con el progreso de la noche
  bottle(x, y, k, t) {
    this.rect(x + 3, y, 4, 4, INK); this.rect(x, y + 3, 10, 16, INK);
    this.rect(x + 4, y + 1, 2, 3, '#2d6a4f'); this.rect(x + 1, y + 4, 8, 14, '#2a2540');
    const fill = Math.round(14 * Math.max(0, Math.min(1, k)));
    if (fill > 0) {
      this.rect(x + 1, y + 18 - fill, 8, fill, '#f2b705');
      this.rect(x + 1 + (Math.floor(t * 4) % 2 ? 0 : 4), y + 18 - fill, 4, 1, '#ffe98a');
    }
    this.rect(x + 2, y + 6, 1, 8, 'rgba(255,255,255,0.35)');
  }

  roach(x, y, on = true) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x, y + 1, 10, 5, INK); this.rect(x + 1, y, 8, 7, INK);
    this.rect(x + 1, y + 2, 8, 3, on ? '#a04c1a' : '#3d3850'); this.rect(x + 2, y + 1, 6, 5, on ? '#a04c1a' : '#3d3850');
    this.rect(x + 2, y + 2, 4, 3, on ? '#5e230b' : '#2f2b40');
    this.rect(x + 7, y + 1, 2, 2, on ? '#d00000' : '#55506a');
    if (on) this.rect(x + 8, y + 4, 1, 1, '#fff');
  }

  // ojo de detección: k = 0 cerrado … 1 abierto del todo
  eye(x, y, k, hunt) {
    x = Math.round(x); y = Math.round(y);
    const h = k < 0.15 ? 1 : k < 0.55 ? 3 : 5, c = hunt ? '#ff3b3b' : k > 0.55 ? '#ffb347' : '#fdf6e3';
    this.rect(x - 6, y - (h >> 1) - 1, 12, h + 2, INK); this.rect(x - 7, y - 1, 14, 3, INK);
    this.rect(x - 5, y - (h >> 1), 10, h, c); this.rect(x - 6, y, 12, 1, c);
    if (h > 1) this.rect(x - 1, y - 1, 3, 3, INK);
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

  moon(x, y) { this.rect(x - 1, y - 1, 7, 7, INK); this.rect(x, y, 5, 5, '#e6ecff'); this.rect(x + 2, y, 3, 3, INK); }
  sun(x, y, t) {
    const c = Math.floor(t * 3) % 2 ? '#ffd23f' : '#ffb347';
    this.rect(x - 1, y - 1, 7, 7, INK); this.rect(x, y, 5, 5, c); this.rect(x + 2, y - 2, 1, 1, c); this.rect(x + 2, y + 6, 1, 1, c); this.rect(x - 2, y + 2, 1, 1, c); this.rect(x + 6, y + 2, 1, 1, c);
  }
}
