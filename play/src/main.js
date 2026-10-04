// Srak l zit — سراق الزيت. Una cucaracha marroquí roba el aceite de la cocina de noche.
import { THREE, Gfx, basic, sph, cyl, put, GHOST } from './gfx.js';
import { buildWorld, ROOM } from './world.js';
import { makeRoach, animRoach, makeGranny, makeSlipper, makeCat, animCat } from './actors.js';
import { Hud, INK, GOLD, CREAM } from './hud.js';
import { Sfx } from './audio.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.random() * a.length | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k) => 1 - (1 - k) ** 3;
const ARABIC = 'bold {s}px "Geeza Pro", "Noto Naskh Arabic", "Segoe UI", sans-serif';

const gfx = new Gfx(document.getElementById('view'));
const hud = new Hud(document.getElementById('hud'));
const sfx = new Sfx();
const world = buildWorld(gfx.scene);
const scene = gfx.scene;

const CARRY_MAX = 3, VISION = 10.5, VISION_HALF = 0.6, ROACH_R = 0.55, GRANNY_R = 1.35;
const DASH_T = 0.26, DASH_CD = 1.4, DASH_SPEED = 17;

// ---------- actores y efectos ----------
const roachMesh = makeRoach(); scene.add(roachMesh);
const babies = [[-14.5, 5.3, 0.25], [-14.45, 6.7, -0.3]].map(([x, z, h]) => {
  const m = makeRoach({ baby: true }); m.position.set(x, 0, z); m.rotation.y = -h; scene.add(m);
  return { m, x, z, h, hop: 0 };
});
const grannyMesh = makeGranny(); scene.add(grannyMesh); grannyMesh.visible = false;
grannyMesh.userData.cone.scale.setScalar(VISION);
const catMesh = makeCat(); scene.add(catMesh); catMesh.visible = false;
const slipMesh = makeSlipper(); scene.add(slipMesh); slipMesh.visible = false;

const transp = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
const flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m; };
const marker = flat(new THREE.CircleGeometry(1, 18), transp('#ff2d2d', 0.5)); marker.position.y = 0.06;
const cloud = new THREE.Group(); scene.add(cloud); cloud.visible = false;
for (let i = 0; i < 7; i++) {
  const a = i / 7 * Math.PI * 2, m = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.9 : 1.2, 7, 5), transp('#b9f6a8', 0.45));
  m.position.set(i ? Math.cos(a) * 1.3 : 0, 0.7, i ? Math.sin(a) * 1.3 : 0); cloud.add(m);
}
const soul = new THREE.Group(); scene.add(soul); soul.visible = false; // el alma de la cucaracha, con su aureola
soul.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), transp('#ffffff', 0.7)));
const halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 5, 12), transp('#ffd23f', 0.9)); halo.rotation.x = Math.PI / 2; halo.position.y = 0.6; soul.add(halo);

const parts = [];
for (let i = 0; i < 80; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), basic('#ffffff'));
  m.visible = false; scene.add(m); parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0, g: 14 });
}
function burst(x, y, z, color, n = 8, speed = 4, up = 4, life = 0.6, g = 14) {
  for (const p of parts) {
    if (n <= 0) break;
    if (p.life > 0) continue;
    const a = rand(0, Math.PI * 2), s = rand(0.3, 1) * speed;
    p.m.position.set(x, y, z); p.m.material.color.set(color); p.m.visible = true; p.m.scale.setScalar(rand(0.7, 1.4));
    p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = rand(0.4, 1) * up; p.life = rand(0.6, 1) * life; p.g = g; n--;
  }
}

const rings = [];
for (let i = 0; i < 6; i++) rings.push({ m: flat(new THREE.RingGeometry(0.88, 1, 30), transp('#ffffff', 0.3)), t: 0, dur: 1, r: 1, op: 0.3 });
function ring(x, z, r, color = '#ffffff', dur = 0.5, op = 0.35) {
  const f = rings.find((q) => q.t >= q.dur) || rings[0];
  Object.assign(f, { t: 0, dur, r, op }); f.m.material.color.set(color); f.m.position.set(x, 0.07, z); f.m.visible = true;
}

const slicks = [];
for (let i = 0; i < 3; i++) slicks.push({ m: flat(new THREE.CircleGeometry(0.95, 14), transp('#f2b705', 0.85)), x: 0, z: 0, on: false, t: 0 });
slicks.forEach((s) => { s.m.position.y = 0.04; });

const looseDrops = [];
for (let i = 0; i < 5; i++) {
  const m = put(scene, sph(0.26, basic('#ffd23f'), 7, 5), 0, 0.22, 0); m.castShadow = false; m.visible = false;
  looseDrops.push({ m, x: 0, z: 0, on: false });
}

// ---------- estado ----------
const R = { x: 0, z: 0, vx: 0, vz: 0, head: 0, carry: 0, fill: 0, hidden: false, lowHidden: false, alive: true, respawn: 0, inv: 0, poison: 0, walk: 0, glued: false, sprint: false, moving: false, dashT: 0, dashCd: 0, dvx: 0, dvz: 0, air: 0, wing: 0, turn: 0, squash: 0, noise: 1.6, ringT: 0, dripT: 0, deliverT: 0, delivered: 0, dustT: 0 };
const G = { state: 'away', t: 0, x: 0, z: 0, face: 0, baseFace: 0, node: 0, prev: -1, route: [], linger: 0, visit: 0, leaving: false, lost: 0, throwCd: 0, sprayCd: 0, hear: 0, say: '', sayT: 0, walk: 0, arm: -2.6, reroute: 0, lastX: 0, lastZ: 0 };
const K = { on: false, state: 'sleep', t: 0, x: 0, z: 0, face: 0, tx: 0, tz: 0, vx: 0, vz: 0, walk: 0, dur: 1, dodged: false };
const S = { st: 'idle', t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), harmless: false };
const P = { st: 'idle', t: 0, x: 0, z: 0 };
const st = {
  mode: 'title', modeT: 0, night: 1, quota: 6, stolen: 0, score: 0, combo: 1, lives: 3, time: 0, nightLen: 90,
  detect: 0, lightOn: false, lightT: 9, light: 0, shake: 0, flash: 0, msg: '', msgT: 0, clock: 0, paused: false,
  freeze: 0, slow: 0, kick: 0, zoom: 1, danger: 0, seen: false, punchOil: 0, punchScore: 0, banner: null, news: '',
  res: null, tut: 0, reason: '', introSeen: false,
  best: { score: 0, night: 0, ...JSON.parse(localStorage.getItem('srak-l-zit.best') || '{}') },
};
const cam = new THREE.Vector3(-8, 0, 3);
const keys = new Set(), pressed = new Set();
const floaters = [];
const cine = { steps: null, i: 0, t: 0, done: null };

function say(msg, t = 2.6) { st.msg = msg; st.msgT = t; }
function gsay(msg, t = 1.8) { G.say = msg; G.sayT = t; }
function floater(text, x, z, color = GOLD, scale = 1, h = 1.6) { floaters.push({ text, x, z, h, color, scale, t: 0, dur: 1.2 }); }
function addScore(n, label, x, z, color = GOLD) {
  st.score += n; st.punchScore = 0.3;
  if (label) floater(`${label} +${n}`, x, z, color);
}
const hitstop = (t) => { st.freeze = Math.max(st.freeze, t); };

// ---------- flujo ----------
function startGame() {
  Object.assign(st, { lives: 3, score: 0, combo: 1, tut: 0 });
  if (st.introSeen) startNight(1); else playIntro();
}

function startNight(n) {
  Object.assign(st, { night: n, quota: 4 + n * 2, stolen: 0, time: 0, nightLen: 84 + n * 8, detect: 0, mode: 'intro', modeT: 0, msgT: 0, seen: false, banner: null, res: null });
  st.news = n === 1 ? 'ESPACIO: vuelo corto · E: suelta zit y que resbale'
    : n === 2 ? 'Nuevo: Mchicha, el gato. A oscuras, no hagas ruido'
      : n === 3 ? 'Nuevo: Baygon. No te duermas bajo el mueble' : 'La jadda cada vez duerme menos...';
  resetRoach();
  Object.assign(G, { state: 'away', t: n === 1 ? 9 : rand(4, 7), sayT: 0, route: [] });
  grannyMesh.visible = false; grannyMesh.rotation.set(0, 0, 0); world.doorGlow.visible = false;
  setLight(false); st.lightT = 9;
  S.st = 'idle'; slipMesh.visible = false; marker.visible = false; P.st = 'idle'; cloud.visible = false;
  slicks.forEach((s) => { s.on = false; s.m.visible = false; });
  world.bottle.visible = n >= 2; world.bottleCollider.off = n < 2;
  const traps = n < 2 ? 0 : n < 3 ? 2 : n < 5 ? 3 : 5;
  world.glue.forEach((g, i) => { g.on = i < traps; g.mesh.visible = g.on; });
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const spots = shuffle(world.dropSpots), count = Math.min(5, 2 + (n >> 1));
  looseDrops.forEach((d, i) => { d.on = i < count; d.m.visible = d.on; if (d.on) { [d.x, d.z] = spots[i]; d.m.position.set(d.x, 0.22, d.z); } });
  const ps = shuffle(world.plateSpots), plates = n < 3 ? 2 : 3;
  world.plates.forEach((p, i) => { p.on = i < plates; p.mesh.visible = p.on; p.amount = 3; p.oil.visible = true; p.oil.scale.set(1, 1, 1); if (p.on) { [p.x, p.z] = ps[i]; p.mesh.position.set(p.x, 0, p.z); } });
  K.on = n >= 2; catMesh.visible = K.on;
  if (K.on) { const [cx, cz] = pick(world.catSpots.slice(0, 3)); Object.assign(K, { state: 'sleep', t: rand(4, 7), x: cx, z: cz, face: rand(-3, 3) }); }
}

