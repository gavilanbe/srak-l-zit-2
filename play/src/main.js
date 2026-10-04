// Srak l zit — سراق الزيت. Una cucaracha marroquí roba el aceite de la cocina de noche.
import { THREE, Gfx, basic, box, sph, cyl, put, GHOST } from './gfx.js';
import { buildWorld, ROOM } from './world.js';
import { makeRoach, animRoach, makeGranny, makeSlipper } from './actors.js';
import { Hud, ARABIC, BOLD } from './hud.js';
import { Sfx } from './audio.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.random() * a.length | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const gfx = new Gfx(document.getElementById('view'));
const hud = new Hud(document.getElementById('hud'));
const sfx = new Sfx();
const world = buildWorld(gfx.scene);
const scene = gfx.scene;

const CARRY_MAX = 3, VISION = 10.5, VISION_HALF = 0.6, ROACH_R = 0.5, GRANNY_R = 1.35;

// ---------- actores y efectos ----------
const roachMesh = makeRoach(); scene.add(roachMesh);
const grannyMesh = makeGranny(); scene.add(grannyMesh); grannyMesh.visible = false;
grannyMesh.userData.cone.scale.setScalar(VISION);
const slipMesh = makeSlipper(); scene.add(slipMesh); slipMesh.visible = false;

const transp = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
const marker = put(scene, new THREE.Mesh(new THREE.CircleGeometry(1, 18), transp('#ff2d2d', 0.5)), 0, 0.06, 0);
marker.rotation.x = -Math.PI / 2; marker.visible = false;
const cloud = new THREE.Group(); scene.add(cloud); cloud.visible = false;
for (let i = 0; i < 7; i++) {
  const a = i / 7 * Math.PI * 2, m = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.9 : 1.2, 7, 5), transp('#b9f6a8', 0.45));
  m.position.set(i ? Math.cos(a) * 1.3 : 0, 0.7, i ? Math.sin(a) * 1.3 : 0); m.userData.a = a; cloud.add(m);
}

const parts = [];
for (let i = 0; i < 56; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), basic('#ffffff'));
  m.visible = false; scene.add(m); parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0 });
}
function burst(x, y, z, color, n = 8, speed = 4, up = 4) {
  for (const p of parts) {
    if (n <= 0) break;
    if (p.life > 0) continue;
    const a = rand(0, Math.PI * 2), s = rand(0.3, 1) * speed;
    p.m.position.set(x, y, z); p.m.material.color.set(color); p.m.visible = true;
    p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = rand(0.4, 1) * up; p.life = rand(0.35, 0.7); n--;
  }
}

const looseDrops = [];
for (let i = 0; i < 5; i++) {
  const m = put(scene, sph(0.24, basic('#ffd23f'), 7, 5), 0, 0.22, 0); m.castShadow = false; m.visible = false;
  looseDrops.push({ m, x: 0, z: 0, on: false });
}

// ---------- estado ----------
const R = { x: 0, z: 0, vx: 0, vz: 0, head: 0, carry: 0, fill: 0, hidden: false, alive: true, respawn: 0, inv: 0, poison: 0, walk: 0, glued: false, sprint: false, moving: false };
const G = { state: 'away', t: 0, x: 0, z: 0, face: 0, node: 0, prev: -1, route: [], linger: 0, visit: 0, leaving: false, lost: 0, throwCd: 0, sprayCd: 0, hear: 0, say: '', sayT: 0, baseFace: 0, walk: 0, arm: -2.6, reroute: 0, lastX: 0, lastZ: 0 };
const S = { st: 'idle', t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), harmless: false };
const P = { st: 'idle', t: 0, x: 0, z: 0 };
const st = {
  mode: 'title', modeT: 0, night: 1, quota: 6, stolen: 0, total: 0, lives: 3, time: 0, nightLen: 90,
  detect: 0, lightOn: false, lightT: 9, light: 0, shake: 0, flash: 0, msg: '', msgT: 0, clock: 0, paused: false,
  best: JSON.parse(localStorage.getItem('srak-l-zit.best') || '{"night":0,"total":0}'), tut: 0, reason: '',
};
const cam = new THREE.Vector3(0, 0, 0);
const keys = new Set();

function say(msg, t = 2.4) { st.msg = msg; st.msgT = t; }
function gsay(msg, t = 1.8) { G.say = msg; G.sayT = t; }

