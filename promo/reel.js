// Reel promocional de Srak l zit (1080×1920, 30 fps): un atraco contado como una película corta.
//
// No son partidas grabadas. La página monta su propio plató con el motor del juego (mismos escenarios,
// personajes y render 3D con aspecto de pixel art), pero con cámara libre, atrezo hecho para la ocasión
// y cada movimiento dirigido a mano. tools/promo.mjs captura los fotogramas y los une con la música.
//
//   1. el golpe     una botella a la luz de la luna; la cucaracha sale, bebe y la tira
//   2. la pillan    se enciende la luz, la jadda grita «¡¡SRAK ZIT!!» (y qué significa)
//   3. la huida     por toda la casa, siempre hacia la derecha, robando una gota más en cada sitio
//   4. el porqué    llega al agujero y da de comer a las crías
//   5. el título
import { THREE, Gfx, basic, box, cyl, sph, put } from '../play/src/gfx.js';
import { buildLevels } from '../play/src/world.js';
import { makeRoach, animRoach, makeGranny, makeSlipper, makeChicken, animChicken } from '../play/src/actors.js';
import { drawCity, drawMoon, drawLogo, drawClouds, drawRoof } from '../play/src/art.js';
import { Hud } from '../play/src/hud.js';
import { Sfx } from '../play/src/audio.js';

const W = 1080, H = 1920, FPS = 30, T0 = 0.05, STEP = 0.15, CSTEP = 0.099, BAR = 16 * STEP;
// [nombre, capa de la música, pasos, duración del paso, paso del tema en el que empieza]
const SCORE = [['golpe', 0, 64, STEP, 0], ['grito', 1, 32, STEP, 0], ['huida', 2, 144, CSTEP, 0], ['familia', 0, 32, STEP, 64], ['titulo', 1, 56, STEP, 0]];
const AT = {}; { let t = T0; for (const [name, , steps, len] of SCORE) { AT[name] = t; t += steps * len; } AT.fin = t; }
const END = AT.fin + 1.9, SEG = 144 * CSTEP / 6; // la huida son seis tramos iguales

const INK = '#07061c', GOLD = '#ffd23f', CREAM = '#fdf6e3', RED = '#c1121f';
const SANS = '"Avenir Next Condensed", "DIN Condensed", sans-serif', SERIF = 'Didot, "Bodoni 72", serif';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = (k) => 1 - (1 - k) ** 3, eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const back = (k) => { const s = 1.9; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };
const arc = (k, h) => Math.sin(clamp(k) * Math.PI) * h;
let seed = 7; const rnd = () => { seed = seed * 1664525 + 1013904223 | 0; return ((seed >>> 8) & 0xffff) / 0xffff; };

// ══════════ el plató ══════════
const LW = 270, LH = 480;
const gfx = new Gfx(document.getElementById('view')); gfx.resize(LW, LH, 4);
const scene = gfx.scene, LV = buildLevels(scene), [COCINA, SALON, PATIO, HANOUT] = LV.levels;
for (const L of LV.levels) for (const h of L.high || []) h.mesh.visible = false;
COCINA.bottle.visible = false;

const roachM = makeRoach(); scene.add(roachM);
const kids = [0, 1].map(() => { const m = makeRoach({ baby: true }); scene.add(m); return m; });
const cast = {}; for (const k of ['jadda', 'jeddi', 'keeper']) { cast[k] = makeGranny(k); cast[k].userData.cone.visible = false; scene.add(cast[k]); }
const hens = [0, 1].map(() => { const m = makeChicken(); scene.add(m); return m; });
const belgha = makeSlipper(); belgha.scale.setScalar(1.3); scene.add(belgha);

// atrezo: la botella del golpe (cristal, aceite que baja, corcho y etiqueta) y la gota que se sirve a las crías
const bottle = new THREE.Group(); scene.add(bottle);
const oil = put(bottle, cyl(0.42, 0.42, 1.25, basic('#f2b705'), 12), 0, 0.68, 0); oil.castShadow = false;
put(bottle, cyl(0.5, 0.5, 1.4, new THREE.MeshBasicMaterial({ color: '#bfe9d4', transparent: true, opacity: 0.2, depthWrite: false }), 12), 0, 0.72, 0);
put(bottle, cyl(0.5, 0.52, 0.08, '#8fb8a4', 12), 0, 0.04, 0); put(bottle, cyl(0.18, 0.46, 0.42, '#9cc9b4', 12), 0, 1.62, 0); put(bottle, cyl(0.17, 0.17, 0.4, '#9cc9b4', 10), 0, 2.0, 0);
put(bottle, cyl(0.16, 0.19, 0.26, '#8a5a2b', 8), 0, 2.3, 0); put(bottle, box(0.7, 0.62, 0.06, '#fdf6e3'), 0, 0.72, 0.5); put(bottle, box(0.7, 0.12, 0.07, '#c1121f'), 0, 0.92, 0.5); put(bottle, box(0.34, 0.2, 0.07, '#2d6a4f'), 0, 0.62, 0.5);
const shine = put(bottle, box(0.1, 1.0, 0.07, basic('#ffffff')), -0.3, 0.75, 0.42); shine.castShadow = false;
const ringOil = put(scene, cyl(0.62, 0.62, 0.03, basic('#f2b705'), 14), 0, 0, 0); ringOil.castShadow = false;
const serving = put(scene, sph(0.5, basic('#ffd23f'), 10, 8), 0, 0, 0); serving.castShadow = false;
const slick = put(scene, cyl(0.95, 0.95, 0.03, basic('#f2b705'), 14), 0, 0, 0); slick.castShadow = false;

