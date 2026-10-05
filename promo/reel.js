// Reel promocional de Srak l zit (1080×1920, 30 fps). La página maneja el juego fotograma a fotograma
// (modo ?promo) y pinta encima la tipografía y los gráficos; tools/promo.mjs la captura y la monta con la música.
//
// El vídeo cuenta el juego en orden y cada parte suena con su versión del tema, renderizada con el motor del juego:
//   la gracia      tema principal a escondidas   cucaracha = سرّاق الزيت = ladrón de aceite
//   la cocina      hijaz: sigilo → orquesta → persecución   la familia, el zit, la jadda, el robo, ¡¡SRAK ZIT!!
//   la mudanza     el estribillo                 la familia corre por dentro de la pared
//   el salón       nana en nahawand              jeddi duerme
//   el patio       bayati con ney                las gallinas, y volar
//   el hanout      chaabi en 6/8                 Si Brahim y el charco
//   el título      tema principal con la orquesta
import { drawCity, drawMoon, drawLogo, drawClouds, drawRoof, drawRoachSprite } from '../play/src/art.js';
import { Hud } from '../play/src/hud.js';
import { Sfx } from '../play/src/audio.js';

const W = 1080, H = 1920, FPS = 30, T0 = 0.05;
// [nombre, tema, capa, pasos, duración del paso]: de aquí salen a la vez la música y los tiempos de los planos
const CHASE = Math.max(0.095, Math.min(0.11, 0.158 * 0.66));
const SCORE = [
  ['gracia', 'title', 0, 48, 0.15], ['cocina1', 'cocina', 0, 32, 0.158], ['cocina2', 'cocina', 1, 48, 0.158], ['cocina3', 'cocina', 2, 32, CHASE],
  ['mudanza', 'title', 1, 32, 0.15], ['salon', 'salon', 0, 24, 0.215], ['paso1', 'title', 1, 10, 0.15], ['patio', 'patio', 1, 32, 0.172],
  ['paso2', 'title', 1, 10, 0.15], ['hanout', 'hanout', 1, 48, 0.125], ['titulo', 'title', 1, 56, 0.15],
];
const AT = {}; { let t = T0; for (const [name, , , steps, len] of SCORE) { AT[name] = t; t += steps * len; } AT.fin = t; }
const END = AT.fin + 1.9, BAR = 16 * 0.15;

const INK = '#07061c', GOLD = '#ffd23f', OIL = '#f2b705', CREAM = '#fdf6e3', RED = '#c1121f';
const SANS = '"Avenir Next Condensed", "DIN Condensed", sans-serif', SERIF = 'Didot, "Bodoni 72", serif', KUFI = '"Diwan Kufi", "Al Nile", "Geeza Pro", sans-serif';

const fx = document.getElementById('fx'), c = fx.getContext('2d'), frameEl = document.getElementById('game');
let g = null; // window.game del juego incrustado

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = (k) => 1 - (1 - k) ** 3, eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const back = (k) => { const s = 1.9; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };
let seed = 7; const rnd = () => { seed = seed * 1664525 + 1013904223 | 0; return ((seed >>> 8) & 0xffff) / 0xffff; };

// ---------- tipografía y formas ----------
function txt(str, x, y, { size = 100, font = SANS, weight = 800, color = '#fff', align = 'center', track = 0, alpha = 1, scale = 1, rot = 0, italic = false, stroke = null, sw = 0, shadow = null, fit = 0 } = {}) {
  if (alpha <= 0) return 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale, scale); c.globalAlpha *= alpha;
  const set = () => { c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; c.letterSpacing = track + 'px'; };
  set(); if (fit) { const w = c.measureText(str).width; if (w > fit) { size *= fit / w; set(); } } // que quepa a lo ancho
  c.textAlign = align; c.textBaseline = 'middle';
  if (shadow) { c.fillStyle = shadow; c.fillText(str, 8, 10); }
  if (stroke) { c.lineWidth = sw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, 0, 0); }
  c.fillStyle = color; c.fillText(str, 0, 0);
  const w = c.measureText(str).width; c.restore();
  return w;
}
const rect = (x, y, w, h, color, alpha = 1) => { c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(x, y, w, h); c.globalAlpha = 1; };
function rrect(x, y, w, h, r, color) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }

function zellige(t, alpha) { // fondo: estrellas de ocho puntas muy tenues que derivan
  c.save(); c.globalAlpha = alpha; c.strokeStyle = '#e9c46a'; c.lineWidth = 3;
  const S = 180, ox = (t * 14) % S, oy = (t * 9) % S;
  for (let y = -S; y < H + S; y += S) for (let x = -S; x < W + S; x += S) {
    const cx = x + ox + ((Math.round(y / S) & 1) ? S / 2 : 0), cy = y + oy;
    for (const a of [0, Math.PI / 4]) { c.save(); c.translate(cx, cy); c.rotate(a + t * 0.05); c.strokeRect(-38, -38, 76, 76); c.restore(); }
  }
  c.restore();
}