function resetRoach() {
  Object.assign(R, { x: world.hole.x + 0.8, z: world.hole.z, vx: 0, vz: 0, head: 0, carry: 0, fill: 0, alive: true, respawn: 0, inv: 2, poison: 0, glued: false, dashT: 0, dashCd: 0, air: 0, wing: 0, squash: 0, deliverT: 0, delivered: 0 });
  roachMesh.visible = true; soul.visible = false;
}

function setLight(on) { if (st.lightOn !== on) { st.lightOn = on; st.lightT = 0; sfx.click(); } }

function killRoach(cause) {
  if (!R.alive || R.inv > 0) return;
  Object.assign(R, { alive: false, respawn: 2.1, carry: 0, vx: 0, vz: 0, dashT: 0, air: 0, wing: 0 });
  R.cause = cause; st.lives--; st.detect = 0; st.combo = 1; st.shake = 0.5; st.flash = 0.5; hitstop(0.14); sfx.squash();
  burst(R.x, 0.3, R.z, '#a8521c', 14, 6, 5); burst(R.x, 0.3, R.z, '#ffd23f', 8, 4, 6);
  ring(R.x, R.z, 3, '#ffffff', 0.4, 0.6);
  roachMesh.userData.body.scale.set(1.3, 0.14, 1.3); roachMesh.userData.body.position.y = 0;
  soul.visible = true; soul.position.set(R.x, 0.6, R.z);
  say(cause === 'spray' ? '¡Cof, cof! Baygon...' : cause === 'cat' ? '¡Ñam! Mchicha no perdona' : '¡PLAF! Belgha en toda la espalda', 2);
  if (G.state === 'hunt') { G.state = 'gloat'; G.t = 2; gsay('¡Hamdullah!', 2); }
}

function endRun(reason) {
  st.mode = 'over'; st.modeT = 0; st.reason = reason; sfx.lose();
  if (st.score > st.best.score) { st.best = { score: st.score, night: st.night }; localStorage.setItem('srak-l-zit.best', JSON.stringify(st.best)); }
}

function clearNight() {
  const time = Math.max(0, Math.floor(st.nightLen - st.time)) * 2, stealth = st.seen ? 0 : 100, lives = st.lives * 25;
  st.res = { drops: st.quota, time, stealth, lives, before: st.score };
  st.score += time + stealth + lives;
  st.mode = 'clear'; st.modeT = 0; sfx.win();
  grannyMesh.visible = false; setLight(false); S.st = 'idle'; slipMesh.visible = false; marker.visible = false; cloud.visible = false; P.st = 'idle';
  R.x = world.hole.x + 1.6; R.z = world.hole.z; R.vx = R.vz = 0;
}

// ---------- cucaracha ----------
function collide(p, r) {
  for (const c of world.colliders) {
    if (c.off) continue;
    if (c.r !== undefined) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = r + c.r;
      if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
    } else {
      const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * r; p.z = nz + dz / d * r; }
      else { // el centro está dentro: salir por el lado más cercano
        const l = p.x - c.x0, ri = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, ri, t, b);
        if (m === l) p.x = c.x0 - r; else if (m === ri) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r;
      }
    }
  }
  p.x = clamp(p.x, ROOM.x0 + r, ROOM.x1 - r); p.z = clamp(p.z, ROOM.z0 + r, ROOM.z1 - r);
}

function oilSources() {
  const list = world.oil.filter((o) => st.night >= o.minNight);
  for (const p of world.plates) if (p.on && p.amount > 0) list.push(p);
  return list;
}