// ---------- flujo ----------
function startGame() { st.lives = 3; st.total = 0; st.tut = 0; startNight(1); }

function startNight(n) {
  st.night = n; st.quota = 4 + n * 2; st.stolen = 0; st.time = 0; st.nightLen = 82 + n * 8;
  st.detect = 0; st.mode = 'intro'; st.modeT = 2.8; st.msgT = 0;
  resetRoach();
  G.state = 'away'; G.t = n === 1 ? 9 : rand(4, 7); G.sayT = 0; grannyMesh.visible = false; world.doorGlow.visible = false;
  setLight(false); st.lightT = 9;
  S.st = 'idle'; slipMesh.visible = false; marker.visible = false; P.st = 'idle'; cloud.visible = false;
  world.bottle.visible = n >= 2; world.bottleCollider.off = n < 2;
  const traps = n < 2 ? 0 : n < 3 ? 2 : n < 5 ? 3 : 5;
  world.glue.forEach((g, i) => { g.on = i < traps; g.mesh.visible = g.on; });
  const spots = [...world.dropSpots].sort(() => Math.random() - 0.5), count = Math.min(5, 2 + (n >> 1));
  looseDrops.forEach((d, i) => { d.on = i < count; d.m.visible = d.on; if (d.on) { [d.x, d.z] = spots[i]; d.m.position.set(d.x, 0.22, d.z); } });
}

function resetRoach() {
  Object.assign(R, { x: world.hole.x + 0.6, z: world.hole.z, vx: 0, vz: 0, head: 0, carry: 0, fill: 0, alive: true, respawn: 0, inv: 2, poison: 0, glued: false });
  roachMesh.visible = true; roachMesh.scale.set(1.8, 1.8, 1.8);
}

function setLight(on) { if (st.lightOn !== on) { st.lightOn = on; st.lightT = 0; sfx.click(); } }

function killRoach(cause) {
  if (!R.alive || R.inv > 0) return;
  R.alive = false; R.respawn = 1.9; R.carry = 0; R.vx = R.vz = 0; st.lives--; st.detect = 0;
  st.shake = 0.5; st.flash = 0.5; sfx.squash();
  burst(R.x, 0.3, R.z, '#8a3b16', 12, 5, 4); burst(R.x, 0.3, R.z, '#ffd23f', 6, 4, 5);
  roachMesh.scale.set(2.3, 0.3, 2.3);
  say(cause === 'spray' ? '¡Cof, cof! Insecticida...' : '¡PLAF! Belgha en toda la espalda', 2);
  if (G.state === 'hunt') { G.state = 'gloat'; G.t = 2; gsay('¡Hamdullah!', 2); }
}

