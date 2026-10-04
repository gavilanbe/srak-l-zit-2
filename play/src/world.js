// Los cuatro escenarios de la casa (cocina, salón, patio y hanout). Todos comparten el mismo
// rectángulo de suelo; solo uno está visible a la vez. Los muebles con hueco debajo son escondites.
import { THREE, toon, basic, box, cyl, sph, plane, put, canvasTex } from './gfx.js';

export const ROOM = { x0: -15, x1: 15, z0: -10, z1: 10 };
const SHADE = new THREE.MeshBasicMaterial({ color: '#0a0820', transparent: true, opacity: 0.3, depthWrite: false });
const cone = (r, h, color, seg = 10) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toon(color)); m.castShadow = true; return m; };

// ---------- texturas ----------
function zellige(star, inner, corner, bg, line) {
  return (g) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = Math.abs(x - 15.5), dy = Math.abs(y - 15.5);
      const cx = Math.min(x, 31 - x) + 0.5, cy = Math.min(y, 31 - y) + 0.5;
      let c = bg;
      if (x === 0 || y === 0) c = line;
      if (cx + cy <= 7) c = corner;
      if (Math.min(dx + cy, dy + cx) <= 3) c = inner;
      if (Math.max(dx, dy) <= 7 || dx + dy <= 10) c = star;
      if (Math.max(dx, dy) <= 3.5) c = inner;
      if (dx + dy <= 2) c = bg;
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
  };
}

function rugTex(base, border, inner) {
  return (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = border; g.fillRect(2, 2, w - 4, 1); g.fillRect(2, h - 3, w - 4, 1); g.fillRect(2, 2, 1, h - 4); g.fillRect(w - 3, 2, 1, h - 4);
    g.fillStyle = inner; g.fillRect(5, 5, w - 10, h - 10);
    g.fillStyle = base; g.fillRect(7, 7, w - 14, h - 14);
    for (let i = 0; i < 5; i++) { // rombos amazigh
      const cx = 12 + i * 10, cy = h / 2;
      for (let y = -7; y <= 7; y++) for (let x = -4; x <= 4; x++) {
        const d = Math.abs(x) * 1.75 + Math.abs(y);
        if (d <= 7) { g.fillStyle = d <= 2 ? border : d <= 5 ? '#f1faee' : inner; g.fillRect(cx + x, cy + y, 1, 1); }
      }
    }
    g.fillStyle = '#f1faee';
    for (let x = 1; x < w; x += 3) { g.fillRect(x, 0, 1, 1); g.fillRect(x, h - 1, 1, 1); } // flecos
  };
}

function shelfTex(g, w, h) { // estantes llenos de latas y paquetes
  g.fillStyle = '#4a2f18'; g.fillRect(0, 0, w, h);
  const cols = ['#d62828', '#f4c20d', '#2a9d8f', '#e76f51', '#f1faee', '#2b5fa8', '#6a994e', '#e9c46a', '#c1440e'];
  for (let r = 0; r < 4; r++) {
    const y0 = r * 12;
    g.fillStyle = '#7a5230'; g.fillRect(0, y0 + 11, w, 1);
    for (let x = 1; x < w - 2;) {
      const pw = 2 + (Math.random() * 3 | 0), ph = 5 + (Math.random() * 5 | 0);
      g.fillStyle = cols[Math.random() * cols.length | 0]; g.fillRect(x, y0 + 11 - ph, pw, ph);
      if (pw > 2) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 1, y0 + 13 - ph, pw - 2, 1); }
      x += pw + 1;
    }
  }
}

function checkerTex(a, b) {
  return (g) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x * 16, y * 16, 16, 1); g.fillRect(x * 16, y * 16, 1, 16); } };
}