function updateRoach(dt) {
  R.squash = Math.max(0, R.squash - dt * 5);
  if (!R.alive) {
    R.respawn -= dt;
    soul.position.y += dt * 1.6; soul.rotation.y += dt * 3;
    if (R.respawn <= 0) {
      if (st.lives <= 0) endRun(R.cause === 'cat' ? 'Mchicha se ha relamido los bigotes.' : R.cause === 'spray' ? 'El Baygon pudo contigo.' : 'La jadda te ha dejado como una pegatina.'); else resetRoach();
    }
    return;
  }
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix--;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix++;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy++;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy--;
  const il = Math.hypot(ix, iy) || 1;
  let dx = (gfx.floorRight.x * ix + gfx.floorUp.x * iy) / il, dz = (gfx.floorRight.z * ix + gfx.floorUp.z * iy) / il;
  const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  R.moving = ix !== 0 || iy !== 0;
  R.sprint = R.moving && (keys.has('ShiftLeft') || keys.has('ShiftRight'));

  const wasGlued = R.glued;
  R.glued = R.air < 0.2 && world.glue.some((g) => g.on && dist(R.x, R.z, g.x, g.z) < g.r);
  if (R.glued && !wasGlued) { sfx.glue(); say('¡Pegamento! Sal de ahí con un vuelo', 1.8); }

  // vuelo corto
  R.dashCd = Math.max(0, R.dashCd - dt);
  if (pressed.has('Space') && R.dashCd <= 0 && R.dashT <= 0) {
    const a = R.moving ? Math.atan2(dz, dx) : R.head;
    R.dashT = DASH_T; R.dashCd = DASH_CD; R.dvx = Math.cos(a) * DASH_SPEED; R.dvz = Math.sin(a) * DASH_SPEED; R.head = a;
    sfx.dash(); burst(R.x, 0.15, R.z, '#e6dcc4', 7, 3, 2, 0.4); ring(R.x, R.z, 8, '#ffffff', 0.45, 0.3); st.kick = 0.04;
  }
  if (R.dashT > 0) {
    R.dashT -= dt; R.vx = R.dvx; R.vz = R.dvz;
    R.air = Math.sin(clamp(1 - R.dashT / DASH_T, 0, 1) * Math.PI); R.wing = 1;
    if (R.dashT <= 0) { R.air = 0; R.squash = 1; R.vx *= 0.35; R.vz *= 0.35; burst(R.x, 0.12, R.z, '#e6dcc4', 6, 2.5, 1.5, 0.35); }
  } else {
    R.wing = Math.max(0, R.wing - dt * 8);
    const speed = 6.4 * (R.sprint ? 1.55 : 1) * (1 - 0.1 * R.carry) * (R.glued ? 0.28 : 1);
    const tx = R.moving ? dx * speed : 0, tz = R.moving ? dz * speed : 0, k = Math.min(1, dt * 14);
    R.vx += (tx - R.vx) * k; R.vz += (tz - R.vz) * k;
  }
  R.x += R.vx * dt; R.z += R.vz * dt;
  collide(R, ROACH_R);
  if (grannyMesh.visible && G.state !== 'slip') { // no se puede atravesar a la jadda
    const d = dist(R.x, R.z, G.x, G.z), m = ROACH_R + GRANNY_R;
    if (d < m && d > 1e-4) { R.x = G.x + (R.x - G.x) / d * m; R.z = G.z + (R.z - G.z) / d * m; }
  }
  const sp = Math.hypot(R.vx, R.vz);
  if (sp > 0.4) {
    const dh = wrap(Math.atan2(R.vz, R.vx) - R.head);
    R.head += dh * Math.min(1, dt * 16); R.turn += (clamp(dh * 2.5, -1, 1) - R.turn) * Math.min(1, dt * 10);
  } else R.turn *= 1 - Math.min(1, dt * 10);
  R.inv = Math.max(0, R.inv - dt);

  // ruido: lo oyen el gato y la jadda
  const dashing = R.dashT > 0;
  R.noise = dashing ? 8 : R.sprint ? 7.5 : R.moving ? 3.6 : 1.6;
  R.ringT -= dt; R.dustT -= dt;
  const catAwake = K.on && !st.lightOn;
  if (R.moving && R.ringT <= 0 && (R.sprint ? (grannyMesh.visible || catAwake) : catAwake)) {
    ring(R.x, R.z, R.noise, R.sprint ? '#ffffff' : '#9db8ff', 0.5, R.sprint ? 0.3 : 0.16); R.ringT = 0.42;
  }
  if (R.sprint && R.dustT <= 0) { burst(R.x - R.vx * 0.05, 0.1, R.z - R.vz * 0.05, '#e6dcc4', 1, 1, 1.2, 0.35); R.dustT = 0.07; }

  R.hidden = false; R.lowHidden = false;
  for (const c of world.covers) {
    c.under = R.x > c.x0 && R.x < c.x1 && R.z > c.z0 && R.z < c.z1;
    if (c.under) { R.hidden = true; if (c.low) R.lowHidden = true; }
    // el tablero también se aparta si tapa a la cucaracha desde la cámara
    const k = c.h / gfx.dir.y, qx = R.x + gfx.dir.x * k, qz = R.z + gfx.dir.z * k, m = 1.1;
    c.hides = c.under || (qx > c.x0 - m && qx < c.x1 + m && qz > c.z0 - m && qz < c.z1 + m && R.x > c.x0 - m && R.z > c.z0 - m);
  }

  // beber zit
  const src = oilSources().find((o) => dist(R.x, R.z, o.x, o.z) < o.r);
  if (src && R.carry < CARRY_MAX && !dashing) {
    R.fill += dt / src.rate;
    if (R.fill >= 1) {
      R.fill = 0; R.carry++; sfx.sip(); burst(R.x, 0.6, R.z, '#ffd23f', 4, 2, 3); R.squash = 0.5; if (st.tut < 2) st.tut = 2;
      if (src.amount !== undefined && --src.amount <= 0) { src.oil.visible = false; floater('vacío', src.x, src.z, '#b9c8ff'); } else if (src.amount) src.oil.scale.set(src.amount / 3, 1, src.amount / 3);
    }
  } else R.fill = 0;
  for (const d of looseDrops) {
    if (d.on && R.carry < CARRY_MAX && dist(R.x, R.z, d.x, d.z) < 0.9) { d.on = false; d.m.visible = false; R.carry++; R.squash = 0.5; sfx.pickup(); burst(d.x, 0.4, d.z, '#ffd23f', 6, 2.5, 3.5); if (st.tut < 2) st.tut = 2; }
  }
  // gotitas que va dejando al cargar
  R.dripT -= dt;
  if (R.carry > 0 && sp > 1 && R.dripT <= 0) { burst(R.x - Math.cos(R.head) * 0.6, 0.3, R.z - Math.sin(R.head) * 0.6, '#f2b705', 1, 0.3, 0.6, 0.9); R.dripT = 0.3 / R.carry; }

  // soltar una gota: charco resbaladizo
  const atHole = dist(R.x, R.z, world.hole.x, world.hole.z) < 1.6;
  if (pressed.has('KeyE') && R.carry > 0 && !atHole) {
    const s = slicks.find((q) => !q.on) || slicks.reduce((a, b) => (a.t > b.t ? a : b));
    Object.assign(s, { on: true, t: 0, x: R.x - Math.cos(R.head) * 0.5, z: R.z - Math.sin(R.head) * 0.5 });
    s.m.position.set(s.x, 0.04, s.z); s.m.visible = true; s.m.scale.setScalar(0.2);
    R.carry--; sfx.drip(); burst(s.x, 0.2, s.z, '#f2b705', 6, 2.5, 2); if (st.tut === 3) st.tut = 4;
  }

  // entregar en el agujero, gota a gota
  if (R.carry > 0 && atHole) {
    R.deliverT -= dt;
    if (R.deliverT <= 0) {
      R.deliverT = 0.16; R.carry--; R.delivered++; st.stolen++; st.punchOil = 0.3;
      sfx.coin(R.delivered + st.combo); addScore(10 * st.combo, '', 0, 0);
      floater(`+${10 * st.combo}`, world.hole.x + rand(-0.4, 0.8), world.hole.z + rand(-0.6, 0.6));
      burst(world.hole.x + 0.3, 0.5, world.hole.z, '#ffd23f', 5, 2.5, 4.5); babies.forEach((b) => { b.hop = 0.4; });
      if (R.carry === 0) {
        if (R.delivered >= CARRY_MAX) { addScore(20, '¡Carga completa!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
        if (st.combo < 5) { st.combo++; floater(`combo x${st.combo}`, R.x, R.z - 0.8, '#ffb347'); }
        R.delivered = 0;
        if (st.tut < 3) { st.tut = 3; say('E suelta una gota: quien la pise, resbala', 4); }
      }
      if (st.stolen >= st.quota) clearNight();
    }
  } else if (!atHole) { R.deliverT = 0; R.delivered = 0; }
}

// ---------- la jadda ----------
function bfs(from, to) {
  const prev = new Map([[from, -1]]), q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) break;
    for (const m of world.adj[n]) if (!prev.has(m)) { prev.set(m, n); q.push(m); }
  }
  const path = [];
  for (let n = to; n !== from && n !== undefined && n !== -1; n = prev.get(n)) path.unshift(n);
  return path;
}

function nearestNode(x, z) {
  let best = 0, bd = 1e9;
  world.nodes.forEach((n, i) => { const d = dist(x, z, n.x, n.z); if (d < bd) { bd = d; best = i; } });
  return best;
}

function grannyWalk(dt, speed) { // avanza hacia route[0]; devuelve true al llegar a un nodo
  if (!G.route.length) return true;
  const n = world.nodes[G.route[0]], dx = n.x - G.x, dz = n.z - G.z, d = Math.hypot(dx, dz), step = speed * dt;
  const before = G.walk; G.walk += dt * speed * 1.3;
  if (Math.floor(before / Math.PI) !== Math.floor(G.walk / Math.PI)) {
    sfx.step_(); const near = dist(G.x, G.z, R.x, R.z);
    if (near < 9) st.shake = Math.max(st.shake, 0.06 * (1 - near / 9));
    burst(G.x, 0.1, G.z, '#e6dcc4', 2, 1.5, 1, 0.3);
  }
  const s = slicks.find((q) => q.on && dist(G.x, G.z, q.x, q.z) < 1.25);
  if (s) { grannySlip(s); return false; }
  if (d <= step) { G.x = n.x; G.z = n.z; G.prev = G.node; G.node = G.route.shift(); return true; }
  G.x += dx / d * step; G.z += dz / d * step;
  return false;
}

function grannySlip(s) {
  s.on = false; s.m.visible = false;
  G.state = 'slip'; G.t = 3.8; st.detect = 0; st.slow = 0.5; st.kick = 0.1; sfx.slip();
  gsay('¡Ay ay ay! ¡Dahri!', 2.6); addScore(50, '¡Resbalón!', G.x, G.z, '#9be7a0');
  burst(G.x, 0.2, G.z, '#f2b705', 10, 5, 4);
}

function turnTo(a, dt, rate = 5) { G.face += wrap(a - G.face) * Math.min(1, dt * rate); }

function canSeeRoach(range, half) {
  if (!R.alive || R.hidden || R.inv > 0 || st.light < 0.5) return false;
  const d = dist(R.x, R.z, G.x, G.z);
  return d < range && Math.abs(wrap(Math.atan2(R.z - G.z, R.x - G.x) - G.face)) < half;
}