function rays(cx, cy, t, alpha, color = GOLD) { // rayos que giran detrás de una palabra
  if (alpha <= 0) return;
  c.save(); c.translate(cx, cy); c.rotate(t * 0.25); c.globalAlpha = alpha; c.fillStyle = color;
  for (let i = 0; i < 14; i++) { c.rotate(Math.PI * 2 / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(-90, -1700); c.lineTo(90, -1700); c.fill(); }
  c.restore();
}

function grade(t) { // viñeta y grano encima de todo
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
  v.addColorStop(0, 'rgba(7,6,28,0)'); v.addColorStop(1, 'rgba(7,6,28,0.55)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  seed = Math.floor(t * FPS) * 7919 + 13; c.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 260; i++) c.fillRect(rnd() * W, rnd() * H, 3, 3);
}

// cortinilla de aceite: p 0→1 cubre de arriba abajo, 1→2 se escurre y descubre
function oilWipe(p) {
  if (p <= 0 || p >= 2) return;
  const n = 9, cw = W / n;
  for (let i = 0; i < n; i++) {
    const d = ((i * 37) % 9) / 9 * 0.3, k = eio(clamp(((p > 1 ? p - 1 : p) - d) / 0.7)), edge = lerp(-160, H + 160, k);
    const grad = c.createLinearGradient(i * cw, 0, (i + 1) * cw, 0); grad.addColorStop(0, '#c98a00'); grad.addColorStop(0.3, '#ffd23f'); grad.addColorStop(0.55, '#f2b705'); grad.addColorStop(1, '#b87a00');
    c.fillStyle = grad; c.beginPath();
    if (p <= 1) { c.rect(i * cw - 1, -10, cw + 2, edge + 10); c.arc(i * cw + cw / 2, edge, cw / 2 + 1, 0, Math.PI); }
    else { c.rect(i * cw - 1, edge, cw + 2, H - edge + 10); c.arc(i * cw + cw / 2, edge, cw / 2 + 1, Math.PI, 0); }
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; if (p <= 1) c.fillRect(i * cw + cw * 0.2, -10, 10, Math.max(0, edge - 40)); else c.fillRect(i * cw + cw * 0.2, edge + 40, 10, H);
  }
}

// iris: p 0 abierto … 1 cerrado, sobre el centro de la imagen
function iris(p) {
  if (p <= 0) return;
  const r = (1 - eio(clamp(p))) * 1150;
  c.fillStyle = INK; c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H * 0.47, Math.max(0.01, r), 0, Math.PI * 2, true); c.fill('evenodd');
}

const flash = (a, color = '#ffffff') => { if (a > 0) rect(0, 0, W, H, color, clamp(a)); };

// rótulo en el tercio inferior (el juego visto como película)
function lower(lines, lt, dur) {
  const out = 1 - seg(lt, dur - 0.3, dur - 0.05), k = eo(seg(lt, 0.15, 0.55)) * out;
  const g2 = c.createLinearGradient(0, 1230, 0, H); g2.addColorStop(0, 'rgba(7,6,28,0)'); g2.addColorStop(0.5, 'rgba(7,6,28,0.72)'); g2.addColorStop(1, 'rgba(7,6,28,0.92)');
  c.fillStyle = g2; c.fillRect(0, 1230, W, H - 1230);
  rect(80, 1452, 150 * k, 10, GOLD);
  lines.forEach((l, i) => { const kk = eo(seg(lt, 0.2 + i * 0.22, 0.65 + i * 0.22)) * out; txt(l, 80 - (1 - kk) * 60, 1540 + i * 128, { size: i ? 132 : 100, weight: i ? 900 : 700, color: i ? GOLD : CREAM, align: 'left', alpha: kk, shadow: 'rgba(7,6,28,0.8)', track: 1, fit: 920 }); });
}

// cinta con el capítulo y el nombre del sitio, arriba
function place(n, name, lt) {
  const k = back(seg(lt, 0.25, 0.6)), out = 1 - eio(seg(lt, 2.6, 3.0)), y = 330 - (1 - k) * 520 - (1 - out) * 520;
  c.save(); c.translate(W / 2, y); c.rotate(-0.03);
  rect(-520, -112, 1040, 232, 'rgba(7,6,28,0.35)'); rect(-560, -124, 1120, 232, RED); rect(-560, -124, 1120, 12, GOLD); rect(-560, 96, 1120, 12, GOLD);
  c.restore();
  txt(`CAPÍTULO ${n}`, W / 2, y - 76, { size: 50, weight: 700, color: GOLD, rot: -0.03, track: 10 });
  txt(name, W / 2, y + 14, { size: 150, weight: 900, color: CREAM, rot: -0.03, track: 4, shadow: '#5a0a10', fit: 900 });
}

// ---------- el juego como plató ----------
function use(n, lit = false) { // prepara una noche y deja el escenario quieto para moverlo a mano
  g.st.introSeen = true; g.startNight(n); stage(); light(lit, true);
}
function stage() {
  Object.assign(g.st, { mode: 'promo', irisIn: 0, shake: 0, flash: 0, slow: 0, freeze: 0, promoStep: null });
  Object.assign(g.R, { inv: 0, vx: 0, vz: 0, y: 0, air: 0, wing: 0, carry: 0, scared: 0, turn: 0, squash: 0, alive: true });
  for (const cv of g.world.covers) cv.hides = false;
}
function light(on, now = false) { if (now) { g.st.lightOn = on; g.st.light = on ? 1 : 0; g.st.lightT = 9; } else g.setLight(on); }
function camera(x, z, zoom, y = 0, cut = false, rate = 4) { g.st.promoCam = [x, z, zoom, y, rate]; if (cut) { g.cam.x = x; g.cam.z = z; g.cam.y = y; g.st.zoom = zoom; g.st.kick = 0; } }
function roach(x, z, head, speed = 0) { Object.assign(g.R, { x, z, vx: speed }); if (head !== null) g.R.head += Math.atan2(Math.sin(head - g.R.head), Math.cos(head - g.R.head)) * 0.3; }
function granny(x, z, face, state, walking) { Object.assign(g.G, { x, z, face, state, route: walking ? [0] : [] }); if (walking) g.G.walk += 0.15; g.granny.visible = true; }
function plate(x, z) { const p = g.world.plates[0]; Object.assign(p, { x, z, on: true, amount: 3 }); p.mesh.position.set(x, 0, z); p.mesh.visible = true; p.oil.visible = true; p.oil.scale.set(1, 1, 1); g.world.plates.slice(1).forEach((q) => { q.on = false; q.mesh.visible = false; }); }
const hop = (k, a, b, h) => (k > a && k < b ? Math.sin(seg(k, a, b) * Math.PI) * h : 0);

// la familia corriendo por dentro de la pared, de x0 a x1 (la cerilla está en x = 0)
function tunnelRun(dt, k, x0, x1) {
  const x = lerp(x0, x1, k), over = (px) => (Math.abs(px) < 1.5 ? Math.sin((px + 1.5) / 3 * Math.PI) : 0);
  roach(x, 0.9, 0, 5.4); g.R.head = 0; g.R.y = over(x) * 0.9;
  g.babies.forEach((b, i) => { const bx = x - 3 - i * 1.5; b.m.visible = true; b.m.position.set(bx, over(bx) * 0.7, 0.9 + (i ? 0.55 : -0.45)); b.m.rotation.y = 0; b.hop = 0; });
  g.world.holeLight.position.set(x + 0.8, 1.5, 2.3);
  if (Math.random() < dt * 14) g.burst(x - 1.4, 0.1, 0.9 + (Math.random() - 0.5) * 0.8, '#8a7a66', 1, 1, 1, 0.45);
  if (Math.random() < dt * 5) g.burst(x + (Math.random() - 0.4) * 12, 2 + Math.random() * 4, Math.random() * 5 - 2, '#d9cdb8', 1, 0.15, 0.1, 1.6, 0.4);
  camera(x - 0.6, 0.2, 1.12, 0.5, false, 9);
}
function tunnel(from, to, x0) { g.showTunnel(from, to); stage(); g.granny.visible = false; g.R.head = 0; roach(x0, 0.9, 0); camera(x0 - 0.6, 0.2, 1.12, 0.5, true); }

// cada plano: { t0, t1, enter(), step(dt, k, lt), over(lt, dur) } — step mueve el juego, over pinta encima
const shots = [];
const game = (t0, t1, enter, step, over) => shots.push({ t0, t1, enter, step, over, game: true });
const card = (t0, t1, over) => shots.push({ t0, t1, over, game: false });

// ── la gracia: cucaracha = سرّاق الزيت = ladrón de aceite ─────────────────────
const pix = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(a, b, w, h); };
function sprite(x, y, s, dir, frame, carry) { c.save(); c.translate(x, y); c.scale(s, s); c.imageSmoothingEnabled = false; drawRoachSprite(pix, -10, -6, dir, frame, carry); c.restore(); }
card(0, AT.cocina1, (t) => {
  rect(0, 0, W, H, INK); zellige(t, 0.07);
  const b2 = T0 + BAR, b3 = T0 + 2 * BAR, b4 = b3 + 0.55, eq = eio(seg(t, b2 - 0.25, b2 + 0.1));
  // primero la palabra de siempre; luego sube y queda como primer término
  const k1 = back(seg(t, 0.15, 0.5));
  txt('CUCARACHA', W / 2, lerp(900, 430, eq), { size: lerp(178, 110, eq), weight: 900, color: CREAM, alpha: seg(t, 0.15, 0.3), scale: lerp(1.5, 1, k1), track: 6 });
  txt('en dariya se dice…', W / 2, 1060, { size: 70, font: SERIF, italic: true, color: '#d9c9a3', alpha: eo(seg(t, 0.8, 1.2)) * (1 - seg(t, b2 - 0.3, b2 - 0.1)) });
  if (t < b2) sprite(lerp(-140, 620, eio(seg(t, 0.5, 2.1))), 1290, 12, 1, Math.floor(t * 12), false);
  if (t >= b2 - 0.1) txt('=', W / 2, 560, { size: 110, weight: 500, color: GOLD, alpha: seg(t, b2 - 0.1, b2 + 0.1) });
  if (t >= b2) { // la palabra en árabe, de golpe
    const lt = t - b2, k = seg(lt, 0, 0.18), sh = lt < 0.35 ? (rnd() - 0.5) * 26 * (1 - lt / 0.35) : 0;
    rays(W / 2, 780, t, 0.1 * k);
    txt('سرّاق الزيت', W / 2 + sh, 780 + sh * 0.4, { size: 250, font: KUFI, weight: 700, color: GOLD, scale: lerp(2.4, 1, back(k)), alpha: k, shadow: '#7a3d00' });
    txt('sarraq zzit', W / 2, 965, { size: 76, font: SERIF, italic: true, color: '#d9c9a3', alpha: eo(seg(lt, 0.35, 0.7)) });
    flash(0.85 * (1 - lt / 0.14));
  }
  if (t >= b3 - 0.1) txt('=', W / 2, 1090, { size: 110, weight: 500, color: GOLD, alpha: seg(t, b3 - 0.1, b3 + 0.1) });
  if (t >= b3) { const lt = t - b3, k = seg(lt, 0, 0.16); txt('LADRÓN', W / 2, 1260, { size: 260, weight: 900, color: CREAM, alpha: k, scale: lerp(1.9, 1, back(k)), track: 4, shadow: 'rgba(0,0,0,0.5)' }); flash(0.5 * (1 - lt / 0.1)); }
  if (t >= b4) { // «de aceite», y la gota que se le cae
    const lt = t - b4, k = seg(lt, 0, 0.16);
    txt('DE ACEITE', W / 2, 1480, { size: 230, weight: 900, color: GOLD, alpha: k, scale: lerp(1.9, 1, back(k)), track: 2, shadow: '#7a3d00' }); flash(0.5 * (1 - lt / 0.1));
    const fall = seg(lt, 0.35, 0.8), dy = lerp(1580, 1752, fall * fall), gone = t > b4 + 1.25;
    if (lt > 0.35 && !gone) { c.fillStyle = OIL; c.beginPath(); c.moveTo(770, dy - 46); c.quadraticCurveTo(806, dy + 6, 770, dy + 22); c.quadraticCurveTo(734, dy + 6, 770, dy - 46); c.fill(); rrect(762, dy - 6, 7, 14, 4, '#fff3b0'); }
    const run = eio(seg(lt, 0.7, 1.75)); // y ella, que pasa y se la lleva
    if (lt > 0.7) sprite(lerp(-160, 1260, run), 1756, 12, 1, Math.floor(t * 14), gone);
  }
});