function endRun(reason) {
  st.mode = 'over'; st.modeT = 0; st.reason = reason; sfx.lose();
  if (st.night > st.best.night || (st.night === st.best.night && st.total > st.best.total)) {
    st.best = { night: st.night, total: st.total }; localStorage.setItem('srak-l-zit.best', JSON.stringify(st.best));
  }
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

function updateRoach(dt) {
  if (!R.alive) {
    R.respawn -= dt;
    if (R.respawn <= 0) { if (st.lives <= 0) endRun('La jadda te ha dejado como una pegatina.'); else resetRoach(); }
    return;
  }
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix--;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix++;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy++;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy--;
  const il = Math.hypot(ix, iy) || 1;
  const dx = (gfx.floorRight.x * ix + gfx.floorUp.x * iy) / il, dz = (gfx.floorRight.z * ix + gfx.floorUp.z * iy) / il;
  const dl = Math.hypot(dx, dz) || 1;
  R.moving = ix !== 0 || iy !== 0;
  R.sprint = R.moving && (keys.has('ShiftLeft') || keys.has('ShiftRight'));

  const wasGlued = R.glued;
  R.glued = world.glue.some((g) => g.on && dist(R.x, R.z, g.x, g.z) < g.r);
  if (R.glued && !wasGlued) { sfx.glue(); say('¡Pegamento! Sal de ahí', 1.5); }
  const speed = 6.2 * (R.sprint ? 1.55 : 1) * (1 - 0.1 * R.carry) * (R.glued ? 0.28 : 1);
  const tx = R.moving ? dx / dl * speed : 0, tz = R.moving ? dz / dl * speed : 0, k = Math.min(1, dt * 14);
  R.vx += (tx - R.vx) * k; R.vz += (tz - R.vz) * k;
  R.x += R.vx * dt; R.z += R.vz * dt;
  collide(R, ROACH_R);
  if (grannyMesh.visible) { // no se puede atravesar a la jadda
    const d = dist(R.x, R.z, G.x, G.z), m = ROACH_R + GRANNY_R;
    if (d < m && d > 1e-4) { R.x = G.x + (R.x - G.x) / d * m; R.z = G.z + (R.z - G.z) / d * m; }
  }
  const sp = Math.hypot(R.vx, R.vz);
  if (sp > 0.4) { R.head += wrap(Math.atan2(R.vz, R.vx) - R.head) * Math.min(1, dt * 16); R.walk += dt * sp * 4.5; }
  R.inv = Math.max(0, R.inv - dt);

  R.hidden = false;
  for (const c of world.covers) {
    c.under = R.x > c.x0 && R.x < c.x1 && R.z > c.z0 && R.z < c.z1;
    if (c.under) R.hidden = true;
    // el tablero también se aparta si tapa a la cucaracha desde la cámara
    const k = c.h / gfx.dir.y, qx = R.x + gfx.dir.x * k, qz = R.z + gfx.dir.z * k, m = 0.9;
    c.hides = c.under || (qx > c.x0 - m && qx < c.x1 + m && qz > c.z0 - m && qz < c.z1 + m && R.x > c.x0 - m && R.z > c.z0 - m);
  }

  // beber zit
  const src = world.oil.find((o) => st.night >= o.minNight && dist(R.x, R.z, o.x, o.z) < o.r);
  if (src && R.carry < CARRY_MAX) {
    R.fill += dt / 1.05;
    if (R.fill >= 1) { R.fill = 0; R.carry++; sfx.sip(); burst(R.x, 0.5, R.z, '#ffd23f', 4, 2, 3); if (st.tut < 2) st.tut = 2; }
  } else R.fill = 0;
  for (const d of looseDrops) {
    if (d.on && R.carry < CARRY_MAX && dist(R.x, R.z, d.x, d.z) < 0.8) { d.on = false; d.m.visible = false; R.carry++; sfx.pickup(); burst(d.x, 0.4, d.z, '#ffd23f', 5, 2, 3); }
  }
  // entregar en el agujero
  if (R.carry > 0 && dist(R.x, R.z, world.hole.x, world.hole.z) < 1.4) {
    st.stolen += R.carry; st.total += R.carry; R.carry = 0; sfx.deliver(); st.tut = 3;
    burst(world.hole.x, 0.5, world.hole.z, '#ffd23f', 10, 3, 5);
    if (st.stolen >= st.quota) {
      st.mode = 'clear'; st.modeT = 3.4; sfx.win(); st.total += Math.max(0, Math.floor((st.nightLen - st.time) / 10));
    }
  }
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
  if (Math.floor(before / Math.PI) !== Math.floor(G.walk / Math.PI)) sfx.step_();
  if (d <= step) { G.x = n.x; G.z = n.z; G.prev = G.node; G.node = G.route.shift(); return true; }
  G.x += dx / d * step; G.z += dz / d * step;
  return false;
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
    if (G.t <= 0) { G.state = 'warn'; G.t = 2.3; G.walk = 0; world.doorGlow.visible = true; if (st.tut < 4) say('¡Viene la jadda! Escóndete bajo un mueble', 3); }
    st.detect = Math.max(0, st.detect - dt);
    return;
  }
  if (G.state === 'warn') {
    G.t -= dt; const b = G.walk; G.walk += dt * 5;
    if (Math.floor(b / Math.PI) !== Math.floor(G.walk / Math.PI)) sfx.step_();
    if (G.t <= 0) {
      Object.assign(G, { state: 'patrol', x: world.nodes[0].x, z: world.nodes[0].z, node: 0, prev: -1, route: [], linger: 1, visit: rand(12, 17) + n, leaving: false, face: Math.PI / 2, baseFace: Math.PI / 2, hear: 0 });
      grannyMesh.visible = true; world.doorGlow.visible = false; setLight(true);
      gsay(pick(['¿Quién anda ahí?', 'Bismillah...', 'Mmm... un atay', '¿Y ese ruido?']));
    }
    return;
  }

  const toRoach = Math.atan2(R.z - G.z, R.x - G.x), dR = dist(R.x, R.z, G.x, G.z);

  if (G.state === 'patrol') {
    G.visit -= dt;
    if (R.sprint && dR < 9 && R.alive) G.hear = 1.3;          // correr hace ruido
    if (G.hear > 0) turnTo(toRoach, dt, 7);
    else if (G.linger > 0) {
      G.linger -= dt; turnTo(G.baseFace + Math.sin(st.clock * 1.4) * 1.0, dt, 3);
      if (G.linger <= 0) {
        if (G.leaving && G.node === 0) { G.state = 'away'; G.t = Math.max(3.5, rand(7, 11) - n * 0.6); grannyMesh.visible = false; setLight(false); st.tut = Math.max(st.tut, 4); return; }
        if (G.visit <= 0) { G.route = bfs(G.node, 0); G.leaving = true; if (!G.route.length) { G.linger = 0.3; } else gsay('Tfou... a dormir', 1.5); }
        else { const opts = world.adj[G.node].filter((m) => m !== G.prev); G.route = [pick(opts.length ? opts : world.adj[G.node])]; }
      }
    } else {
      const nd = world.nodes[G.route[0]];
      if (nd) turnTo(Math.atan2(nd.z - G.z, nd.x - G.x), dt, 6);
      if (grannyWalk(dt, 3.1 + n * 0.2) && !G.route.length) { G.linger = G.leaving ? 0.4 : rand(1.2, 2.4); G.baseFace = G.face; }
    }
    if (canSeeRoach(VISION, VISION_HALF)) st.detect += dt * (R.moving ? 1.7 : 0.75) * (1.35 - dR / VISION);
    else st.detect = Math.max(0, st.detect - dt * 0.45);
    if (st.detect >= 1) {
      G.state = 'hunt'; G.lost = 0; G.throwCd = 0.55; G.sprayCd = 1.5; G.reroute = 0; st.detect = 1;
      gsay('¡¡SRAK ZIT!!', 1.6); sfx.alarm(); st.flash = 0.25; G.lastX = R.x; G.lastZ = R.z;
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
    if (R.alive) gsay('¿Fin mchiti?', 1.8);
    return;
  }
  G.reroute -= dt;
  if (G.reroute <= 0 && !G.route.length) {
    G.reroute = 0.8;
    const target = nearestNode(G.lastX, G.lastZ);
    if (dist(G.x, G.z, G.lastX, G.lastZ) > 6.5 && target !== G.node) G.route = bfs(G.node, target).slice(0, 1);
  }
  grannyWalk(dt, 4 + n * 0.2);

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
    marker.material.opacity = 0.3 + 0.3 * Math.sin(st.clock * 30);
    if (k >= 1) {
      S.st = 'landed'; S.t = 0; slipMesh.rotation.set(0, rand(0, 6), 0); sfx.slap(); st.shake = Math.max(st.shake, 0.25);
      burst(S.to.x, S.to.y, S.to.z, '#e9dcc0', 9, 5, 3);
      if (!S.harmless && !R.hidden && dist(R.x, R.z, S.to.x, S.to.z) < 1.25) killRoach('slipper');
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
    marker.material.opacity = 0.2 + 0.15 * Math.sin(st.clock * 30);
    if (P.t <= 0) { P.st = 'cloud'; P.t = 3.6; cloud.position.set(P.x, 0, P.z); }
    return;
  }
  cloud.visible = true;
  cloud.children.forEach((m, i) => { m.position.y = 0.7 + Math.sin(st.clock * 2 + i) * 0.25; m.scale.setScalar(Math.min(1, (3.6 - P.t) * 3) * Math.min(1, P.t * 2)); });
  if (R.alive && dist(R.x, R.z, P.x, P.z) < 2.3) { R.poison += dt; if (R.poison > 0.85) killRoach('spray'); }
  else R.poison = Math.max(0, R.poison - dt);
  if (P.t <= 0) P.st = 'idle';
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
  const a = st.light, dawn = st.mode === 'title' ? 0 : clamp((st.time / st.nightLen - 0.72) / 0.28, 0, 1);
  tmpC.copy(moonC).lerp(dawnC, dawn);
  world.sun.color.copy(tmpC).lerp(lampC, a);
  world.sun.intensity = lerp(1.7 + dawn * 0.6, 2.3, a);
  world.sun.position.lerpVectors(world.moonPos, world.lampPos, a);
  world.hemi.color.copy(hemiN).lerp(hemiL, a); world.hemi.groundColor.copy(gndN).lerp(gndL, a);
  world.hemi.intensity = lerp(1.25 + dawn * 0.4, 1.3, a);
  world.windowMat.color.copy(winN).lerp(winD, dawn);
  gfx.post.uniforms.tint.value.copy(tintN).lerp(tintL, Math.max(a, dawn * 0.6));
  world.holeLight.intensity = 5 + Math.sin(st.clock * 6) * 0.8;
}

function updateCamera(dt) {
  let tx, tz;
  if (st.mode === 'title') { tx = Math.sin(st.clock * 0.13) * 9; tz = Math.cos(st.clock * 0.17) * 4; }
  else { tx = clamp(R.x + R.vx * 0.25, -12, 12); tz = clamp(R.z + R.vz * 0.25, -7.5, 7.5); }
  const k = 1 - Math.exp(-dt * 5);
  cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
  st.shake = Math.max(0, st.shake - dt);
  const s = st.shake * 0.9;
  gfx.setTarget(new THREE.Vector3(cam.x + rand(-s, s), 0, cam.z + rand(-s, s)));
}

// ---------- sincronizar mallas ----------
function syncMeshes(dt) {
  roachMesh.position.set(R.x, 0, R.z);
  if (R.alive) {
    roachMesh.rotation.y = -R.head;
    roachMesh.visible = R.inv <= 0 || Math.floor(st.clock * 14) % 2 === 0;
    animRoach(roachMesh, R.walk, Math.hypot(R.vx, R.vz) > 0.5, st.clock);
  }
  roachMesh.userData.drops.forEach((d, i) => { d.visible = i < R.carry; });

  if (grannyMesh.visible) {
    const moving = G.route.length > 0;
    grannyMesh.position.set(G.x, moving ? Math.abs(Math.sin(G.walk)) * 0.14 : 0, G.z);
    grannyMesh.rotation.set(0, -G.face, moving ? Math.sin(G.walk) * 0.05 : 0);
    const u = grannyMesh.userData, hunting = G.state === 'hunt';
    G.arm += ((hunting ? -0.5 : -2.5) - G.arm) * Math.min(1, dt * 7);
    u.arm.rotation.z = G.arm;
    u.held.visible = S.st === 'idle';
    u.cone.visible = st.light > 0.5 && G.state !== 'gloat';
    u.cone.material.color.set(hunting ? '#ff3030' : '#ff9f1c');
    u.cone.material.opacity = hunting ? 0.16 : 0.3;
  }
  for (const c of world.covers) {
    const ghost = c.hides && st.mode !== 'title';
    if (c.ghost === ghost) continue;
    c.ghost = ghost;
    c.top.traverse((o) => { if (o.isMesh) { o.userData.mat ??= o.material; o.material = ghost ? GHOST : o.userData.mat; } });
  }
  for (const d of looseDrops) if (d.on) d.m.position.y = 0.26 + Math.sin(st.clock * 4 + d.x) * 0.08;
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt; p.vy -= 14 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.07, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    if (p.life <= 0) p.m.visible = false;
  }
  st.flash = Math.max(0, st.flash - dt * 2.5);
  gfx.post.uniforms.flash.value = st.flash * 0.6;
}