const parts = [];
for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), basic('#ffffff')); m.visible = false; scene.add(m); parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0, g: 14 }); }
function burst(x, y, z, color, n = 8, speed = 4, up = 4, life = 0.6, grav = 14) {
  for (const p of parts) {
    if (n <= 0) break; if (p.life > 0) continue;
    const a = rnd() * Math.PI * 2, s = (0.3 + rnd() * 0.7) * speed;
    p.m.position.set(x, y, z); p.m.material.color.set(color); p.m.visible = true; p.m.scale.setScalar(0.7 + rnd() * 0.7);
    p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = (0.4 + rnd() * 0.6) * up; p.life = (0.6 + rnd() * 0.4) * life; p.g = grav; n--;
  }
}
function tickParts(dt) { for (const p of parts) { if (p.life <= 0) continue; p.life -= dt; p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; if (p.life <= 0) p.m.visible = false; } }

// ── dirección de escena ──
const TUNNEL = { root: LV.tunnel.root, palette: { bg: '#07050c', moon: '#7a6aa8', moonI: 1.0, tint: '#e6d6c4' } };
let set = COCINA, clock = 0;
const lampC = new THREE.Color('#ffe6bd'), white = new THREE.Color('#ffffff'), hemiL = new THREE.Color('#fff1dc'), gndL = new THREE.Color('#7a6a58');
function stage(place, lamp = 0) { // qué escenario se ve y cuánta luz de lámpara hay (0 = solo la luna)
  set = place; for (const L of LV.levels) L.root.visible = L === place; TUNNEL.root.visible = place === TUNNEL;
  for (const m of [roachM, ...kids, ...Object.values(cast), ...hens, belgha, bottle, ringOil, serving, slick]) m.visible = false;
  for (const p of parts) { p.life = 0; p.m.visible = false; }
  scene.background.set(place.palette.bg); light(lamp);
  LV.holeLight.intensity = 0; gfx.post.uniforms.flash.value = 0; gfx.post.uniforms.danger.value = 0;
}
function light(a) {
  const p = set.palette;
  LV.sun.color.set(p.moon).lerp(lampC, a); LV.sun.intensity = lerp(p.moonI, 2.3, a); LV.sun.position.lerpVectors(LV.moonPos, LV.lampPos, a);
  LV.hemi.color.set('#3a4a8a').lerp(hemiL, a); LV.hemi.groundColor.set('#141428').lerp(gndL, a); LV.hemi.intensity = lerp(1.25, 1.3, a);
  gfx.post.uniforms.tint.value.set(p.tint).lerp(white, a);
}
function glow(x, y, z, intensity, color = '#ffb347') { LV.holeLight.position.set(x, y, z); LV.holeLight.intensity = intensity; LV.holeLight.color.set(color); }
const v3 = new THREE.Vector3();
function cam(yaw, pitch, x, y, z, zoom, shake = 0) { gfx.setView(yaw, pitch); gfx.setZoom(zoom); gfx.setTarget(v3.set(x + (rnd() - 0.5) * shake, y + (rnd() - 0.5) * shake, z)); }
const screen = (x, y, z) => { const p = gfx.project(v3.set(x, y, z)); return { x: p.x * 4, y: p.y * 4 }; };

// la cucaracha: dónde está, hacia dónde mira, a qué velocidad mueve las patas y con qué gesto
const R = { phase: 0 };
function roach(x, y, z, head, { v = 0, tilt = 0, air = 0, scared = 0, carry = 0, squash = 0, dt = 1 / FPS } = {}) {
  R.phase += dt * Math.min(v, 9) * 3.2; roachM.visible = true; roachM.position.set(x, y, z); roachM.rotation.set(0, -head, tilt);
  animRoach(roachM, { phase: R.phase, speed: v / 6.4, time: clock, turn: 0, air, hop: 0, wing: air, scared, carry, squash });
}
function kid(i, x, y, z, head, moving) { const m = kids[i]; m.visible = true; m.position.set(x, y, z); m.rotation.set(0, -head, 0); animRoach(m, { phase: clock * 16 + i * 2, speed: moving ? 0.7 : 0, time: clock + i * 1.7, turn: 0, air: 0, hop: 0, wing: 0, scared: 0, carry: 0, squash: 0 }); }
function person(who, x, y, z, face, { walk = 0, arm = -2.5, tilt = 0 } = {}) {
  const m = cast[who]; m.visible = true; m.position.set(x, y + (walk ? Math.abs(Math.sin(clock * 9)) * 0.14 : 0), z); m.rotation.set(0, -face, tilt + (walk ? Math.sin(clock * 9) * 0.05 : 0));
  m.userData.arm.rotation.z = arm;
}
function hen(i, x, z, face, state, k = 0) { const m = hens[i]; m.visible = true; m.position.set(x, 0, z); m.rotation.y = -face; animChicken(m, state, clock, clock * 18 + i * 2, k); }