// ── la cocina ────────────────────────────────────────────────────────────────
const k1 = AT.cocina1, k2 = AT.cocina2, k3 = AT.cocina3;
game(k1, k1 + 2.9, () => { use(1); const h = g.world.hole; roach(h.x + 0.1, h.z, 0); g.R.head = 0; camera(h.x + 2.1, h.z + 0.3, 1.45, 0.3, true); }, (dt, k) => {
  const h = g.world.hole, walk = eo(seg(k, 0.08, 0.55));
  roach(lerp(h.x + 0.1, h.x + 3.7, walk), h.z + 0.2, k > 0.6 ? Math.PI * 0.86 : 0, k > 0.08 && k < 0.55 ? 5 : 0);
  g.R.y = hop(k, 0.74, 0.9, 0.5);
  g.babies.forEach((b, i) => { if (b.hop <= 0 && Math.sin(k * 22 + i * 2.4) > 0.75) b.hop = 0.36; });
  camera(h.x + 2.1, h.z + 0.3, lerp(1.45, 1.7, k), 0.3);
}, (lt, dur) => lower(['UNA FAMILIA', 'CON HAMBRE.'], lt, dur));

game(k1 + 2.9, k2, () => { use(1); roach(-13, 6, 0); const o = g.world.oil[0]; camera(o.x - 5, o.z - 4, 1.0, 0, true); }, (dt, k) => {
  const o = g.world.oil[0], e = eio(k);
  camera(lerp(o.x - 5, o.x - 0.6, e), lerp(o.z - 4, o.z - 0.9, e), lerp(1.0, 1.75, e), 0.8 * e, false, 9);
  if (Math.random() < 0.5) g.burst(o.x + (Math.random() - 0.5) * 2.4, 0.4 + Math.random() * 2, o.z + (Math.random() - 0.5) * 2.4, '#fff6d6', 1, 0.3, 0.8, 0.5, 2);
}, (lt, dur) => lower(['UNA CASA', 'LLENA DE ZIT.'], lt, dur));