function updateGranny(dt) {
  G.sayT -= dt; G.hear = Math.max(0, G.hear - dt);
  const n = st.night;
  if (G.state === 'away') {
    G.t -= dt;
    if (G.t <= 0) { G.state = 'warn'; G.t = 2.3; G.walk = 0; world.doorGlow.visible = true; say(st.tut < 5 ? '¡Viene la jadda! Escóndete bajo un mueble' : '¡Viene la jadda!', 2.6); }
    st.detect = Math.max(0, st.detect - dt);
    return;
  }
  if (G.state === 'warn') {
    G.t -= dt; const b = G.walk; G.walk += dt * 5;
    if (Math.floor(b / Math.PI) !== Math.floor(G.walk / Math.PI)) { sfx.step_(); st.shake = Math.max(st.shake, 0.05); }
    if (G.t <= 0) {
      Object.assign(G, { state: 'patrol', x: world.nodes[0].x, z: world.nodes[0].z, node: 0, prev: -1, route: [], linger: 1, visit: rand(12, 17) + n, leaving: false, face: Math.PI / 2, baseFace: Math.PI / 2, hear: 0 });
      grannyMesh.visible = true; world.doorGlow.visible = false; setLight(true);
      gsay(pick(['¿Quién anda ahí?', 'Bismillah...', 'Mmm... un atay', '¿Y ese ruido?']));
    }
    return;
  }
  if (G.state === 'slip') {
    G.t -= dt;
    if (G.t <= 0) { G.state = 'patrol'; G.linger = 1.2; G.baseFace = G.face; gsay('Ya verás tú...', 1.5); }
    return;
  }

  const toRoach = Math.atan2(R.z - G.z, R.x - G.x), dR = dist(R.x, R.z, G.x, G.z);

  if (G.state === 'patrol') {
    G.visit -= dt;
    if ((R.sprint || R.dashT > 0) && dR < 9 && R.alive) G.hear = 1.3;          // correr y volar hacen ruido
    if (G.hear > 0) turnTo(toRoach, dt, 7);
    else if (G.linger > 0) {
      G.linger -= dt; turnTo(G.baseFace + Math.sin(st.clock * 1.4) * 1.0, dt, 3);
      if (G.linger <= 0) {
        if (G.leaving && G.node === 0) { G.state = 'away'; G.t = Math.max(3.5, rand(7, 11) - n * 0.6); grannyMesh.visible = false; setLight(false); st.tut = Math.max(st.tut, 5); return; }
        if (G.route.length) { /* sigue el camino que llevaba */ }
        else if (G.visit <= 0) { G.route = bfs(G.node, 0); G.leaving = true; if (!G.route.length) G.linger = 0.3; else gsay('Tfou... a dormir', 1.5); }
        else { const opts = world.adj[G.node].filter((m) => m !== G.prev); G.route = [pick(opts.length ? opts : world.adj[G.node])]; }
      }
    } else {
      const nd = world.nodes[G.route[0]];
      if (nd) turnTo(Math.atan2(nd.z - G.z, nd.x - G.x), dt, 6);
      if (grannyWalk(dt, 3.1 + n * 0.2) && !G.route.length) { G.linger = G.leaving ? 0.4 : rand(1.2, 2.4); G.baseFace = G.face; }
      if (G.state !== 'patrol') return;
    }
    if (canSeeRoach(VISION, VISION_HALF)) st.detect += dt * (R.moving ? 1.7 : 0.75) * (1.35 - dR / VISION);
    else st.detect = Math.max(0, st.detect - dt * 0.45);
    if (st.detect >= 1) {
      Object.assign(G, { state: 'hunt', lost: 0, throwCd: 0.7, sprayCd: 1.5, reroute: 0, lastX: R.x, lastZ: R.z });
      st.detect = 1; st.seen = true; gsay('¡¡SRAK ZIT!!', 1.6); sfx.alarm(); st.flash = 0.25;
      st.banner = { text: '¡¡SRAK ZIT!!', t: 0.9 }; hitstop(0.32); st.kick = 0.14;
    }
    return;
  }

  if (G.state === 'gloat') {
    G.t -= dt;
    if (G.t <= 0) { G.state = 'patrol'; G.visit = Math.min(G.visit, 2); G.linger = 0.5; G.baseFace = G.face; G.leaving = false; }
    return;
  }

  // persecución
  const sees = canSeeRoach(18, Math.PI);
  if (sees) { G.lost = 0; G.lastX = R.x; G.lastZ = R.z; } else G.lost += dt;
  st.detect = clamp(1 - G.lost / 3.6, 0, 1);
  turnTo(Math.atan2(G.lastZ - G.z, G.lastX - G.x), dt, 8);
  if (G.lost > 3.6 || !R.alive) {
    G.state = 'patrol'; G.linger = 1.2; G.baseFace = G.face; st.detect = 0.2;
    if (R.alive) { gsay('¿Fin mchiti?', 1.8); addScore(15, 'Despistada', R.x, R.z, '#9be7a0'); }
    return;
  }
  G.reroute -= dt;
  if (G.reroute <= 0 && !G.route.length) {
    G.reroute = 0.8;
    const target = nearestNode(G.lastX, G.lastZ);
    if (dist(G.x, G.z, G.lastX, G.lastZ) > 6.5 && target !== G.node) G.route = bfs(G.node, target).slice(0, 1);
  }
  grannyWalk(dt, 4 + n * 0.2);
  if (G.state !== 'hunt') return;

  G.throwCd -= dt; G.sprayCd -= dt;
  if (G.throwCd <= 0 && S.st === 'idle') {
    if (!sees && R.hidden && n >= 3 && P.st === 'idle' && G.sprayCd <= 0) {
      P.st = 'warn'; P.t = 0.9; P.x = R.x; P.z = R.z; G.sprayCd = 6; G.throwCd = 1.2;
      gsay('¡Toma Baygon!', 1.4); sfx.spray();
    } else {
      const lead = sees ? 0.42 : 0;
      S.st = 'fly'; S.t = 0; S.dur = Math.max(0.5, 0.88 - n * 0.05);
      S.from.set(G.x, 4.6, G.z);
      S.to.set(clamp(G.lastX + R.vx * lead, ROOM.x0 + 0.6, ROOM.x1 - 0.6), 0.15, clamp(G.lastZ + R.vz * lead, ROOM.z0 + 0.6, ROOM.z1 - 0.6));
      const cover = world.covers.find((c) => S.to.x > c.x0 && S.to.x < c.x1 && S.to.z > c.z0 && S.to.z < c.z1);
      S.harmless = !!cover; if (cover) S.to.y = cover.h + 0.15;
      G.throwCd = Math.max(0.95, 1.9 - n * 0.14); G.arm = 0.4; sfx.whoosh();
    }
  }
}