// ══════════ gráficos sobre la imagen ══════════
const fx = document.getElementById('fx'), c = fx.getContext('2d');
function txt(str, x, y, { size = 100, font = SANS, weight = 800, color = '#fff', align = 'center', track = 0, alpha = 1, scale = 1, rot = 0, italic = false, stroke = null, sw = 0, shadow = null, fit = 0 } = {}) {
  if (alpha <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale, scale); c.globalAlpha *= alpha;
  const setF = () => { c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; c.letterSpacing = track + 'px'; };
  setF(); if (fit) { const w = c.measureText(str).width; if (w > fit) { size *= fit / w; setF(); } }
  c.textAlign = align; c.textBaseline = 'middle';
  if (shadow) { c.fillStyle = shadow; c.fillText(str, 8, 10); }
  if (stroke) { c.lineWidth = sw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, 0, 0); }
  c.fillStyle = color; c.fillText(str, 0, 0); c.restore();
}
const rect = (x, y, w, h, color, alpha = 1) => { c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(x, y, w, h); c.globalAlpha = 1; };
function rrect(x, y, w, h, r, color) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
const flash = (a, color = '#ffffff') => { if (a > 0) rect(0, 0, W, H, color, clamp(a)); };
function bars(k) { const h = 150 * k; rect(0, 0, W, h, '#000'); rect(0, H - h, W, h, '#000'); } // bandas de cine
function grade(t) { // viñeta y grano
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  v.addColorStop(0, 'rgba(7,6,28,0)'); v.addColorStop(1, 'rgba(7,6,28,0.6)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  seed = Math.floor(t * FPS) * 7919 + 13; c.fillStyle = 'rgba(255,255,255,0.045)'; for (let i = 0; i < 260; i++) c.fillRect(rnd() * W, rnd() * H, 3, 3);
}
function iris(p, cx = W / 2, cy = H * 0.47) { // 0 abierto … 1 cerrado
  if (p <= 0) return;
  c.fillStyle = '#000'; c.beginPath(); c.rect(0, 0, W, H); c.arc(cx, cy, Math.max(0.01, (1 - eio(clamp(p))) * 1200), 0, Math.PI * 2, true); c.fill('evenodd');
}
function swipe(p) { // barrido de corte entre tramos de la huida, en el sentido de la carrera
  if (p <= 0 || p >= 1) return;
  const x = lerp(-W * 1.5, W, p); c.fillStyle = '#000'; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + W * 1.5, 0); c.lineTo(x + W * 1.5 - 220, H); c.lineTo(x - 220, H); c.fill();
}
function heart(x, y, s, alpha) { c.globalAlpha = alpha; c.fillStyle = '#ff5a5a'; for (const [a, b, w, h] of [[1, 0, 2, 1], [5, 0, 2, 1], [0, 1, 8, 3], [1, 4, 6, 1], [2, 5, 4, 1], [3, 6, 2, 1]]) c.fillRect(Math.round(x + (a - 4) * s), Math.round(y + b * s), w * s, h * s); c.fillStyle = '#ffb3b3'; c.fillRect(Math.round(x - 3 * s), Math.round(y + s), s, s); c.globalAlpha = 1; }

// ══════════ planos ══════════
const shots = [];
const shot = (t0, t1, enter, step, over) => shots.push({ t0, t1, enter, step, over });
const TABLE = 3.0, BX = -1.8, BZ = 2.55; // altura de la mesa de la cocina y dónde está la botella