game(k2, k2 + 3.0, () => { use(1); roach(-13, 6, 0); const d = g.world.nodes[0]; g.world.doorGlow.visible = true; g.granny.visible = false; camera(d.x - 2.6, d.z + 3.6, 0.92, 2.4, true); }, (dt, k, lt) => {
  const d = g.world.nodes[0];
  if (k < 0.3) { if (Math.floor(lt * 4) !== Math.floor((lt - dt) * 4)) g.st.shake = 0.14; }
  else {
    if (!g.st.lightOn) { light(true); g.world.doorGlow.visible = false; g.st.kick = 0.08; }
    const adv = eo(seg(k, 0.4, 1)); granny(d.x - adv * 0.6, d.z + adv * 2.6, 1.9 + Math.sin(lt * 3) * 0.6, 'cine', k > 0.4);
  }
  camera(d.x - 2.6, d.z + 3.6, lerp(0.92, 1.05, k), 2.4);
}, (lt, dur) => lower(['Y UNA JADDA', 'DE SUEÑO LIGERO.'], lt, dur));

// el robo: sale de debajo de la mesa, bebe del platito y vuelve antes de que la jadda se gire
game(k2 + 3.0, k3, () => { use(1, true); plate(-7.4, 5.2); g.world.covers[0].hides = true; roach(-4.6, 2.2, 2.4); g.R.head = 2.4; granny(4, -4.6, Math.PI, 'patrol', true); camera(-4, 1.4, 0.8, 0.8, true); }, (dt, k, lt) => {
  const out = eio(seg(k, 0.12, 0.38)), home = eio(seg(k, 0.66, 0.92)), p = out - home, moving = (k > 0.12 && k < 0.38) || (k > 0.66 && k < 0.92);
  roach(lerp(-4.6, -6.6, p), lerp(2.2, 4.5, p), k < 0.5 ? 2.3 : -0.8, moving ? 5 : 0);
  g.world.covers[0].hides = p < 0.35;
  for (const at of [0.44, 0.52, 0.6]) if (k >= at && k - dt / 4.6 < at) { g.R.carry++; g.R.squash = 0.6; g.burst(g.R.x, 0.6, g.R.z, '#ffd23f', 5, 2, 3); }
  g.R.squash = Math.max(0, g.R.squash - dt * 4); g.R.scared = k > 0.6 ? 0.7 : 0;
  granny(lerp(4, -8, k), -4.6, Math.PI + Math.sin(lt * 2) * 0.2, 'patrol', true); // la jadda pasa por el fondo, de espaldas
  camera(lerp(-4, -4.6, p), lerp(1.4, 2.0, p), lerp(0.8, 0.88, p), 0.8);
}, (lt, dur) => lower(['ROBA GOTA A GOTA', 'SIN QUE TE VEAN.'], lt, dur));

