// La cocina: suelo de zellige, muebles (que son los escondites), el bidón de zit y el agujero.
import { THREE, toon, basic, box, cyl, sph, plane, put, canvasTex } from './gfx.js';

export const ROOM = { x0: -15, x1: 15, z0: -10, z1: 10 };

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

function rugTex(g, w, h) {
  g.fillStyle = '#8f1d2c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9c46a'; g.fillRect(2, 2, w - 4, 1); g.fillRect(2, h - 3, w - 4, 1); g.fillRect(2, 2, 1, h - 4); g.fillRect(w - 3, 2, 1, h - 4);
  g.fillStyle = '#1d3557'; g.fillRect(5, 5, w - 10, h - 10);
  g.fillStyle = '#8f1d2c'; g.fillRect(7, 7, w - 14, h - 14);
  for (let i = 0; i < 5; i++) { // rombos amazigh
    const cx = 12 + i * 10, cy = h / 2;
    for (let y = -7; y <= 7; y++) for (let x = -4; x <= 4; x++) {
      const d = Math.abs(x) * 1.75 + Math.abs(y);
      if (d <= 7) { g.fillStyle = d <= 2 ? '#e9c46a' : d <= 5 ? '#f1faee' : '#1d3557'; g.fillRect(cx + x, cy + y, 1, 1); }
    }
  }
  g.fillStyle = '#f1faee';
  for (let x = 1; x < w; x += 3) { g.fillRect(x, 0, 1, 1); g.fillRect(x, h - 1, 1, 1); } // flecos
}

const SHADE = new THREE.MeshBasicMaterial({ color: '#0a0820', transparent: true, opacity: 0.3, depthWrite: false });