function updateSlipper(dt) {
  marker.visible = false;
  if (S.st === 'idle') { slipMesh.visible = false; return; }
  slipMesh.visible = true; S.t += dt;
  if (S.st === 'fly') {
    const k = Math.min(1, S.t / S.dur);
    slipMesh.position.lerpVectors(S.from, S.to, k); slipMesh.position.y += Math.sin(k * Math.PI) * 4;
    slipMesh.rotation.set(0, st.clock * 9, k * 14);
    marker.visible = !S.harmless; marker.position.set(S.to.x, 0.06, S.to.z); marker.scale.setScalar(0.35 + k * 0.95);
    marker.material.color.set('#ff2d2d'); marker.material.opacity = 0.3 + 0.3 * Math.sin(st.clock * 30);
    if (k >= 1) {
      S.st = 'landed'; S.t = 0; slipMesh.rotation.set(0, rand(0, 6), 0); sfx.slap(); st.shake = Math.max(st.shake, 0.3); hitstop(0.05);
      burst(S.to.x, S.to.y, S.to.z, '#e9dcc0', 12, 6, 3.5); ring(S.to.x, S.to.z, 2.6, '#ffffff', 0.35, 0.6);
      const d = dist(R.x, R.z, S.to.x, S.to.z);
      if (!S.harmless && !R.hidden && d < 1.3) killRoach('slipper');
      else if (R.alive && d < 2.9) { st.slow = 0.35; addScore(10, '¡Por los pelos!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
    }
  } else if (S.st === 'landed') {
    if (S.t > 0.5) { S.st = 'back'; S.t = 0; S.from.copy(slipMesh.position); }
  } else if (S.st === 'back') {
    const k = Math.min(1, S.t / 0.35);
    S.to.set(G.x, 4.6, G.z); slipMesh.position.lerpVectors(S.from, S.to, k); slipMesh.rotation.z = k * 10;
    if (k >= 1 || !grannyMesh.visible) S.st = 'idle';
  }
}

function updateSpray(dt) {
  if (P.st === 'idle') { cloud.visible = false; R.poison = Math.max(0, R.poison - dt); return; }
  P.t -= dt;
  if (P.st === 'warn') {
    marker.visible = true; marker.position.set(P.x, 0.06, P.z); marker.scale.setScalar(2.3);
    marker.material.color.set('#7dff5c'); marker.material.opacity = 0.2 + 0.15 * Math.sin(st.clock * 30);
    if (P.t <= 0) { P.st = 'cloud'; P.t = 3.6; cloud.position.set(P.x, 0, P.z); }
    return;
  }
  cloud.visible = true;
  cloud.children.forEach((m, i) => { m.position.y = 0.7 + Math.sin(st.clock * 2 + i) * 0.25; m.scale.setScalar(Math.min(1, (3.6 - P.t) * 3) * Math.min(1, P.t * 2)); });
  if (R.alive && dist(R.x, R.z, P.x, P.z) < 2.3) { R.poison += dt; if (R.poison > 0.85) killRoach('spray'); }
  else R.poison = Math.max(0, R.poison - dt);
  if (P.t <= 0) P.st = 'idle';
}

// ---------- Mchicha, el gato: manda en la oscuridad ----------
function updateCat(dt) {
  if (!K.on) return;
  K.t -= dt;
  const dark = !st.lightOn, d = dist(R.x, R.z, K.x, K.z);
  const hears = dark && R.alive && R.inv <= 0 && !R.lowHidden && d < R.noise * (K.state === 'sleep' ? 0.6 : 1);
  const alert = () => { K.state = 'alert'; K.t = 0.75; sfx.meow(); };
  if (K.state === 'sleep') {
    if (hears) alert();
    else if (dark && K.t <= 0) {
      const [tx, tz] = pick(world.catSpots.filter(([x, z]) => dist(x, z, K.x, K.z) > 3));
      Object.assign(K, { state: 'prowl', tx, tz });
    }
  } else if (K.state === 'prowl') {
    const dx = K.tx - K.x, dz = K.tz - K.z, l = Math.hypot(dx, dz);
    if (hears) alert();
    else if (!dark || l < 0.2) { K.state = 'sleep'; K.t = rand(3.5, 6.5); }
    else { K.x += dx / l * 2.4 * dt; K.z += dz / l * 2.4 * dt; K.face += wrap(Math.atan2(dz, dx) - K.face) * Math.min(1, dt * 6); K.walk += dt * 9; }
  } else if (K.state === 'alert') {
    K.face += wrap(Math.atan2(R.z - K.z, R.x - K.x) - K.face) * Math.min(1, dt * 12);
    if (K.t <= 0) {
      const tx = R.x + R.vx * 0.18, tz = R.z + R.vz * 0.18, l = Math.hypot(tx - K.x, tz - K.z) || 1;
      Object.assign(K, { state: 'pounce', vx: (tx - K.x) / l * 15, vz: (tz - K.z) / l * 15, dur: Math.min(0.7, (l + 1.2) / 15), dodged: false });
      K.t = K.dur; K.face = Math.atan2(K.vz, K.vx); sfx.hiss();
    }
  } else if (K.state === 'pounce') {
    K.x = clamp(K.x + K.vx * dt, ROOM.x0 + 1, ROOM.x1 - 1); K.z = clamp(K.z + K.vz * dt, ROOM.z0 + 1, ROOM.z1 - 1);
    if (R.alive && !R.lowHidden && d < 1.15) {
      if (R.air < 0.25) killRoach('cat');
      else if (!K.dodged) { K.dodged = true; st.slow = 0.35; addScore(15, '¡Olé!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
    }
    const s = slicks.find((q) => q.on && dist(K.x, K.z, q.x, q.z) < 1.2);
    if (s) { s.on = false; s.m.visible = false; K.state = 'slide'; K.t = 2.4; sfx.slip(); addScore(30, '¡Patinazo!', K.x, K.z, '#9be7a0'); burst(K.x, 0.2, K.z, '#f2b705', 8, 4, 3); }
    else if (K.t <= 0) { K.state = 'recover'; K.t = 1.5; burst(K.x, 0.1, K.z, '#e6dcc4', 6, 3, 1.5, 0.4); }
  } else if (K.state === 'slide') {
    K.x = clamp(K.x + K.vx * 0.3 * dt, ROOM.x0 + 1, ROOM.x1 - 1); K.z = clamp(K.z + K.vz * 0.3 * dt, ROOM.z0 + 1, ROOM.z1 - 1);
    if (K.t <= 0) { K.state = 'recover'; K.t = 1.2; }
  } else if (K.t <= 0) { K.state = 'sleep'; K.t = dark ? rand(0.5, 1.5) : 3; }
}

// ---------- cinemática de entrada ----------
function playCine(steps, done) { Object.assign(cine, { steps, i: 0, t: 0, done }); st.mode = 'cine'; steps[0].enter?.(); }
function endCine() { const d = cine.done; cine.steps = null; d(); }
function updateCine(dt) {
  const s = cine.steps[cine.i], before = cine.t;
  s.update?.(dt, Math.min(1, cine.t / s.dur));
  cine.t += dt;
  const text = s.cap || s.say?.text;
  if (text && Math.floor(before * 34) !== Math.floor(cine.t * 34) && cine.t * 34 < text.length && Math.floor(cine.t * 34) % 2 === 0) sfx.blip();
  if (cine.t >= s.dur) { cine.i++; cine.t = 0; if (cine.i >= cine.steps.length) endCine(); else cine.steps[cine.i].enter?.(); }
}

function playIntro() {
  const h = world.hole, oil = world.oil[0], door = world.nodes[0];
  const place = (x, z, head) => { Object.assign(R, { x, z, head, vx: 0, vz: 0, air: 0, carry: 0, alive: true, inv: 0 }); };
  place(h.x - 1.2, h.z, 0); roachMesh.visible = false; grannyMesh.visible = false; setLight(false);
  playCine([
    { dur: 2.6, cam: [h.x + 2, h.z, 1.5], cap: 'Marrakech. Las 3:07 de la madrugada.' },
    { dur: 2.9, cam: [h.x + 2, h.z, 1.7], say: { who: 'baby', text: '¡Baba! ¡Tenemos hambre!' },
      enter: () => { roachMesh.visible = true; },
      update: (dt, k) => { R.x = lerp(h.x - 0.8, h.x + 3.2, ease(Math.min(1, k * 1.6))); R.vx = k < 0.6 ? 4 : 0; if (k > 0.6) R.head += wrap(Math.PI - R.head) * Math.min(1, dt * 8); babies.forEach((b, i) => { if (Math.sin(k * 20 + i * 2) > 0.9) b.hop = 0.3; }); } },
    { dur: 3.0, cam: [h.x + 2, h.z, 1.7], say: { who: 'roach', text: 'Tranquilos, wlidati. Hoy cenamos zit.' },
      enter: () => { R.vx = 0; R.head = Math.PI; }, update: (dt, k) => { R.air = k > 0.7 && k < 0.85 ? Math.sin((k - 0.7) / 0.15 * Math.PI) * 0.4 : 0; } },
    { dur: 3.2, cam: [oil.x - 1.5, oil.z - 1.5, 1.4], cap: 'Zit zitoun. Cinco litros. Sin vigilancia...',
      update: () => { if (Math.random() < 0.12) burst(oil.x + rand(-1, 1), rand(0.5, 2), oil.z + rand(-1, 1), '#fff6d6', 1, 0.3, 0.8, 0.5, 2); } },
    { dur: 3.6, cam: [door.x - 1, door.z + 2.5, 1.35], cap: '...casi.',
      enter: () => { world.doorGlow.visible = true; G.walk = 0; },
      update: (dt, k) => {
        const b = G.walk; G.walk += dt * 5;
        if (k < 0.5 && Math.floor(b / Math.PI) !== Math.floor(G.walk / Math.PI)) { sfx.step_(); st.shake = 0.12; }
        if (k >= 0.5 && !grannyMesh.visible) { Object.assign(G, { x: door.x, z: door.z, face: 1.9, state: 'cine', route: [] }); grannyMesh.visible = true; world.doorGlow.visible = false; setLight(true); gsay('¿Quién anda ahí?', 1.8); st.kick = 0.1; }
        if (grannyMesh.visible) G.face = 1.9 + Math.sin(st.clock * 2.2) * 0.7;
      } },
    { dur: 2.0, cam: [h.x + 2, h.z, 1.8], say: { who: 'roach', text: '¡Bismillah!' },
      enter: () => { grannyMesh.visible = false; setLight(false); R.head = 0; sfx.gulp(); },
      update: (dt, k) => { R.air = k < 0.3 ? Math.sin(k / 0.3 * Math.PI) * 0.6 : 0; R.scared = 1; } },
  ], () => { st.introSeen = true; R.scared = 0; grannyMesh.visible = false; world.doorGlow.visible = false; G.sayT = 0; startNight(1); });
}

// ---------- luces y cámara ----------
const C = (h) => new THREE.Color(h);
const moonC = C('#7f9be6'), dawnC = C('#ffa066'), lampC = C('#ffe6bd'), tmpC = new THREE.Color();
const hemiN = C('#3a4a8a'), hemiL = C('#fff1dc'), gndN = C('#141428'), gndL = C('#7a6a58');
const winN = C('#9db8ff'), winD = C('#ffb26b'), tintN = C('#b9c8ff'), tintL = C('#ffffff');

function updateLight(dt) {
  st.lightT += dt;
  const t = st.lightT;
  const target = st.lightOn ? (t < 0.07 ? 1 : t < 0.15 ? 0.1 : t < 0.24 ? 0.9 : t < 0.3 ? 0.25 : 1) : 0;
  st.light = st.lightOn ? target : Math.max(0, st.light - dt * 8);
  const playing = ['play', 'intro', 'clear', 'dawn', 'over'].includes(st.mode);
  const a = st.light, dawn = playing ? clamp((st.time / st.nightLen - 0.72) / 0.28, 0, 1) : 0;
  tmpC.copy(moonC).lerp(dawnC, dawn);
  world.sun.color.copy(tmpC).lerp(lampC, a);
  world.sun.intensity = lerp(1.7 + dawn * 0.6, 2.3, a);
  world.sun.position.lerpVectors(world.moonPos, world.lampPos, a);
  world.hemi.color.copy(hemiN).lerp(hemiL, a); world.hemi.groundColor.copy(gndN).lerp(gndL, a);
  world.hemi.intensity = lerp(1.25 + dawn * 0.4, 1.3, a);
  world.windowMat.color.copy(winN).lerp(winD, dawn);
  gfx.post.uniforms.tint.value.copy(tintN).lerp(tintL, Math.max(a, dawn * 0.6));
  world.holeLight.intensity = 5 + Math.sin(st.clock * 6) * 0.8;
  const danger = st.mode !== 'play' ? 0 : G.state === 'hunt' ? 0.75 + Math.sin(st.clock * 10) * 0.25 : K.state === 'alert' || K.state === 'pounce' ? 0.7 : st.detect * 0.5;
  st.danger += (danger - st.danger) * Math.min(1, dt * 8);
  gfx.post.uniforms.danger.value = st.danger;
}

const camT = new THREE.Vector3();
function updateCamera(dt, raw) {
  let tx, tz, zoom = 1, rate = 5;
  if (st.mode === 'title') { tx = -9.4 + Math.sin(st.clock * 0.25) * 0.6; tz = 3.6; zoom = 1.35; }
  else if (st.mode === 'cine') { [tx, tz, zoom] = cine.steps[cine.i].cam; rate = 3.2; }
  else if (st.mode === 'clear') { tx = world.hole.x + 3.6; tz = world.hole.z + 1.6; zoom = 1.6; rate = 3; }
  else {
    tx = clamp(R.x + R.vx * 0.25, -12, 12); tz = clamp(R.z + R.vz * 0.25, -7.5, 7.5);
    if (!R.alive || st.mode === 'over') { tx = R.x; tz = R.z; zoom = 1.35; }
  }
  const k = 1 - Math.exp(-raw * rate);
  cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
  st.kick = Math.max(0, st.kick - raw * 0.5);
  st.zoom += (zoom - st.zoom) * (1 - Math.exp(-raw * 4));
  gfx.setZoom(st.zoom + st.kick);
  st.shake = Math.max(0, st.shake - raw);
  const s = st.shake * 0.9;
  gfx.setTarget(camT.set(cam.x + rand(-s, s), 0, cam.z + rand(-s, s)));
}

// ---------- sincronizar mallas ----------
function syncMeshes(dt) {
  const sp = Math.hypot(R.vx, R.vz);
  R.walk += dt * Math.min(sp, 9) * 3.2;
  roachMesh.position.set(R.x, 0, R.z);
  if (R.alive) {
    roachMesh.rotation.y = -R.head;
    if (st.mode !== 'cine') roachMesh.visible = R.inv <= 0 || Math.floor(st.clock * 14) % 2 === 0;
    const scared = st.mode === 'play' ? clamp(st.detect * 1.5, 0, 1) : (R.scared || 0);
    animRoach(roachMesh, { phase: R.walk, speed: sp / 6.4, time: st.clock, turn: R.turn, air: R.air, wing: R.wing, scared, carry: R.carry, squash: R.squash });
  }
  babies.forEach((b, i) => {
    b.hop = Math.max(0, b.hop - dt);
    b.m.position.y = Math.sin(clamp(b.hop / 0.4, 0, 1) * Math.PI) * 0.5;
    animRoach(b.m, { phase: st.clock * 6, speed: b.hop > 0 ? 0.6 : 0, time: st.clock + i * 1.7, turn: 0, air: 0, wing: 0, scared: 0, carry: 0, squash: 0 });
  });

  if (grannyMesh.visible) {
    const moving = G.route.length > 0 && G.state !== 'slip';
    let tilt = moving ? Math.sin(G.walk) * 0.05 : 0, y = moving ? Math.abs(Math.sin(G.walk)) * 0.14 : 0;
    if (G.state === 'slip') { // patas arriba
      const e = 3.8 - G.t, down = clamp(e / 0.45, 0, 1), up = clamp(G.t / 0.6, 0, 1);
      tilt = Math.PI / 2 * Math.min(ease(down), up); y = Math.sin(down * Math.PI) * 1.6 + (down >= 1 && up >= 1 ? 0.75 : 0);
      if (e - dt < 0.45 && e >= 0.45) { st.shake = 0.55; sfx.slap(); burst(G.x, 0.2, G.z, '#e6dcc4', 16, 7, 4); ring(G.x, G.z, 4, '#ffffff', 0.5, 0.6); }
    }
    grannyMesh.position.set(G.x, y, G.z);
    grannyMesh.rotation.set(0, -G.face, tilt);
    const u = grannyMesh.userData, hunting = G.state === 'hunt';
    G.arm += ((hunting ? -0.5 : -2.5) - G.arm) * Math.min(1, dt * 7);
    u.arm.rotation.z = G.arm;
    u.held.visible = S.st === 'idle';
    u.cone.visible = st.light > 0.5 && G.state !== 'gloat' && G.state !== 'slip';
    u.cone.material.color.set(hunting ? '#ff3030' : '#ff9f1c');
    u.cone.material.opacity = hunting ? 0.16 : 0.3;
    if (hunting && Math.random() < dt * 9) burst(G.x, 5.6, G.z, '#ffffff', 1, 1.2, 2.5, 0.5, 3); // humo de cabreo
  }

  if (K.on) {
    catMesh.position.set(K.x, 0, K.z); catMesh.rotation.y = -K.face;
    animCat(catMesh, K.state, st.clock, K.walk, K.state === 'pounce' ? 1 - K.t / K.dur : 0);
  }

  const inWorld = ['play', 'intro', 'dawn', 'over'].includes(st.mode);
  for (const c of world.covers) {
    const ghost = !!c.hides && inWorld;
    if (c.ghost === ghost) continue;
    c.ghost = ghost; c.decal.visible = ghost;
    c.top.traverse((o) => { if (o.isMesh) { o.userData.mat ??= o.material; o.material = ghost ? GHOST : o.userData.mat; } });
  }
  for (const d of looseDrops) if (d.on) d.m.position.y = 0.28 + Math.sin(st.clock * 4 + d.x) * 0.09;
  for (const s of slicks) if (s.on) { s.t += dt; s.m.scale.setScalar(Math.min(1, s.m.scale.x + dt * 5)); s.m.material.opacity = 0.7 + Math.sin(st.clock * 5 + s.x) * 0.15; }
  for (const f of rings) {
    if (f.t >= f.dur) { f.m.visible = false; continue; }
    f.t += dt; const k = Math.min(1, f.t / f.dur);
    f.m.scale.setScalar(f.r * (0.25 + 0.75 * ease(k))); f.m.material.opacity = f.op * (1 - k);
  }
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt;
    p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.07, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    if (p.m.position.y <= 0.07) { p.vx *= 0.8; p.vz *= 0.8; }
    if (p.life <= 0) p.m.visible = false;
  }
  for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].t += dt; if (floaters[i].t >= floaters[i].dur) floaters.splice(i, 1); }
  st.flash = Math.max(0, st.flash - dt * 2.5);
  gfx.post.uniforms.flash.value = st.flash * 0.6;
}

// ---------- HUD ----------
const v3 = new THREE.Vector3();
const proj = (x, y, z) => gfx.project(v3.set(x, y, z));
const SOFT = '#b9c8ff', GREEN = '#9be7a0', RED = '#ff5a5a';

function pointer(x, z, label, color) {
  const p = proj(x, 1.4, z), { W, H } = hud, m = 16;
  if (p.x > m && p.x < W - m && p.y > 44 && p.y < H - 30) { hud.arrow(p.x, p.y - 10 + Math.sin(st.clock * 6) * 2, Math.PI / 2, color, 4); return; }
  const cx = clamp(p.x, m + 6, W - m - 6), cy = clamp(p.y, 48, H - 34);
  hud.arrow(cx, cy, Math.atan2(p.y - cy, p.x - cx), color, 5);
  hud.text(label, clamp(cx, 22, W - 22), cy + (cy > H / 2 ? -12 : 12), { color });
}

function toast(msg, y) {
  const lines = hud.wrap(msg, hud.W - 60), w = Math.max(...lines.map((l) => hud.width(l))) + 16, h = lines.length * 10 + 8;
  hud.panel(hud.W / 2 - w / 2, y - h, w, h);
  lines.forEach((l, i) => hud.text(l, hud.W / 2, y - h + 9 + i * 10, { color: CREAM, outline: null }));
}

function drawWorldMarks() {
  const { W, H } = hud;
  if (st.mode === 'play' && R.alive) {
    if (R.carry > 0) pointer(world.hole.x, world.hole.z, 'CASA', '#ffb347');
    if (R.carry === 0) {
      const src = oilSources().reduce((a, b) => (dist(R.x, R.z, a.x, a.z) < dist(R.x, R.z, b.x, b.z) ? a : b));
      pointer(src.x, src.z, 'ZIT', GOLD);
    }
    const p = proj(R.x, 1.3 + R.air, R.z);
    if (R.fill > 0) hud.bar(p.x - 9, p.y - 9, 18, 3, R.fill, GOLD);
    if (st.detect > 0.02) {
      const hunt = G.state === 'hunt';
      hud.eye(p.x, p.y - 18 - (hunt ? Math.abs(Math.sin(st.clock * 12)) * 2 : 0), st.detect, hunt);
      if (!hunt) hud.bar(p.x - 8, p.y - 12, 16, 2, st.detect, '#ffb347');
    } else if (R.hidden && st.light > 0.5) hud.text('oculta', p.x, p.y - 12, { color: GREEN });
    if (R.poison > 0.1) hud.text('¡cof!', p.x + 14, p.y - 6, { color: '#7dff5c' });
  }
  if (grannyMesh.visible) {
    const p = proj(G.x, G.state === 'slip' ? 2.5 : 6.6, G.z);
    if (G.state === 'slip') for (let i = 0; i < 3; i++) { const a = st.clock * 6 + i * 2.1; hud.text('*', p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 4, { color: GOLD }); }
    if (G.sayT > 0) hud.bubble([G.say], p.x, Math.max(52, p.y), G.state === 'hunt' ? { bg: '#d62828', color: '#ffffff', shake: 2 } : {});
    else if (st.mode === 'play' && (p.x < 0 || p.x > W || p.y > H + 60)) { // aviso de por dónde anda
      const cx = clamp(p.x, 14, W - 14), cy = clamp(p.y - 30, 50, H - 40);
      hud.rect(cx - 5, cy - 5, 10, 10, INK); hud.rect(cx - 4, cy - 4, 8, 4, '#d62828'); hud.rect(cx - 3, cy, 6, 4, '#c68a5b'); hud.rect(cx - 2, cy + 1, 1, 1, INK); hud.rect(cx + 1, cy + 1, 1, 1, INK);
    }
  }
  if (K.on && st.mode === 'play') {
    const p = proj(K.x, 2.4, K.z);
    if (K.state === 'sleep' && !st.lightOn) hud.text('z'.repeat(1 + Math.floor(st.clock * 1.5) % 3), p.x + 8, p.y, { color: SOFT });
    if (K.state === 'alert') hud.text('!', p.x, p.y - 4 - Math.abs(Math.sin(st.clock * 14)) * 3, { color: RED, scale: 2 });
    if (K.state === 'slide') hud.text('?!', p.x, p.y, { color: GOLD });
  }
  for (const f of floaters) {
    const k = f.t / f.dur, p = proj(f.x, f.h + ease(k) * 1.6, f.z);
    if (k < 0.85 || Math.floor(st.clock * 20) % 2) hud.text(f.text, clamp(p.x, 30, W - 30), p.y, { color: f.color, scale: f.scale });
  }
}

function drawPlayHud() {
  const { W, H } = hud, cx = W / 2;
  // zit robado y carga
  hud.panel(3, 3, 76, 33);
  hud.bottle(9, 8, st.stolen / st.quota, st.clock);
  hud.text(`${st.stolen}/${st.quota}`, 25, 13 - (st.punchOil > 0 ? 2 : 0), { scale: 2, color: st.punchOil > 0 ? '#ffffff' : GOLD, align: 'left' });
  for (let i = 0; i < CARRY_MAX; i++) hud.drop(28 + i * 10, 24, GOLD, i >= R.carry);
  // la noche
  const k = clamp(st.time / st.nightLen, 0, 1), late = k > 0.8, bw = Math.min(110, W - 190), bx = cx - bw / 2;
  hud.text(late && Math.floor(st.clock * 3) % 2 ? '¡AMANECE!' : `NOCHE ${st.night}`, cx, 8, { color: late ? '#ffa066' : SOFT });
  hud.bar(bx, 17, bw, 4, k, late ? '#ff7a3b' : '#5a6ad0', '#1c2247');
  hud.moon(Math.round(bx + k * bw) - 2, 16); hud.sun(Math.round(bx + bw + 5), 16, st.clock);
  // puntos y vidas
  hud.panel(W - 79, 3, 76, 33);
  hud.text(String(st.score).padStart(6, '0'), W - 10, 12 - (st.punchScore > 0 ? 1 : 0), { color: st.punchScore > 0 ? '#ffffff' : CREAM, align: 'right' });
  if (st.combo > 1) hud.text(`x${st.combo}`, W - 72, 12, { color: '#ffb347', align: 'left' });
  for (let i = 0; i < 3; i++) hud.roach(W - 72 + i * 13, 22, i < st.lives);
  // habilidades
  let x = 4; const y = H - 17;
  x += hud.keycap('ESP', x, y, R.dashCd <= 0) + 3;
  hud.bar(x, y + 9, 26, 2, 1 - R.dashCd / DASH_CD, R.dashCd <= 0 ? GREEN : '#6a6578'); hud.text('vuelo', x, y + 3, { align: 'left', color: R.dashCd <= 0 ? CREAM : '#8a86a0' });
  x += 34; x += hud.keycap('E', x, y, R.carry > 0) + 3;
  hud.text('soltar zit', x, y + 5, { align: 'left', color: R.carry > 0 ? CREAM : '#8a86a0' });
  hud.keycap('SHIFT', W - 70, y, true); hud.text('correr', W - 4, y + 5, { align: 'right', color: R.sprint ? GOLD : CREAM });

  let msg = st.msgT > 0 && st.mode === 'play' ? st.msg : '';
  if (!msg && st.mode === 'play' && st.night === 1 && R.alive) {
    if (st.tut === 0) { msg = 'Cruza la cocina y busca zit. La flecha te guía'; if (dist(R.x, R.z, world.hole.x, world.hole.z) > 7) st.tut = 1; }
    else if (st.tut === 2 && R.carry > 0) msg = 'Lleva el zit a tu agujero';
  }
  if (msg) toast(msg, H - 22);
}

function card(title, lines, color = GOLD, y0 = 0.3) {
  const { W, H } = hud, cx = W / 2, slide = (1 - ease(clamp(st.modeT * 3, 0, 1))) * W;
  const w = Math.min(W - 20, 250), h = 30 + lines.length * 12, y = Math.round(H * y0);
  hud.panel(cx - w / 2 - slide, y, w, h);
  hud.text(title, cx - slide, y + 14, { scale: 2, color });
  lines.forEach(([l, c], i) => hud.text(l, cx - slide, y + 31 + i * 12, { color: c || CREAM }));
}

function drawHud() {
  hud.clear();
  const { W, H } = hud, cx = W / 2;

  if (st.mode === 'title') {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.38)');
    const sc = W > 330 ? 5 : 4, title = 'SRAK L ZIT', tw = hud.width(title, sc), ty = Math.round(H * 0.2);
    let x = cx - tw / 2;
    for (const [i, ch] of [...title].entries()) { // letras que botan
      const w = ch === ' ' ? 4 * sc : hud.width(ch, sc) + sc, bob = Math.round(Math.sin(st.clock * 3 - i * 0.5) * 2);
      if (ch !== ' ') { hud.text(ch, x + 2, ty + bob + sc + 1, { scale: sc, color: INK, align: 'left', outline: null }); hud.text(ch, x, ty + bob + sc, { scale: sc, color: '#b3121d', align: 'left', outline: null }); hud.text(ch, x, ty + bob, { scale: sc, color: GOLD, align: 'left', outline: null }); }
      x += w;
    }
    hud.sysText('سراق الزيت', cx, ty + 36, 24, CREAM, ARABIC);
    for (let i = -6; i <= 6; i++) hud.rect(cx + i * 9 - 1, ty + 54 + (i % 2 ? 1 : 0), 3, 3, i % 2 ? '#2b5fa8' : BORDER_C);
    hud.text('la cucaracha que roba el aceite', cx, ty + 68, { color: '#e9c46a' });
    if (Math.floor(st.clock * 2) % 2) { const w = 86; hud.panel(cx - w / 2, H * 0.8 - 9, w, 18); hud.text('PULSA ENTER', cx, H * 0.8, { color: CREAM, outline: null }); }
    const keysY = H - 20; let kx = cx - 150;
    if (W > 320) for (const [k, l] of [['WASD', 'moverse'], ['SHIFT', 'correr'], ['ESP', 'vuelo'], ['E', 'soltar zit']]) { kx += hud.keycap(k, kx, keysY) + 3; kx += hud.text(l, kx, keysY + 5, { align: 'left', color: SOFT }) + 9; }
    if (st.best.score) hud.text(`récord: ${st.best.score} puntos · noche ${st.best.night}`, cx, H - 32, { color: '#8fa0d8' });
    return;
  }

  if (st.mode === 'cine') {
    const s = cine.steps[cine.i], bar = 26;
    drawWorldMarks();
    hud.rect(0, 0, W, bar, INK); hud.rect(0, H - bar, W, bar, INK);
    hud.rect(0, bar, W, 1, '#e9c46a'); hud.rect(0, H - bar - 1, W, 1, '#e9c46a');
    const typed = (t) => t.slice(0, Math.floor(cine.t * 34));
    if (s.cap) hud.wrap(typed(s.cap), W - 40).forEach((l, i) => hud.text(l, cx, H - bar + 10 + i * 10, { color: CREAM, outline: null }));
    if (s.say) {
      const p = s.say.who === 'baby' ? proj(babies[0].x + 0.3, 1.6, world.hole.z) : proj(R.x, 2.2, R.z);
      hud.bubble([typed(s.say.text) || ' '], p.x, p.y);
    }
    hud.text('ENTER: saltar', W - 6, 12, { align: 'right', color: '#6a6f9a', outline: null });
    return;
  }

  drawWorldMarks();
  drawPlayHud();

  if (st.banner) { // «¡¡SRAK ZIT!!» a toda pantalla
    const k = st.banner.t / 0.9, hgt = Math.round(40 * Math.min(1, (1 - k) * 8, k * 6));
    hud.rect(0, H * 0.42 - hgt / 2, W, hgt, '#b3121d'); hud.rect(0, H * 0.42 - hgt / 2, W, 2, GOLD); hud.rect(0, H * 0.42 + hgt / 2 - 2, W, 2, GOLD);
    if (hgt > 30) hud.text(st.banner.text, cx + 2, H * 0.42 + 2, { scale: W > 330 ? 4 : 3, color: '#5a0a10', outline: null }); hud.text(st.banner.text, cx + rand(-2, 2), H * 0.42 + rand(-1, 1), { scale: W > 330 ? 4 : 3, color: '#ffffff', outline: null });
  }

  if (st.mode === 'intro') card(`NOCHE ${st.night}`, [[`roba ${st.quota} gotas de zit antes del amanecer`], [st.news, GREEN]]);
  else if (st.mode === 'clear') {
    const r = st.res, t = st.modeT, rows = [['Zit robado', `${r.drops} gotas`], ['Tiempo sobrante', `+${r.time}`], [r.stealth ? 'Ni te ha visto' : 'Te ha visto', `+${r.stealth}`], ['Vidas', `+${r.lives}`]];
    const w = Math.min(W - 20, 210), h = 100, x = cx - w / 2, y = Math.round(H * 0.44);
    hud.panel(x, y, w, h);
    hud.text('¡ZIT ROBADO!', cx, y + 14, { scale: 2, color: GOLD });
    rows.forEach(([a, b], i) => {
      if (t < 0.7 + i * 0.45) return;
      hud.text(a, x + 14, y + 34 + i * 12, { align: 'left', color: CREAM, outline: null }); hud.text(b, x + w - 14, y + 34 + i * 12, { align: 'right', color: i === 2 && !r.stealth ? '#8a86a0' : GREEN, outline: null });
    });
    if (t > 2.7) { hud.rect(x + 12, y + 79, w - 24, 1, '#e9c46a'); hud.text('TOTAL', x + 14, y + 88, { align: 'left', color: GOLD, outline: null }); hud.text(st.score, x + w - 14, y + 88, { align: 'right', color: GOLD, outline: null }); }
    if (t > 3.4 && Math.floor(st.clock * 2) % 2) hud.text('ENTER: siguiente noche', cx, y + h + 10, { color: CREAM });
  } else if (st.mode === 'dawn') card('AMANECE...', [['no has robado bastante zit'], ['pierdes una vida', RED]], '#ffa066');
  else if (st.mode === 'over') {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.6)');
    const w = Math.min(W - 20, 240), y = Math.round(H * 0.16);
    hud.panel(cx - w / 2, y, w, 120);
    hud.text('SAFI', cx, y + 22, { scale: 4, color: RED, outline: null });
    hud.wrap(st.reason, w - 20).forEach((l, i) => hud.text(l, cx, y + 48 + i * 10, { color: CREAM, outline: null }));
    hud.text(`${st.score} puntos · noche ${st.night}`, cx, y + 76, { color: GOLD, outline: null });
    hud.text(st.score >= st.best.score && st.score > 0 ? '¡nuevo récord!' : `récord: ${st.best.score}`, cx, y + 90, { color: SOFT, outline: null });
    if (st.modeT > 1 && Math.floor(st.clock * 2) % 2) hud.text('ENTER: otra vez', cx, y + 106, { color: CREAM, outline: null });
  }

  if (st.paused) {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.6)');
    const w = 190, y = Math.round(H * 0.22); hud.panel(cx - w / 2, y, w, 108);
    hud.text('PAUSA', cx, y + 15, { scale: 2, color: GOLD });
    [['WASD / flechas', 'moverse'], ['SHIFT', 'correr (hace ruido)'], ['ESPACIO', 'vuelo corto'], ['E', 'soltar una gota'], ['M', 'silenciar'], ['P', 'seguir']].forEach(([a, b], i) => {
      hud.text(a, cx - 6, y + 34 + i * 11, { align: 'right', color: CREAM, outline: null }); hud.text(b, cx + 4, y + 34 + i * 11, { align: 'left', color: SOFT, outline: null });
    });
  }
}
const BORDER_C = '#e9c46a';

