// Fuente de píxeles propia (5x7, ancho variable). Cada glifo son filas de 'X' y '.'.
// Las filas 0-6 son el cuerpo; las 7-8, los rasgos descendentes.
const SRC = {
  A: '.XXX.|X...X|X...X|XXXXX|X...X|X...X|X...X', B: 'XXXX.|X...X|X...X|XXXX.|X...X|X...X|XXXX.',
  C: '.XXX.|X...X|X....|X....|X....|X...X|.XXX.', D: 'XXXX.|X...X|X...X|X...X|X...X|X...X|XXXX.',
  E: 'XXXXX|X....|X....|XXXX.|X....|X....|XXXXX', F: 'XXXXX|X....|X....|XXXX.|X....|X....|X....',
  G: '.XXX.|X...X|X....|X.XXX|X...X|X...X|.XXXX', H: 'X...X|X...X|X...X|XXXXX|X...X|X...X|X...X',
  I: 'XXX|.X.|.X.|.X.|.X.|.X.|XXX', J: '..XXX|...X.|...X.|...X.|...X.|X..X.|.XX..',
  K: 'X...X|X..X.|X.X..|XX...|X.X..|X..X.|X...X', L: 'X....|X....|X....|X....|X....|X....|XXXXX',
  M: 'X...X|XX.XX|X.X.X|X.X.X|X...X|X...X|X...X', N: 'X...X|XX..X|X.X.X|X..XX|X...X|X...X|X...X',
  O: '.XXX.|X...X|X...X|X...X|X...X|X...X|.XXX.', P: 'XXXX.|X...X|X...X|XXXX.|X....|X....|X....',
  Q: '.XXX.|X...X|X...X|X...X|X.X.X|X..X.|.XX.X', R: 'XXXX.|X...X|X...X|XXXX.|X.X..|X..X.|X...X',
  S: '.XXXX|X....|X....|.XXX.|....X|....X|XXXX.', T: 'XXXXX|..X..|..X..|..X..|..X..|..X..|..X..',
  U: 'X...X|X...X|X...X|X...X|X...X|X...X|.XXX.', V: 'X...X|X...X|X...X|X...X|X...X|.X.X.|..X..',
  W: 'X...X|X...X|X...X|X.X.X|X.X.X|XX.XX|X...X', X: 'X...X|X...X|.X.X.|..X..|.X.X.|X...X|X...X',
  Y: 'X...X|X...X|.X.X.|..X..|..X..|..X..|..X..', Z: 'XXXXX|....X|...X.|..X..|.X...|X....|XXXXX',
  0: '.XXX.|X...X|X..XX|X.X.X|XX..X|X...X|.XXX.', 1: '.X.|XX.|.X.|.X.|.X.|.X.|XXX',
  2: '.XXX.|X...X|....X|...X.|..X..|.X...|XXXXX', 3: 'XXXX.|....X|....X|.XXX.|....X|....X|XXXX.',
  4: '...X.|..XX.|.X.X.|X..X.|XXXXX|...X.|...X.', 5: 'XXXXX|X....|XXXX.|....X|....X|X...X|.XXX.',
  6: '.XXX.|X....|X....|XXXX.|X...X|X...X|.XXX.', 7: 'XXXXX|....X|...X.|..X..|..X..|..X..|..X..',
  8: '.XXX.|X...X|X...X|.XXX.|X...X|X...X|.XXX.', 9: '.XXX.|X...X|X...X|.XXXX|....X|....X|.XXX.',
  a: '.....|.....|.XXX.|....X|.XXXX|X...X|.XXXX', b: 'X....|X....|XXXX.|X...X|X...X|X...X|XXXX.',
  c: '....|....|.XXX|X...|X...|X...|.XXX', d: '....X|....X|.XXXX|X...X|X...X|X...X|.XXXX',
  e: '.....|.....|.XXX.|X...X|XXXXX|X....|.XXX.', f: '..XX|.X..|XXXX|.X..|.X..|.X..|.X..',
  g: '.....|.....|.XXXX|X...X|X...X|X...X|.XXXX|....X|.XXX.', h: 'X....|X....|XXXX.|X...X|X...X|X...X|X...X',
  i: 'X|.|X|X|X|X|X', j: '.X|..|.X|.X|.X|.X|.X|.X|X.',
  k: 'X...|X...|X..X|X.X.|XX..|X.X.|X..X', l: 'X.|X.|X.|X.|X.|X.|.X',
  m: '.....|.....|XX.X.|X.X.X|X.X.X|X.X.X|X.X.X', n: '.....|.....|XXXX.|X...X|X...X|X...X|X...X',
  o: '.....|.....|.XXX.|X...X|X...X|X...X|.XXX.', p: '.....|.....|XXXX.|X...X|X...X|X...X|XXXX.|X....|X....',
  q: '.....|.....|.XXXX|X...X|X...X|X...X|.XXXX|....X|....X', r: '....|....|X.XX|XX..|X...|X...|X...',
  s: '....|....|.XXX|X...|.XX.|...X|XXX.', t: '.X..|.X..|XXXX|.X..|.X..|.X..|..XX',
  u: '.....|.....|X...X|X...X|X...X|X...X|.XXXX', v: '.....|.....|X...X|X...X|X...X|.X.X.|..X..',
  w: '.....|.....|X...X|X...X|X.X.X|X.X.X|.X.X.', x: '.....|.....|X...X|.X.X.|..X..|.X.X.|X...X',
  y: '.....|.....|X...X|X...X|X...X|X...X|.XXXX|....X|.XXX.', z: '.....|.....|XXXXX|...X.|..X..|.X...|XXXXX',
  '.': '.|.|.|.|.|.|X', ',': '..|..|..|..|..|..|.X|.X|X.', '!': 'X|X|X|X|X|.|X', '¡': 'X|.|X|X|X|X|X',
  '?': '.XXX.|X...X|....X|...X.|..X..|.....|..X..', '¿': '..X..|.....|..X..|.X...|X....|X...X|.XXX.',
  ':': '.|.|X|.|.|X|.', '-': '...|...|...|XXX|...|...|...', '+': '...|...|.X.|XXX|.X.|...|...',
  '/': '....X|...X.|...X.|..X..|.X...|.X...|X....', '·': '.|.|.|X|.|.|.', "'": 'X|X|.|.|.|.|.',
  '(': '.X|X.|X.|X.|X.|X.|.X', ')': 'X.|.X|.X|.X|.X|.X|X.', '>': '...|X..|.X.|..X|.X.|X..|...',
  '<': '...|..X|.X.|X..|.X.|..X|...', '%': 'XX..X|XX.X.|...X.|..X..|.X...|.X.XX|X..XX', '*': '.....|X.X.X|.XXX.|XXXXX|.XXX.|X.X.X|.....',
  'í': '.X|..|X.|X.|X.|X.|X.',
};

