// Srak l zit — سراق الزيت. Una cucaracha marroquí roba el aceite de toda la casa, noche a noche.
import { THREE, Gfx, basic, sph, put, GHOST } from './gfx.js';
import { buildLevels, ROOM } from './world.js';
import { makeRoach, animRoach, makeGranny, makeSlipper, makeCat, animCat, makeChicken, animChicken } from './actors.js';
import { Hud, INK, GOLD, CREAM } from './hud.js';
import { drawCity, drawMoon, drawRoof, drawLogo, drawClouds, drawRoachSprite } from './art.js';
import { Sfx } from './audio.js';
import { VERSION } from './version.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.random() * a.length | 0];
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k) => 1 - (1 - k) ** 3;
const ARABIC = 'bold {s}px "Geeza Pro", "Noto Naskh Arabic", "Segoe UI", sans-serif';

const gfx = new Gfx(document.getElementById('view'));
const hud = new Hud(document.getElementById('hud'));
const sfx = new Sfx();
const scene = gfx.scene;
const LV = buildLevels(scene);
let world = LV.levels[0];
if (matchMedia('(pointer: coarse)').matches) { LV.sun.shadow.mapSize.set(1024, 1024); } // sombras más ligeras en el móvil

const CARRY_MAX = 3, VISION = 10.5, VISION_HALF = 0.6, ROACH_R = 0.55, GRANNY_R = 1.35;
const FLY_TIME = 1.6, WINGS_MAX = 3; // segundos que dura un vuelo y alas (vuelos) que se pueden acumular

// La campaña: dos noches por sitio. Después del hanout, la casa se repite más difícil.
const PLAN = [
  { lv: 0, quota: 6, news: ['Roba zit sin que te vean. ESPACIO: saltito para esquivar', 'Roba zit sin que te vean. Botón azul: saltito para esquivar'] },
  { lv: 0, quota: 8, glue: 2, bottle: true, news: ['Nuevo: ALAS. Salta y mantén ESPACIO. Cada vuelo gasta un ala', 'Nuevo: ALAS. Salta y deja pulsado el botón azul. Cada vuelo gasta un ala'] },
  { lv: 1, quota: 6, glue: 2, news: 'Jeddi oye todo. Corre o vuela cerca de él y se despierta' },
  { lv: 1, quota: 8, cat: true, glue: 3, news: 'Nuevo: Mchicha, el gato. A oscuras, no hagas ruido' },
  { lv: 2, quota: 6, cat: true, chicks: 2, enemy: false, news: 'Las gallinas te ven de cerca. Escóndete o súbete a algo' },
  { lv: 2, quota: 8, chicks: 3, glue: 2, news: 'La jadda sale a regar. Y trae el Baygon' },
  { lv: 3, quota: 8, snaps: 3, news: 'Cepos: sáltalos o rodéalos' },
  { lv: 3, quota: 10, snaps: 5, glue: 3, news: 'El último golpe. Si Brahim está de mal humor' },
];
function plan(n) {
  const i = (n - 1) % PLAN.length, loop = Math.floor((n - 1) / PLAN.length);
  return { ...PLAN[i], loop, wings: i > 0 || loop > 0, tier: Math.min(5, i + 1) + loop * 2, quota: PLAN[i].quota + loop * 2 };
}

// ---------- actores y efectos ----------
const roachMesh = makeRoach(); scene.add(roachMesh);
const babies = [0.25, -0.3].map((h, i) => {
  const m = makeRoach({ baby: true }); m.rotation.y = -h; scene.add(m);
  return { m, h, x: -14.5, z: 0, side: i ? 0.7 : -0.7, hop: 0 };
});
const looks = {};
for (const k of ['jadda', 'jeddi', 'keeper']) { looks[k] = makeGranny(k); looks[k].visible = false; looks[k].userData.cone.scale.setScalar(VISION); scene.add(looks[k]); }
let grannyMesh = looks.jadda;
const catMesh = makeCat(); scene.add(catMesh); catMesh.visible = false;
const slipMesh = makeSlipper(); scene.add(slipMesh); slipMesh.visible = false;
const C = [0, 1, 2].map(() => { const mesh = makeChicken(); mesh.visible = false; scene.add(mesh); return { mesh, on: false, state: 'wander', t: 0, x: 0, z: 0, face: 0, tx: 0, tz: 0, walk: 0 }; });

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
const takeSlick = (x, z, r) => { const s = slicks.find((q) => q.on && dist(x, z, q.x, q.z) < r); if (s) { s.on = false; s.m.visible = false; } return s; };

const looseDrops = [];
for (let i = 0; i < 5; i++) {
  const m = put(scene, sph(0.26, basic('#ffd23f'), 7, 5), 0, 0.22, 0); m.castShadow = false; m.visible = false;
  looseDrops.push({ m, x: 0, z: 0, on: false });
}

// ---------- estado ----------
const R = { x: 0, z: 0, vx: 0, vz: 0, head: 0, carry: 0, fill: 0, hidden: false, lowHidden: false, alive: true, respawn: 0, inv: 0, poison: 0, walk: 0, glued: false, sprint: false, moving: false, y: 0, vy: 0, sup: 0, wings: 0, fuel: 0, hopCd: 0, holdT: 0, flying: false, flapT: 0, air: 0, wing: 0, turn: 0, squash: 0, noise: 1.6, ringT: 0, dripT: 0, deliverT: 0, delivered: 0, dustT: 0, scared: 0, cause: '' };
const G = { kind: 'jadda', state: 'away', t: 0, x: 0, z: 0, face: 0, baseFace: 0, node: 0, prev: -1, route: [], linger: 0, visit: 0, leaving: false, lost: 0, throwCd: 0, sprayCd: 0, hear: 0, say: '', sayT: 0, walk: 0, arm: -2.6, reroute: 0, lastX: 0, lastZ: 0 };
const K = { on: false, state: 'sleep', t: 0, x: 0, z: 0, face: 0, tx: 0, tz: 0, vx: 0, vz: 0, walk: 0, dur: 1, dodged: false };
const S = { st: 'idle', t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), harmless: false };
const P = { st: 'idle', t: 0, x: 0, z: 0 };
const st = {
  mode: 'title', modeT: 0, night: 1, plan: plan(1), quota: 6, stolen: 0, score: 0, combo: 1, lives: 3, time: 0, nightLen: 90,
  detect: 0, lightOn: false, lightT: 9, light: 0, shake: 0, flash: 0, msg: '', msgT: 0, clock: 0, paused: false,
  freeze: 0, slow: 0, kick: 0, zoom: 1, danger: 0, seen: false, punchOil: 0, punchScore: 0, banner: null, news: '',
  res: null, tut: 0, reason: '', introSeen: false, cineT: 0, titleT0: 0, irisIn: 0,
  best: { score: 0, night: 0, ...JSON.parse(localStorage.getItem('srak-l-zit.best') || '{}') },
};
// Pantalla táctil: palanca flotante a la izquierda (a fondo = correr), botón de salto/vuelo y botón de soltar
// a la derecha. Los botones pulsan las mismas «teclas» que el teclado, así el juego no distingue.
const touch = { on: matchMedia('(pointer: coarse)').matches, stick: null, mx: 0, my: 0, mag: 0, a: null, bT: 0, used: false, zones: [], safe: { l: 0, r: 0, b: 0 }, lefty: localStorage.getItem('srak-l-zit.zurdo') === '1' };
const STICK_R = 27;
const say2 = (desk, tap) => (touch.on ? tap : desk); // texto según se juegue con teclado o con el dedo
// los mandos cambian de lado para zurdos
const side = (fromEdge) => (touch.lefty ? fromEdge + touch.safe.l : hud.W - fromEdge - touch.safe.r);
const padA = () => ({ x: side(38), y: hud.H - 44 - touch.safe.b, r: 22 });
const padB = () => ({ x: side(90), y: hud.H - 34 - touch.safe.b, r: 13 });
const stickHome = () => ({ x: touch.lefty ? hud.W - 46 - touch.safe.r : 46 + touch.safe.l, y: hud.H - 46 - touch.safe.b });
const buzz = (ms) => { if (touch.on) navigator.vibrate?.(ms); }; // vibración, donde el teléfono la tenga