// 1 ── el golpe: un solo plano, cámara baja que se acerca despacio ──────────────
shot(0, AT.grito, () => { stage(COCINA); bottle.position.set(BX, TABLE, BZ); bottle.rotation.set(0, 0, 0); oil.scale.y = 1; oil.position.y = 0.68; R.phase = 0; }, (lt, k, dt) => {
  bottle.visible = true;
  // luz: la luna de relleno y un foco cálido de frente, para que el aceite brille y a ella se la vea bien
  LV.sun.intensity = 2.6; LV.hemi.intensity = 2.1; gfx.post.uniforms.tint.value.set('#d6dcff'); glow(BX + 1.6, TABLE + 2.6, BZ + 3.4, 26, '#ffe2b0');
  const push = eio(seg(lt, 0, 2.8)), wide = eio(seg(lt, 2.6, 3.8));
  cam(lerp(30, 20, k), 9, lerp(BX + 0.1, BX + 1.25, wide), TABLE + lerp(1.15, 1.0, wide), BZ, lerp(lerp(3.6, 4.6, push), 3.15, wide));
  shine.position.y = 0.75 + Math.sin(lt * 1.5) * 0.25; if (lt < 3 && rnd() < 0.12) burst(BX + (rnd() - 0.5) * 2.4, TABLE + 0.6 + rnd() * 2, BZ + (rnd() - 0.5), '#ffffff', 1, 0.15, 0.2, 1.4, 0.3);
  // llega volando desde la derecha y aterriza en la mesa; mira a un lado y a otro; se acerca hasta tocar la botella con el morro
  const fly = seg(lt, 3.0, 3.9), creep = eio(seg(lt, 5.0, 5.9)), sip = seg(lt, 6.1, 8.3), leave = eio(seg(lt, 8.4, 9.3));
  const stop = BX + 2.2, land = BX + 3.0; // el morro queda justo fuera del cristal
  const x = fly < 1 ? lerp(BX + 6.4, land, eo(fly)) : lerp(lerp(land, stop, creep), stop + 1.0, leave), y = TABLE + (fly < 1 ? (1 - eo(fly)) * 2.8 : 0) + arc(seg(lt, 8.5, 8.9), 0.35);
  const look = lt < 3.9 ? Math.PI : lt < 5.0 ? Math.PI + Math.sin((lt - 3.9) * 6) * 0.55 : lerp(Math.PI, 0.5, leave);
  const carry = lt > 7.9 ? 3 : lt > 7.3 ? 2 : lt > 6.8 ? 1 : 0;
  if (lt >= 3.9 && lt - dt < 3.9) burst(land, TABLE + 0.1, BZ, '#e6dcc4', 8, 3, 1.5, 0.4);
  for (const at of [6.8, 7.3, 7.9]) if (lt >= at && lt - dt < at) burst(stop - 0.7, TABLE + 1.0, BZ + 0.3, '#ffd23f', 6, 2, 3, 0.5);
  if (lt > 3.0) roach(x, y, BZ + 0.15 + leave * 0.4, look, { v: fly < 1 ? 8 : (creep > 0 && creep < 1) || (leave > 0 && leave < 1) ? 3 : 0, air: fly < 1 ? 1 : 0, tilt: sip > 0 && leave === 0 ? 0.26 + Math.sin(lt * 9) * 0.03 : 0, carry, scared: lt > 3.9 && lt < 5.0 ? 0.7 : 0, squash: (lt > 3.9 && lt < 4.1) || [6.8, 7.3, 7.9].some((a) => lt > a && lt < a + 0.15) ? 0.6 : 0, dt });
  oil.scale.y = lerp(1, 0.32, eio(sip)); oil.position.y = 0.055 + 0.625 * oil.scale.y;
  // al darse la vuelta le da con la gota: la botella se tambalea y cae hacia el otro lado
  const wob = seg(lt, 8.7, 9.35), fall = eio(seg(lt, 9.35, 9.6));
  bottle.rotation.z = Math.sin(lt * 26) * 0.09 * wob * (1 - fall) + fall * 1.5; bottle.position.x = BX - fall * 0.5;
}, (lt) => { bars(eo(seg(lt, 0, 1.2))); flash(1 - lt / 0.9, '#000'); });

// 2 ── la pillan ─────────────────────────────────────────────────────────────
const door = COCINA.nodes[0];
shot(AT.grito, AT.grito + 1.5, () => { stage(COCINA, 1); bottle.position.set(BX - 0.5, TABLE, BZ); bottle.rotation.z = 1.5; }, (lt, k) => {
  const fl = lt < 0.07 ? 1 : lt < 0.15 ? 0.15 : lt < 0.24 ? 0.9 : lt < 0.3 ? 0.3 : 1; light(fl); // el fluorescente parpadea al encenderse
  person('jadda', door.x, 0, door.z + 1.2, 1.25, { arm: lerp(-2.5, -0.35, back(seg(lt, 0.25, 0.6))) });
  cam(24, 5, door.x + 0.2, 3.9, door.z + 1.2, lerp(2.5, 3.1, eo(k)), lt > 0.3 && lt < 0.8 ? 0.12 : 0);
  if (lt > 0.5 && rnd() < 0.5) burst(door.x, 6.2, door.z + 1.2, '#ffffff', 1, 1.4, 2.6, 0.5, 3);
}, (lt) => { bars(1); flash(1.2 - lt / 0.14); });

shot(AT.grito + 1.5, AT.huida, () => { stage(COCINA, 1); bottle.position.set(BX - 0.5, TABLE, BZ); bottle.rotation.z = 1.5; ringOil.position.set(BX, TABLE + 0.02, BZ); }, (lt, k) => {
  bottle.visible = true; ringOil.visible = true; // foto fija: la han pillado con las manos en la masa
  roach(BX + 3.0, TABLE, BZ + 0.5, 0.9, { scared: 1, carry: 3 });
  cam(26, 13, BX + 2.6, TABLE + 0.75, BZ + 0.5, lerp(3.9, 4.2, k));
  gfx.post.uniforms.danger.value = 0.9;
}, (lt) => {
  rect(0, 0, W, H, '#7a0a12', 0.28);
  const p = screen(BX + 3.0, TABLE + 0.5, BZ + 0.5); c.save(); c.translate(p.x, p.y); c.globalAlpha = 0.13; c.fillStyle = '#fff'; // líneas de susto
  for (let i = 0; i < 18; i++) { c.rotate(Math.PI * 2 / 18); c.beginPath(); c.moveTo(260, -14); c.lineTo(2200, -70); c.lineTo(2200, 70); c.lineTo(260, 14); c.fill(); }
  c.restore(); c.globalAlpha = 1;
  const k = seg(lt, 0, 0.14), sh = lt < 0.45 ? (rnd() - 0.5) * 28 * (1 - lt / 0.45) : 0;
  c.save(); c.translate(W / 2, 400); c.rotate(-0.04); rect(-700, -168 * k, 1400, 336 * k, RED); rect(-700, -168 * k, 1400, 12, GOLD); rect(-700, 168 * k - 12, 1400, 12, GOLD); c.restore();
  txt('¡¡SRAK ZIT!!', W / 2 + sh, 404 + sh * 0.5, { size: 205, weight: 900, color: '#fff', shadow: '#5a0a10', rot: -0.04, alpha: k, scale: lerp(1.9, 1, back(k)) });
  const a = eo(seg(lt, 0.7, 1.1)); // la única explicación del vídeo
  rrect(110, 1420 + (1 - a) * 60, 860, 250, 22, `rgba(253,246,227,${0.96 * a})`);
  txt('«¡ladrona de aceite!»', W / 2, 1500 + (1 - a) * 60, { size: 92, font: SERIF, weight: 700, italic: true, color: INK, alpha: a });
  txt('así se dice «cucaracha» en dariya', W / 2, 1606 + (1 - a) * 60, { size: 50, weight: 600, color: '#7a6a55', alpha: eo(seg(lt, 0.9, 1.3)), track: 1 });
  flash(0.9 * (1 - lt / 0.12), '#ff3030');
});