// ---------- piezas comunes ----------
function kit(root) {
  const L = { root, colliders: [], covers: [], oil: [], doorGlow: { visible: false } };
  const K = {
    L,
    add: (o, x, y, z) => put(root, o, x, y, z),
    solid: (x0, x1, z0, z1) => L.colliders.push({ x0, x1, z0, z1 }),
    round: (x, z, r) => L.colliders.push({ x, z, r }),

    floor(tex, side = '#4a3828') {
      K.add(box(30, 0.8, 20, side), 0, -0.41, 0);
      const f = K.add(plane(30, 20, toon('#ffffff', tex)), 0, 0, 0); f.rotation.x = -Math.PI / 2; f.castShadow = false;
    },

    walls(color, band, trim = '#14532d') {
      K.add(box(0.6, 7, 20.6, color), -15.3, 3.5, -0.3);
      K.add(box(30, 7, 0.6, color), 0, 3.5, -10.3);
      if (!band) return;
      const bandX = canvasTex(32, 32, band, 10, 1.25), bandZ = canvasTex(32, 32, band, 15, 1.25);
      const bx = K.add(plane(20, 2.5, toon('#ffffff', bandX)), -14.99, 1.25, 0); bx.rotation.y = Math.PI / 2; bx.castShadow = false;
      K.add(plane(30, 2.5, toon('#ffffff', bandZ)), 0, 1.25, -9.99).castShadow = false;
      K.add(box(0.12, 0.18, 20, trim), -14.95, 2.6, 0);
      K.add(box(30, 0.18, 0.12, trim), 0, 2.6, -9.95);
    },

    rug(x, z, w, d, tex) { const r = K.add(plane(w, d, toon('#ffffff', canvasTex(64, 40, tex))), x, 0.012, z); r.rotation.x = -Math.PI / 2; r.castShadow = false; },

    cover(id, x0, x1, z0, z1, h, top) { // escondite: zona + lo que se aparta para dejar ver + sombra pintada
      const w = x1 - x0, d = z1 - z0, decal = K.add(plane(w, d, SHADE), (x0 + x1) / 2, 0.02, (z0 + z1) / 2);
      decal.rotation.x = -Math.PI / 2; decal.visible = false;
      L.covers.push({ id, x0, x1, z0, z1, h, top, under: false, low: h < 2.5, decal });
    },

    table(x, z, w, d, h, color, leg = 0.4, id = '') {
      const top = new THREE.Group(); root.add(top);
      put(top, box(w, 0.3, d, color), x, h - 0.15, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const lx = x + sx * (w / 2 - leg / 2 - 0.15), lz = z + sz * (d / 2 - leg / 2 - 0.15);
        K.add(box(leg, h - 0.3, leg, color), lx, (h - 0.3) / 2, lz);
        K.solid(lx - leg / 2, lx + leg / 2, lz - leg / 2, lz + leg / 2);
      }
      K.cover(id, x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, top);
      return top;
    },

    roundTable(x, z, r, h, color, id) {
      const top = new THREE.Group(); root.add(top);
      put(top, cyl(r, r, 0.14, color, 14), x, h, z);
      for (const a of [0, 2.1, 4.2]) {
        const lx = x + Math.cos(a) * r * 0.62, lz = z + Math.sin(a) * r * 0.62;
        K.add(box(0.2, h - 0.05, 0.2, '#6b4a16'), lx, (h - 0.05) / 2, lz); K.solid(lx - 0.1, lx + 0.1, lz - 0.1, lz + 0.1);
      }
      K.cover(id, x - r * 0.75, x + r * 0.75, z - r * 0.75, z + r * 0.75, h, top);
      return top;
    },

    teaSet(top, x, y, z) {
      put(top, sph(0.4, '#cfd6dc', 8, 6), x, y + 0.4, z); put(top, cone(0.2, 0.36, '#cfd6dc', 8), x, y + 0.88, z);
      put(top, box(0.5, 0.1, 0.1, '#cfd6dc'), x + 0.42, y + 0.5, z).rotation.z = 0.5;
      for (const [gx, gz, c] of [[0.8, -0.3, '#2a9d8f'], [0.75, 0.5, '#e76f51'], [0.3, 0.8, '#e9c46a']]) put(top, cyl(0.13, 0.11, 0.34, c, 6), x + gx, y + 0.17, z + gz);
    },

    hole(z) { // el agujero de casa, en la pared izquierda
      L.hole = { x: -14.2, z };
      const h = K.add(cyl(0.8, 0.8, 0.1, basic('#0d0705'), 12), -14.97, 0, z); h.rotation.z = Math.PI / 2; h.castShadow = false;
    },

    door(x, color, dark) {
      K.add(box(3, 5.4, 0.25, color), x, 2.7, -9.9);
      K.add(cyl(1.5, 1.5, 0.25, color, 14), x, 5.4, -9.9).rotation.x = Math.PI / 2;
      K.add(box(0.12, 5.4, 0.3, dark), x, 2.7, -9.86);
      K.add(sph(0.14, '#e9c46a'), x - 0.5, 2.8, -9.72);
      L.doorGlow = K.add(box(2.9, 0.14, 0.12, basic('#ffd27a')), x, 0.07, -9.74); L.doorGlow.castShadow = false; L.doorGlow.visible = false;
    },

    jar(x, z, s = 1, color = '#b5562b') { // tinaja de barro
      K.add(sph(1, color, 10, 7), x, 1.15 * s, z).scale.set(0.95 * s, 1.2 * s, 0.95 * s);
      K.add(cyl(0.45 * s, 0.6 * s, 0.5 * s, color, 10), x, 2.3 * s, z); K.add(cyl(0.5 * s, 0.5 * s, 0.1 * s, '#8f3f1c', 10), x, 2.58 * s, z);
      K.round(x, z, 0.95 * s);
    },

    puddle(x, z, r) { K.add(cyl(r, r, 0.03, basic('#f2b705'), 14), x, 0.02, z).castShadow = false; },

    graph(nodes, edges) {
      L.nodes = nodes.map(([x, z]) => ({ x, z }));
      L.adj = L.nodes.map(() => []);
      for (const [a, b] of edges) { L.adj[a].push(b); L.adj[b].push(a); }
    },
  };
  return K;
}