// ---------- bucle ----------
function update(raw) {
  st.clock += raw; st.punchOil -= raw; st.punchScore -= raw;
  if (st.banner && (st.banner.t -= raw) <= 0) st.banner = null;
  if (st.freeze > 0) { st.freeze -= raw; updateCamera(0, raw); return; }
  st.slow = Math.max(0, st.slow - raw);
  const dt = raw * (st.slow > 0 ? 0.3 : 1);
  st.msgT -= dt;

  if (st.mode === 'play') {
    st.time += dt;
    updateRoach(dt);
    if (st.mode === 'play') { updateGranny(dt); updateSlipper(dt); updateSpray(dt); updateCat(dt); }
    if (st.mode === 'play' && st.time >= st.nightLen) {
      st.lives--; sfx.lose();
      if (st.lives <= 0) endRun('Salió el sol y la colonia se quedó sin zit.'); else { st.mode = 'dawn'; st.modeT = 0; }
    }
    sfx.music(dt, G.state === 'hunt' ? 2 : grannyMesh.visible ? 1 : 0);
  } else if (st.mode === 'cine') updateCine(dt);
  else {
    st.modeT += dt;
    if (st.mode === 'intro' && st.modeT > 3.2) st.mode = 'play';
    else if (st.mode === 'dawn' && st.modeT > 3.2) startNight(st.night);
    else if (st.mode === 'clear') { // bailecito de la victoria
      R.head += dt * 9; R.air = Math.abs(Math.sin(st.modeT * 7)) * 0.45; R.wing = 0.6; R.carry = 0;
      babies.forEach((b, i) => { if (b.hop <= 0 && Math.sin(st.modeT * 9 + i * 2) > 0.7) b.hop = 0.4; });
      if (Math.random() < dt * 14) burst(world.hole.x + rand(0, 3), rand(1.5, 3), world.hole.z + rand(-2, 2), pick(['#ffd23f', '#fff6d6', '#f2b705']), 1, 1, 2, 0.9, 5);
      for (const [i, at] of [0.7, 1.15, 1.6, 2.05, 2.7].entries()) if (st.modeT - dt < at && st.modeT >= at) (i === 4 ? sfx.bonus() : sfx.tick());
      if (st.modeT > 9) startNight(st.night + 1);
    }
  }
  updateLight(dt); updateCamera(dt, raw); syncMeshes(dt);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!st.paused) update(dt);
  pressed.clear();
  gfx.render(); drawHud();
  requestAnimationFrame(frame);
}