// 3 ── la huida: vista lateral, siempre hacia la derecha, una gota más en cada sitio ──
const h0 = AT.huida, side = (x, z, zoom, shake = 0) => cam(0, 50, x, 0, z, zoom, shake);
shot(h0, h0 + SEG, () => stage(COCINA, 1), (lt, k, dt) => { // cocina: salta de la mesa y la belgha cae detrás
  const jump = seg(lt, 0, 0.5), x = lerp(1.5, 8.6, eio(seg(lt, 0, SEG)) * 0.3 + k * 0.7), z = lerp(BZ + 0.5, 4.2, eo(jump));
  roach(x, lerp(TABLE, 0, jump) + arc(jump, 1.6), z, 0, { v: 9, air: jump < 1 ? 1 : 0, scared: 1, carry: 1, dt });
  person('jadda', lerp(-8, 0.5, k), 0, 4.2, 0, { walk: 1, arm: -0.4 });
  for (const [at, lx] of [[0.75, 2.6], [1.6, 5.6]]) { // dos belghazos
    const f = seg(lt, at - 0.45, at); if (f > 0 && lt < at + 0.5) { belgha.visible = true; belgha.position.set(lerp(lx - 6, lx, f), arc(f, 5) + 0.15, 4.2); belgha.rotation.set(0, 0, f < 1 ? lt * 16 : 0.2); }
    if (lt >= at && lt - dt < at) { burst(lx, 0.2, 4.2, '#e9dcc0', 14, 6, 3.5, 0.5); shakeT = 0.3; }
  }
  side(x - 1.4, 1.8, 1.75, shakeT > 0 ? 0.25 : 0);
});
let shakeT = 0;
shot(h0 + SEG, h0 + 2 * SEG, () => { stage(TUNNEL); LV.tunnel.from.mat.color.set(COCINA.glow); LV.tunnel.from.light.color.set(COCINA.glow); LV.tunnel.to.mat.color.set(SALON.glow); LV.tunnel.to.light.color.set(SALON.glow); }, (lt, k, dt) => {
  const x = lerp(-8, 6.5, k), over = Math.abs(x) < 1.5 ? Math.sin((x + 1.5) / 3 * Math.PI) : 0; // por dentro de la pared, saltando la cerilla
  roach(x, over * 1.0, 0.9, 0, { v: 9, carry: 1, air: over > 0.2 ? 0.6 : 0, dt }); glow(x + 0.8, 1.5, 2.6, 6);
  if (rnd() < 0.5) burst(x - 1.4, 0.1, 0.9, '#8a7a66', 1, 1, 1, 0.45); if (rnd() < 0.2) burst(x + (rnd() - 0.4) * 10, 2 + rnd() * 4, rnd() * 4 - 1, '#d9cdb8', 1, 0.15, 0.1, 1.5, 0.4);
  cam(0, 30, x + 1.2, 1.5, 0.9, 2.1);
});
shot(h0 + 2 * SEG, h0 + 3 * SEG, () => stage(SALON), (lt, k, dt) => { // salón: de puntillas ante jeddi, y otra gota de la tinaja
  const e = SALON.enemyPos, x = lerp(3.4, 11.2, eio(k)), tip = Math.abs(Math.sin(lt * 9)) * 0.22, got = k > 0.8;
  person('jeddi', e.x, e.y, e.z, e.face, { tilt: -0.12 + Math.sin(clock * 1.6) * 0.05 });
  roach(x, tip, 7.2, 0, { v: 2.6, carry: got ? 2 : 1, scared: 0.5, squash: got && k < 0.86 ? 0.6 : 0, dt });
  if (k >= 0.8 && k - dt / SEG < 0.8) burst(x, 0.8, 7.2, '#ffd23f', 8, 2.5, 3.5, 0.5);
  side(lerp(5.5, 8.6, k), 3.0, 1.75);
}, (lt) => { for (let i = 0; i < 3; i++) { const q = (lt * 0.6 + i / 3) % 1, p = screen(SALON.enemyPos.x + 0.6 + q * 1.4, 6.4 + q * 2.6, SALON.enemyPos.z); txt('Z', p.x, p.y, { size: 46 + q * 50, weight: 800, color: CREAM, alpha: (1 - q) * 0.9, stroke: INK, sw: 10 }); } });
shot(h0 + 3 * SEG, h0 + 4 * SEG, () => { stage(PATIO); PATIO.high[0].mesh.visible = true; }, (lt, k, dt) => { // patio: las gallinas detrás; despega y se posa en lo alto de la fuente
  const run = seg(k, 0, 0.45), fly = seg(k, 0.45, 0.78), x = fly > 0 ? lerp(-3.6, 0, eio(fly)) : lerp(-10, -3.6, run), z = fly > 0 ? lerp(5.9, 0, eio(fly)) : 5.9;
  const y = fly >= 1 ? 2.23 : fly > 0 ? Math.max(fly > 0.8 ? 2.23 : 0, Math.sin(fly * Math.PI * 0.72) * 4.4) : 0, got = k > 0.86;
  roach(x, y, z, fly > 0 ? -0.9 : 0, { v: k < 0.78 ? 9 : 0, air: fly > 0 && fly < 1 ? 1 : 0, scared: k < 0.78 ? 1 : 0, carry: got ? 3 : 2, squash: (fly >= 1 && k < 0.83) || (got && k < 0.9) ? 0.7 : 0, dt });
  if (k >= 0.78 && k - dt / SEG < 0.78) burst(0, 2.4, 0, '#bfe9ff', 10, 3, 2, 0.5); if (k >= 0.86 && k - dt / SEG < 0.86) burst(0, 3, 0, '#ffd23f', 8, 2.5, 3.5, 0.5);
  hens.forEach((_, i) => { const hx = Math.min(-4.6 - i * 1.7, lerp(-13 - i * 1.8, -3.6 - i * 1.8, seg(k, 0, 0.5))); hen(i, hx, 5.9 + (i ? 0.9 : -0.3), 0, k < 0.55 ? 'chase' : 'peck', k > 0.55 ? (lt * 2.5 + i * 0.4) % 1 : 0); });
  side(lerp(-6.5, -1.5, eio(seg(k, 0.1, 0.8))), 2.0, lerp(1.7, 1.6, k));
});
shot(h0 + 4 * SEG, h0 + 5 * SEG, () => { stage(HANOUT, 1); slick.position.set(-1.6, 0.03, 5.6); }, (lt, k, dt) => { // hanout: suelta una gota y Si Brahim patina
  const x = lerp(-7.5, 4.6, k), dropped = k > 0.48, sx = lerp(-13.5, -1.8, seg(k, 0, 0.66)), fell = seg(k, 0.66, 0.8);
  roach(x, k > 0.85 ? arc(seg(k, 0.85, 1) * 2 % 1, 0.5) : 0, 5.6, k > 0.85 ? Math.PI : 0, { v: k < 0.85 ? 9 : 0, carry: dropped ? 2 : 3, scared: k < 0.66 ? 1 : 0, dt });
  slick.visible = dropped && fell === 0; if (k >= 0.48 && k - dt / SEG < 0.48) burst(-1.6, 0.2, 5.6, '#f2b705', 6, 2.5, 2, 0.4);
  person('keeper', sx + fell * 1.2, arc(fell, 1.7) + (fell >= 1 ? 0.75 : 0), 5.6, 0, { walk: fell === 0 ? 1 : 0, arm: -0.6, tilt: Math.PI / 2 * eo(fell) });
  if (k >= 0.8 && k - dt / SEG < 0.8) { burst(-0.6, 0.3, 5.6, '#e6dcc4', 16, 7, 4, 0.6); burst(-0.6, 0.5, 5.6, '#c1121f', 8, 5, 5, 0.7); burst(-0.6, 0.5, 5.6, '#e9b21a', 8, 5, 5, 0.7); shakeT = 0.35; }
  side(lerp(-5, 1.6, k), 2.2, 1.75, shakeT > 0 ? 0.3 : 0);
});
shot(h0 + 5 * SEG, AT.familia, () => { stage(TUNNEL); LV.tunnel.from.mat.color.set(HANOUT.glow); LV.tunnel.to.mat.color.set('#ffb347'); LV.tunnel.to.light.color.set('#ffb347'); }, (lt, k, dt) => {
  const x = lerp(1, 12.2, eo(k)), into = seg(k, 0.82, 1); // de vuelta: la luz de casa al fondo, y las crías esperando
  roach(x, 0, lerp(0.9, -2.2, eio(into)), into > 0 ? -1.4 : 0, { v: lerp(9, 3, k), carry: 2, dt }); glow(x + 0.8, 1.5, 2.6, 6);
  kids.forEach((_, i) => kid(i, 12.2 + i * 1.3, arc((clock * 2.4 + i * 0.5) % 1, 0.45), -1.6 + i * 0.5, Math.PI, true));
  if (rnd() < 0.4) burst(x - 1.4, 0.1, 0.9, '#8a7a66', 1, 1, 1, 0.45);
  cam(0, 30, lerp(3, 11.5, eio(k)), 1.5, 0.9, lerp(2.1, 2.4, k));
});