// ---------- 1. la cocina de la jadda ----------
function cocina(K) {
  const { L, add, solid, round } = K;
  K.floor(canvasTex(32, 32, zellige('#2b5fa8', '#e9c46a', '#b5532a', '#eadfc6', '#cdbf9f'), 15, 10));
  K.walls('#e3c79c', zellige('#1f7a5c', '#f1faee', '#1d3557', '#e9d8a6', '#c9b47f'));
  K.door(9.5, '#1d6f73', '#0f4447');
  L.windowMat = basic('#9db8ff');                                   // ventana con la luna
  add(box(0.1, 2.2, 2.4, L.windowMat), -14.96, 4.9, -5).castShadow = false;
  const warch = add(cyl(1.2, 1.2, 0.1, L.windowMat, 14), -14.96, 6.0, -5); warch.rotation.z = Math.PI / 2; warch.castShadow = false;
  add(box(0.14, 3.4, 0.12, '#3b2a1a'), -14.9, 5.4, -5); add(box(0.14, 0.12, 2.4, '#3b2a1a'), -14.9, 4.9, -5);
  K.hole(6);

  add(box(2.2, 3, 9.5, '#2a9d8f'), -13.9, 1.5, -5.25);              // encimera
  add(box(2.4, 0.25, 9.7, '#e9d8a6'), -13.9, 3.12, -5.25);
  for (const z of [-8.6, -6.3, -4, -1.8]) add(box(0.08, 0.5, 0.12, '#e9c46a'), -12.78, 2.2, z);
  solid(-15, -12.8, -10, -0.5);
  add(box(2.5, 6, 2.4, '#e4e4dc'), -9.25, 3, -8.8);                  // nevera
  add(box(2.52, 0.08, 2.42, '#9a9a94'), -9.25, 3.9, -8.8); add(box(0.12, 1.2, 0.12, '#8a8a84'), -8.3, 4.8, -7.55);
  solid(-10.5, -8, -10, -7.6);
  add(sph(0.85, '#f1ede0', 8, 6), -6.5, 0.6, -8.9).scale.set(1, 0.95, 0.9); round(-6.5, -8.9, 0.85); // saco de harina
  add(box(3, 3, 2.2, '#d6d6d0'), -3, 1.5, -8.9);                     // cocina
  add(box(3.02, 0.12, 2.22, '#2b2b2b'), -3, 3.05, -8.9); add(box(2.2, 1.3, 0.1, '#33373d'), -3, 1.3, -7.78);
  add(cyl(0.7, 0.55, 0.3, '#b5562b', 10), -3.6, 3.26, -8.9); add(cone(0.62, 0.95, '#c4622d'), -3.6, 3.88, -8.9);
  solid(-4.5, -1.5, -10, -7.8);
  add(cyl(0.75, 0.75, 1.9, '#2f6fd0', 10), 0.2, 0.95, -8.8);         // butano
  add(cyl(0.4, 0.7, 0.4, '#2f6fd0', 10), 0.2, 2.1, -8.8); add(cyl(0.45, 0.45, 0.14, '#c8c8c8', 8), 0.2, 2.35, -8.8);
  round(0.2, -8.8, 0.8);

  K.rug(-2, 1, 11, 7, rugTex('#8f1d2c', '#e9c46a', '#1d3557'));
  const t = K.table(-2, 1, 8, 4.5, 3, '#8a5a2b', 0.45, 'mesa');
  put(t, cyl(0.85, 0.65, 0.3, '#b5562b', 10), -3.6, 3.15, 1); put(t, cone(0.75, 1.1, '#c4622d'), -3.6, 3.85, 1);
  put(t, cyl(1.1, 1.1, 0.08, '#cfd6dc', 12), -0.6, 3.04, 0.8); K.teaSet(t, -0.9, 3.05, 0.7);
  put(t, sph(0.75, '#d9a441', 10, 6), 0.9, 3.1, 1.6).scale.y = 0.3; put(t, sph(0.75, '#cf9838', 10, 6), 1.2, 3.25, 1.3).scale.y = 0.3;
  K.table(-7.7, 1.2, 1.6, 1.6, 1.8, '#b5651d', 0.25, 'taburete1');
  K.table(0.5, -3.4, 1.6, 1.6, 1.8, '#b5651d', 0.25, 'taburete2');
  const bench = K.table(8.9, 7.2, 6.8, 2.2, 1.5, '#5e3b1e', 0.35, 'sedari');
  put(bench, box(6.6, 0.4, 2.0, '#c1440e'), 8.9, 1.7, 7.2);
  for (const [cx, c] of [[6.6, '#264653'], [8.9, '#e9c46a'], [11.2, '#264653']]) put(bench, box(1.5, 0.45, 1.5, c), cx, 2.1, 7.2);
  const tea = K.roundTable(10.5, 2.5, 1.6, 1.3, '#d4a017', 'te');
  put(tea, sph(0.36, '#cfd6dc', 8, 6), 10.5, 1.7, 2.5); put(tea, cone(0.18, 0.34, '#cfd6dc', 8), 10.5, 2.12, 2.5);

  const bidon = new THREE.Group(); L.root.add(bidon);               // el bidón de zit
  put(bidon, box(1.3, 1.9, 1.0, '#d4a80f'), 0, 0.95, 0); put(bidon, box(1.0, 0.9, 1.04, '#2d6a4f'), 0, 0.95, 0);
  put(bidon, box(0.5, 0.3, 1.06, '#f1faee'), 0, 1.0, 0); put(bidon, cyl(0.2, 0.2, 0.3, '#2d6a4f', 8), -0.3, 2.05, 0);
  put(bidon, box(0.5, 0.14, 0.2, '#d4a80f'), 0.3, 2.0, 0);
  bidon.position.set(13.7, 0, 8.3); bidon.rotation.y = 0.5; round(13.7, 8.3, 0.85); K.puddle(13.5, 8.0, 1.35);
  L.oil.push({ x: 13.6, z: 8.2, r: 2.0, rate: 1.0 });

  const bottle = L.bottle = new THREE.Group(); L.root.add(bottle);  // botella junto a la puerta (2.ª noche)
  put(bottle, cyl(0.4, 0.4, 1.3, '#3a7d44', 8), 0, 0.65, 0); put(bottle, cyl(0.14, 0.34, 0.5, '#3a7d44', 8), 0, 1.5, 0);
  put(bottle, cyl(0.16, 0.16, 0.14, '#e9c46a', 8), 0, 1.8, 0);
  put(bottle, cyl(0.9, 0.9, 0.03, basic('#f2b705'), 12), 0.2, 0.02, 0.5).castShadow = false;
  bottle.position.set(3.0, 0, -8.9);
  L.bottleCollider = { x: 3.0, z: -8.9, r: 0.5, off: true }; L.colliders.push(L.bottleCollider);
  L.oil.push({ x: 3.1, z: -8.6, r: 1.6, rate: 0.85, bottle: true });

  K.graph([[9.5, -7.8], [5, -6.3], [-5.5, -5.6], [-10.8, -3.6], [-10.2, 6], [0, 7.2], [5.6, 1.6], [12.6, -3]],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [6, 7], [7, 0], [1, 7]]);
  return Object.assign(L, {
    name: 'LA COCINA', theme: 'cocina', short: 'COCINA', enemy: 'jadda', look: 'jadda', who: 'la jadda',
    sub: 'La jadda guarda el zit. Y tiene el sueño ligero.',
    dropSpots: [[-10, -2], [-5, -4.8], [3.5, 4.8], [7.5, -3], [12.5, -7], [13.3, 4.6], [-12, 2.6], [2.6, 8.8], [6.5, -8.6], [-8.5, 8.4], [4.2, -1]],
    plateSpots: [[-6, 6.6], [4.2, -1.4], [7.8, -5.4], [-10.6, -1.4], [1.6, 5.4], [12.8, -5.6], [5.4, 9], [-3, -6]],
    catSpots: [[-4.6, 5.6], [3.8, 3.4], [6.8, -3.4], [-7.4, -4.4], [11.6, 5.2], [0.4, -6]],
    glueSpots: [[6.6, 4.2], [-9.2, 5.6], [11.8, -1.2], [-3, -4.4], [3.4, 8.6]],
    palette: { bg: '#090b16', moon: '#7f9be6', moonI: 1.7, tint: '#b9c8ff' },
  });
}