game(k3, AT.mudanza, () => { use(1, true); roach(3.6, -3.2, 1.1); g.R.head = 1.1; g.R.carry = 3; granny(5, -6.3, 2.4, 'hunt', false); camera(4.2, -3.4, 1.0, 0.8, true); g.R.scared = 1; }, (dt, k, lt) => {
  const rx = lerp(3.6, 7.4, k), rz = lerp(-3.2, 4.8, k);
  roach(rx, rz, Math.atan2(8, 3.8), 9.5); g.R.scared = 1; g.R.carry = 3;
  granny(5, -6.3, Math.atan2(rz + 6.3, rx - 5), 'hunt', false);
  for (const at of [0.5, 1.9]) if (lt >= at && lt - dt < at) { g.S.st = 'fly'; g.S.t = 0; g.S.dur = 0.62; g.S.from.set(5, 4.6, -6.3); g.S.to.set(rx + 3.2, 0.15, rz + 3.0); } // cae cerca, pero no le da
  g.updateSlipper(dt);
  camera(rx + 0.4, rz - 1.4, 1.0, 0.8, false, 7);
}, (lt) => {
  const k = seg(lt, 0, 0.14), out = 1 - seg(lt, 1.9, 2.2), sh = lt < 0.4 ? (rnd() - 0.5) * 24 : 0;
  if (out > 0) {
    c.save(); c.translate(W / 2, 430); c.rotate(-0.045);
    rect(-700, -150 * k, 1400, 300 * k, RED, out); rect(-700, -150 * k, 1400, 12, GOLD, out); rect(-700, 150 * k - 12, 1400, 12, GOLD, out);
    c.restore();
    txt('¡¡SRAK ZIT!!', W / 2 + sh, 432 + sh * 0.5, { size: 196, weight: 900, color: '#ffffff', shadow: '#5a0a10', rot: -0.045, alpha: k * out, scale: lerp(1.8, 1, back(k)) });
    txt('«¡ladrona de aceite!»', W / 2, 650, { size: 78, font: SERIF, italic: true, weight: 700, color: CREAM, alpha: eo(seg(lt, 0.3, 0.55)) * out, stroke: INK, sw: 14 });
  }
  flash(0.8 * (1 - lt / 0.12), '#ff3030');
});

// ── la mudanza por dentro de la pared ────────────────────────────────────────
game(AT.mudanza, AT.salon, () => tunnel(0, 1, -11), (dt, k) => tunnelRun(dt, k, -11, 10.5), (lt, dur) => lower(['CUANDO SE ACABA EL ZIT,', 'LA FAMILIA SE MUDA.'], lt, dur));