// ---------- aplicación instalable: partida guardada, instalación y pantalla encendida ----------
const SAVE = 'srak-l-zit.save';
const app = { install: null, reg: null, update: null, updating: false, told: false, standalone: matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true, ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), wake: null };
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } };
async function keepAwake() { // que la pantalla no se apague a media escena
  if (app.wake || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  try { app.wake = await navigator.wakeLock.request('screen'); app.wake.addEventListener('release', () => { app.wake = null; }); } catch { /* sin permiso o en ahorro de batería */ }
}
const cam = new THREE.Vector3(-8, 0, 3);
const keys = new Set(), pressed = new Set();
const floaters = [];
const cine = { steps: null, i: 0, t: 0, done: null };

function say(msg, t = 2.6) { st.msg = msg; st.msgT = t; st.msgDur = t; }
function gsay(msg, t = 1.8) { G.say = msg; G.sayT = t; }
function floater(text, x, z, color = GOLD, scale = 1, h = 1.6) { floaters.push({ text, x, z, h, color, scale, t: 0, dur: 1.2 }); }
function addScore(n, label, x, z, color = GOLD) {
  st.score += n; st.punchScore = 0.3;
  if (label) floater(`${label} +${n}`, x, z, color);
}
const hitstop = (t) => { st.freeze = Math.max(st.freeze, t); };

// ---------- luces (los colores de noche dependen del escenario) ----------
const Col = (h) => new THREE.Color(h);
const moonC = Col('#7f9be6'), dawnC = Col('#ffa066'), lampC = Col('#ffe6bd'), tmpC = new THREE.Color();
const hemiN = Col('#3a4a8a'), hemiL = Col('#fff1dc'), gndN = Col('#141428'), gndL = Col('#7a6a58');
const winN = Col('#9db8ff'), winD = Col('#ffb26b'), tintN = Col('#b9c8ff'), tintL = Col('#ffffff');
let moonI = 1.7;

// ---------- flujo ----------
const STORY = ['', 'En la cocina ya no queda ni gota. Por dentro de la pared, al salón.', 'Jeddi se ha quedado sin argán. Tubería abajo, hacia el patio.', 'Queda el premio gordo: la tienda de Si Brahim, a pie de calle.'];
const THREATS = ['la jadda', 'jeddi, que lo oye todo', 'las gallinas', 'Si Brahim y sus cepos'];

// El interior de la pared sustituye al escenario mientras dura la mudanza.
function showTunnel(fromLv, toLv) {
  LV.levels.forEach((l) => { l.root.visible = false; });
  const T = LV.tunnel; T.root.visible = true;
  for (const [h, lv] of [[T.from, fromLv], [T.to, toLv]]) { h.mat.color.set(LV.levels[lv].glow); h.light.color.set(LV.levels[lv].glow); }
  for (const k in looks) looks[k].visible = false;
  catMesh.visible = false; K.on = false; C.forEach((c) => { c.on = false; c.mesh.visible = false; });
  for (const list of [world.plates, world.glue, world.snaps]) list.forEach((o) => { o.on = false; o.mesh.visible = false; });
  looseDrops.forEach((d) => { d.on = false; d.m.visible = false; }); slicks.forEach((q) => { q.on = false; q.m.visible = false; });
  marker.visible = false; cloud.visible = false; slipMesh.visible = false; S.st = 'idle'; P.st = 'idle';
  st.lightOn = false; st.light = 0; scene.background.set('#07050c'); moonC.set('#7a6aa8'); tintN.set('#e6d6c4'); moonI = 1.0;
}

function loadLevel(i) {
  LV.tunnel.root.visible = false;
  LV.levels.forEach((l, j) => { l.root.visible = j === i; });
  world = LV.levels[i];
  for (const k in looks) looks[k].visible = false;
  grannyMesh = looks[world.look];
  world.holeLight.position.set(world.hole.x, 0.7, world.hole.z);
  babies.forEach((b) => { b.z = world.hole.z + b.side; b.m.position.set(b.x, 0, b.z); b.m.rotation.y = -b.h; b.m.visible = true; });
  scene.background.set(world.palette.bg); moonC.set(world.palette.moon); tintN.set(world.palette.tint); moonI = world.palette.moonI;
  for (const c of world.covers) c.hides = false;
}

function setupNight(n) {
  const p = plan(n), lit = !!world.alwaysLit;
  Object.assign(st, { night: n, plan: p, quota: p.quota, stolen: 0, time: 0, nightLen: 86 + Math.min(n, 8) * 6, detect: 0, msgT: 0, seen: false, banner: null, res: null, news: Array.isArray(p.news) ? p.news[touch.on ? 1 : 0] : p.news, lightOn: lit, lightT: 9, light: lit ? 1 : 0 });
  resetRoach();
  G.kind = p.enemy === false ? 'none' : world.enemy;
  grannyMesh.visible = false; grannyMesh.rotation.set(0, 0, 0); world.doorGlow.visible = false;
  Object.assign(G, { sayT: 0, route: [], hear: 0, node: 0, prev: -1, leaving: false });
  if (G.kind === 'jadda') Object.assign(G, { state: 'away', t: n === 1 ? 9 : rand(4, 7) });
  else if (G.kind === 'sleeper') { const e = world.enemyPos; Object.assign(G, { state: 'doze', x: e.x, z: e.z, face: e.face, baseFace: e.face }); grannyMesh.visible = true; }
  else if (G.kind === 'keeper') { const nd = world.nodes[0]; Object.assign(G, { state: 'patrol', x: nd.x, z: nd.z, linger: 1.5, visit: Infinity, face: Math.PI / 2, baseFace: Math.PI / 2 }); grannyMesh.visible = true; }
  else G.state = 'none';
  S.st = 'idle'; slipMesh.visible = false; marker.visible = false; P.st = 'idle'; cloud.visible = false;
  slicks.forEach((s) => { s.on = false; s.m.visible = false; });
  if (world.bottle) { world.bottle.visible = !!p.bottle; world.bottleCollider.off = !p.bottle; }
  const nGlue = (p.glue || 0) + (p.loop ? 1 : 0);
  world.glue.forEach((g, i) => { g.on = i < nGlue && !!world.glueSpots[i]; g.mesh.visible = g.on; if (g.on) { [g.x, g.z] = world.glueSpots[i]; g.mesh.position.set(g.x, 0, g.z); g.mesh.rotation.y = i * 0.7; } });
  world.snaps.forEach((s, i) => { s.on = i < (p.snaps || 0); s.shut = false; s.mesh.visible = s.on; s.bar.position.x = 0.42; if (s.on) { [s.x, s.z] = world.snapSpots[i]; s.mesh.position.set(s.x, 0, s.z); s.mesh.rotation.y = i * 1.3; } });
  const spots = shuffle(world.dropSpots), count = Math.min(5, 2 + (p.tier >> 1));
  looseDrops.forEach((d, i) => { d.on = i < count; d.m.visible = d.on; if (d.on) { [d.x, d.z] = spots[i]; d.m.position.set(d.x, 0.22, d.z); } });
  const ps = shuffle(world.plateSpots), plates = p.tier < 4 ? 2 : 3;
  world.plates.forEach((pl, i) => { pl.on = i < plates; pl.mesh.visible = pl.on; pl.amount = 3; pl.oil.visible = true; pl.oil.scale.set(1, 1, 1); if (pl.on) { [pl.x, pl.z] = ps[i]; pl.mesh.position.set(pl.x, 0, pl.z); } });
  for (const h of world.high || []) { h.amount = 2; h.tasted = false; h.mesh.visible = p.wings; }
  R.wings = p.wings ? 1 : 0;
  K.on = !!p.cat; catMesh.visible = K.on;
  if (K.on) { const [cx, cz] = pick(world.catSpots.slice(0, 3)); Object.assign(K, { state: 'sleep', t: rand(4, 7), x: cx, z: cz, face: rand(-3, 3) }); }
  C.forEach((c, i) => { c.on = i < (p.chicks || 0); c.mesh.visible = c.on; if (c.on) { [c.x, c.z] = world.chickSpots[i]; Object.assign(c, { state: 'wander', t: rand(1, 3), tx: c.x, tz: c.z, face: rand(-3, 3) }); } });
}

function startNight(n) {
  st.prepN = n; loadLevel(plan(n).lv); setupNight(n); st.mode = 'intro'; st.modeT = 0;
  localStorage.setItem(SAVE, JSON.stringify({ night: n, score: st.score, lives: st.lives })); // se retoma desde el principio de esta noche
}
function prep(n) { if (st.prepN !== n) { st.prepN = n; loadLevel(plan(n).lv); setupNight(n); } }

function startGame() {
  localStorage.removeItem(SAVE);
  Object.assign(st, { lives: 3, score: 0, combo: 1, tut: 0, prepN: null });
  goNight(1);
}

function continueGame() {
  const sv = loadSave(); if (!sv) return startGame();
  Object.assign(st, { lives: Math.max(1, sv.lives), score: sv.score, combo: 1, tut: 9, prepN: null, introSeen: true });
  startNight(sv.night); st.irisIn = 0.55;
}

// Pasa a la noche n; si cambia de sitio, antes van el plano de la casa y la presentación del lugar.
function goNight(n) {
  const p = plan(n), prev = n > 1 ? plan(n - 1) : null;
  if ((prev && prev.lv === p.lv) || (n === 1 && st.introSeen)) return startNight(n);
  // la primera vez, de fuera hacia dentro: la ciudad y, ya en la cocina, la familia.
  // Después: las crías piden más, la mudanza por dentro de la pared y la presentación del sitio nuevo.
  const steps = n === 1 ? [...openingSteps(), ...kitchenSteps()] : [...familySteps(p), tunnelStep(prev.lv, p), ...placeSteps(n)];
  playCine(steps, () => { st.introSeen = true; R.scared = 0; startNight(n); st.irisIn = 0.55; });
}

function resetRoach() {
  Object.assign(R, { x: world.hole.x + 0.8, z: world.hole.z, vx: 0, vz: 0, head: 0, carry: 0, fill: 0, alive: true, respawn: 0, inv: 2, poison: 0, glued: false, y: 0, vy: 0, sup: 0, fuel: 0, hopCd: 0, flying: false, air: 0, wing: 0, squash: 0, deliverT: 0, delivered: 0 });
  roachMesh.visible = true; soul.visible = false;
}

function setLight(on) { if (st.lightOn !== on) { st.lightOn = on; st.lightT = 0; sfx.click(); } }

const DEATHS = {
  slipper: ['¡PLAF! Belgha en toda la espalda', (w) => `${w[0].toUpperCase() + w.slice(1)} te ha dejado como una pegatina.`],
  spray: ['¡Cof, cof! Baygon...', () => 'El Baygon pudo contigo.'],
  cat: ['¡Ñam! Mchicha no perdona', () => 'Mchicha se ha relamido los bigotes.'],
  peck: ['¡Toc! Picotazo de gallina', () => 'Has acabado de desayuno de gallina.'],
  trap: ['¡CLAC! El cepo', () => 'El cepo de Si Brahim no falla.'],
};

function killRoach(cause) {
  if (!R.alive || R.inv > 0) return;
  Object.assign(R, { alive: false, respawn: 2.1, carry: 0, vx: 0, vz: 0, vy: 0, flying: false, air: 0, wing: 0, cause });
  st.lives--; st.detect = 0; st.combo = 1; st.shake = 0.5; st.flash = 0.5; hitstop(0.14); sfx.squash(); buzz([70, 40, 120]);
  burst(R.x, 0.3, R.z, '#a8521c', 14, 6, 5); burst(R.x, 0.3, R.z, '#ffd23f', 8, 4, 6);
  ring(R.x, R.z, 3, '#ffffff', 0.4, 0.6);
  roachMesh.userData.body.scale.set(1.3, 0.14, 1.3); roachMesh.userData.body.position.y = 0;
  soul.visible = true; soul.position.set(R.x, R.y + 0.6, R.z);
  say(DEATHS[cause][0], 2);
  if (G.state === 'hunt') { G.state = 'gloat'; G.t = 2; gsay('¡Hamdullah!', 2); }
}

function endRun(reason) {
  st.mode = 'over'; st.modeT = 0; st.reason = reason; sfx.lose(); localStorage.removeItem(SAVE);
  if (st.score > st.best.score) { st.best = { score: st.score, night: st.night }; localStorage.setItem('srak-l-zit.best', JSON.stringify(st.best)); }
}

function clearNight() {
  const time = Math.max(0, Math.floor(st.nightLen - st.time)) * 2, stealth = st.seen ? 0 : 100, lives = st.lives * 25;
  st.res = { drops: st.quota, time, stealth, lives };
  st.score += time + stealth + lives;
  st.mode = 'clear'; st.modeT = 0; sfx.win();
  grannyMesh.visible = false; setLight(!!world.alwaysLit); S.st = 'idle'; slipMesh.visible = false; marker.visible = false; cloud.visible = false; P.st = 'idle';
  Object.assign(R, { x: world.hole.x + 1.6, z: world.hole.z, vx: 0, vz: 0, y: 0, vy: 0 });
}

function nextNight() { if (st.night % PLAN.length === 0) playEnding(st.night); else goNight(st.night + 1); }

// ---------- cucaracha ----------
const inside = (c, x, z) => (c.r !== undefined ? dist(x, z, c.x, c.z) < c.r : x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);

// Altura de la superficie más alta sobre la que se puede estar en (x, z) viniendo desde la altura y.
function supportAt(x, z, y) {
  let s = 0;
  for (const c of world.colliders) if (!c.off && c.h < 50 && c.h > s && y >= c.h - 0.35 && inside(c, x, z)) s = c.h;
  for (const c of world.covers) if (c.topY > s && y >= c.topY - 0.35 && inside(c, x, z)) s = c.topY;
  return s;
}

function collide(p, r, y = 0) {
  for (const c of world.colliders) {
    if (c.off || y >= c.h - 0.35 || y + 0.5 < c.y0) continue; // por encima o por debajo de la pieza
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
  const list = world.oil.filter((o) => !o.bottle || st.plan.bottle);
  for (const p of world.plates) if (p.on && p.amount > 0) list.push(p);
  if (st.plan.wings) for (const h of world.high || []) if (h.amount > 0) list.push(h);
  return list;
}

function updateRoach(dt) {
  R.squash = Math.max(0, R.squash - dt * 5);
  if (!R.alive) {
    R.respawn -= dt;
    soul.position.y += dt * 1.6; soul.rotation.y += dt * 3;
    if (R.respawn <= 0) { if (st.lives <= 0) endRun(DEATHS[R.cause][1](world.who)); else resetRoach(); }
    return;
  }
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix--;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix++;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy++;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy--;
  let pace = 1;
  if (touch.stick && touch.mag > 0.2) { ix = touch.mx; iy = -touch.my; pace = touch.mag > 0.9 ? 1 : clamp(touch.mag / 0.75, 0.5, 1); } // la palanca es analógica
  const il = Math.hypot(ix, iy) || 1;
  let dx = (gfx.floorRight.x * ix + gfx.floorUp.x * iy) / il, dz = (gfx.floorRight.z * ix + gfx.floorUp.z * iy) / il;
  const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  R.moving = ix !== 0 || iy !== 0;
  R.sprint = R.moving && (keys.has('ShiftLeft') || keys.has('ShiftRight') || (!!touch.stick && touch.mag > 0.9));

  const wasGlued = R.glued;
  R.glued = R.y < 0.15 && world.glue.some((g) => g.on && dist(R.x, R.z, g.x, g.z) < g.r);
  if (R.glued && !wasGlued) { sfx.glue(); say('¡Pegamento! Sal de ahí de un salto', 1.8); }
  for (const s of world.snaps) {
    if (!s.on || s.shut || R.y > 0.15 || dist(R.x, R.z, s.x, s.z) > 0.85) continue;
    s.shut = true; s.bar.position.x = -0.3; sfx.slap(); burst(s.x, 0.3, s.z, '#d7dbe2', 6, 4, 3); killRoach('trap');
  }

  // ESPACIO: un toque es un saltito libre. Volar es otra cosa: en el aire, mantenerlo (o volver a pulsar)
  // gasta un ala y deja aletear hasta FLY_TIME segundos. Las alas se ganan entregando cargas completas.
  const grounded = R.y <= R.sup + 0.02 && R.vy <= 0, held = keys.has('Space');
  R.hopCd = Math.max(0, R.hopCd - dt);
  const takeoff = () => {
    R.wings--; R.fuel = FLY_TIME; R.holdT = -99; R.vy = Math.max(R.vy, 4.5); sfx.dash(); st.kick = Math.max(st.kick, 0.04);
    ring(R.x, R.z, 8, '#ffffff', 0.45, 0.3); burst(R.x, R.y + 0.2, R.z, '#fff3c4', 6, 3, 1, 0.4);
  };
  if (grounded) { R.fuel = 0; R.holdT = 0; }
  if (pressed.has('Space')) {
    if (grounded && R.hopCd <= 0) { R.vy = 5.4; R.hopCd = 0.85; R.holdT = 0; sfx.hop(); burst(R.x, R.y + 0.15, R.z, '#e6dcc4', 5, 2.5, 1.5, 0.35); }
    else if (!grounded && R.fuel <= 0 && st.plan.wings) { if (R.wings > 0) takeoff(); else say('Sin alas. Entrega 3 gotas de una vez para ganar una', 2.4); }
  }
  if (!grounded && held && R.fuel <= 0 && st.plan.wings && R.wings > 0 && (R.holdT += dt) > 0.24) takeoff();
  if (!held) R.fuel = 0; // soltar la tecla acaba el vuelo
  R.flying = held && R.fuel > 0 && !grounded;
  if (R.flying) {
    R.vy = Math.min(6.5, R.vy + 34 * dt); R.fuel -= dt;
    R.flapT -= dt; if (R.flapT <= 0) { R.flapT = 0.11; sfx.flap(); }
  }
  const airborne = !grounded;
  R.wing = airborne ? 1 : Math.max(0, R.wing - dt * 8);
  {
    const speed = (airborne ? 8.2 : 6.4 * (R.sprint ? 1.55 : pace)) * (1 - 0.1 * R.carry) * (R.glued ? 0.28 : 1);
    const tx = R.moving ? dx * speed : 0, tz = R.moving ? dz * speed : 0, k = Math.min(1, dt * (airborne ? 7 : 14));
    R.vx += (tx - R.vx) * k; R.vz += (tz - R.vz) * k;
  }
  R.x += R.vx * dt; R.z += R.vz * dt;
  collide(R, ROACH_R, R.y);
  // altura: gravedad, techo bajo los muebles y aterrizaje en lo que haya debajo
  R.vy = Math.max(-12, R.vy - 17 * dt); R.y = Math.min(7.6, R.y + R.vy * dt);
  for (const c of world.covers) if (inside(c, R.x, R.z) && R.y < c.topY - 0.35 && R.y > c.h - 0.6) { R.y = c.h - 0.6; R.vy = Math.min(0, R.vy); }
  R.sup = supportAt(R.x, R.z, R.y);
  if (R.y <= R.sup) {
    if (R.vy < -4) { R.squash = 1; burst(R.x, R.sup + 0.12, R.z, '#e6dcc4', 6, 2.5, 1.5, 0.35); if (R.sup > 1) floater(pick(['¡hop!', '¡arriba!']), R.x, R.z, '#9be7a0', 1, R.sup + 1.2); }
    R.y = R.sup; R.vy = 0;
  }
  R.air = clamp((R.y - R.sup) / 0.6, 0, 1);
  if (grannyMesh.visible && G.state !== 'slip' && G.kind !== 'sleeper' && R.y < 4.5) { // no se puede atravesar a quien patrulla
    const d = dist(R.x, R.z, G.x, G.z), m = ROACH_R + GRANNY_R;
    if (d < m && d > 1e-4) { R.x = G.x + (R.x - G.x) / d * m; R.z = G.z + (R.z - G.z) / d * m; }
  }
  const sp = Math.hypot(R.vx, R.vz);
  if (sp > 0.4) {
    const dh = wrap(Math.atan2(R.vz, R.vx) - R.head);
    R.head += dh * Math.min(1, dt * 16); R.turn += (clamp(dh * 2.5, -1, 1) - R.turn) * Math.min(1, dt * 10);
  } else R.turn *= 1 - Math.min(1, dt * 10);
  R.inv = Math.max(0, R.inv - dt);

  // ruido: lo oyen el gato, jeddi y quien patrulle
  const dashing = R.flying;
  R.noise = dashing ? 8 : R.sprint && !airborne ? 7.5 : R.moving ? 3.6 : 1.6;
  R.ringT -= dt; R.dustT -= dt;
  const listener = (K.on && !st.lightOn) || G.state === 'doze';
  const loud = R.noise > 7;
  if ((R.moving || loud) && R.ringT <= 0 && (loud ? (grannyMesh.visible || listener) : listener)) {
    ring(R.x, R.z, R.noise, loud ? '#ffffff' : '#9db8ff', 0.5, loud ? 0.3 : 0.16); R.ringT = 0.42;
  }
  if (R.sprint && !airborne && R.dustT <= 0) { burst(R.x - R.vx * 0.05, 0.1, R.z - R.vz * 0.05, '#e6dcc4', 1, 1, 1.2, 0.35); R.dustT = 0.07; }

  R.hidden = false; R.lowHidden = false;
  for (const c of world.covers) {
    c.under = inside(c, R.x, R.z) && R.y < c.h - 0.3;
    if (c.under) { R.hidden = true; if (c.low) R.lowHidden = true; }
    // el mueble también se aparta si tapa a la cucaracha desde la cámara (no si está posada encima)
    const k = (c.topY - R.y) / gfx.dir.y, qx = R.x + gfx.dir.x * k, qz = R.z + gfx.dir.z * k, m = 1.1;
    c.hides = c.under || (R.y < c.topY - 0.35 && qx > c.x0 - m && qx < c.x1 + m && qz > c.z0 - m && qz < c.z1 + m && R.x > c.x0 - m && R.z > c.z0 - m);
  }

  // beber zit
  const src = oilSources().find((o) => dist(R.x, R.z, o.x, o.z) < o.r && Math.abs(R.y - (o.y || 0)) < 0.6);
  if (src && R.carry < CARRY_MAX && R.air < 0.2) {
    R.fill += dt / src.rate;
    if (R.fill >= 1) {
      R.fill = 0; R.carry++; sfx.sip(); buzz(8); burst(R.x, 0.6, R.z, '#ffd23f', 4, 2, 3); R.squash = 0.5; if (st.tut < 2) st.tut = 2;
      if (src.high && !src.tasted) { src.tasted = true; addScore(25, '¡Zit de altura!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
      if (src.amount !== undefined && --src.amount <= 0) { (src.oil || src.mesh).visible = false; floater('vacío', src.x, src.z, '#b9c8ff', 1, R.y + 1.6); } else if (src.amount && src.oil) src.oil.scale.set(src.amount / 3, 1, src.amount / 3);
    }
  } else R.fill = 0;
  for (const d of looseDrops) {
    if (d.on && R.carry < CARRY_MAX && R.y < 0.7 && dist(R.x, R.z, d.x, d.z) < 0.9) { d.on = false; d.m.visible = false; R.carry++; R.squash = 0.5; sfx.pickup(); burst(d.x, 0.4, d.z, '#ffd23f', 6, 2.5, 3.5); if (st.tut < 2) st.tut = 2; }
  }
  // gotitas que va dejando al cargar
  R.dripT -= dt;
  if (R.carry > 0 && sp > 1 && R.dripT <= 0) { burst(R.x - Math.cos(R.head) * 0.6, 0.3, R.z - Math.sin(R.head) * 0.6, '#f2b705', 1, 0.3, 0.6, 0.9); R.dripT = 0.3 / R.carry; }

  // soltar una gota: charco resbaladizo
  const atHole = R.y < 0.3 && dist(R.x, R.z, world.hole.x, world.hole.z) < 1.6;
  if (pressed.has('KeyE') && R.carry > 0 && !atHole && R.y < 0.3) {
    const s = slicks.find((q) => !q.on) || slicks.reduce((a, b) => (a.t > b.t ? a : b));
    Object.assign(s, { on: true, t: 0, x: R.x - Math.cos(R.head) * 0.5, z: R.z - Math.sin(R.head) * 0.5 });
    s.m.position.set(s.x, 0.04, s.z); s.m.visible = true; s.m.scale.setScalar(0.2);
    R.carry--; sfx.drip(); burst(s.x, 0.2, s.z, '#f2b705', 6, 2.5, 2);
  }

  // entregar en el agujero, gota a gota
  if (R.carry > 0 && atHole) {
    R.deliverT -= dt;
    if (R.deliverT <= 0) {
      R.deliverT = 0.16; R.carry--; R.delivered++; st.stolen++; st.punchOil = 0.3;
      sfx.coin(R.delivered + st.combo); addScore(10 * st.combo, '', 0, 0); buzz(10);
      floater(`+${10 * st.combo}`, world.hole.x + rand(-0.4, 0.8), world.hole.z + rand(-0.6, 0.6));
      burst(world.hole.x + 0.3, 0.5, world.hole.z, '#ffd23f', 5, 2.5, 4.5); babies.forEach((b) => { b.hop = 0.4; });
      if (R.carry === 0) {
        if (R.delivered >= CARRY_MAX) {
          addScore(20, '¡Carga completa!', R.x, R.z, '#9be7a0'); sfx.bonus();
          if (st.plan.wings && R.wings < WINGS_MAX) { R.wings++; floater('+1 ala', R.x, R.z + 0.9, '#7dd3fc'); }
        }
        if (st.combo < 5) { st.combo++; floater(`combo x${st.combo}`, R.x, R.z - 0.8, '#ffb347'); }
        R.delivered = 0;
        if (st.tut < 3) { st.tut = 3; say(say2('E suelta una gota: quien la pise, resbala', 'El botón dorado suelta una gota: quien la pise, resbala'), 4); }
      }
      if (st.stolen >= st.quota) clearNight();
    }
  } else if (!atHole) { R.deliverT = 0; R.delivered = 0; }
}

// ---------- quien vigila: la jadda (entra y sale), jeddi (duerme) o Si Brahim (no para) ----------
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
  if (takeSlick(G.x, G.z, 1.25)) { // patas arriba
    G.state = 'slip'; G.t = 3.8; st.detect = 0; st.slow = 0.5; st.kick = 0.1; sfx.slip();
    gsay('¡Ay ay ay! ¡Dahri!', 2.6); addScore(50, '¡Resbalón!', G.x, G.z, '#9be7a0'); burst(G.x, 0.2, G.z, '#f2b705', 10, 5, 4);
    return false;
  }
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

function alarm(text) {
  Object.assign(G, { state: 'hunt', lost: 0, throwCd: 0.7, sprayCd: 1.5, reroute: 0, lastX: R.x, lastZ: R.z });
  st.detect = 1; st.seen = true; gsay(text, 1.6); sfx.alarm(); st.flash = 0.25;
  st.banner = { text, t: 0.9 }; hitstop(0.32); st.kick = 0.14; buzz([30, 50, 30, 50, 60]);
}

function updateGranny(dt) {
  G.sayT -= dt; G.hear = Math.max(0, G.hear - dt);
  const n = st.plan.tier, sleeper = G.kind === 'sleeper';
  if (G.state === 'none') { st.detect = Math.max(0, st.detect - dt); return; }
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
  if (G.state === 'doze') { // jeddi no ve: oye. El ruido cerca de él lo va despertando
    const d = dist(R.x, R.z, G.x, G.z), reach = R.noise + 1.6;
    if (R.alive && R.noise > 2 && d < reach) st.detect += dt * (R.noise > 7 ? 1.25 : 0.42) * (1.45 - d / reach);
    else st.detect = Math.max(0, st.detect - dt * 0.22);
    if (st.detect >= 1) { setLight(true); alarm('¡¿CHKOUN?!'); }
    return;
  }
  if (G.state === 'slip') {
    G.t -= dt;
    if (G.t <= 0) { G.state = 'patrol'; G.linger = 1.2; G.baseFace = G.face; gsay('Ya verás tú...', 1.5); }
    return;
  }
  const backToSleep = () => { G.state = 'doze'; st.detect = 0.15; setLight(false); gsay('Mmm... zzz', 1.6); };

  const toRoach = Math.atan2(R.z - G.z, R.x - G.x), dR = dist(R.x, R.z, G.x, G.z);

  if (G.state === 'patrol') {
    G.visit -= dt;
    if (R.noise > 7 && dR < 9 && R.alive) G.hear = 1.3;          // correr y aletear hacen ruido
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
    if (st.detect >= 1) alarm('¡¡SRAK ZIT!!');
    return;
  }

  if (G.state === 'gloat') {
    G.t -= dt;
    if (G.t <= 0) {
      if (sleeper) backToSleep();
      else { G.state = 'patrol'; if (G.kind === 'jadda') G.visit = Math.min(G.visit, 2); G.linger = 0.5; G.baseFace = G.face; G.leaving = false; }
    }
    return;
  }

  // persecución
  const sees = canSeeRoach(18, Math.PI);
  if (sees) { G.lost = 0; G.lastX = R.x; G.lastZ = R.z; } else G.lost += dt;
  st.detect = clamp(1 - G.lost / 3.6, 0, 1);
  turnTo(Math.atan2(G.lastZ - G.z, G.lastX - G.x), dt, 8);
  if (G.lost > 3.6 || !R.alive) {
    if (R.alive) addScore(15, 'Despistado', R.x, R.z, '#9be7a0');
    if (sleeper) { backToSleep(); return; }
    G.state = 'patrol'; G.linger = 1.2; G.baseFace = G.face; st.detect = 0.2;
    if (R.alive) gsay('¿Fin mchiti?', 1.8);
    return;
  }
  if (!sleeper) {
    G.reroute -= dt;
    if (G.reroute <= 0 && !G.route.length) {
      G.reroute = 0.8;
      const target = nearestNode(G.lastX, G.lastZ);
      if (dist(G.x, G.z, G.lastX, G.lastZ) > 6.5 && target !== G.node) G.route = bfs(G.node, target).slice(0, 1);
    }
    grannyWalk(dt, 4 + n * 0.2);
    if (G.state !== 'hunt') return;
  }

  G.throwCd -= dt; G.sprayCd -= dt;
  if (G.throwCd <= 0 && S.st === 'idle') {
    if (!sees && R.hidden && n >= 3 && !sleeper && P.st === 'idle' && G.sprayCd <= 0) {
      P.st = 'warn'; P.t = 0.9; P.x = R.x; P.z = R.z; G.sprayCd = 6; G.throwCd = 1.2;
      gsay('¡Toma Baygon!', 1.4); sfx.spray();
    } else {
      const lead = sees ? 0.42 : 0;
      S.st = 'fly'; S.t = 0; S.dur = Math.max(0.5, 0.88 - n * 0.05);
      S.from.set(G.x, 4.6, G.z);
      S.to.set(clamp(G.lastX + R.vx * lead, ROOM.x0 + 0.6, ROOM.x1 - 0.6), 0.15, clamp(G.lastZ + R.vz * lead, ROOM.z0 + 0.6, ROOM.z1 - 0.6));
      S.to.y = supportAt(S.to.x, S.to.z, 99) + 0.15; // cae sobre lo que haya: mesa, encimera o suelo
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
    marker.visible = true; marker.position.set(S.to.x, S.to.y - 0.08, S.to.z); marker.scale.setScalar(0.35 + k * 0.95);
    marker.material.color.set('#ff2d2d'); marker.material.opacity = 0.3 + 0.3 * Math.sin(st.clock * 30);
    if (k >= 1) {
      S.st = 'landed'; S.t = 0; slipMesh.rotation.set(0, rand(0, 6), 0); sfx.slap(); buzz(25); st.shake = Math.max(st.shake, 0.3); hitstop(0.05);
      burst(S.to.x, S.to.y, S.to.z, '#e9dcc0', 12, 6, 3.5); ring(S.to.x, S.to.z, 2.6, '#ffffff', 0.35, 0.6);
      const d = dist(R.x, R.z, S.to.x, S.to.z);
      const level = Math.abs(R.y + 0.15 - S.to.y) < 1.2; // misma superficie
      if (level && d < 1.3) killRoach('slipper');
      else if (R.alive && level && d < 2.9) { st.slow = 0.35; addScore(10, '¡Por los pelos!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
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
  if (R.alive && R.y < 2.5 && dist(R.x, R.z, P.x, P.z) < 2.3) { R.poison += dt; if (R.poison > 0.85) killRoach('spray'); }
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
      if (R.air < 0.25 && R.y < 2.4) killRoach('cat');
      else if (!K.dodged && R.air >= 0.25) { K.dodged = true; st.slow = 0.35; addScore(15, '¡Olé!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
    }
    if (takeSlick(K.x, K.z, 1.2)) { K.state = 'slide'; K.t = 2.4; sfx.slip(); addScore(30, '¡Patinazo!', K.x, K.z, '#9be7a0'); burst(K.x, 0.2, K.z, '#f2b705', 8, 4, 3); }
    else if (K.t <= 0) { K.state = 'recover'; K.t = 1.5; burst(K.x, 0.1, K.z, '#e6dcc4', 6, 3, 1.5, 0.4); }
  } else if (K.state === 'slide') {
    K.x = clamp(K.x + K.vx * 0.3 * dt, ROOM.x0 + 1, ROOM.x1 - 1); K.z = clamp(K.z + K.vz * 0.3 * dt, ROOM.z0 + 1, ROOM.z1 - 1);
    if (K.t <= 0) { K.state = 'recover'; K.t = 1.2; }
  } else if (K.t <= 0) { K.state = 'sleep'; K.t = dark ? rand(0.5, 1.5) : 3; }
}

// ---------- las gallinas del patio: ven de cerca, persiguen y pican ----------
function updateChicks(dt) {
  for (const c of C) {
    if (!c.on) continue;
    c.t -= dt;
    const d = dist(R.x, R.z, c.x, c.z), sees = R.alive && R.inv <= 0 && !R.hidden && R.y < 1.3 && d < (R.noise > 7 ? 6.2 : 4.3);
    const go = (tx, tz, speed) => { const dx = tx - c.x, dz = tz - c.z, l = Math.hypot(dx, dz) || 1; c.x += dx / l * speed * dt; c.z += dz / l * speed * dt; c.face += wrap(Math.atan2(dz, dx) - c.face) * Math.min(1, dt * 9); c.walk += dt * speed * 3; return l; };
    if (c.state === 'wander') {
      if (sees) { c.state = 'chase'; c.t = 3.4; sfx.cluck(); floater('!', c.x, c.z, '#ff5a5a', 2, 2.2); }
      else if (c.t <= 0 || go(c.tx, c.tz, (c.t % 1.7) > 0.6 ? 1.7 : 0) < 0.4) { c.tx = clamp(c.x + rand(-5, 5), -13, 13); c.tz = clamp(c.z + rand(-4, 4), -8.5, 8.5); c.t = rand(2.5, 5); }
    } else if (c.state === 'chase') {
      if (!R.alive || R.hidden || c.t <= 0 || d > 8) { c.state = 'rest'; c.t = 1.6; }
      else if (go(R.x, R.z, 5.7) < 1.4) { c.state = 'peck'; c.t = 0.42; c.dur = 0.42; }
    } else if (c.state === 'peck') {
      c.face += wrap(Math.atan2(R.z - c.z, R.x - c.x) - c.face) * Math.min(1, dt * 10);
      if (c.t <= 0) {
        sfx.peck(); burst(c.x + Math.cos(c.face), 0.1, c.z + Math.sin(c.face), '#e6dcc4', 4, 2, 1.5, 0.3);
        if (R.alive && !R.hidden && R.air < 0.25 && R.y < 1 && d < 1.55) killRoach('peck');
        else if (R.alive && d < 2.6) { st.slow = 0.3; addScore(15, '¡Olé!', R.x, R.z, '#9be7a0'); sfx.bonus(); }
        c.state = 'rest'; c.t = 0.9;
      }
    } else if (c.t <= 0) { c.state = 'wander'; c.t = rand(1, 3); c.tx = c.x; c.tz = c.z; }
    if ((c.state === 'wander' || c.state === 'chase') && takeSlick(c.x, c.z, 1.1)) { c.state = 'slide'; c.t = 2.6; sfx.slip(); addScore(30, '¡Patinazo!', c.x, c.z, '#9be7a0'); burst(c.x, 0.2, c.z, '#f2b705', 8, 4, 3); }
    collide(c, 0.55, 0);
  }
}

// ---------- cinemáticas ----------
function enterStep(i) { // al abrir con iris, la cámara ya está en su sitio
  const s = cine.steps[i];
  if (s.cam && (s.iris === 'in' || s.iris === 'both')) { cam.x = s.cam[0]; cam.z = s.cam[1]; cam.y = 0; st.zoom = s.cam[2]; }
  s.enter?.();
}
function playCine(steps, done) { Object.assign(cine, { steps, i: 0, t: 0, done }); st.mode = 'cine'; st.cineT = st.clock; enterStep(0); }
function endCine() { const d = cine.done; cine.steps = null; grannyMesh.visible = false; world.doorGlow.visible = false; G.sayT = 0; d(); }
function updateCine(dt) {
  const s = cine.steps[cine.i], before = cine.t;
  s.update?.(dt, Math.min(1, cine.t / s.dur));
  cine.t += dt;
  const text = s.cap || s.say?.text;
  if (text && Math.floor(before * 34) !== Math.floor(cine.t * 34) && cine.t * 34 < text.length && Math.floor(cine.t * 34) % 2 === 0) sfx.blip();
  if (cine.t >= s.dur) { cine.i++; cine.t = 0; if (cine.i >= cine.steps.length) endCine(); else enterStep(cine.i); }
}
const place = (x, z, head) => { Object.assign(R, { x, z, head, vx: 0, vz: 0, y: 0, vy: 0, air: 0, wing: 0, carry: 0, alive: true, inv: 0, scared: 0 }); };

const openingSteps = () => [
  { dur: 4.6, art: 'night', reveal: true, cap: 'Marrakech. Las 3:07 de la madrugada.' },
  { dur: 4.6, art: 'night', scroll: 26, cap: 'La medina duerme. Todos, menos una familia con hambre.' },
  { dur: 3.4, art: 'night', scroll0: 26, zoom: [1, 5], focus: [0.5, 0.86], cap: 'Detrás de una pared. Debajo de una cocina.', iris: 'out' },
];

function kitchenSteps() {
  const L = LV.levels[0], h = L.hole, oil = L.oil[0], door = L.nodes[0];
  return [
    { dur: 4.4, cam: [7, -3.5, 1.1], cam2: [-8.5, 4, 1.3], cap: 'La cocina de la jadda. Territorio enemigo.', iris: 'in', chapter: { n: 1, name: L.name, lv: 0, at: 0.7 },
      enter: () => { prep(1); place(h.x - 1.2, h.z, 0); G.state = 'cine'; roachMesh.visible = false; } },
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
  ];
}

// Antes de mudarse: en el agujero del sitio ya saqueado, las crías quieren más.
function familySteps(p) {
  const h = world.hole, line = p.loop && p.lv === 0 ? 'El invierno es largo. Otra vuelta por la casa.' : ['', 'Queda el salón de jeddi. Vamos.', 'Al patio. Dicen que hay una khabia entera.', 'La tienda de Si Brahim. El golpe del siglo.'][p.lv];
  return [
    { dur: 2.8, cam: [h.x + 2, h.z, 1.8], fade: true, say: { who: 'baby', text: pick(['¡Baba! ¡Más zit!', '¡Sigo con hambre, baba!', '¡Otro poquito, baba!']) },
      enter: () => { place(h.x + 2.2, h.z, Math.PI); grannyMesh.visible = false; setLight(!!world.alwaysLit); }, update: (dt, k) => { babies.forEach((b, i) => { if (b.hop <= 0 && Math.sin(k * 22 + i * 2) > 0.8) b.hop = 0.35; }); } },
    { dur: 3.0, cam: [h.x + 2, h.z, 1.8], say: { who: 'roach', text: line }, update: (dt, k) => { R.air = k > 0.75 && k < 0.9 ? Math.sin((k - 0.75) / 0.15 * Math.PI) * 0.4 : 0; } },
  ];
}

// La mudanza: salen por un agujero, corren por dentro de la pared saltando una cerilla y entran por el siguiente.
function tunnelStep(fromLv, p) {
  const path = (q) => (q < 0.1 ? { x: -13, z: lerp(-3, 0.9, q / 0.1), h: Math.PI / 2 }
    : q > 0.9 ? { x: 13, z: lerp(0.9, -3, (q - 0.9) / 0.1), h: -Math.PI / 2 } : { x: lerp(-13, 13, (q - 0.1) / 0.8), z: 0.9, h: 0 });
  const hopAt = (x) => (Math.abs(x) < 1.5 ? Math.sin((x + 1.5) / 3 * Math.PI) : 0);
  return {
    dur: 7.4, cam: [-11, 0, 1.5], cam2: [11, 0, 1.5], iris: 'both',
    cap: p.loop && p.lv === 0 ? 'El invierno es largo. Otra vuelta por la casa, y todos más despiertos.' : STORY[p.lv],
    chapter: { n: p.lv + 1, name: LV.levels[p.lv].name, lv: p.lv, at: 3.2, loop: p.loop },
    enter: () => { showTunnel(fromLv, p.lv); place(-13, -3, Math.PI / 2); },
    update: (dt, k) => {
      const q = clamp(k * 1.03, 0, 1), a = path(q);
      R.x = a.x; R.z = a.z; R.head += wrap(a.h - R.head) * Math.min(1, dt * 9); R.vx = q < 1 ? 5 : 0; R.air = hopAt(a.x) * 0.9;
      babies.forEach((b, i) => {
        const bq = clamp(q - 0.115 - i * 0.055, 0, 1), c = path(bq);
        b.m.visible = bq > 0.005 && bq < 0.995; b.m.position.set(c.x, hopAt(c.x) * 0.7, c.z + (i ? 0.55 : -0.45)); b.m.rotation.y = -c.h; b.hop = 0;
      });
      world.holeLight.position.set(R.x + 0.8, 1.5, R.z + 1.4);
      if (q > 0.1 && q < 0.9 && Math.random() < dt * 14) burst(R.x - 1.2, 0.1, R.z + rand(-0.4, 0.4), '#8a7a66', 1, 1, 1, 0.45);
      if (Math.random() < dt * 5) burst(R.x + rand(-6, 8), rand(2, 6), rand(-2, 3), '#d9cdb8', 1, 0.15, 0.1, 1.6, 0.4); // motas de polvo
    },
  };
}

// Presentación de un sitio nuevo: la amenaza, el botín y la cucaracha armándose de valor.
function placeSteps(n) {
  const p = plan(n), L = LV.levels[p.lv], h = L.hole, oil = L.oil[0];
  const th = L.enemyPos || (p.chicks && L.chickSpots ? { x: L.chickSpots[0][0], z: L.chickSpots[0][1] } : L.nodes[Math.min(1, L.nodes.length - 1)]);
  return [
    { dur: 3.6, cam: [th.x, th.z + 1, 1.35], iris: 'in', cap: L.capThreat || 'La jadda sigue de guardia. Y está de peor humor.', enter: () => { prep(n); place(h.x + 1.4, h.z, 0); } },
    { dur: 3.2, cam: [oil.x - 1.5, oil.z - 1.5, 1.4], cap: L.capOil || 'El bidón sigue ahí. Esperándote.',
      update: () => { if (Math.random() < 0.12) burst(oil.x + rand(-1, 1), rand(0.5, 2), oil.z + rand(-1, 1), '#fff6d6', 1, 0.3, 0.8, 0.5, 2); } },
    { dur: 1.9, cam: [h.x + 2, h.z, 1.8], say: { who: 'roach', text: pick(['¡Yallah!', 'Bismillah...', 'Por los wlidat.']) },
      update: (dt, k) => { R.air = k < 0.35 ? Math.sin(k / 0.35 * Math.PI) * 0.5 : 0; } },
  ];
}

function playEnding(n) {
  const h = world.hole;
  playCine([
    { dur: 3.6, cam: [h.x + 2.5, h.z, 1.8], say: { who: 'roach', text: '¡Wlidati! ¡Zit para todo el invierno!' },
      enter: () => { place(h.x + 1.8, h.z, Math.PI); grannyMesh.visible = false; },
      update: (dt, k) => { R.air = Math.abs(Math.sin(k * 14)) * 0.4; babies.forEach((b, i) => { if (b.hop <= 0 && Math.sin(k * 30 + i * 2) > 0.6) b.hop = 0.4; }); } },
    { dur: 4.4, art: 'dawn', cap: 'Amanece sobre Marrakech.', enter: () => { st.cineT = st.clock; sfx.win(); } },
    { dur: 5.2, art: 'dawn', scroll: 20, cap: 'En algún agujero de la medina, una familia desayuna khobz con zit.' },
    { dur: 7, art: 'dawn', scroll: 34, big: 'FIN', cap: `${st.score} puntos. Pero el zit se acaba pronto... y la jadda no olvida.` },
  ], () => goNight(n + 1));
}

// ---------- luces y cámara ----------
function updateLight(dt) {
  st.lightT += dt;
  const t = st.lightT;
  const target = st.lightOn ? (t < 0.07 ? 1 : t < 0.15 ? 0.1 : t < 0.24 ? 0.9 : t < 0.3 ? 0.25 : 1) : 0;
  st.light = st.lightOn ? target : Math.max(0, st.light - dt * 8);
  const playing = ['play', 'intro', 'clear', 'dawn', 'over'].includes(st.mode);
  const a = st.light, dawn = playing ? clamp((st.time / st.nightLen - 0.72) / 0.28, 0, 1) : 0;
  tmpC.copy(moonC).lerp(dawnC, dawn);
  world.sun.color.copy(tmpC).lerp(lampC, a);
  world.sun.intensity = lerp(moonI + dawn * 0.6, 2.3, a);
  world.sun.position.lerpVectors(world.moonPos, world.lampPos, a);
  world.hemi.color.copy(hemiN).lerp(hemiL, a); world.hemi.groundColor.copy(gndN).lerp(gndL, a);
  world.hemi.intensity = lerp(1.25 + dawn * 0.4, 1.3, a);
  world.windowMat?.color.copy(winN).lerp(winD, dawn);
  if (world.tvLight) { const f = Math.floor(st.clock * 2.5) % 3; world.tvLight.intensity = 11 + f * 4 + Math.sin(st.clock * 17) * 2; world.tvMat.color.setHSL(0.6 - f * 0.04, 0.7, 0.62 + f * 0.06); }
  world.waterMat?.color.setHSL(0.55, 0.62, 0.52 + Math.sin(st.clock * 3) * 0.05);
  gfx.post.uniforms.tint.value.copy(tintN).lerp(tintL, Math.max(a, dawn * 0.6));
  world.holeLight.intensity = 5 + Math.sin(st.clock * 6) * 0.8;
  const chased = C.some((c) => c.on && (c.state === 'chase' || c.state === 'peck'));
  const danger = st.mode !== 'play' ? 0 : G.state === 'hunt' ? 0.75 + Math.sin(st.clock * 10) * 0.25 : chased || K.state === 'alert' || K.state === 'pounce' ? 0.7 : st.detect * 0.5;
  st.danger += (danger - st.danger) * Math.min(1, dt * 8);
  gfx.post.uniforms.danger.value = st.danger;
}

const camT = new THREE.Vector3();
function updateCamera(dt, raw) {
  let tx, tz, ty = 0, zoom = 1, rate = 5;
  const step = st.mode === 'cine' ? cine.steps[cine.i] : null;
  if (step?.cam) {
    [tx, tz, zoom] = step.cam; rate = 3.2;
    if (step.cam2) { const q = clamp(cine.t / step.dur, 0, 1); tx = lerp(tx, step.cam2[0], q); tz = lerp(tz, step.cam2[1], q); zoom = lerp(zoom, step.cam2[2], q); rate = 9; }
  }
  else if (st.mode === 'title' || step) { tx = cam.x; tz = cam.z; }
  else if (st.mode === 'clear') { tx = world.hole.x + 3.6; tz = world.hole.z + 1.6; zoom = 1.6; rate = 3; }
  else {
    tx = clamp(R.x + R.vx * 0.25, -12, 12); tz = clamp(R.z + R.vz * 0.25, -7.5, 7.5); ty = R.y * 0.7;
    if (!R.alive || st.mode === 'over') { tx = R.x; tz = R.z; zoom = 1.35; }
  }
  const k = 1 - Math.exp(-raw * rate);
  cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k; cam.y += (ty - cam.y) * k;
  st.kick = Math.max(0, st.kick - raw * 0.5);
  st.zoom += (zoom - st.zoom) * (1 - Math.exp(-raw * 4));
  gfx.setZoom(st.zoom + st.kick);
  st.shake = Math.max(0, st.shake - raw);
  const s = st.shake * 0.9;
  gfx.setTarget(camT.set(cam.x + rand(-s, s), cam.y, cam.z + rand(-s, s)));
}

// ---------- sincronizar mallas ----------
function syncMeshes(dt) {
  const sp = Math.hypot(R.vx, R.vz);
  R.walk += dt * Math.min(sp, 9) * 3.2;
  roachMesh.position.set(R.x, R.y, R.z);
  if (R.alive) {
    roachMesh.rotation.y = -R.head;
    if (st.mode !== 'cine') roachMesh.visible = R.inv <= 0 || Math.floor(st.clock * 14) % 2 === 0;
    const scared = st.mode === 'play' ? clamp(st.detect * 1.5, 0, 1) : R.scared;
    const show = st.mode === 'cine' || st.mode === 'clear'; // fuera de la partida, R.air es un saltito de atrezo
    animRoach(roachMesh, { phase: R.walk, speed: sp / 6.4, time: st.clock, turn: R.turn, air: show ? 0 : R.air, hop: show ? R.air : 0, wing: R.wing, scared, carry: R.carry, squash: R.squash });
  }
  babies.forEach((b, i) => {
    b.hop = Math.max(0, b.hop - dt);
    if (b.hop > 0 || !LV.tunnel.root.visible) b.m.position.y = Math.sin(clamp(b.hop / 0.4, 0, 1) * Math.PI) * 0.5;
    animRoach(b.m, { phase: st.clock * 6, speed: b.hop > 0 ? 0.6 : 0, time: st.clock + i * 1.7, turn: 0, air: 0, wing: 0, scared: 0, carry: 0, squash: 0 });
  });

  if (grannyMesh.visible) {
    const moving = G.route.length > 0 && G.state !== 'slip', seated = G.kind === 'sleeper' && G.state !== 'cine';
    let tilt = moving ? Math.sin(G.walk) * 0.05 : 0, y = moving ? Math.abs(Math.sin(G.walk)) * 0.14 : seated ? world.enemyPos.y : 0;
    if (G.state === 'doze') tilt = -0.12 + Math.sin(st.clock * 1.6) * 0.04; // cabezadas
    if (G.state === 'slip') {
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
    u.cone.visible = st.light > 0.5 && !['gloat', 'slip', 'doze'].includes(G.state) && !seated;
    u.cone.material.color.set(hunting ? '#ff3030' : '#ff9f1c');
    u.cone.material.opacity = hunting ? 0.16 : 0.3;
    if (hunting && Math.random() < dt * 9) burst(G.x, 5.6 + y, G.z, '#ffffff', 1, 1.2, 2.5, 0.5, 3); // humo de cabreo
  }

  if (K.on) {
    catMesh.position.set(K.x, 0, K.z); catMesh.rotation.y = -K.face;
    animCat(catMesh, K.state, st.clock, K.walk, K.state === 'pounce' ? 1 - K.t / K.dur : 0);
  }
  for (const c of C) {
    if (!c.on) continue;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = -c.face;
    animChicken(c.mesh, c.state, st.clock, c.walk, c.state === 'peck' ? 1 - c.t / c.dur : 0);
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
const SOFT = '#b9c8ff', GREEN = '#9be7a0', RED = '#ff5a5a', BORDER_C = '#e9c46a';

function pointer(x, z, label, color) {
  const p = proj(x, 1.4, z), { W, H } = hud, m = 16;
  if (p.x > m && p.x < W - m && p.y > 44 && p.y < H - 30) { hud.arrow(p.x, p.y - 10 + Math.sin(st.clock * 6) * 2, Math.PI / 2, color, 4); return; }
  const cx = clamp(p.x, m + 6, W - m - 6), cy = clamp(p.y, 48, H - 34);
  hud.arrow(cx, cy, Math.atan2(p.y - cy, p.x - cx), color, 5);
  hud.text(label, clamp(cx, 22, W - 22), cy + (cy > H / 2 ? -12 : 12), { color });
}

function toast(msg) { // aviso bajo la barra de la noche
  const lines = hud.wrap(msg, Math.min(hud.W - 60, 250)), w = Math.max(...lines.map((l) => hud.width(l))) + 34, h = lines.length * 10 + 10;
  const x = Math.round(hud.W / 2 - w / 2), y = 42 + Math.round(clamp(st.msgT - (st.msgDur - 0.15), 0, 0.15) * -40); // entra deslizándose desde arriba
  hud.plate(x, y, w, h);
  hud.rect(x + 6, y + (h >> 1) - 5, 9, 10, INK); hud.rect(x + 7, y + (h >> 1) - 4, 7, 8, GOLD); hud.text('!', x + 11, y + (h >> 1), { color: INK, outline: null });
  lines.forEach((l, i) => hud.text(l, x + 12 + w / 2, y + 9 + i * 10, { color: CREAM, outline: null }));
}

function drawWorldMarks() {
  const { W, H } = hud;
  if (st.mode === 'play' && R.alive) {
    if (R.carry > 0) pointer(world.hole.x, world.hole.z, 'CASA', '#ffb347');
    if (R.carry === 0) {
      const src = oilSources().reduce((a, b) => (dist(R.x, R.z, a.x, a.z) < dist(R.x, R.z, b.x, b.z) ? a : b));
      pointer(src.x, src.z, 'ZIT', GOLD);
    }
    const p = proj(R.x, R.y + 1.3, R.z);
    if (R.fuel > 0) hud.bar(p.x - 9, p.y - 5, 18, 2, R.fuel / FLY_TIME, R.fuel > 0.5 ? '#7dd3fc' : '#ff5a5a');
    if (R.fill > 0) hud.bar(p.x - 9, p.y - 9, 18, 3, R.fill, GOLD);
    if (st.detect > 0.02 && G.state === 'doze') { hud.bar(p.x - 10, p.y - 14, 20, 3, st.detect, st.detect > 0.6 ? RED : '#ffb347'); hud.text('ruido', p.x, p.y - 21, { color: st.detect > 0.6 ? RED : '#ffb347' }); }
    else if (st.detect > 0.02) {
      const hunt = G.state === 'hunt';
      hud.eye(p.x, p.y - 18 - (hunt ? Math.abs(Math.sin(st.clock * 12)) * 2 : 0), st.detect, hunt);
      if (!hunt) hud.bar(p.x - 8, p.y - 12, 16, 2, st.detect, '#ffb347');
    } else if (R.hidden && (st.light > 0.5 || C.some((c) => c.on))) hud.text('oculta', p.x, p.y - 12, { color: GREEN });
    if (R.poison > 0.1) hud.text('¡cof!', p.x + 14, p.y - 6, { color: '#7dff5c' });
  }
  if (grannyMesh.visible) {
    const p = proj(G.x, G.state === 'slip' ? 2.5 : 6.6 + (G.kind === 'sleeper' ? 0.7 : 0), G.z);
    if (G.state === 'slip') for (let i = 0; i < 3; i++) { const a = st.clock * 6 + i * 2.1; hud.text('*', p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 4, { color: GOLD }); }
    if (G.state === 'doze' && G.sayT <= 0) hud.text(st.detect > 0.6 ? '¿mm?' : 'z'.repeat(1 + Math.floor(st.clock * 1.5) % 3), p.x + 8, p.y + 6, { color: st.detect > 0.6 ? '#ffb347' : SOFT });
    if (G.sayT > 0) hud.bubble([G.say], p.x, Math.max(52, p.y), G.state === 'hunt' ? { bg: '#d62828', color: '#ffffff', shake: 2 } : {});
    else if (st.mode === 'play' && G.kind !== 'sleeper' && (p.x < 0 || p.x > W || p.y > H + 60)) { // aviso de por dónde anda
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
  for (const c of C) if (c.on && c.state === 'slide') { const p = proj(c.x, 2.4, c.z); hud.text('?!', p.x, p.y, { color: GOLD }); }
  for (const f of floaters) {
    const k = f.t / f.dur, p = proj(f.x, f.h + ease(k) * 1.6, f.z);
    if (k < 0.85 || Math.floor(st.clock * 20) % 2) hud.text(f.text, clamp(p.x, 30, W - 30), p.y, { color: f.color, scale: f.scale });
  }
}

const pxr = (a, b, w, h, c) => hud.rect(a, b, w, h, c);
const zone = (x, y, w, h, act) => touch.zones.push({ x, y, w, h, act }); // zona tocable de este fotograma

function drawTouch() {
  const { W, H } = hud, t = st.clock, A = padA(), B = padB(), wings = st.plan.wings, home = stickHome();
  // palanca: una bandeja de latón que aparece bajo el pulgar, con la tapa de un tajín por pomo
  const s = touch.stick, bx = s ? s.ox : home.x, by = s ? s.oy : home.y, run = !!s && touch.mag > 0.9;
  hud.tray(bx, by, STICK_R, s ? 0.85 : 0.45);
  if (!s) for (const [ax, ay, ang] of [[0, -18, -Math.PI / 2], [0, 18, Math.PI / 2], [-18, 0, Math.PI], [18, 0, 0]]) hud.arrow(bx + ax, by + ay, ang, 'rgba(253,246,227,0.7)', 2);
  hud.g.globalAlpha = s ? 1 : 0.7; hud.tajine(bx + (s ? touch.mx * touch.mag * STICK_R : 0), by + (s ? touch.my * touch.mag * STICK_R : 0), run); hud.g.globalAlpha = 1;
  if (run) hud.text('correr', bx, by - STICK_R - 9, { color: GOLD });
  else if (!touch.used) hud.text('mover', bx, by - STICK_R - 9, { color: CREAM });
  // el tarbouch: saltar; en el aire, dejarlo pulsado vuela mientras queden alas
  const down = touch.a !== null;
  hud.fez(A.x, A.y, A.r, down, t);
  if (R.fuel > 0) { hud.ring(A.x, A.y, A.r + 3, '#7dd3fc', R.fuel / FLY_TIME); hud.ring(A.x, A.y, A.r + 4, '#e0f6ff', R.fuel / FLY_TIME); }
  hud.text(wings ? 'volar' : 'saltar', A.x, A.y + A.r + 8, { color: CREAM });
  if (wings) for (let i = 0; i < WINGS_MAX; i++) hud.wing(A.x - 14 + i * 10, A.y - A.r - 11, i < R.wings);
  // la gota: soltar zit
  const has = R.carry > 0; touch.bT = Math.max(0, touch.bT - 0.016);
  hud.oilDrop(B.x, B.y, B.r, has, touch.bT > 0); hud.text('soltar', B.x, B.y + B.r + 8, { color: has ? CREAM : '#7f79a8' });
  // ruido y pausa
  hud.plate(W / 2 - 14, H - 18 - touch.safe.b, 28, 16); hud.noise(W / 2 - 9, H - 16 - touch.safe.b, !R.alive ? 0 : R.noise > 7 ? 3 : R.noise > 3 ? 1 : 0);
  const px = W - 21 - touch.safe.r, py = 47;
  hud.plate(px - 9, py, 18, 16); hud.rect(px - 4, py + 4, 3, 8, CREAM); hud.rect(px + 1, py + 4, 3, 8, CREAM);
  zone(px - 16, py - 6, 32, 30, () => { st.paused = true; });
}

function drawPlayHud() {
  const { W, H } = hud, cx = W / 2, t = st.clock;
  // zit robado y carga
  hud.g.save(); hud.g.translate(touch.safe.l, 0);
  hud.plate(3, 3, 78, 40);
  hud.bottle(8, 8, st.stolen / st.quota, t);
  const pop = st.punchOil > 0, nw = hud.text(st.stolen, 27, 15 - (pop ? 2 : 0), { scale: 2, color: pop ? '#ffffff' : GOLD, align: 'left', shadow: '#7a3d00' });
  hud.text(`/${st.quota}`, 29 + nw, 18, { color: '#d9b25a', align: 'left' });
  for (let i = 0; i < CARRY_MAX; i++) hud.socket(27 + i * 13, 27, i < R.carry, t);
  hud.g.restore();
  // la noche
  const k = clamp(st.time / st.nightLen, 0, 1), late = k > 0.8, bw = clamp(W - 240, 70, 130);
  hud.ribbon(late && Math.floor(t * 3) % 2 ? '¡AMANECE!' : `NOCHE ${st.night} · ${world.short}`, cx, 4, late ? { color: '#c1440e', dark: '#7a2606', light: '#ff8a4c' } : { color: '#2b3a8a', dark: '#161f55', light: '#5a6ad0' });
  hud.skybar(cx - bw / 2, 25, bw, k, t);
  // puntos, combo y vidas
  hud.g.save(); hud.g.translate(-touch.safe.r, 0);
  hud.plate(W - 81, 3, 78, 40);
  hud.text(String(st.score).padStart(6, '0'), W - 9, 14 - (st.punchScore > 0 ? 1 : 0), { color: st.punchScore > 0 ? '#ffffff' : GOLD, align: 'right', shadow: '#7a3d00' });
  if (st.combo > 1) { hud.rect(W - 77, 8, 22, 13, INK); hud.rect(W - 76, 9, 20, 11, '#b3121d'); hud.rect(W - 76, 9, 20, 1, '#ff5a5a'); hud.text(`x${st.combo}`, W - 66, 14, { color: CREAM, outline: null }); }
  for (let i = 0; i < 3; i++) {
    if (i < st.lives) drawRoachSprite(pxr, W - 76 + i * 23, 25, 1, i === st.lives - 1 && R.alive ? Math.floor(t * 4) : 0);
    else { hud.rect(W - 74 + i * 23, 29, 16, 7, INK); hud.rect(W - 73 + i * 23, 30, 14, 5, '#2f2a52'); hud.rect(W - 71 + i * 23, 31, 10, 3, '#3d3760'); }
  }
  hud.g.restore();
  // teclas: saltar o volar, soltar zit, correr y cuánto ruido haces
  const y = H - 20, wings = st.plan.wings, lw = wings ? 190 : 164;
  if (st.mode === 'play' && !st.paused && touch.on) drawTouch();
  else if (st.mode === 'play' && !st.paused) {
  hud.plate(3, y - 3, lw, 20);
  let x = 8; x += hud.keycap('ESP', x, y, true, keys.has('Space')) + 4;
  x += hud.text(wings ? 'volar' : 'saltar', x, y + 6, { align: 'left', color: CREAM, outline: null }) + 5;
  if (wings) { for (let i = 0; i < WINGS_MAX; i++) hud.wing(x + i * 10, y + 4, i < R.wings); x += WINGS_MAX * 10 + 2; }
  hud.rect(x, y, 1, 14, '#4a3f8e'); x += 5;
  x += hud.keycap('E', x, y, R.carry > 0, keys.has('KeyE')) + 4;
  hud.text('soltar zit', x, y + 6, { align: 'left', color: R.carry > 0 ? CREAM : '#7f79a8', outline: null });
  hud.plate(W - 117, y - 3, 114, 20);
  x = W - 112; x += hud.keycap('SHIFT', x, y, true, R.sprint) + 4;
  x += hud.text('correr', x, y + 6, { align: 'left', color: R.sprint ? GOLD : CREAM, outline: null }) + 6;
  hud.noise(x, y + 2, !R.alive ? 0 : R.noise > 7 ? 3 : R.noise > 3 ? 1 : 0);
  }

  let msg = st.msgT > 0 && st.mode === 'play' ? st.msg : '';
  if (!msg && st.mode === 'play' && st.night === 1 && R.alive) {
    if (st.tut === 0) { msg = 'Cruza la cocina y busca zit. La flecha te guía'; if (dist(R.x, R.z, world.hole.x, world.hole.z) > 7) st.tut = 1; }
    else if (st.tut === 2 && R.carry > 0) msg = 'Lleva el zit a tu agujero';
  }
  if (!msg && app.update && !app.told && st.mode === 'play') { app.told = true; say(say2('Hay una versión nueva: pulsa U en la pausa para actualizar', 'Hay una versión nueva: actualiza desde la pausa'), 4); }
  if (msg) toast(msg);
}

// tarjeta con cinta de título que entra deslizándose; devuelve su esquina para pintar dentro
function card(title, w, h, y0, opts = {}) {
  const { W, H } = hud, slide = Math.round((1 - ease(clamp(st.modeT * 3, 0, 1))) * W);
  const x = Math.round(W / 2 - w / 2) - slide, y = Math.round(H * y0);
  hud.panel(x, y, w, h, { tone: opts.tone });
  hud.ribbon(title, x + w / 2, y - 9, { scale: 2, ...opts.ribbon });
  return { x, y, cx: x + w / 2 };
}

function drawCards() {
  const { W, H } = hud, cx = W / 2, t = st.modeT, blink = Math.floor(st.clock * 2) % 2;
  const prompt = (label, key, y) => {
    if (touch.on) { if (blink) hud.text(`toca para ${label}`, cx, y - 1, { color: CREAM }); return; }
    const w = hud.width(label) + hud.width(key) + 22, x = Math.round(cx - w / 2); const kw = hud.keycap(key, x, y - 7, true, blink); hud.text(label, x + kw + 5, y - 1, { align: 'left', color: CREAM });
  };
  if (st.mode === 'intro') {
    const w = Math.min(W - 16, 296), news = hud.wrap(st.news, w - 76), c = card(`NOCHE ${st.night}`, w, 74 + news.length * 10, 0.26);
    hud.text(world.name, c.cx, c.y + 30, { scale: 2, color: GOLD, shadow: '#7a3d00' });
    const goal = `roba ${st.quota} gotas antes del amanecer`, gw = hud.width(goal);
    hud.drop(c.cx - gw / 2 - 8, c.y + 44); hud.text(goal, c.cx + 4, c.y + 48, { color: CREAM, outline: null });
    hud.divider(c.cx, c.y + 60, w - 60);
    hud.rect(c.x + 12, c.y + 67, 38, 13, INK); hud.rect(c.x + 13, c.y + 68, 36, 11, '#1f7a5c'); hud.rect(c.x + 13, c.y + 68, 36, 1, '#7fe0c0'); hud.text('OJO', c.x + 31, c.y + 73, { color: CREAM, outline: null });
    news.forEach((l, i) => hud.text(l, c.x + 58, c.y + 73 + i * 10, { align: 'left', color: '#b8f0d0', outline: null }));
  } else if (st.mode === 'clear') {
    const r = st.res, w = Math.min(W - 16, 230), c = card('¡ZIT ROBADO!', w, 122, 0.42, { ribbon: { color: '#c98a00', dark: '#7a4f00', light: '#ffe98a', text: '#fff6d6' } });
    const stars = 1 + (r.stealth ? 1 : 0) + (r.time >= 40 ? 1 : 0);
    for (let i = 0; i < 3; i++) { const on = i < stars && t > 0.5 + i * 0.3, pop = on && t < 0.62 + i * 0.3 ? -2 : 0; hud.icon('star', c.cx - 20 + i * 16 - 4, c.y + 20 + pop, on ? GOLD : '#3d3760'); }
    const rows = [['drop', 'Zit robado', `${r.drops} gotas`], ['clock', 'Tiempo sobrante', `+${r.time}`], ['eye', r.stealth ? 'Sin dar la alarma' : 'Han dado la alarma', `+${r.stealth}`], ['heart', 'Vidas', `+${r.lives}`]];
    rows.forEach(([ic, a, b], i) => {
      if (t < 0.7 + i * 0.45) return;
      const yy = c.y + 43 + i * 13;
      if (ic === 'drop') hud.drop(c.x + 17, yy - 4); else hud.icon(ic, c.x + 13, yy - 3, ic === 'heart' ? '#ff5a5a' : '#b9c8ff');
      hud.text(a, c.x + 28, yy, { align: 'left', color: CREAM, outline: null }); hud.text(b, c.x + w - 14, yy, { align: 'right', color: i === 2 && !r.stealth ? '#7f79a8' : GREEN, outline: null });
    });
    if (t > 2.7) { hud.divider(c.cx, c.y + 96, w - 50); hud.text('TOTAL', c.x + 14, c.y + 108, { align: 'left', color: GOLD, outline: null }); hud.text(st.score, c.x + w - 14, c.y + 108, { align: 'right', scale: 1, color: GOLD, shadow: '#7a3d00' }); }
    if (t > 3.4) prompt('seguir', 'ENTER', Math.min(H - 12, c.y + 136));
  } else if (st.mode === 'dawn') {
    const c = card('AMANECE...', Math.min(W - 16, 240), 58, 0.32, { ribbon: { color: '#c1440e', dark: '#7a2606', light: '#ff8a4c' } });
    hud.text('no has robado bastante zit', c.cx, c.y + 28, { color: CREAM, outline: null });
    hud.icon('heart', c.cx - 54, c.y + 39, '#ff5a5a'); hud.text('pierdes una vida', c.cx + 6, c.y + 43, { color: '#ff8a8a', outline: null });
  } else if (st.mode === 'over') {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.62)');
    const w = Math.min(W - 16, 250), lines = hud.wrap(st.reason, w - 60), c = card('SAFI', w, 104 + lines.length * 10, 0.2, { tone: 'red' });
    hud.icon('skull', c.cx - 3, c.y + 22, CREAM);
    lines.forEach((l, i) => hud.text(l, c.cx, c.y + 42 + i * 10, { color: CREAM, outline: null }));
    const yy = c.y + 46 + lines.length * 10;
    hud.divider(c.cx, yy, w - 60);
    hud.text(String(st.score).padStart(6, '0'), c.cx, yy + 18, { scale: 2, color: GOLD, shadow: '#7a3d00' });
    hud.text(`noche ${st.night} · ${world.short.toLowerCase()}`, c.cx, yy + 34, { color: '#e0b0b8', outline: null });
    hud.text(st.score >= st.best.score && st.score > 0 ? '¡nuevo récord!' : `récord: ${st.best.score}`, c.cx, yy + 46, { color: st.score >= st.best.score && st.score > 0 ? GREEN : '#b98a94', outline: null });
    if (st.modeT > 1) prompt('otra vez', 'ENTER', Math.min(H - 12, c.y + 122 + lines.length * 10));
  }
  if (st.paused) {
    hud.rect(0, 0, W, H, 'rgba(6,7,18,0.62)');
    const w = Math.min(W - 16, 250), x = Math.round(cx - w / 2), y = Math.round(H * 0.2);
    hud.panel(x, y, w, 128); hud.ribbon('PAUSA', cx, y - 9, { scale: 2, color: '#2b3a8a', dark: '#161f55', light: '#5a6ad0' });
    if (app.update) { const uw = 150, ux = Math.round(cx - uw / 2), uy = y + 134; hud.plate(ux, uy, uw, 18, { tone: 'red' }); hud.text(say2('U · ACTUALIZAR A LA NUEVA VERSIÓN', 'ACTUALIZAR A LA NUEVA VERSIÓN'), cx, uy + 9, { color: GOLD, outline: null }); zone(ux, uy - 3, uw, 24, applyUpdate); }
    if (touch.on) { // en el móvil: cómo se juega y dos botones grandes
      [['palanca', 'moverse · a fondo, correr'], ['botón azul', 'saltar · dejarlo pulsado: volar'], ['botón dorado', 'soltar una gota de zit']].forEach(([a, b], i) => {
        hud.text(a, x + 16, y + 28 + i * 14, { align: 'left', color: GOLD, outline: null }); hud.text(b, x + 16 + 76, y + 28 + i * 14, { align: 'left', color: CREAM, outline: null });
      });
      const bw = Math.floor((w - 40) / 3), by = y + 76;
      const flip = () => { touch.lefty = !touch.lefty; localStorage.setItem('srak-l-zit.zurdo', touch.lefty ? '1' : '0'); };
      for (const [i, top, label, act] of [[0, '', 'SEGUIR', () => { st.paused = false; }], [1, 'sonido', sfx.muted ? 'NO' : 'SÍ', () => sfx.toggleMute()], [2, 'mano', touch.lefty ? 'ZURDA' : 'DIESTRA', flip]]) {
        const bx = x + 12 + i * (bw + 8); hud.plate(bx, by, bw, 38, { tone: i ? 'blue' : 'red' });
        if (top) hud.text(top, bx + bw / 2, by + 12, { color: SOFT, outline: null });
        hud.text(label, bx + bw / 2, by + (top ? 25 : 19), { color: CREAM, outline: null }); zone(bx, by, bw, 38, act);
      }
    } else {
      [['WASD', 'moverse'], ['SHIFT', 'correr (hace ruido)'], ['ESP', 'saltar · en el aire, mantener: volar'], ['E', 'soltar una gota de zit'], ['M', 'silenciar'], ['P', 'seguir jugando']].forEach(([key, what], i) => {
        const yy = y + 24 + i * 16; hud.keycap(key, x + 54 - hud.width(key) - 8, yy); hud.text(what, x + 60, yy + 6, { align: 'left', color: CREAM, outline: null });
      });
    }
  }
}

function letterbox(cap, bar = 26) {
  const { W, H } = hud;
  hud.rect(0, 0, W, bar, INK); hud.rect(0, H - bar, W, bar, INK);
  hud.rect(0, bar, W, 1, BORDER_C); hud.rect(0, H - bar - 1, W, 1, BORDER_C);
  if (cap) { const lines = hud.wrap(cap.slice(0, Math.floor(cine.t * 34)), W - 30); lines.forEach((l, i) => hud.text(l, W / 2, H - bar + (lines.length > 1 ? 8 : 13) + i * 10, { color: CREAM, outline: null })); }
  if (touch.on) { // botón de saltar la escena: tocar en otro sitio no hace nada, para no saltársela sin querer
    const x = W - 62 - touch.safe.r; hud.plate(x, 4, 58, 18); hud.text('SALTAR', x + 25, 13, { color: CREAM, outline: null }); hud.arrow(x + 50, 13, 0, GOLD, 2); zone(x - 6, 0, 70, 30, () => endCine());
  } else hud.text('ENTER: saltar', W - 6, 12, { align: 'right', color: '#6a6f9a', outline: null });
}

function drawTitle() {
  const { W, H, g } = hud, cx = W / 2, t = st.clock, T = t - st.titleT0, cy = Math.round(H * 0.3);
  // la ciudad sube, la luna sale por detrás del Atlas y las letras caen una a una
  const my = Math.round(lerp(H * 0.9, cy, ease(clamp((T - 0.5) / 2.1, 0, 1))));
  drawCity(g, W, H, t, 'night', 0, { reveal: clamp(T / 2.4, 0, 1), behind: () => { drawMoon(g, cx, my, Math.round(H * 0.21)); drawClouds(g, W, H, t); } });
  drawRoof(g, W, H, t, T > 4);
  const half = drawLogo(g, cx, cy, W, t, T - 1.9);
  if (T > 2.95 && T < 3.2) hud.rect(0, 0, W, H, `rgba(255,255,255,${(3.2 - T) * 2})`);
  if (T > 3.1) hud.sysText('سراق الزيت', cx, cy + half + 18, 22, CREAM, ARABIC);
  const dy = cy + half + 34;
  if (T > 3.4) for (let i = -7; i <= 7; i++) if (Math.abs(i) < (T - 3.4) * 20) hud.rect(cx + i * 9 - 1, dy + (i % 2 ? 1 : 0), 3, 3, i % 2 ? '#3fa7d6' : BORDER_C);
  if (T > 3.7) hud.text('la cucaracha que roba el aceite'.slice(0, Math.floor((T - 3.7) * 36)), cx, dy + 13, { color: '#ffd9a0' });
  if (T > 4.8) {
    const bob = Math.round(Math.sin(t * 3) * 1.5), y = H - 66 + bob, blink = Math.floor(t * 2) % 2, sv = loadSave();
    const plate = (x, w, label, key, act, strong) => { // botón de portada: se toca o se pulsa su tecla
      hud.plate(x, y, w, 22, { tone: strong ? 'red' : 'blue' });
      if (touch.on) hud.text(label, x + w / 2, y + 11, { color: strong && blink ? GOLD : CREAM, outline: null });
      else { const kw = hud.keycap(key, x + 7, y + 4, true, strong && blink); hud.text(label, x + 12 + kw, y + 10, { align: 'left', color: CREAM, outline: null }); }
      zone(x, y - 4, w, 30, act);
    };
    if (sv) { // hay partida a medias
      const a = `CONTINUAR · NOCHE ${sv.night}`, b = 'NUEVA PARTIDA', wa = hud.width(a) + (touch.on ? 20 : 62), wb = hud.width(b) + (touch.on ? 20 : 34), x = Math.round(cx - (wa + wb + 8) / 2);
      plate(x, wa, a, 'ENTER', continueGame, true); plate(x + wa + 8, wb, b, 'N', startGame, false);
    } else { const label = touch.on ? 'TOCA PARA EMPEZAR' : 'empezar', w = hud.width(label) + (touch.on ? 24 : 62); plate(Math.round(cx - w / 2), w, label, 'ENTER', startGame, true); }
    hud.text(st.best.score ? `récord: ${st.best.score} puntos · noche ${st.best.night}` : 'una noche en Marrakech', cx, H - 34, { color: '#b9b6e6' });
    // instalar como aplicación: botón donde el navegador lo ofrece; en iPhone, la pista de cómo hacerlo
    if (app.install) { const w = 66, x = W - w - 4 - touch.safe.r; hud.plate(x, 4, w, 18); hud.text('INSTALAR', x + w / 2, 13, { color: GOLD, outline: null }); zone(x - 4, 0, w + 8, 28, () => { app.install.prompt(); app.install = null; }); }
    else if (app.ios && touch.on && !app.standalone) hud.text('iPhone: Compartir > Añadir a pantalla de inicio', cx, H - 22, { color: '#8fa0d8' });
    if (app.update) { const w = 126, x = 4 + touch.safe.l; hud.plate(x, 4, w, 18, { tone: 'red' }); hud.text('NUEVA VERSIÓN · ACTUALIZAR', x + w / 2, 13, { color: Math.floor(t * 2) % 2 ? GOLD : CREAM, outline: null }); zone(x - 4, 0, w + 8, 28, applyUpdate); }
    else if (st.offline) hud.text('sin conexión', 6 + touch.safe.l, 10, { align: 'left', color: '#8fa0d8' });
    hud.text(`v${VERSION}`, W - 5 - touch.safe.r, H - 22, { align: 'right', color: '#5a5690' });
  }
}

const artC = document.createElement('canvas');
function drawCineBody(s, k) {
  const { W, H, g } = hud, cx = W / 2, t = st.clock - st.cineT;
  if (s.art === 'logo') { // el título cae con estruendo sobre negro
    const a = cine.t - 0.3, cy = Math.round(H * 0.42);
    hud.rect(0, 0, W, H, '#07061c');
    const half = drawLogo(g, cx, cy + (a > 0.9 && a < 1.3 ? Math.round(rand(-2, 2)) : 0), W, st.clock, a);
    if (a > 0.9 && a < 1.2) hud.rect(0, 0, W, H, `rgba(255,255,255,${(1.2 - a) * 2.5})`);
    if (a > 1.5) hud.sysText('سراق الزيت', cx, cy + half + 18, 22, CREAM, ARABIC);
    if (a > 1.9) hud.text('la cucaracha que roba el aceite'.slice(0, Math.floor((a - 1.9) * 36)), cx, cy + half + 40, { color: '#ffd9a0' });
    return;
  }
  if (s.art) {
    const scroll = (s.scroll0 || 0) + (s.scroll || 0) * k + (s.art === 'dawn' ? t * 1.5 : 0);
    const paint = (c) => {
      drawCity(c, W, H, t, s.art, scroll, { reveal: s.reveal ? clamp(cine.t / 2.6, 0, 1) : 1, behind: s.art === 'night' ? () => { drawMoon(c, Math.round(W * 0.22), Math.round(H * 0.3), Math.round(H * 0.1)); drawClouds(c, W, H, t); } : null });
      drawRoof(c, W, H, t, s.art === 'night' && !s.zoom);
    };
    if (s.zoom) { // la cámara se mete por una ventana
      if (artC.width !== W || artC.height !== H) { artC.width = W; artC.height = H; }
      paint(artC.getContext('2d'));
      const z = lerp(s.zoom[0], s.zoom[1], k * k), sw = W / z, sh = H / z, q = Math.min(1, k * 1.6);
      g.drawImage(artC, clamp(lerp(W / 2, s.focus[0] * W, q) - sw / 2, 0, W - sw), clamp(lerp(H / 2, s.focus[1] * H, q) - sh / 2, 0, H - sh), sw, sh, 0, 0, W, H);
    } else paint(g);
    if (s.big) { hud.text(s.big, cx + 3, H * 0.36 + 3, { scale: 6, color: '#5a1a3a', outline: null }); hud.text(s.big, cx, H * 0.36, { scale: 6, color: '#fff6d6', outline: null }); }
    letterbox(s.cap);
    return;
  }
  drawWorldMarks();
  letterbox(s.cap);
  if (s.chapter) drawChapter(s.chapter);
  if (s.say) {
    const p = s.say.who === 'baby' ? proj(babies[0].x + 0.3, 1.6, world.hole.z) : proj(R.x, 2.2, R.z);
    hud.bubble([s.say.text.slice(0, Math.floor(cine.t * 34)) || ' '], p.x, p.y);
  }
}

// Rótulo de capítulo sobre la escena, con el recorrido por la casa como una fila de nombres.
function drawChapter(ch) {
  const { W, H } = hud, cx = W / 2, q = cine.t - ch.at;
  const names = LV.levels.map((l) => l.short), gap = 12, total = names.reduce((a, n) => a + hud.width(n), 0) + gap * 3;
  let x = Math.round(cx - total / 2);
  names.forEach((n, i) => {
    const w = hud.width(n), now = i === ch.lv, done = i < ch.lv && !ch.loop;
    if (now) { hud.rect(x - 4, H - 46, w + 8, 13, INK); hud.rect(x - 3, H - 45, w + 6, 11, '#b3121d'); hud.rect(x - 3, H - 45, w + 6, 1, '#ff5a5a'); }
    hud.text(n, x, H - 40, { align: 'left', color: now ? CREAM : done ? GOLD : '#6a6f9a', outline: now ? null : INK });
    if (i < 3) hud.arrow(x + w + gap / 2, H - 40, 0, i < ch.lv ? GOLD : '#4a4f7a', 2);
    x += w + gap;
  });
  if (q < 0) return;
  const sc = (W > 340 ? 3 : 2) + (q < 0.1 ? 1 : 0);
  hud.ribbon(`CAPÍTULO ${ch.n}${ch.loop ? ' · OTRA VUELTA' : ''}`, cx, 32);
  hud.text(ch.name, cx + 2, 66, { scale: sc, color: '#5a0a10', outline: null }); hud.text(ch.name, cx, 64, { scale: sc, color: GOLD, outline: INK });
  if (q > 0.9) hud.text(`cuidado con ${THREATS[ch.lv]}`, cx, 86, { color: '#ff9a9a' });
}

function drawCine() {
  const s = cine.steps[cine.i], { W, H } = hud, far = Math.hypot(W, H) / 2 + 6;
  drawCineBody(s, Math.min(1, cine.t / s.dur));
  if (s.iris === 'in' || s.iris === 'both') { const q = clamp(cine.t / 0.55, 0, 1); if (q < 1) hud.iris(W / 2, H / 2, far * ease(q)); }
  if (s.iris === 'out' || s.iris === 'both') { const q = clamp((cine.t - (s.dur - 0.6)) / 0.55, 0, 1); if (q > 0) hud.iris(W / 2, H / 2, far * (1 - ease(q))); }
  if (s.fade && cine.t < 0.35) hud.rect(0, 0, W, H, `rgba(7,6,24,${1 - cine.t / 0.35})`);
}

function drawHud() {
  hud.clear(); touch.zones.length = 0;
  const { W, H } = hud, cx = W / 2;
  if (st.portrait) { // el juego es apaisado
    hud.rect(0, 0, W, H, '#07061c');
    const flip = Math.floor(st.clock * 1.2) % 2, pw = flip ? 44 : 24, ph = flip ? 24 : 44, py = Math.round(H * 0.38);
    hud.rect(cx - pw / 2 - 1, py - ph / 2 - 1, pw + 2, ph + 2, GOLD); hud.rect(cx - pw / 2 + 1, py - ph / 2 + 1, pw - 2, ph - 2, '#1f1848'); hud.rect(cx - 2, py + ph / 2 - 4 + (flip ? 0 : 0), 4, 2, GOLD);
    hud.text('GIRA EL MÓVIL', cx, py + 40, { color: GOLD }); hud.wrap('Srak l zit se juega en horizontal', W - 16).forEach((l, i) => hud.text(l, cx, py + 56 + i * 10, { color: CREAM }));
    return;
  }
  if (st.mode === 'title') return drawTitle();
  if (st.mode === 'cine') return drawCine();

  drawWorldMarks();
  drawPlayHud();

  if (st.banner) { // el grito de alarma a toda pantalla
    const k = st.banner.t / 0.9, hgt = Math.round(40 * Math.min(1, (1 - k) * 8, k * 6)), sc = W > 330 ? 4 : 3;
    hud.rect(0, H * 0.42 - hgt / 2, W, hgt, '#b3121d'); hud.rect(0, H * 0.42 - hgt / 2, W, 2, GOLD); hud.rect(0, H * 0.42 + hgt / 2 - 2, W, 2, GOLD);
    if (hgt > 30) { hud.text(st.banner.text, cx + 2, H * 0.42 + 2, { scale: sc, color: '#5a0a10', outline: null }); hud.text(st.banner.text, cx + rand(-2, 2), H * 0.42 + rand(-1, 1), { scale: sc, color: '#ffffff', outline: null }); }
  }

  drawCards();
  if (st.irisIn > 0) hud.iris(cx, H / 2, (Math.hypot(W, H) / 2 + 6) * ease(1 - st.irisIn / 0.55));
}

// ---------- bucle ----------
function update(raw) {
  st.clock += raw; st.punchOil -= raw; st.punchScore -= raw; st.irisIn -= raw;
  if (st.banner && (st.banner.t -= raw) <= 0) st.banner = null;
  // música: tema del sitio y capa según el peligro
  const chase = G.state === 'hunt' || K.state === 'alert' || K.state === 'pounce' || C.some((c) => c.on && (c.state === 'chase' || c.state === 'peck'));
  if (st.mode === 'play') sfx.music(world.theme, chase ? 2 : (grannyMesh.visible && G.state !== 'doze') || C.some((c) => c.on) ? 1 : 0);
  else if (st.mode === 'cine') { const cs = cine.steps[cine.i]; if (cs.art) sfx.music(cs.art === 'dawn' ? 'dawn' : 'title', 1); else sfx.music(world.theme, 0); }
  else if (st.mode === 'title') sfx.music('title', 1);          // la portada, con la orquesta entera
  else sfx.music(st.mode === 'over' ? 'title' : world.theme, st.mode === 'clear' ? 1 : 0);
  if (st.freeze > 0) { st.freeze -= raw; updateCamera(0, raw); return; }
  st.slow = Math.max(0, st.slow - raw);
  const dt = raw * (st.slow > 0 ? 0.3 : 1);
  st.msgT -= dt;

  if (st.mode === 'play') {
    st.time += dt;
    updateRoach(dt);
    if (st.mode === 'play') { updateGranny(dt); updateSlipper(dt); updateSpray(dt); updateCat(dt); updateChicks(dt); }
    if (st.mode === 'play' && st.time >= st.nightLen) {
      st.lives--; sfx.lose();
      if (st.lives <= 0) endRun('Salió el sol y la colonia se quedó sin zit.'); else { st.mode = 'dawn'; st.modeT = 0; }
    }
  } else if (st.mode === 'cine') updateCine(dt);
  else {
    st.modeT += dt;
    if (st.mode === 'intro' && st.modeT > 3.4) st.mode = 'play';
    else if (st.mode === 'dawn' && st.modeT > 3.2) startNight(st.night);
    else if (st.mode === 'clear') { // bailecito de la victoria
      R.head += dt * 9; R.air = Math.abs(Math.sin(st.modeT * 7)) * 0.45; R.wing = 0.6; R.carry = 0;
      babies.forEach((b, i) => { if (b.hop <= 0 && Math.sin(st.modeT * 9 + i * 2) > 0.7) b.hop = 0.4; });
      if (Math.random() < dt * 14) burst(world.hole.x + rand(0, 3), rand(1.5, 3), world.hole.z + rand(-2, 2), pick(['#ffd23f', '#fff6d6', '#f2b705']), 1, 1, 2, 0.9, 5);
      for (const [i, at] of [0.7, 1.15, 1.6, 2.05, 2.7].entries()) if (st.modeT - dt < at && st.modeT >= at) (i === 4 ? sfx.bonus() : sfx.tick());
      if (st.modeT > 9) nextNight();
    }
  }
  updateLight(dt); updateCamera(dt, raw); syncMeshes(dt);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!st.paused && !st.portrait) update(dt);
  pressed.clear();
  gfx.render(); drawHud();
  requestAnimationFrame(frame);
}

function resize() {
  const dpr = window.devicePixelRatio || 1, vw = innerWidth, vh = innerHeight;
  st.portrait = touch.on && vh > vw * 1.1;
  // el alto del juego ronda siempre los 228 píxeles; la escala es un número entero de píxeles del dispositivo
  const scale = Math.max(1, Math.round((st.portrait ? vw : vh) * dpr / 228)) / dpr;
  const W = Math.ceil(vw / scale), H = Math.ceil(vh / scale);
  gfx.resize(W, H, scale); hud.resize(W, H, scale);
  const css = getComputedStyle(document.documentElement), inset = (v) => Math.ceil((parseFloat(css.getPropertyValue(v)) || 0) / scale);
  touch.safe = { l: inset('--sal'), r: inset('--sar'), b: inset('--sab') };
}

// ---------- pantalla táctil y ratón ----------
function confirm() { // lo mismo que ENTER en menús y tarjetas
  if (st.mode === 'title') { if (st.clock - st.titleT0 > 4.8 && loadSave()) continueGame(); else startGame(); }
  else if (st.mode === 'over' && st.modeT > 1) startGame();
  else if (st.mode === 'clear' && st.modeT > 2.9) nextNight();
  else if (st.mode === 'intro' && st.modeT > 0.6) st.mode = 'play';
}

addEventListener('pointerdown', (e) => {
  sfx.init();
  const isTouch = e.pointerType !== 'mouse', x = e.clientX / gfx.scale, y = e.clientY / gfx.scale;
  if (isTouch && !touch.on) { touch.on = true; resize(); }
  if (isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) { // pantalla completa y apaisado donde el navegador lo permita
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }
  if (st.portrait) return;
  const z = touch.zones.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
  if (z) { z.act(); return; }
  if (st.mode !== 'play' || st.paused) { if (st.mode !== 'cine' && !st.paused) confirm(); return; }
  if (!isTouch) return;
  keepAwake();
  const A = padA(), B = padB(), stickSide = touch.lefty ? x > hud.W * 0.45 : x < hud.W * 0.55;
  const dA = Math.hypot(x - A.x, y - A.y), dB = Math.hypot(x - B.x, y - B.y);
  if (!stickSide && y > hud.H * 0.42 && Math.min(dA, dB) < 62) { // en la esquina de los mandos gana el botón más cercano: no hace falta atinar
    if (dA - A.r <= dB - B.r) { touch.a = e.pointerId; keys.add('Space'); pressed.add('Space'); buzz(8); }
    else { pressed.add('KeyE'); touch.bT = 0.15; buzz(R.carry > 0 ? 12 : 4); }
  } else if (stickSide && !touch.stick) { touch.stick = { id: e.pointerId, ox: clamp(x, STICK_R + 4, hud.W - STICK_R - 4), oy: clamp(y, 50, hud.H - STICK_R - 4) }; touch.mag = 0; touch.used = true; }
});
addEventListener('pointermove', (e) => {
  const s = touch.stick; if (!s || e.pointerId !== s.id) return;
  const x = e.clientX / gfx.scale, y = e.clientY / gfx.scale, dx = x - s.ox, dy = y - s.oy, d = Math.hypot(dx, dy);
  if (d > STICK_R) { s.ox = x - dx / d * STICK_R; s.oy = y - dy / d * STICK_R; } // si el pulgar se sale, la base lo sigue
  touch.mag = Math.min(1, d / STICK_R); if (d > 0.01) { touch.mx = dx / d; touch.my = dy / d; }
});
const release = (e) => {
  if (touch.stick && e.pointerId === touch.stick.id) { touch.stick = null; touch.mag = 0; }
  if (e.pointerId === touch.a) { touch.a = null; keys.delete('Space'); }
};
addEventListener('pointerup', release); addEventListener('pointercancel', release);
addEventListener('contextmenu', (e) => e.preventDefault());

// ciclo de vida de la aplicación: al salir se pausa y calla; al volver, recupera sonido y pantalla encendida
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (st.mode === 'play') st.paused = true; keys.clear(); touch.stick = null; touch.a = null; touch.mag = 0; sfx.ctx?.suspend(); }
  else { sfx.ctx?.resume(); keepAwake(); last = performance.now(); }
});
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); app.install = e; });
addEventListener('appinstalled', () => { app.install = null; app.standalone = true; });
addEventListener('online', () => { st.offline = false; }); addEventListener('offline', () => { st.offline = true; });
st.offline = !navigator.onLine;
if (navigator.audioSession) navigator.audioSession.type = 'playback'; // en iPhone, que suene aunque esté el interruptor de silencio
navigator.storage?.persist?.().catch(() => {});                       // que el sistema no borre la partida guardada
// Service worker: guarda el juego para jugar sin conexión. Una versión nueva se descarga en segundo plano y se queda
// esperando; el juego lo avisa con un botón y solo al aceptarlo se activa y se recarga, sin cortar la partida.
if ('serviceWorker' in navigator) {
  const sw = navigator.serviceWorker, waiting = (reg) => { if (reg.waiting && sw.controller) app.update = reg.waiting; };
  addEventListener('load', () => sw.register(location.search.includes('pwa=prod') ? 'sw.js?prod' : 'sw.js').then((reg) => {
    app.reg = reg; waiting(reg);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') waiting(reg); }); });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000); // y se vuelve a mirar cada media hora
  }).catch(() => {}));
  sw.addEventListener('controllerchange', () => { if (app.updating) location.reload(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') app.reg?.update().catch(() => {}); });
}
function applyUpdate() { if (!app.update) return; app.updating = true; app.update.postMessage('SKIP_WAITING'); app.update = null; }
addEventListener('orientationchange', () => setTimeout(resize, 200));

addEventListener('resize', resize);
addEventListener('blur', () => { keys.clear(); touch.stick = null; touch.a = null; touch.mag = 0; });
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (touch.on) { touch.on = false; resize(); } // si aparece un teclado, vuelven las teclas
  keys.add(e.code); pressed.add(e.code); sfx.init(); keepAwake();
  if (e.code === 'KeyN' && st.mode === 'title') startGame();
  if (e.code === 'KeyU' && (st.mode === 'title' || st.paused)) applyUpdate();
  if (e.code === 'KeyM') sfx.toggleMute();
  if ((e.code === 'Escape' || e.code === 'KeyP') && st.mode === 'play') st.paused = !st.paused;
  if (e.code === 'Enter' || (e.code === 'Space' && st.mode !== 'play')) {
    if (st.mode === 'cine') endCine(); else confirm();
  }
});

resize();
loadLevel(0); resetRoach();
requestAnimationFrame(frame);
window.game = { sfx, touch, app, applyUpdate, st, R, G, K, C, S, P, LV, gfx, keys, pressed, slicks, cine, get world() { return world; }, startGame, startNight, goNight, playEnding, update, killRoach, setLight, clearNight, endCine };