// 4 ── el porqué: en el agujero, la gota es para las crías ─────────────────────
const hole = COCINA.hole;
shot(AT.familia, AT.titulo, () => { stage(COCINA); serving.position.set(hole.x + 1.9, 0.3, hole.z + 0.9); }, (lt, k, dt) => {
  glow(hole.x + 0.6, 1.2, hole.z + 0.4, 11);
  const arrive = eo(seg(lt, 0, 0.9)), poured = seg(lt, 1.2, 1.7), drunk = eio(seg(lt, 2.0, 4.2));
  roach(lerp(hole.x + 5, hole.x + 3.1, arrive), 0, hole.z + 0.6, Math.PI, { v: arrive < 1 ? 4 : 0, tilt: poured > 0 && poured < 1 ? 0.3 : 0, carry: poured >= 1 ? 0 : 2, dt });
  serving.visible = poured > 0; serving.scale.setScalar(Math.max(0.05, eo(poured) * (1 - drunk * 0.85))); serving.position.y = 0.3 * serving.scale.x;
  kids.forEach((_, i) => { const in2 = eo(seg(lt, 0.5 + i * 0.2, 1.4 + i * 0.2)); kid(i, lerp(hole.x + 0.3, hole.x + 1.2 + i * 0.5, in2), arc((lt * 2.2 + i * 0.5) % 1, lt > 2 ? 0.25 : 0.4), hole.z + (i ? 1.8 : 0.1), i ? -0.5 : 0.6, in2 < 1); });
  cam(45, 30, hole.x + 2.0, 0.9, hole.z + 0.8, lerp(2.5, 2.9, eio(k)));
}, (lt) => {
  for (let i = 0; i < 6; i++) { const q = ((lt - 2.2) * 0.45 + i * 0.19) % 1; if (lt < 2.2) continue; const p = screen(hole.x + 1.2 + (i % 3) * 0.6, 1.4 + q * 2.6, hole.z + 0.6 + (i % 2)); heart(p.x + Math.sin(q * 9 + i) * 18, p.y, 7, (1 - q) * 0.95); }
  bars(1);
});