// ---------- 2. el salón, con jeddi dormido delante de la tele ----------
function salon(K) {
  const { L, add, solid, round } = K;
  K.floor(canvasTex(32, 32, zellige('#9c4a2f', '#e9c46a', '#3a5a40', '#dcc39a', '#c4a274'), 15, 10));
  K.walls('#a8483a', zellige('#2b5fa8', '#f1faee', '#e9c46a', '#e9dcc0', '#c9b47f'), '#e9c46a');
  K.hole(7);
  K.rug(-1, 1, 15, 9.5, rugTex('#1d3557', '#e9c46a', '#8f1d2c'));

  const sa = K.table(-13.75, -3, 2.3, 10, 1.5, '#5e3b1e', 0.3, 'sedariA');     // sedaris pegados a la pared
  put(sa, box(2.1, 0.45, 9.8, '#1d6f73'), -13.75, 1.72, -3); put(sa, box(0.5, 1.2, 9.8, '#e9c46a'), -14.6, 2.5, -3);
  for (const z of [-6, -3, 0]) put(sa, box(1.2, 0.4, 1.2, '#c1440e'), -13.5, 2.1, z);
  const sb = K.table(-3, -8.75, 11, 2.3, 1.5, '#5e3b1e', 0.3, 'sedariB');
  put(sb, box(10.8, 0.45, 2.1, '#1d6f73'), -3, 1.72, -8.75); put(sb, box(10.8, 1.2, 0.5, '#e9c46a'), -3, 2.5, -9.6);
  for (const x of [-7, -3, 1]) put(sb, box(1.2, 0.4, 1.2, '#c1440e'), x, 2.1, -8.5);

  add(box(4, 1.6, 1.4, '#3b2a1a'), 10, 0.8, -9.2); solid(8, 12, -10, -8.5);    // la tele
  add(box(3.3, 2.1, 0.2, '#15151c'), 10, 2.75, -9.3);
  L.tvMat = basic('#7fb2ff'); add(box(2.95, 1.75, 0.06, L.tvMat), 10, 2.75, -9.17).castShadow = false;
  L.tvLight = new THREE.PointLight('#6fa8ff', 14, 16, 1.4); L.tvLight.position.set(9.6, 2.6, -7.2); L.root.add(L.tvLight);
  add(box(2.4, 5, 1.2, '#5e3b1e'), 5.2, 2.5, -9.4); solid(4, 6.4, -10, -8.8);   // librería
  for (const [y, c] of [[1.2, '#c1440e'], [2.4, '#1d6f73'], [3.6, '#e9c46a']]) add(box(2.0, 0.7, 0.2, c), 5.2, y, -8.78);

  add(box(2.6, 1.0, 2.6, '#7a2a2a'), 3, 0.5, 1.5); add(box(0.6, 2.6, 2.6, '#7a2a2a'), 4.1, 1.3, 1.9).rotation.y = -0.6; // sillón de jeddi
  round(3, 1.5, 1.55);
  L.enemyPos = { x: 3, z: 1.5, y: 0.7, face: -0.95 };

  const rt = K.roundTable(-5, -2.2, 2.2, 1.3, '#d4a017', 'bandeja'); K.teaSet(rt, -5, 1.37, -2.2);
  const st2 = K.table(8.2, 5, 2.6, 2.6, 1.6, '#6b4a16', 0.25, 'mesita');
  put(st2, cyl(0.3, 0.4, 0.9, '#d4a017', 6), 8.2, 2.05, 5); put(st2, cone(0.4, 0.5, '#d4a017', 6), 8.2, 2.75, 5);
  for (const [x, z] of [[-1.5, 4.6], [-8, 4.8], [7.2, -3.6]]) { add(cyl(0.85, 0.95, 0.9, '#b5651d', 10), x, 0.45, z); add(cyl(0.7, 0.7, 0.1, '#e9c46a', 10), x, 0.95, z); round(x, z, 0.95); } // pufs
  add(cyl(0.7, 0.5, 1.0, '#b5562b', 10), 13.2, 0.5, -4); add(sph(1.0, '#2d6a4f', 8, 6), 13.2, 1.8, -4); round(13.2, -4, 0.8);
  add(cyl(0.35, 0.45, 1.2, '#d4a017', 6), -11.6, 0.6, 8.4); round(-11.6, 8.4, 0.5);                     // farol
  const lamp = new THREE.PointLight('#ffb347', 5, 7, 1.6); lamp.position.set(-11.6, 1.4, 8.4); L.root.add(lamp);

  K.jar(12.9, 7.7, 1, '#c98a3a'); K.puddle(12.2, 7.2, 1.3);                                                // tinaja de argán
  L.oil.push({ x: 12.3, z: 7.2, r: 2.1, rate: 1.0 });
  K.graph([[3, 1.5]], []);
  return Object.assign(L, {
    name: 'EL SALÓN', theme: 'salon', short: 'SALÓN', enemy: 'sleeper', look: 'jeddi', who: 'jeddi',
    sub: 'Jeddi duerme con la tele puesta. No hagas ruido.',
    capThreat: 'Jeddi ronca delante de la tele. El ruido lo despierta.', capOil: 'Al fondo, la tinaja de aceite de argán.',
    dropSpots: [[-9, -4], [1, -5.5], [8.5, 0.5], [12, -1], [-6, 7.5], [0, 7], [5, 8.5], [-10.5, 2], [9.5, -5.5], [-2, 1.5]],
    plateSpots: [[-9.5, 6.8], [0.5, -3.5], [6.8, -6.2], [11.6, 2], [4, 6.5], [-7, -5.5], [6.5, 2.2]],
    catSpots: [[-6, 2.5], [8, 1.5], [9.5, -4.5], [1, 6.5], [-9.5, -5]],
    glueSpots: [[-4.5, 6.2], [6.2, -1], [10.5, 5.8], [0.2, 3.6], [-10, 4]],
    palette: { bg: '#0d0812', moon: '#8a7fd0', moonI: 1.2, tint: '#c9bfff' },
  });
}