// ---------- HUD ----------
const v3 = new THREE.Vector3();
const GOLD = '#ffd23f', CREAM = '#f1faee';

function pointer(x, z, label, color) {
  const p = gfx.project(v3.set(x, 1.2, z)), { W, H } = hud, m = 14;
  const inside = p.x > m && p.x < W - m && p.y > 26 && p.y < H - m;
  if (inside) { hud.text('▼', p.x, p.y - 12 + Math.sin(st.clock * 6) * 2, { size: 9, color }); return; }
  const cx = clamp(p.x, m + 10, W - m - 10), cy = clamp(p.y, 30, H - m - 4);
  if (Math.floor(st.clock * 3) % 2) hud.rect(cx - 3, cy - 3, 6, 6, '#0b0b12');
  hud.rect(cx - 2, cy - 2, 4, 4, color);
  hud.text(label, cx, cy + (cy > H / 2 ? -10 : 10), { size: 9, color });
}

function drawHud() {
  hud.clear();
  const { W, H } = hud, cx = W / 2;
  if (st.mode === 'title') {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.5)');
    hud.text('SRAK L ZIT', cx, H * 0.26, { size: 34, color: GOLD, font: BOLD });
    hud.text('سراق الزيت', cx, H * 0.26 + 34, { size: 24, color: CREAM, font: ARABIC });
    hud.text('la cucaracha que roba el aceite', cx, H * 0.26 + 60, { size: 10, color: '#e9c46a' });
    if (Math.floor(st.clock * 2) % 2) hud.text('pulsa ENTER', cx, H * 0.72, { size: 12, color: CREAM });
    hud.text('flechas o WASD: moverse · SHIFT: correr (hace ruido)', cx, H - 22, { size: 9, color: '#b9c8ff' });
    if (st.best.night) hud.text(`récord: noche ${st.best.night} · ${st.best.total} zit`, cx, H - 10, { size: 9, color: '#8fa0d8' });
    return;
  }

  // marcadores del mundo
  if (st.mode === 'play' && R.alive) {
    if (R.carry > 0) pointer(world.hole.x, world.hole.z, 'CASA', '#ffb347');
    if (R.carry < CARRY_MAX) { const o = world.oil[0]; if (R.carry === 0 || dist(R.x, R.z, o.x, o.z) < 12) pointer(o.x, o.z - 0.4, 'ZIT', GOLD); }
    const p = gfx.project(v3.set(R.x, 1.1, R.z));
    if (R.fill > 0) { hud.frame(p.x - 8, p.y - 10, 16, 3, '#2a2416'); hud.rect(p.x - 8, p.y - 10, 16 * R.fill, 3, GOLD); }
    if (st.detect > 0.02) {
      const hunt = G.state === 'hunt';
      hud.frame(p.x - 10, p.y - 17, 20, 3, '#2a1616'); hud.rect(p.x - 10, p.y - 17, 20 * st.detect, 3, hunt ? '#ff3b3b' : '#ffb347');
      hud.text(hunt ? '!!' : '?', p.x, p.y - 25, { size: 10, color: hunt ? '#ff3b3b' : '#ffb347' });
    } else if (R.hidden && st.light > 0.5) hud.text('oculta', p.x, p.y - 14, { size: 9, color: '#9be7a0' });
  }
  if (grannyMesh.visible && G.sayT > 0) {
    const p = gfx.project(v3.set(G.x, 6.6, G.z));
    hud.text(G.say, clamp(p.x, 50, W - 50), Math.max(34, p.y), { size: 10, color: G.state === 'hunt' ? '#ff6b6b' : CREAM });
  }

  // barra superior
  hud.drop(8, 6); hud.text(`${st.stolen}/${st.quota}`, 15, 10, { size: 12, color: GOLD, align: 'left' });
  for (let i = 0; i < CARRY_MAX; i++) hud.drop(9 + i * 9, 23, GOLD, i >= R.carry);
  for (let i = 0; i < 3; i++) hud.roach(W - 14 - i * 12, 6, i < st.lives);
  const bw = 96, bx = cx - bw / 2, k = clamp(st.time / st.nightLen, 0, 1), late = k > 0.8;
  hud.text(`NOCHE ${st.night}`, cx, 8, { size: 9, color: '#b9c8ff' });
  hud.frame(bx, 16, bw, 4, '#1c2247'); hud.rect(bx, 16, bw * k, 4, late && Math.floor(st.clock * 4) % 2 ? '#ff6b3b' : '#ffa066');
  hud.rect(bx - 8, 15, 5, 5, '#dfe7ff'); hud.rect(bx - 6, 15, 3, 3, '#0b0b12'); // luna
  hud.rect(bx + bw + 4, 15, 5, 5, '#ffd23f');                                   // sol

  // mensajes
  let msg = st.msgT > 0 ? st.msg : '';
  if (!msg && st.mode === 'play' && st.night === 1 && R.alive) {
    msg = st.tut === 0 ? 'Cruza la cocina hasta el bidón de zit' : st.tut <= 2 && R.carry > 0 ? 'Lleva el zit a tu agujero' : '';
    if (st.tut === 0 && dist(R.x, R.z, world.hole.x, world.hole.z) > 6) st.tut = 1;
    if (st.tut === 1) msg = '';
  }
  if (msg) hud.text(msg, cx, H - 16, { size: 10, color: CREAM });

  if (st.mode === 'intro') {
    hud.rect(0, H * 0.34, W, 46, 'rgba(6,7,18,0.7)');
    hud.text(`NOCHE ${st.night}`, cx, H * 0.34 + 15, { size: 20, color: GOLD, font: BOLD });
    hud.text(`roba ${st.quota} gotas de zit antes del amanecer`, cx, H * 0.34 + 35, { size: 10, color: CREAM });
  } else if (st.mode === 'clear') {
    hud.rect(0, H * 0.34, W, 46, 'rgba(6,7,18,0.7)');
    hud.text('¡ZIT ROBADO!', cx, H * 0.34 + 15, { size: 20, color: GOLD, font: BOLD });
    hud.text(`la colonia cena esta noche · total ${st.total}`, cx, H * 0.34 + 35, { size: 10, color: CREAM });
  } else if (st.mode === 'dawn') {
    hud.rect(0, H * 0.34, W, 46, 'rgba(40,16,6,0.7)');
    hud.text('AMANECE...', cx, H * 0.34 + 15, { size: 20, color: '#ffa066', font: BOLD });
    hud.text('no has robado bastante zit · pierdes una vida', cx, H * 0.34 + 35, { size: 10, color: CREAM });
  } else if (st.mode === 'over') {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.62)');
    hud.text('SAFI', cx, H * 0.3, { size: 34, color: '#ff6b6b', font: BOLD });
    hud.text(st.reason, cx, H * 0.3 + 30, { size: 10, color: CREAM });
    hud.text(`llegaste a la noche ${st.night} · ${st.total} zit`, cx, H * 0.3 + 46, { size: 10, color: GOLD });
    hud.text(`récord: noche ${st.best.night} · ${st.best.total} zit`, cx, H * 0.3 + 60, { size: 9, color: '#8fa0d8' });
    if (st.modeT > 1 && Math.floor(st.clock * 2) % 2) hud.text('ENTER para volver a intentarlo', cx, H * 0.76, { size: 11, color: CREAM });
  }
  if (st.paused) { hud.rect(0, 0, W, H, 'rgba(6,7,18,0.55)'); hud.text('PAUSA', cx, H / 2, { size: 22, color: CREAM, font: BOLD }); }
}