// ── el salón: jeddi duerme con la tele puesta ────────────────────────────────
game(AT.salon, AT.paso1, () => { use(3); roach(-6.5, 5.6, 0); g.R.head = 0; camera(-1, 3.2, 0.78, 1.2, true); }, (dt, k, lt) => {
  const stop = k > 0.42 && k < 0.62; // él se revuelve; ella se queda helada
  const p = k < 0.42 ? k / 0.42 * 0.45 : k < 0.62 ? 0.45 : 0.45 + (k - 0.62) / 0.38 * 0.55;
  roach(lerp(-6.5, 6.5, p), lerp(5.6, 6.4, p), 0.06, stop ? 0 : 3.2); g.R.scared = stop ? 1 : 0.2;
  g.G.face = g.world.enemyPos.face + (stop ? Math.sin(lt * 14) * 0.12 : 0);
  camera(lerp(-1, 2.5, k), 3.4, lerp(0.78, 0.92, k), 1.2, false, 6);
}, (lt, dur) => { place(2, 'EL SALÓN', lt); lower(['JEDDI DUERME.', 'NO HAGAS RUIDO.'], lt, dur); });

game(AT.paso1, AT.patio, () => tunnel(1, 2, -6), (dt, k) => tunnelRun(dt, k, -6, 2));

// ── el patio: las gallinas pican; se sube volando a la fuente ────────────────
game(AT.patio, AT.paso2, () => { use(5); g.R.landed = false; roach(-8.5, 6.2, -0.6); g.R.head = -0.6; camera(-4, 3.4, 0.82, 0.8, true); }, (dt, k, lt) => {
  const run = seg(k, 0, 0.42), fly = seg(k, 0.42, 0.66);
  const x = fly > 0 ? lerp(-3.4, 0, eio(fly)) : lerp(-8.5, -3.4, run), z = fly > 0 ? lerp(2.6, 0, eio(fly)) : lerp(6.2, 2.6, run);
  roach(x, z, Math.atan2(-3.6, 5.1), k < 0.66 ? 8 : 0);
  g.R.y = fly >= 1 ? 2.23 : fly > 0 ? Math.max(fly > 0.7 ? 2.23 : 0, Math.sin(fly * Math.PI * 0.7) * 3.9) : 0;
  g.R.air = fly > 0 && fly < 1 ? 1 : 0; g.R.wing = g.R.air; g.R.scared = k < 0.66 ? 1 : 0;
  if (fly >= 1 && !g.R.landed) { g.R.landed = true; g.R.squash = 1; g.burst(0, 2.4, 0, '#bfe9ff', 9, 3, 2, 0.5); }
  g.R.squash = Math.max(0, g.R.squash - dt * 4); g.R.carry = k > 0.9 ? 2 : k > 0.8 ? 1 : 0;
  g.C.forEach((ch, i) => { // la persiguen y luego dan vueltas a la fuente sin alcanzarla
    if (!ch.on) return;
    if (k < 0.5) Object.assign(ch, { state: 'chase', x: x - 2.4 - i * 1.6, z: z + 1.7 + (i ? 1.2 : -0.6), face: Math.atan2(-3.6, 5.1) });
    else { const a = 2.4 + i * 2.6 + (k - 0.5) * 7; Object.assign(ch, { state: 'chase', x: Math.cos(a) * 4.3, z: Math.sin(a) * 4.3, face: a + Math.PI / 2 }); }
    ch.walk += 0.5;
  });
  camera(lerp(-4, 0.2, eio(seg(k, 0.2, 0.7))), lerp(3.4, 0.8, eio(seg(k, 0.2, 0.7))), lerp(0.82, 1.0, k), 0.8 + g.R.y * 0.5, false, 6);
}, (lt, dur) => { place(3, 'EL PATIO', lt); lower(['LAS GALLINAS PICAN.', 'VUELA.'], lt, dur); });

game(AT.paso2, AT.hanout, () => { g.R.landed = false; tunnel(2, 3, -4); }, (dt, k) => tunnelRun(dt, k, -4, 4));

// ── el hanout: Si Brahim nunca cierra; un charco lo arregla ──────────────────
game(AT.hanout, AT.titulo, () => { use(7, true); roach(0.5, -2.5, Math.PI); g.R.head = Math.PI; g.R.carry = 2; granny(5.5, -2.5, Math.PI, 'patrol', true); camera(-3.4, -1.6, 0.92, 1.0, true); }, (dt, k, lt) => {
  const s = g.slicks[0], run = eio(seg(k, 0, 0.42));
  roach(lerp(0.5, -9.4, run), lerp(-2.5, -1.3, eio(seg(k, 0.25, 0.42))), k < 0.42 ? Math.PI : 0.15, k < 0.42 ? 7 : 0);
  if (k > 0.16 && !s.on && g.G.state !== 'slip') { Object.assign(s, { on: true, x: -3.6, z: -2.5, t: 0 }); s.m.position.set(-3.6, 0.04, -2.5); s.m.visible = true; s.m.scale.setScalar(0.2); g.R.carry = 1; g.burst(-3.6, 0.2, -2.5, '#f2b705', 6, 2.5, 2); }
  if (g.G.state !== 'slip') { const gx = lerp(5.5, -3.3, seg(k, 0, 0.5)); granny(gx, -2.5, Math.PI, 'patrol', true); if (k >= 0.5) { g.G.state = 'slip'; g.G.t = 3.8; g.G.route = []; s.on = false; s.m.visible = false; g.burst(-3.6, 0.2, -2.5, '#f2b705', 12, 5, 4); } }
  else g.G.t = Math.max(1.5, g.G.t - dt * 1.1);
  g.R.y = k > 0.62 ? Math.abs(Math.sin((k - 0.62) * 15)) * 0.6 : 0;
  camera(lerp(-3.4, -5.2, k), -1.6, lerp(0.92, 1.05, k), 1.0, false, 5);
}, (lt, dur) => { place(4, 'EL HANOUT', lt); lower(['SI BRAHIM NUNCA CIERRA.', 'HAZLE RESBALAR.'], lt, dur); });