// ---------- 3. el patio del riad: gallinas sueltas ----------
function patio(K) {
  const { L, add, solid, round } = K;
  K.floor(canvasTex(32, 32, zellige('#1f7a5c', '#f1faee', '#2b5fa8', '#e8e2cc', '#c9c2a8'), 15, 10), '#6b6252');
  K.walls('#efe4cc', zellige('#2b5fa8', '#f1faee', '#1f7a5c', '#e8e2cc', '#c9c2a8'), '#2b5fa8');
  K.door(9.5, '#2b5fa8', '#1d3557');
  K.hole(5);
  for (const z of [-6.5, -1.5, 8]) { add(box(0.12, 4.2, 2.6, '#d9c9a3'), -14.96, 4.7, z); const a = add(cyl(1.3, 1.3, 0.12, '#d9c9a3', 14), -14.96, 6.6, z); a.rotation.z = Math.PI / 2; } // arcos
  for (const x of [-9.5, -1, 4]) { add(box(2.6, 4.2, 0.12, '#d9c9a3'), x, 4.7, -9.96); add(cyl(1.3, 1.3, 0.12, '#d9c9a3', 14), x, 6.6, -9.96).rotation.x = Math.PI / 2; }

  add(cyl(2.8, 3.0, 0.75, '#d9d2bd', 8), 0, 0.37, 0); round(0, 0, 3.0);                                   // la fuente
  L.waterMat = basic('#3fa7d6'); add(cyl(2.4, 2.4, 0.1, L.waterMat, 8), 0, 0.72, 0).castShadow = false;
  add(cyl(0.4, 0.55, 1.5, '#d9d2bd', 8), 0, 1.2, 0); add(cyl(1.0, 0.4, 0.3, '#d9d2bd', 8), 0, 2.05, 0);
  add(cyl(0.8, 0.8, 0.06, L.waterMat, 8), 0, 2.2, 0).castShadow = false;

  for (const [x, z] of [[-12.4, -8], [-5.2, -8.6], [5, -8.6]]) { // naranjos
    add(box(1.6, 1.0, 1.6, '#b5562b'), x, 0.5, z); solid(x - 0.8, x + 0.8, z - 0.8, z + 0.8);
    add(cyl(0.18, 0.24, 2.6, '#5e3b1e', 6), x, 2.3, z); add(sph(1.5, '#2d6a4f', 9, 7), x, 4.4, z);
    for (const [ox, oy, oz] of [[1.1, 0.2, 0.9], [-0.6, -0.6, 1.3], [0.4, 0.9, 1.2], [1.3, -0.5, -0.2]]) add(sph(0.2, basic('#ff9f1c'), 6, 5), x + ox, 4.4 + oy, z + oz).castShadow = false;
  }
  add(box(3, 2.2, 2, '#8a5a2b'), -9.2, 1.1, -8.9); add(box(3.2, 0.2, 2.3, '#5e3b1e'), -9.2, 2.3, -8.9).rotation.z = 0.12; // gallinero
  add(box(1.2, 1.2, 0.1, '#1b1410'), -9.2, 0.7, -7.86); solid(-10.7, -7.7, -10, -7.8);
  add(cyl(0.9, 0.75, 1.1, '#c79a5b', 10), -10.2, 0.55, -2.2); round(-10.2, -2.2, 0.95);                    // cesto de la ropa
  add(sph(0.75, '#f1faee', 7, 5), -10.2, 1.2, -2.2).scale.y = 0.5;
  for (const [x, z] of [[13.2, 2.2], [-13.2, -3.2], [13.2, 9]]) { add(cyl(0.6, 0.45, 0.9, '#b5562b', 8), x, 0.45, z); add(sph(0.8, '#3a7d44', 7, 5), x, 1.5, z); round(x, z, 0.7); }

  const b1 = K.table(-8, 4.2, 5, 1.8, 1.4, '#d9d2bd', 0.4, 'banco1'); put(b1, box(4.6, 0.3, 1.5, '#2b5fa8'), -8, 1.55, 4.2);
  const b2 = K.table(8.6, 7, 5, 1.8, 1.4, '#d9d2bd', 0.4, 'banco2'); put(b2, box(4.6, 0.3, 1.5, '#c1440e'), 8.6, 1.55, 7);
  const t = K.table(8.6, -2.6, 3.2, 3.2, 1.6, '#8a5a2b', 0.3, 'mesa');
  put(t, cyl(0.8, 0.6, 0.3, '#b5562b', 10), 8.6, 1.75, -2.6); put(t, cone(0.7, 1.0, '#c4622d'), 8.6, 2.4, -2.6);

  K.jar(12.8, -7.6, 1.15); K.puddle(11.9, -6.8, 1.4);                                                     // la khabia
  L.oil.push({ x: 12.0, z: -6.8, r: 2.2, rate: 1.0 });
  K.graph([[9.5, -7.8], [4.5, -5.2], [-4.5, -5.2], [-5.2, 0.6], [-3, 6.8], [4, 5.8], [5.4, 1.4]],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]]);
  return Object.assign(L, {
    name: 'EL PATIO', theme: 'patio', short: 'PATIO', enemy: 'jadda', look: 'jadda', who: 'la jadda', outdoor: true,
    sub: 'Luna llena sobre el riad. Las gallinas no duermen.',
    capThreat: 'Las gallinas andan sueltas. Y pican fuerte.', capOil: 'La khabia de aceite, junto a la puerta azul.',
    dropSpots: [[-9, -5], [-4.5, 3.6], [3.8, -4], [11.5, 1], [1, 8.4], [-11, 8.4], [12.5, 5], [5.5, 3.6], [-6.8, -2.4]],
    plateSpots: [[-11.4, 1.6], [-3.6, -4.4], [4.4, 4], [12.6, -3.2], [-1, 8.6], [5.6, -7.6]],
    catSpots: [[-5, 7], [4.6, -4.4], [11, 3.4], [-8.6, -5], [2, 7.4]],
    glueSpots: [[-4.6, -3.4], [5, 5.2], [10.8, -5], [-11, 7], [1, -7.6]],
    chickSpots: [[-7, -5.4], [5.2, 3.6], [-3.4, 7.6]],
    palette: { bg: '#0a1024', moon: '#a9c0ff', moonI: 2.3, tint: '#c4d4ff' },
  });
}