function resize() {
  const scale = Math.max(1, Math.round(innerHeight / 230));
  const W = Math.ceil(innerWidth / scale), H = Math.ceil(innerHeight / scale);
  gfx.resize(W, H, scale); hud.resize(W, H, scale);
}

addEventListener('resize', resize);
addEventListener('blur', () => keys.clear());
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code); pressed.add(e.code); sfx.init();
  if (e.code === 'KeyM') sfx.toggleMute();
  if ((e.code === 'Escape' || e.code === 'KeyP') && st.mode === 'play') st.paused = !st.paused;
  if (e.code === 'Enter' || (e.code === 'Space' && st.mode !== 'play')) {
    if (st.mode === 'title' || (st.mode === 'over' && st.modeT > 1)) startGame();
    else if (st.mode === 'cine') endCine();
    else if (st.mode === 'clear' && st.modeT > 2.9) startNight(st.night + 1);
    else if (st.mode === 'intro' && st.modeT > 0.6) st.mode = 'play';
  }
});

resize();
resetRoach(); Object.assign(R, { x: -7, z: 6, head: 0.8, inv: 0 });
requestAnimationFrame(frame);
window.game = { st, R, G, K, S, P, world, gfx, keys, pressed, slicks, startGame, startNight, playIntro, update, killRoach, setLight, clearNight };