// ── el título ────────────────────────────────────────────────────────────────
const LW = 270, LH = 480, low = document.createElement('canvas'); low.width = LW; low.height = LH;
const lh = new Hud(low); lh.W = LW; lh.H = LH; lh.g.imageSmoothingEnabled = false;
const logoC = document.createElement('canvas'); logoC.width = 460; logoC.height = 150; const logoG = logoC.getContext('2d');
card(AT.titulo, END, (t) => {
  const lt = t - AT.titulo, lg = lh.g, moonY = Math.round(lerp(LH * 0.78, 150, eo(seg(lt, 0.15, 1.7)))), half = 28;
  drawCity(lg, LW, LH, t, 'night', 0, { reveal: clamp(lt / 1.7), behind: () => { drawMoon(lg, LW / 2, moonY, 62); drawClouds(lg, LW, LH, t); } });
  drawRoof(lg, LW, LH, t, lt > 3);
  if (lt > 2.75) lh.sysText('سراق الزيت', LW / 2, 150 + half + 20, 22, CREAM, 'bold {s}px "Geeza Pro", "Noto Naskh Arabic", sans-serif');
  if (lt > 3.1) lh.text('la cucaracha que roba el aceite'.slice(0, Math.floor((lt - 3.1) * 34)), LW / 2, 150 + half + 46, { color: '#ffd9a0' });
  c.imageSmoothingEnabled = false; c.drawImage(low, 0, 0, W, H);
  logoG.clearRect(0, 0, 460, 150); drawLogo(logoG, 230, 60, 460, t, lt - 0.95); c.drawImage(logoC, W / 2 - 460, 600 - 120, 920, 300); c.imageSmoothingEnabled = true; // el logotipo, a más resolución
  flash(0.9 * (1 - (lt - 2.4) / 0.2) * (lt >= 2.4 ? 1 : 0));
  const e = lt - 2 * BAR; // dónde se juega
  if (e > 0) {
    const k = eo(seg(e, 0, 0.4)), gr = c.createLinearGradient(0, 1080, 0, H); gr.addColorStop(0, 'rgba(7,6,28,0)'); gr.addColorStop(0.3, `rgba(7,6,28,${0.82 * k})`); gr.addColorStop(1, `rgba(7,6,28,${0.9 * k})`);
    c.fillStyle = gr; c.fillRect(0, 1080, W, H - 1080);
    const s = seg(e, 0.05, 0.22); txt('JUEGA GRATIS', W / 2, 1330, { size: 166, weight: 900, color: GOLD, alpha: s, scale: lerp(1.7, 1, back(s)), shadow: '#7a3d00', track: 2 });
    txt('EN EL NAVEGADOR Y EN EL MÓVIL', W / 2, 1462, { size: 60, weight: 700, color: CREAM, alpha: eo(seg(e, 0.3, 0.6)), track: 5 });
    const p = back(seg(e, 0.55, 0.85)); c.save(); c.translate(W / 2, 1600); c.scale(p, p); rrect(-430, -58, 860, 116, 58, CREAM); c.restore();
    txt('gavilanbe.github.io/srak-l-zit-2', W / 2, 1602, { size: 58, weight: 800, color: INK, alpha: seg(e, 0.65, 0.85) });
    txt('un juego hecho con Claude Opus 5.5', W / 2, 1722, { size: 40, font: SERIF, italic: true, color: '#d9c9a3', alpha: eo(seg(e, 1.0, 1.4)) });
  }
  flash(seg(t, END - 0.5, END - 0.05), '#000000');
});