// 5 ── el título ──────────────────────────────────────────────────────────────
const low = document.createElement('canvas'); low.width = LW; low.height = LH;
const lh = new Hud(low); lh.W = LW; lh.H = LH; lh.g.imageSmoothingEnabled = false;
const logoC = document.createElement('canvas'); logoC.width = 460; logoC.height = 150; const logoG = logoC.getContext('2d');
shot(AT.titulo, END, null, null, (lt, dur) => {
  const t = clock, lg = lh.g, moonY = Math.round(lerp(LH * 0.78, 150, eo(seg(lt, 0.15, 1.7))));
  drawCity(lg, LW, LH, t, 'night', 0, { reveal: clamp(lt / 1.7), behind: () => { drawMoon(lg, LW / 2, moonY, 62); drawClouds(lg, LW, LH, t); } });
  drawRoof(lg, LW, LH, t, lt > 3);
  if (lt > 2.75) lh.sysText('سراق الزيت', LW / 2, 198, 22, CREAM, 'bold {s}px "Geeza Pro", "Noto Naskh Arabic", sans-serif');
  if (lt > 3.1) lh.text('la cucaracha que roba el aceite'.slice(0, Math.floor((lt - 3.1) * 34)), LW / 2, 224, { color: '#ffd9a0' });
  c.imageSmoothingEnabled = false; c.drawImage(low, 0, 0, W, H);
  logoG.clearRect(0, 0, 460, 150); drawLogo(logoG, 230, 60, 460, t, lt - 0.95); c.drawImage(logoC, W / 2 - 460, 480, 920, 300); c.imageSmoothingEnabled = true;
  flash(lt >= 2.4 ? 0.9 * (1 - (lt - 2.4) / 0.2) : 0);
  const e = lt - 2 * BAR;
  if (e > 0) {
    const k = eo(seg(e, 0, 0.4)), gr = c.createLinearGradient(0, 1080, 0, H); gr.addColorStop(0, 'rgba(7,6,28,0)'); gr.addColorStop(0.3, `rgba(7,6,28,${0.82 * k})`); gr.addColorStop(1, `rgba(7,6,28,${0.9 * k})`);
    c.fillStyle = gr; c.fillRect(0, 1080, W, H - 1080);
    const s = seg(e, 0.05, 0.22); txt('JUEGA GRATIS', W / 2, 1330, { size: 166, weight: 900, color: GOLD, alpha: s, scale: lerp(1.7, 1, back(s)), shadow: '#7a3d00', track: 2 });
    txt('EN EL NAVEGADOR Y EN EL MÓVIL', W / 2, 1462, { size: 60, weight: 700, color: CREAM, alpha: eo(seg(e, 0.3, 0.6)), track: 5 });
    const p = back(seg(e, 0.55, 0.85)); c.save(); c.translate(W / 2, 1600); c.scale(p, p); rrect(-430, -58, 860, 116, 58, CREAM); c.restore();
    txt('gavilanbe.github.io/srak-l-zit-2', W / 2, 1602, { size: 58, weight: 800, color: INK, alpha: seg(e, 0.65, 0.85) });
    txt('un juego hecho con Claude Opus 5.5', W / 2, 1722, { size: 40, font: SERIF, italic: true, color: '#d9c9a3', alpha: eo(seg(e, 1.0, 1.4)) });
  }
  flash(seg(lt, dur - 0.5, dur - 0.05), '#000');
});