export const GLYPHS = {};
for (const [ch, rows] of Object.entries(SRC)) { const r = rows.split('|'); GLYPHS[ch] = { rows: r, w: r[0].length, y: 0 }; }
for (const [acc, base] of [['á', 'a'], ['é', 'e'], ['ó', 'o'], ['ú', 'u'], ['ñ', 'n']]) {
  const r = [...GLYPHS[base].rows]; r[0] = acc === 'ñ' ? '.XXX.' : '...X.';
  GLYPHS[acc] = { rows: r, w: 5, y: 0 };
}
for (const [acc, base] of [['Á', 'A'], ['É', 'E'], ['Í', 'I'], ['Ó', 'O'], ['Ú', 'U'], ['Ñ', 'N']]) {
  const g = GLYPHS[base], top = acc === 'Ñ' ? '.XXX.' : g.w === 3 ? '..X' : '...X.';
  GLYPHS[acc] = { rows: [top, '.'.repeat(g.w), ...g.rows], w: g.w, y: -2 };
}

export const PAD_TOP = 2, CELL_H = 11; // 2 filas para tildes de mayúscula + 9 de glifo

export function measure(str) {
  let w = 0;
  for (const ch of str) w += (ch === ' ' ? 3 : (GLYPHS[ch] || GLYPHS['?']).w) + 1;
  return Math.max(0, w - 1);
}

export function drawGlyphs(g, str, x, y) {
  for (const ch of str) {
    if (ch === ' ') { x += 4; continue; }
    const gl = GLYPHS[ch] || GLYPHS['?'];
    for (let r = 0; r < gl.rows.length; r++) {
      const row = gl.rows[r];
      for (let c = 0; c < row.length; c++) if (row[c] === 'X') g.fillRect(x + c, y + PAD_TOP + gl.y + r, 1, 1);
    }
    x += gl.w + 1;
  }
}