// ---------- 4. el hanout: Si Brahim, cepos y estanterías ----------
function hanout(K) {
  const { L, add, solid, round } = K;
  K.floor(canvasTex(32, 32, checkerTex('#d8d2c0', '#9a958a'), 15, 10), '#55524a');
  K.walls('#c9d6c2');
  K.hole(6.5);
  const shelf = canvasTex(64, 48, shelfTex);
  const shelfMat = (rx) => { const t = shelf.clone(); t.repeat.set(rx, 1); t.needsUpdate = true; return toon('#ffffff', t); };
  add(box(21, 5.6, 1.4, shelfMat(5)), -4.5, 2.8, -9.3); solid(-15, 6, -10, -8.6);                          // estanterías de pared
  add(box(1.4, 5.6, 10.6, shelfMat(3)), -14.3, 2.8, -3.3); solid(-15, -13.6, -8.6, 2);
  add(box(4, 5.6, 0.25, '#7a7f87'), 10, 2.8, -9.9);                                                          // persiana
  for (let y = 0.6; y < 5.4; y += 0.7) add(box(4.02, 0.08, 0.27, '#5a5f66'), 10, y, -9.9);
  add(box(6, 3, 1.8, '#8a5a2b'), -8, 1.5, -5); add(box(6.2, 0.2, 2, '#e9d8a6'), -8, 3.1, -5); solid(-11, -5, -5.9, -4.1); // mostrador
  add(box(1.0, 0.5, 0.8, '#b8bcc4'), -9.5, 3.45, -5); add(cyl(0.5, 0.5, 0.06, '#e9c46a', 10), -9.5, 3.9, -5);
  add(box(0.9, 0.8, 0.7, '#3b2a1a'), -6.4, 3.6, -5);

  function gondola(x, z, w, d, id) {
    const top = new THREE.Group(); L.root.add(top);
    put(top, box(w, 3.2, d, shelfMat(Math.max(1, Math.max(w, d) / 3.5))), x, 2.8, z);
    put(top, box(w + 0.2, 0.2, d + 0.2, '#4a2f18'), x, 4.5, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = x + sx * (w / 2 - 0.3), lz = z + sz * (d / 2 - 0.3);
      add(box(0.3, 1.2, 0.3, '#3b2a1a'), lx, 0.6, lz); solid(lx - 0.15, lx + 0.15, lz - 0.15, lz + 0.15);
    }
    K.cover(id, x - w / 2, x + w / 2, z - d / 2, z + d / 2, 1.2, top);
  }
  gondola(-3, 3.5, 9, 1.8, 'g1'); gondola(6.5, -1.5, 1.8, 7, 'g2'); gondola(9, 6.8, 7, 1.8, 'g3');

  for (const [x, z, c] of [[-11.5, 5.2, '#c1121f'], [-9.4, 7.2, '#e9b21a'], [-12, 8.6, '#6a994e'], [1.6, 8.8, '#e76f51']]) { // sacos de especias
    add(cyl(0.85, 0.75, 0.9, '#c79a5b', 9), x, 0.45, z); add(cone(0.78, 0.8, c, 9), x, 1.25, z); round(x, z, 0.9);
  }
  for (const [x, z] of [[12.8, -7.6], [13.1, -5.2]]) { add(cyl(1, 1, 2.6, '#2f6fd0', 12), x, 1.3, z); add(cyl(1.03, 1.03, 0.12, '#1d3557', 12), x, 1.3, z); add(cyl(1.03, 1.03, 0.12, '#1d3557', 12), x, 2.4, z); round(x, z, 1.05); } // bidones
  add(box(0.3, 0.14, 0.14, '#e9c46a'), 11.7, 0.7, -6.9); K.puddle(11.3, -6.2, 1.5);
  L.oil.push({ x: 11.4, z: -6.2, r: 2.2, rate: 0.9 });
  add(box(1.8, 1.0, 1.4, '#8a5a2b'), 13.2, 0.5, 2.2); add(box(1.6, 0.2, 1.2, '#3a5a40'), 13.2, 1.05, 2.2); solid(12.3, 14.1, 1.5, 2.9); // caja de aceitunas

  K.graph([[-8, -2.5], [-1, -2.5], [3.5, -7], [10.5, -7], [10.5, 2.5], [3.8, 3.5], [3.5, 7], [-6.5, 6.8], [-9.8, 1]],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [1, 5]]);
  return Object.assign(L, {
    name: 'EL HANOUT', theme: 'hanout', short: 'HANOUT', enemy: 'keeper', look: 'keeper', who: 'Si Brahim', alwaysLit: true,
    sub: 'La tienda de Si Brahim. Nunca cierra. Nunca duerme.',
    capThreat: 'Si Brahim hace la ronda. Y ha puesto cepos por toda la tienda.', capOil: 'Dos bidones de zit. El golpe del siglo.',
    dropSpots: [[-4, -0.5], [1, 0.5], [9, -3.5], [12.5, 4.6], [-11, -1.5], [0, 6.2], [5, 5.2], [-5.5, 8.6], [13, -2]],
    plateSpots: [[-12, 3], [2.5, -4.5], [8.8, 3.8], [-3, 6.8], [12.8, 8.6], [4.4, -0.5]],
    catSpots: [], glueSpots: [[-6, 0.5], [4.2, 1], [9.5, -5], [-1.5, 8.2], [11.8, 5]],
    snapSpots: [[-7.6, 1.6], [2.6, 5.4], [8.8, -0.6], [11.8, -3.4], [-3.4, -5.2]],
    palette: { bg: '#0b0d12', moon: '#7f9be6', moonI: 1.6, tint: '#ffffff' },
  });
}