// ══════════ línea de tiempo ══════════
const SWIPES = [1, 2, 3, 4, 5].map((i) => h0 + i * SEG);
let current = null;
function draw(t, dt) {
  const s = shots.find((q) => t >= q.t0 && t < q.t1) || shots[shots.length - 1], lt = t - s.t0, dur = s.t1 - s.t0;
  clock = t; seed = Math.floor(t * FPS) * 131 + 5;
  if (s !== current) { current = s; shakeT = 0; s.enter?.(); }
  shakeT = Math.max(0, shakeT - dt);
  c.clearRect(0, 0, W, H);
  if (s.step) { s.step(lt, clamp(lt / dur), dt); tickParts(dt); gfx.render(); }
  s.over?.(lt, dur);
  if (t >= h0 && t < AT.familia) bars(1);
  if (t >= h0 - 0.02 && t < h0 + 0.2) flash(0.8 * (1 - (t - h0) / 0.14));                  // arranca la huida
  for (const b of SWIPES) swipe(seg(t, b - 0.13, b + 0.13));
  for (const b of [AT.familia, AT.titulo]) if (t > b - 0.3 && t < b + 0.35) iris(t < b ? seg(t, b - 0.3, b) : 1 - seg(t, b, b + 0.35));
  grade(t);
}

const painted = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
window.reel = {
  frames: Math.round(END * FPS), fps: FPS, marks: { ...AT, END },
  async init() { await document.fonts.ready; },
  async frame(f) { draw(f / FPS, 1 / FPS); await painted(); },                                  // en orden dentro de cada plano
  async seek(f) { const t = f / FPS, s = shots.find((q) => t >= q.t0 && t < q.t1) || shots[shots.length - 1]; current = null; for (let i = Math.ceil(s.t0 * FPS); i <= f; i++) draw(i / FPS, 1 / FPS); await painted(); }, // foto suelta

  // la banda sonora: el tema del juego en sus capas, cortado para que cada parte del vídeo caiga a compás
  async audio() {
    const rate = 44100, ctx = new OfflineAudioContext(2, Math.ceil((END + 0.4) * rate), rate), AC = window.AudioContext;
    window.AudioContext = function () { return ctx; }; const sfx = new Sfx(); sfx.init(); window.AudioContext = AC;
    for (const [name, inten, steps, len, from] of SCORE) { sfx.step = from; sfx.cstep = 0; sfx.prev = {}; sfx.next = AT[name]; sfx._fill('title', inten, AT[name] + steps * len - 0.01); }
    const f = AT.fin; sfx.strings(293.66, f, 1.5, 0.09); sfx.strings(146.83, f, 1.5, 0.08); sfx.strings(440, f, 1.5, 0.05); sfx.bass(73.42, f, 1.4, 0.3); sfx.drum('D', f, 0.26); sfx.qanun(587.33, f, 1.1, 0.05); sfx.riq(f, 0.08);
    const hit = (at, v = 0.4) => { sfx.noise(0.2, { vol: v, freq: 700, at }); sfx.tone(140, 0.24, { type: 'sine', vol: v * 0.8, to: 48, at }); };
    const whoosh = (at, v = 0.12) => sfx.noise(0.3, { vol: v, freq: 900, type: 'bandpass', at: at - 0.15 });
    const sip = (at) => sfx.tone(520, 0.09, { type: 'triangle', vol: 0.13, to: 880, at });
    for (const at of [6.8, 7.3, 7.9]) sip(at);                                                                                          // sorbos
    sfx.tone(1900, 0.5, { type: 'sine', vol: 0.1, to: 1500, at: AT.grito - 0.25 }); sfx.noise(0.12, { vol: 0.3, freq: 2600, type: 'highpass', at: AT.grito - 0.05 }); // la botella contra la mesa
    sfx.noise(0.03, { vol: 0.25, freq: 3000, type: 'highpass', at: AT.grito });                                                         // el interruptor
    const g2 = AT.grito + 1.5; sfx.tone(880, 0.12, { vol: 0.14, to: 1320, at: g2 }); sfx.tone(1320, 0.26, { vol: 0.14, to: 660, at: g2 + 0.12 }); hit(g2, 0.42); // el grito
    hit(h0 + 0.75, 0.3); hit(h0 + 1.6, 0.3);                                                                                             // belghazos
    for (const b of SWIPES) whoosh(b);
    sip(h0 + 2 * SEG + SEG * 0.8); sip(h0 + 3 * SEG + SEG * 0.86);
    [0, 0.09, 0.2].forEach((d, i) => sfx.tone(520 + i * 90, 0.07, { type: 'square', vol: 0.07, to: 380, at: h0 + 3 * SEG + 0.2 + d }));   // gallinas
    sfx.tone(1100, 0.34, { type: 'sine', vol: 0.1, to: 180, at: h0 + 4 * SEG + SEG * 0.66 }); hit(h0 + 4 * SEG + SEG * 0.8, 0.36);        // el resbalón
    [0, 4, 7, 12].forEach((s, i) => sfx.tone(523.25 * 2 ** (s / 12), 0.16, { type: 'triangle', vol: 0.09, at: AT.familia + 1.3 + i * 0.09, send: 0.3 })); // la gota servida
    hit(AT.titulo + 2.4, 0.42);
    const buf = await ctx.startRendering(), L = buf.getChannelData(0), Rr = buf.getChannelData(1), n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, rate, true); out.setUint32(28, rate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
    const gain = Math.min(2.2, 0.94 / peak), fade = (i) => Math.min(1, (n - i) / (rate * 0.4));
    for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * gain * fade(i))) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rr[i] * gain * fade(i))) * 32767, true); }
    let bin = ''; const bytes = new Uint8Array(out.buffer); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  },
};