// ---------- bucle ----------
function update(dt) {
  st.clock += dt; st.msgT -= dt; st.modeT -= dt;
  if (st.mode === 'play') {
    st.time += dt;
    updateRoach(dt);
    if (st.mode === 'play') { updateGranny(dt); updateSlipper(dt); updateSpray(dt); }
    if (st.mode === 'play' && st.time >= st.nightLen) {
      st.lives--; sfx.lose();
      if (st.lives <= 0) endRun('Salió el sol y la colonia se quedó sin zit.'); else { st.mode = 'dawn'; st.modeT = 3.2; }
    }
    sfx.music(dt, G.state === 'hunt' ? 2 : grannyMesh.visible ? 1 : 0);
  } else if (st.mode === 'intro') { if (st.modeT <= 0) st.mode = 'play'; }
  else if (st.mode === 'clear') { if (st.modeT <= 0) startNight(st.night + 1); }
  else if (st.mode === 'dawn') { if (st.modeT <= 0) startNight(st.night); }
  else if (st.mode === 'over') st.modeT += dt * 2;
  updateLight(dt); updateCamera(dt); syncMeshes(dt);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!st.paused) update(dt);
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
  keys.add(e.code); sfx.init();
  if (e.code === 'KeyM') sfx.toggleMute();
  if ((e.code === 'Escape' || e.code === 'KeyP') && st.mode === 'play') st.paused = !st.paused;
  if (e.code === 'Enter' || e.code === 'Space') {
    if (st.mode === 'title' || (st.mode === 'over' && st.modeT > 1)) startGame();
  }
});

resize();
resetRoach();
grannyMesh.visible = false;
requestAnimationFrame(frame);
window.game = { st, R, G, S, P, world, gfx, keys, startGame, startNight, update, killRoach, setLight };