// ---------- montaje ----------
export function buildLevels(scene) {
  const hemi = new THREE.HemisphereLight('#3a4a8a', '#141428', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#7f9be6', 1.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const holeLight = new THREE.PointLight('#ffb347', 5, 6, 1.6); scene.add(holeLight);

  // objetos que cambian de sitio cada noche y se comparten entre escenarios
  const plates = [], glue = [], snaps = [];
  for (let i = 0; i < 3; i++) { // platitos de zit con khobz
    const g = new THREE.Group(); scene.add(g);
    put(g, cyl(0.8, 0.55, 0.14, '#f1faee', 12), 0, 0.07, 0); put(g, cyl(0.82, 0.8, 0.04, '#2b5fa8', 12), 0, 0.14, 0);
    const oil = put(g, cyl(0.56, 0.56, 0.05, basic('#f2b705'), 10), 0, 0.16, 0); oil.castShadow = false;
    put(g, sph(0.34, '#d9a441', 8, 5), 0.7, 0.14, 0.35).scale.y = 0.45;
    g.visible = false; plates.push({ mesh: g, oil, x: 0, z: 0, r: 1.3, amount: 0, on: false, rate: 0.45 });
  }
  for (let i = 0; i < 5; i++) { // trampas de pegamento
    const g = new THREE.Group(); scene.add(g);
    put(g, box(2.0, 0.06, 1.3, '#f6e27a'), 0, 0.03, 0).castShadow = false; put(g, box(1.7, 0.03, 1.0, '#c9a227'), 0, 0.07, 0).castShadow = false;
    g.visible = false; glue.push({ x: 0, z: 0, r: 0.95, mesh: g, on: false });
  }
  for (let i = 0; i < 5; i++) { // cepos
    const g = new THREE.Group(); scene.add(g);
    put(g, box(1.3, 0.1, 0.8, '#c79a5b'), 0, 0.05, 0);
    const bar = put(g, box(0.08, 0.08, 0.74, '#d7dbe2'), 0.42, 0.16, 0);
    put(g, box(0.5, 0.05, 0.08, '#d7dbe2'), 0.2, 0.12, 0.36); put(g, box(0.5, 0.05, 0.08, '#d7dbe2'), 0.2, 0.12, -0.36);
    put(g, box(0.26, 0.2, 0.24, '#ffd23f'), -0.3, 0.2, 0);
    g.visible = false; snaps.push({ x: 0, z: 0, mesh: g, bar, on: false, shut: false });
  }

  const shared = { hemi, sun, holeLight, plates, glue, snaps, moonPos: new THREE.Vector3(-22, 20, -6), lampPos: new THREE.Vector3(3, 34, 5) };
  const levels = [cocina, salon, patio, hanout].map((make, i) => {
    const root = new THREE.Group(); scene.add(root); root.visible = i === 0;
    return Object.assign(Object.create(shared), make(kit(root)));
  });
  return { ...shared, levels };
}