export function buildWorld(scene) {
  const W = { colliders: [], covers: [], oil: [], glue: [], scene };
  const solid = (x0, x1, z0, z1) => W.colliders.push({ x0, x1, z0, z1 });
  const round = (x, z, r) => W.colliders.push({ x, z, r });

  // ---- luces ----
  W.hemi = new THREE.HemisphereLight('#3a4a8a', '#141428', 0.9);
  scene.add(W.hemi);
  const sun = W.sun = new THREE.DirectionalLight('#7f9be6', 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  W.moonPos = new THREE.Vector3(-22, 20, -6);
  W.lampPos = new THREE.Vector3(3, 34, 5);

  // ---- suelo y paredes ----
  put(scene, box(30, 0.8, 20, '#4a3828'), 0, -0.41, 0);
  const floorTex = canvasTex(32, 32, zellige('#2b5fa8', '#e9c46a', '#b5532a', '#eadfc6', '#cdbf9f'), 15, 10);
  const floor = put(scene, plane(30, 20, toon('#ffffff', floorTex)), 0, 0, 0);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;

  const wallC = '#e3c79c';
  put(scene, box(0.6, 7, 20.6, wallC), -15.3, 3.5, -0.3);
  put(scene, box(30, 7, 0.6, wallC), 0, 3.5, -10.3);
  const bandX = canvasTex(32, 32, zellige('#1f7a5c', '#f1faee', '#1d3557', '#e9d8a6', '#c9b47f'), 10, 1.25);
  const bandZ = bandX.clone(); bandZ.repeat.set(15, 1.25); bandZ.needsUpdate = true;
  const bx = put(scene, plane(20, 2.5, toon('#ffffff', bandX)), -14.99, 1.25, 0); bx.rotation.y = Math.PI / 2; bx.castShadow = false;
  const bz = put(scene, plane(30, 2.5, toon('#ffffff', bandZ)), 0, 1.25, -9.99); bz.castShadow = false;
  put(scene, box(0.12, 0.18, 20, '#14532d'), -14.95, 2.6, 0);
  put(scene, box(30, 0.18, 0.12, '#14532d'), 0, 2.6, -9.95);

  // puerta (por donde entra la jadda)
  put(scene, box(3, 5.4, 0.25, '#1d6f73'), 9.5, 2.7, -9.9);
  const arch = put(scene, cyl(1.5, 1.5, 0.25, '#1d6f73', 14), 9.5, 5.4, -9.9); arch.rotation.x = Math.PI / 2;
  put(scene, box(0.12, 5.4, 0.3, '#0f4447'), 9.5, 2.7, -9.86);
  put(scene, sph(0.14, '#e9c46a'), 9.0, 2.8, -9.72);
  W.doorGlow = put(scene, box(2.9, 0.14, 0.12, basic('#ffd27a')), 9.5, 0.07, -9.74);
  W.doorGlow.castShadow = false; W.doorGlow.visible = false;

  // ventana con la luna
  W.windowMat = basic('#9db8ff');
  put(scene, box(0.1, 2.2, 2.4, W.windowMat), -14.96, 4.9, -5).castShadow = false;
  const warch = put(scene, cyl(1.2, 1.2, 0.1, W.windowMat, 14), -14.96, 6.0, -5); warch.rotation.z = Math.PI / 2; warch.castShadow = false;
  put(scene, box(0.14, 3.4, 0.12, '#3b2a1a'), -14.9, 5.4, -5);
  put(scene, box(0.14, 0.12, 2.4, '#3b2a1a'), -14.9, 4.9, -5);

  // el agujero de la cucaracha
  W.hole = { x: -14.2, z: 6 };
  const hole = put(scene, cyl(0.8, 0.8, 0.1, basic('#0d0705'), 12), -14.97, 0, 6); hole.rotation.z = Math.PI / 2; hole.castShadow = false;
  W.holeLight = new THREE.PointLight('#ffb347', 5, 6, 1.6);
  W.holeLight.position.set(-14.2, 0.7, 6); scene.add(W.holeLight);

  // ---- muebles pegados a la pared ----
  put(scene, box(2.2, 3, 9.5, '#2a9d8f'), -13.9, 1.5, -5.25);      // encimera
  put(scene, box(2.4, 0.25, 9.7, '#e9d8a6'), -13.9, 3.12, -5.25);
  for (const z of [-8.6, -6.3, -4, -1.8]) put(scene, box(0.08, 0.5, 0.12, '#e9c46a'), -12.78, 2.2, z);
  solid(-15, -12.8, -10, -0.5);

  put(scene, box(2.5, 6, 2.4, '#e4e4dc'), -9.25, 3, -8.8);          // nevera
  put(scene, box(2.52, 0.08, 2.42, '#9a9a94'), -9.25, 3.9, -8.8);
  put(scene, box(0.12, 1.2, 0.12, '#8a8a84'), -8.3, 4.8, -7.55);
  solid(-10.5, -8, -10, -7.6);

  put(scene, sph(0.85, '#f1ede0', 8, 6), -6.5, 0.6, -8.9).scale.set(1, 0.95, 0.9); // saco de harina
  round(-6.5, -8.9, 0.85);

  put(scene, box(3, 3, 2.2, '#d6d6d0'), -3, 1.5, -8.9);             // cocina
  put(scene, box(3.02, 0.12, 2.22, '#2b2b2b'), -3, 3.05, -8.9);
  put(scene, box(2.2, 1.3, 0.1, '#33373d'), -3, 1.3, -7.78);
  put(scene, cyl(0.7, 0.55, 0.3, '#b5562b', 10), -3.6, 3.26, -8.9); // tajín al fuego
  put(scene, new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.95, 10), toon('#c4622d')), -3.6, 3.88, -8.9).castShadow = true;
  solid(-4.5, -1.5, -10, -7.8);

  put(scene, cyl(0.75, 0.75, 1.9, '#2f6fd0', 10), 0.2, 0.95, -8.8); // butano
  put(scene, cyl(0.4, 0.7, 0.4, '#2f6fd0', 10), 0.2, 2.1, -8.8);
  put(scene, cyl(0.45, 0.45, 0.14, '#c8c8c8', 8), 0.2, 2.35, -8.8);
  round(0.2, -8.8, 0.8);

  // ---- muebles con hueco debajo: escondites ----
  function table(x, z, w, d, h, color, leg = 0.4, id = '') {
    const top = new THREE.Group(); scene.add(top);
    put(top, box(w, 0.3, d, color), x, h - 0.15, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = x + sx * (w / 2 - leg / 2 - 0.15), lz = z + sz * (d / 2 - leg / 2 - 0.15);
      put(scene, box(leg, h - 0.3, leg, color), lx, (h - 0.3) / 2, lz);
      solid(lx - leg / 2, lx + leg / 2, lz - leg / 2, lz + leg / 2);
    }
    // sombra pintada: marca el escondite cuando el tablero se aparta
    const decal = put(scene, plane(w, d, SHADE), x, 0.02, z); decal.rotation.x = -Math.PI / 2; decal.visible = false;
    const cover = { id, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, top, under: false, low: h < 2.5, decal };
    W.covers.push(cover);
    return cover;
  }

  const rug = put(scene, plane(11, 7, toon('#ffffff', canvasTex(64, 40, rugTex))), -2, 0.012, 1);
  rug.rotation.x = -Math.PI / 2; rug.castShadow = false;

  const t = table(-2, 1, 8, 4.5, 3, '#8a5a2b', 0.45, 'mesa').top;     // mesa grande
  put(t, cyl(0.85, 0.65, 0.3, '#b5562b', 10), -3.6, 3.15, 1);
  put(t, new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 10), toon('#c4622d')), -3.6, 3.85, 1).castShadow = true;
  put(t, cyl(1.1, 1.1, 0.08, '#cfd6dc', 12), -0.6, 3.04, 0.8);       // bandeja del atay
  put(t, sph(0.42, '#cfd6dc', 8, 6), -0.9, 3.45, 0.7);
  put(t, new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 8), toon('#cfd6dc')), -0.9, 3.95, 0.7);
  put(t, box(0.5, 0.1, 0.1, '#cfd6dc'), -0.45, 3.55, 0.7).rotation.z = 0.5;
  for (const [gx, gz, c] of [[-0.1, 0.4, '#2a9d8f'], [-0.15, 1.2, '#e76f51'], [-0.6, 1.5, '#e9c46a']]) put(t, cyl(0.13, 0.11, 0.34, c, 6), gx, 3.25, gz);
  put(t, sph(0.75, '#d9a441', 10, 6), 0.9, 3.1, 1.6).scale.y = 0.3;  // khobz
  put(t, sph(0.75, '#cf9838', 10, 6), 1.2, 3.25, 1.3).scale.y = 0.3;

  table(-7.7, 1.2, 1.6, 1.6, 1.8, '#b5651d', 0.25, 'taburete1');
  table(0.5, -3.4, 1.6, 1.6, 1.8, '#b5651d', 0.25, 'taburete2');

  const bench = table(8.9, 7.2, 6.8, 2.2, 1.5, '#5e3b1e', 0.35, 'sedari').top; // sedari
  put(bench, box(6.6, 0.4, 2.0, '#c1440e'), 8.9, 1.7, 7.2);
  for (const [cx, c] of [[6.6, '#264653'], [8.9, '#e9c46a'], [11.2, '#264653']]) put(bench, box(1.5, 0.45, 1.5, c), cx, 2.1, 7.2);

  const tea = new THREE.Group(); scene.add(tea);                       // mesita del té
  put(tea, cyl(1.6, 1.6, 0.14, '#d4a017', 14), 10.5, 1.3, 2.5);
  put(tea, sph(0.36, '#cfd6dc', 8, 6), 10.5, 1.7, 2.5);
  put(tea, new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 8), toon('#cfd6dc')), 10.5, 2.12, 2.5);
  for (const a of [0, 2.1, 4.2]) {
    const lx = 10.5 + Math.cos(a) * 1.0, lz = 2.5 + Math.sin(a) * 1.0;
    put(scene, box(0.2, 1.25, 0.2, '#6b4a16'), lx, 0.62, lz); solid(lx - 0.1, lx + 0.1, lz - 0.1, lz + 0.1);
  }
  const teaDecal = put(scene, plane(2.4, 2.4, SHADE), 10.5, 0.02, 2.5); teaDecal.rotation.x = -Math.PI / 2; teaDecal.visible = false;
  W.covers.push({ id: 'te', x0: 9.3, x1: 11.7, z0: 1.3, z1: 3.7, h: 1.3, top: tea, under: false, low: true, decal: teaDecal });

  // ---- el zit ----
  const bidon = new THREE.Group(); scene.add(bidon);
  put(bidon, box(1.3, 1.9, 1.0, '#d4a80f'), 0, 0.95, 0);
  put(bidon, box(1.0, 0.9, 1.04, '#2d6a4f'), 0, 0.95, 0);
  put(bidon, box(0.5, 0.3, 1.06, '#f1faee'), 0, 1.0, 0);
  put(bidon, cyl(0.2, 0.2, 0.3, '#2d6a4f', 8), -0.3, 2.05, 0);
  put(bidon, box(0.5, 0.14, 0.2, '#d4a80f'), 0.3, 2.0, 0);
  bidon.position.set(13.7, 0, 8.3); bidon.rotation.y = 0.5;
  round(13.7, 8.3, 0.85);
  const puddle = put(scene, cyl(1.35, 1.35, 0.03, basic('#f2b705'), 14), 13.5, 0.02, 8.0); puddle.castShadow = false;
  W.oil.push({ x: 13.6, z: 8.2, r: 2.0, minNight: 1, name: 'bidón', rate: 1.0 });

  const bottle = W.bottle = new THREE.Group(); scene.add(bottle);
  put(bottle, cyl(0.4, 0.4, 1.3, '#3a7d44', 8), 0, 0.65, 0);
  put(bottle, cyl(0.14, 0.34, 0.5, '#3a7d44', 8), 0, 1.5, 0);
  put(bottle, cyl(0.16, 0.16, 0.14, '#e9c46a', 8), 0, 1.8, 0);
  put(bottle, cyl(0.9, 0.9, 0.03, basic('#f2b705'), 12), 0.2, 0.02, 0.5).castShadow = false;
  bottle.position.set(3.0, 0, -8.9);
  W.bottleCollider = { x: 3.0, z: -8.9, r: 0.5, off: true };
  W.colliders.push(W.bottleCollider);
  W.oil.push({ x: 3.1, z: -8.6, r: 1.6, minNight: 2, name: 'botella', rate: 0.85 });

  // trampas de pegamento (se activan según la noche)
  for (const [x, z, a] of [[6.6, 4.2, 0.3], [-9.2, 5.6, -0.2], [11.8, -1.2, 1.2], [-3, -4.4, 0.1], [3.4, 8.6, 0]]) {
    const g = new THREE.Group(); scene.add(g);
    put(g, box(2.0, 0.06, 1.3, '#f6e27a'), 0, 0.03, 0).castShadow = false;
    put(g, box(1.7, 0.03, 1.0, '#c9a227'), 0, 0.07, 0).castShadow = false;
    g.position.set(x, 0, z); g.rotation.y = a; g.visible = false;
    W.glue.push({ x, z, r: 0.95, mesh: g, on: false });
  }

  // puntos por donde camina la jadda (0 = puerta)
  W.nodes = [[9.5, -7.8], [5, -6.3], [-5.5, -5.6], [-10.8, -3.6], [-10.2, 6], [0, 7.2], [5.6, 1.6], [12.6, -3]].map(([x, z]) => ({ x, z }));
  W.edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [6, 7], [7, 0], [1, 7]];
  W.adj = W.nodes.map(() => []);
  for (const [a, b] of W.edges) { W.adj[a].push(b); W.adj[b].push(a); }

  // platitos de zit con khobz: pocas gotas pero rápidas, cambian de sitio cada noche
  W.plates = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(); scene.add(g);
    put(g, cyl(0.8, 0.55, 0.14, '#f1faee', 12), 0, 0.07, 0);
    put(g, cyl(0.82, 0.8, 0.04, '#2b5fa8', 12), 0, 0.14, 0);
    const oil = put(g, cyl(0.56, 0.56, 0.05, basic('#f2b705'), 10), 0, 0.16, 0); oil.castShadow = false;
    put(g, sph(0.34, '#d9a441', 8, 5), 0.7, 0.14, 0.35).scale.y = 0.45;
    g.visible = false;
    W.plates.push({ mesh: g, oil, x: 0, z: 0, r: 1.3, amount: 0, on: false, rate: 0.45, name: 'platito' });
  }
  W.plateSpots = [[-6, 6.6], [4.2, -1.4], [7.8, -5.4], [-10.6, -1.4], [1.6, 5.4], [12.8, -5.6], [5.4, 9], [-3, -6]];
  W.catSpots = [[-4.6, 5.6], [3.8, 3.4], [6.8, -3.4], [-7.4, -4.4], [11.6, 5.2], [0.4, -6]];

  W.dropSpots = [[-10, -2], [-5, -4.8], [3.5, 4.8], [7.5, -3], [12.5, -7], [13.3, 4.6], [-12, 2.6], [2.6, 8.8], [6.5, -8.6], [-8.5, 8.4], [4.2, -1]];
  return W;
}
