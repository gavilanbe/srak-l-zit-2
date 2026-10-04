// HUD a la misma resolución que el juego. El texto se dibuja con una fuente del sistema
// y se le recorta el suavizado para que quede en píxeles duros.
const MONO = '{s}px Menlo, "DejaVu Sans Mono", Consolas, monospace';
export const BOLD = 'bold ' + MONO;
export const ARABIC = 'bold {s}px "Geeza Pro", "Noto Naskh Arabic", "Segoe UI", sans-serif';

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
  frame(x, y, w, h, fill, border = '#0b0b12') { this.rect(x - 1, y - 1, w + 2, h + 2, border); this.rect(x, y, w, h, fill); }

  sprite(str, size, color, font) {
    const key = size + '|' + color + '|' + font + '|' + str;
    let s = this.cache.get(key);
    if (s) return s;
    if (this.cache.size > 500) this.cache.clear();
    const f = font.replace('{s}', size);
    const m = document.createElement('canvas'); let g = m.getContext('2d', { willReadFrequently: true });
    g.font = f;
    const w = Math.ceil(g.measureText(str).width) + 6, h = Math.ceil(size * 1.7) + 4;
    m.width = w; m.height = h; g = m.getContext('2d', { willReadFrequently: true });
    g.font = f; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(str, 3, h / 2);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] > (size < 16 ? 120 : 95) ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a; }
    g.putImageData(img, 0, 0);
    const tint = (col) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d');
      q.drawImage(m, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, w, h);
      return c;
    };
    s = document.createElement('canvas'); s.width = w + 2; s.height = h + 2;
    const o = s.getContext('2d'), dark = tint('#0b0b12');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2], [0, 0], [2, 0], [0, 2], [2, 2], [1, 3]]) o.drawImage(dark, dx, dy);
    o.drawImage(tint(color), 1, 1);
    this.cache.set(key, s);
    return s;
  }

  text(str, x, y, { size = 10, color = '#fff', align = 'center', font = MONO } = {}) {
    const s = this.sprite(String(str), size, color, font);
    const dx = align === 'center' ? x - s.width / 2 : align === 'right' ? x - s.width : x;
    this.g.drawImage(s, Math.round(dx), Math.round(y - s.height / 2));
    return s.width;
  }

  drop(x, y, color = '#ffd23f', dim = false) {
    const rows = [1, 1, 3, 5, 5, 5, 3];
    x = Math.round(x); y = Math.round(y);
    rows.forEach((w, i) => this.rect(x - (w + 2 >> 1), y + i - 1, w + 2, 3, '#0b0b12'));
    rows.forEach((w, i) => this.rect(x - (w >> 1), y + i, w, 1, dim ? '#4a4636' : color));
    if (!dim) this.rect(x - 1, y + 4, 1, 1, '#fff6d6');
  }

  roach(x, y, on = true) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x - 1, y - 1, 9, 6, '#0b0b12');
    this.rect(x, y + 1, 7, 3, on ? '#8a3b16' : '#3a3030'); this.rect(x + 1, y, 5, 5, on ? '#8a3b16' : '#3a3030');
    this.rect(x + 5, y, 2, 2, on ? '#d00000' : '#4a4040');
  }
}