// ---------- línea de tiempo ----------
// los cambios de sitio se hacen con un iris que se cierra y se abre; el resto, por corte
const IRIS = [AT.mudanza, AT.salon, AT.paso1, AT.patio, AT.paso2, AT.hanout, AT.titulo];
let current = null;
function draw(t, dt) {
  const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1], lt = t - shot.t0, dur = shot.t1 - shot.t0;
  if (shot !== current) { current = shot; shot.enter?.(); }
  c.clearRect(0, 0, W, H);
  if (shot.game) { shot.step(dt, clamp(lt / dur), lt); g.update(dt); }
  seed = Math.floor(t * FPS) * 131 + 5;
  shot.over?.(shot.game ? lt : t, dur);
  oilWipe(seg(t, k1 - 0.38, k1) + seg(t, k1, k1 + 0.42)); // de la gracia al juego
  for (const b of [k1 + 2.9, k2, k2 + 3.0, k3]) if (t >= b - 0.1 && t < b + 0.16) rect(0, 0, W, H, INK, t < b ? seg(t, b - 0.1, b) : 1 - seg(t, b, b + 0.16)); // fundido corto entre planos de la cocina
  for (const b of IRIS) if (t > b - 0.3 && t < b + 0.32) iris(t < b ? seg(t, b - 0.3, b) : 1 - seg(t, b, b + 0.32));
  grade(t);
}

const rendered = () => new Promise((r) => { const w = frameEl.contentWindow; w.requestAnimationFrame(() => w.requestAnimationFrame(r)); });

window.reel = {
  frames: Math.round(END * FPS), fps: FPS, marks: { ...AT, END },
  async init() { await new Promise((r) => { const tick = () => (frameEl.contentWindow.game ? r() : setTimeout(tick, 50)); tick(); }); g = frameEl.contentWindow.game; await document.fonts.ready; },
  // dibuja el fotograma f; hay que pedirlos en orden dentro de cada plano
  async frame(f) { draw(f / FPS, 1 / FPS); await rendered(); },
  // salta a un fotograma simulando su plano desde el principio (para sacar fotos sueltas)
  async seek(f) { const t = f / FPS, shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1]; current = null; for (let i = Math.ceil(shot.t0 * FPS); i <= f; i++) draw(i / FPS, 1 / FPS); await rendered(); },

  // la banda sonora: cada parte con su versión del tema, cortada para que el vídeo caiga a compás
  async audio() {
    const rate = 44100, ctx = new OfflineAudioContext(2, Math.ceil((END + 0.4) * rate), rate), AC = window.AudioContext;
    window.AudioContext = function () { return ctx; }; const sfx = new Sfx(); sfx.init(); window.AudioContext = AC;
    let last = null;
    for (const [name, theme, inten, steps, len] of SCORE) {
      // dentro de un mismo sitio la pieza sigue donde iba; al cambiar de sitio empieza por el estribillo
      if (theme !== last) { sfx.step = 0; sfx.prev = {}; } if (inten === 2) sfx.cstep = 0; last = theme;
      sfx.next = AT[name]; sfx._fill(theme, inten, AT[name] + steps * len - 0.01);
    }
    const f = AT.fin; sfx.strings(293.66, f, 1.5, 0.09); sfx.strings(146.83, f, 1.5, 0.08); sfx.strings(440, f, 1.5, 0.05); sfx.bass(73.42, f, 1.4, 0.3); sfx.drum('D', f, 0.26); sfx.qanun(587.33, f, 1.1, 0.05); sfx.riq(f, 0.08); // acorde final
    const hit = (at, v = 0.4) => { sfx.noise(0.2, { vol: v, freq: 700, at }); sfx.tone(140, 0.24, { type: 'sine', vol: v * 0.8, to: 48, at }); };
    const whoosh = (at, v = 0.14) => sfx.noise(0.34, { vol: v, freq: 900, type: 'bandpass', at: at - 0.2 });
    hit(T0 + BAR); hit(T0 + 2 * BAR, 0.3); hit(T0 + 2 * BAR + 0.55, 0.3); sfx.tone(900, 0.09, { type: 'sine', vol: 0.14, to: 400, at: T0 + 2 * BAR + 1.35 }); whoosh(k1, 0.2);
    sfx.noise(0.03, { vol: 0.2, freq: 3000, type: 'highpass', at: k2 + 0.9 });                                                   // el interruptor de la luz
    for (const d of [0.44, 0.52, 0.6]) sfx.tone(520, 0.09, { type: 'triangle', vol: 0.12, to: 880, at: k2 + 3 + d * 4.6 });        // sorbos
    sfx.tone(880, 0.12, { vol: 0.13, to: 1320, at: k3 }); sfx.tone(1320, 0.26, { vol: 0.13, to: 660, at: k3 + 0.12 }); hit(k3, 0.3); // la alarma
    hit(k3 + 0.5 + 0.62, 0.28); hit(k3 + 1.9 + 0.62, 0.28);                                                                        // belghazos
    for (const b of IRIS) whoosh(b, 0.1);
    sfx.tone(1100, 0.45, { type: 'sine', vol: 0.1, to: 180, at: AT.hanout + 3.0 }); hit(AT.hanout + 3.42, 0.34);                    // el resbalón
    hit(AT.titulo + 2.4, 0.42);
    const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, rate, true); out.setUint32(28, rate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const gain = Math.min(2.2, 0.94 / peak), fade = (i) => Math.min(1, (n - i) / (rate * 0.4)); // normaliza y funde el final
    for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * gain * fade(i))) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * gain * fade(i))) * 32767, true); }
    let bin = ''; const bytes = new Uint8Array(out.buffer); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  },
};
