// Reel promocional de Srak l zit (1080×1920, 30 fps). La página maneja el juego fotograma a fotograma
// (modo ?promo) y pinta encima la tipografía y los gráficos; tools/promo.mjs la captura y la monta con la música.
//
// La estructura sigue a la banda sonora, que se renderiza con el motor del juego:
//   1. sigilo      0 → tA   la gracia: en dariya, cucaracha se dice «ladrón de aceite»
//   2. orquesta   tA → tB   el juego: la familia, el zit, la jadda, ¡¡SRAK ZIT!!
//   3. persecución tB → tC  lo que se hace: esconderse, volar, hacerla resbalar, cuatro sitios, quién más vigila
//   4. orquesta   tC → tD   el título y dónde se juega
import { drawCity, drawMoon, drawLogo, drawClouds, drawRoof, drawRoachSprite } from '../play/src/art.js';
import { Hud } from '../play/src/hud.js';
import { Sfx } from '../play/src/audio.js';

const W = 1080, H = 1920, FPS = 30;
const T0 = 0.05, STEP = 0.15, CSTEP = 0.099, BAR = 16 * STEP, CBAR = 16 * CSTEP;
const tA = T0 + 48 * STEP, tB = tA + 64 * STEP, tC = tB + 80 * CSTEP, tD = tC + 56 * STEP, END = tD + 1.9;

const INK = '#07061c', GOLD = '#ffd23f', OIL = '#f2b705', CREAM = '#fdf6e3', RED = '#c1121f';
const SANS = '"Avenir Next Condensed", "DIN Condensed", sans-serif', SERIF = 'Didot, "Bodoni 72", serif', KUFI = '"Diwan Kufi", "Al Nile", "Geeza Pro", sans-serif';
const ARABIC = 'سرّاق الزيت';

const fx = document.getElementById('fx'), c = fx.getContext('2d'), frameEl = document.getElementById('game');
let g = null; // window.game del juego incrustado

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = (k) => 1 - (1 - k) ** 3, eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const back = (k) => { const s = 1.9; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };
let seed = 7; const rnd = () => { seed = seed * 1664525 + 1013904223 | 0; return ((seed >>> 8) & 0xffff) / 0xffff; };

// ---------- tipografía y formas ----------
function txt(str, x, y, { size = 100, font = SANS, weight = 800, color = '#fff', align = 'center', track = 0, alpha = 1, scale = 1, rot = 0, italic = false, stroke = null, sw = 0, shadow = null } = {}) {
  if (alpha <= 0) return 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale, scale); c.globalAlpha *= alpha;
  c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle'; c.letterSpacing = track + 'px';
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

const flash = (a, color = '#ffffff') => { if (a > 0) rect(0, 0, W, H, color, clamp(a)); };

// palabra enorme que cae de golpe (montaje)
function stamp(str, lt, { y = 330, size = 240, color = GOLD, rot = -0.05 } = {}) {
  c.font = `900 ${size}px ${SANS}`; c.letterSpacing = '2px'; size = Math.min(size, size * 960 / c.measureText(str).width); // que quepa a lo ancho
  const k = seg(lt, 0, 0.16), s = lerp(2.3, 1, back(k)), sh = lt < 0.3 ? (rnd() - 0.5) * 22 * (1 - lt / 0.3) : 0;
  rect(0, y - size * 0.62, W, size * 1.24, INK, 0.5 * k);
  txt(str, W / 2 + sh, y + sh * 0.5, { size, weight: 900, color, stroke: INK, sw: 26, scale: s, rot, alpha: k, track: 2 });
  flash(0.7 * (1 - lt / 0.1));
}

// rótulo en el tercio inferior (el juego visto como película)
function lower(lines, lt, dur) {
  const k = eo(seg(lt, 0.05, 0.4)) * (1 - seg(lt, dur - 0.2, dur));
  const g2 = c.createLinearGradient(0, 1250, 0, H); g2.addColorStop(0, 'rgba(7,6,28,0)'); g2.addColorStop(0.5, 'rgba(7,6,28,0.72)'); g2.addColorStop(1, 'rgba(7,6,28,0.9)');
  c.fillStyle = g2; c.fillRect(0, 1250, W, H - 1250);
  rect(80, 1452, 150 * k, 10, GOLD);
  lines.forEach((l, i) => { const kk = eo(seg(lt, 0.08 + i * 0.12, 0.45 + i * 0.12)) * (1 - seg(lt, dur - 0.2, dur)); c.font = `900 132px ${SANS}`; const fit = i ? Math.min(132, 132 * 900 / c.measureText(l).width) : 104; txt(l, 80 - (1 - kk) * 60, 1540 + i * 128, { size: fit, weight: i ? 900 : 700, color: i ? GOLD : CREAM, align: 'left', alpha: kk, shadow: 'rgba(7,6,28,0.8)', track: 1 }); });
}

// ---------- el juego como plató ----------
const dist = (a, b, x, z) => Math.hypot(a - x, b - z);
function use(n, lit = false) { // prepara una noche y deja el escenario quieto para moverlo a mano
  g.st.introSeen = true; g.startNight(n); g.st.mode = 'promo'; g.st.irisIn = 0; g.st.shake = 0; g.st.flash = 0; g.st.slow = 0; g.st.freeze = 0; g.st.promoStep = null;
  Object.assign(g.R, { inv: 0, vx: 0, vz: 0, y: 0, air: 0, wing: 0, carry: 0, scared: 0, turn: 0, squash: 0, alive: true });
  for (const cv of g.world.covers) cv.hides = false;
  light(lit, true);
}
function light(on, now = false) { if (now) { g.st.lightOn = on; g.st.light = on ? 1 : 0; g.st.lightT = 9; } else g.setLight(on); }
function camera(x, z, zoom, y = 0, cut = false, rate = 4) { g.st.promoCam = [x, z, zoom, y, rate]; if (cut) { g.cam.x = x; g.cam.z = z; g.cam.y = y; g.st.zoom = zoom; g.st.kick = 0; } }
function roach(x, z, head, speed = 0) { Object.assign(g.R, { x, z, vx: speed }); if (head !== null) g.R.head += Math.atan2(Math.sin(head - g.R.head), Math.cos(head - g.R.head)) * 0.35; }
function granny(x, z, face, state, walking) { Object.assign(g.G, { x, z, face, state, route: walking ? [0] : [] }); if (walking) g.G.walk += 0.17; g.granny.visible = true; }

// cada plano: { t0, t1, enter(), step(dt, k, lt), over(lt, dur) } — step mueve el juego, over pinta encima
const shots = [];
const game = (t0, t1, enter, step, over) => shots.push({ t0, t1, enter, step, over, game: true });
const card = (t0, t1, over) => shots.push({ t0, t1, over, game: false });

// 1 ── la gracia ──────────────────────────────────────────────────────────────
card(0, tA, (t) => {
  rect(0, 0, W, H, INK); zellige(t, 0.07);
  const slam = T0 + BAR, dic = T0 + 2 * BAR, ask = 6.5;
  if (t < slam) { // tres líneas que entran y se van
    const out = 1 - seg(t, slam - 0.16, slam - 0.02);
    [['EN MARRUECOS,', 84, 700, CREAM, 0.2, 760], ['A LA CUCARACHA', 122, 900, GOLD, 0.7, 884], ['NO LA LLAMAN CUCARACHA.', 82, 700, CREAM, 1.25, 1020]].forEach(([s, size, weight, color, at, y]) => {
      const k = eo(seg(t, at, at + 0.3)); txt(s, W / 2, y + (1 - k) * 40, { size, weight, color, alpha: k * out, track: 4, scale: lerp(1, 0.9, 1 - out) });
    });
  }
  if (t >= slam && t < ask) { // la palabra, de golpe
    const lt = t - slam, k = seg(lt, 0, 0.18), up = eio(seg(t, dic, dic + 0.4)), away = 1 - seg(t, ask - 0.25, ask - 0.05);
    const y = lerp(860, 330, up), s = lerp(1, 0.5, up) * lerp(2.4, 1, back(k)), sh = lt < 0.35 ? (rnd() - 0.5) * 26 * (1 - lt / 0.35) : 0;
    rays(W / 2, y, t, 0.1 * k * away * (1 - up * 0.6));
    for (const [i, dx] of [[0, -250], [1, -40], [2, 190], [3, 330]].entries()) { // gotea aceite
      const d = seg(lt, 0.5 + i * 0.25, 2.2 + i * 0.25) * (1 - up), len = d * (120 + i * 46);
      if (len > 2) { rrect(W / 2 + dx - 11, y + 96, 22, len, 11, OIL); rrect(W / 2 + dx - 5, y + 100, 6, Math.max(0, len - 16), 3, '#fff3b0'); }
    }
    txt(ARABIC, W / 2 + sh, y + sh * 0.4, { size: 250, font: KUFI, weight: 700, color: GOLD, scale: s, alpha: k * away, shadow: '#7a3d00' });
    const k2 = eo(seg(lt, 0.3, 0.6)) * (1 - up) * away;
    txt('SARRAQ ZZIT', W / 2, 1090 + (1 - k2) * 40, { size: 118, weight: 800, color: CREAM, track: 16, alpha: k2 });
    txt('así la llaman en dariya', W / 2, 1200, { size: 62, font: SERIF, weight: 400, italic: true, color: '#d9c9a3', alpha: eo(seg(lt, 0.8, 1.2)) * (1 - up) * away });
    flash(0.85 * (1 - lt / 0.14));
  }
  if (t >= dic && t < ask + 0.3) { // la ficha de diccionario
    const lt = t - dic, k = back(seg(lt, 0, 0.42)), out = eio(seg(t, ask - 0.3, ask + 0.1));
    c.save(); c.translate(W / 2, 1010 + (1 - k) * 1300 + out * 1500); c.rotate(-0.025 + out * 0.3); c.translate(-W / 2, -1010);
    rrect(96, 596, 900, 830, 28, 'rgba(0,0,0,0.45)'); rrect(84, 580, 900, 830, 28, CREAM); rect(84, 580, 900, 16, RED);
    txt('sarraq zzit', 140, 710, { size: 124, font: SERIF, weight: 700, italic: true, color: INK, align: 'left' });
    txt('سراق الزيت', 930, 806, { size: 54, font: KUFI, color: RED, align: 'right' });
    txt('sustantivo · dariya marroquí', 142, 812, { size: 46, weight: 500, color: '#7a6a55', align: 'left', track: 2 });
    rect(140, 858, 788, 3, '#d9c9a3');
    const a1 = eo(seg(lt, 0.4, 0.65)), a2 = eo(seg(lt, 0.75, 1.0)), a3 = eo(seg(lt, 0.95, 1.2)), hl = eio(seg(lt, 1.1, 1.45));
    txt('1.', 140, 950, { size: 60, weight: 800, color: RED, align: 'left', alpha: a1 }); txt('cucaracha.', 210, 950, { size: 84, font: SERIF, color: INK, align: 'left', alpha: a1 });
    txt('2.', 140, 1090, { size: 60, weight: 800, color: RED, align: 'left', alpha: a2 }); txt('literalmente:', 210, 1090, { size: 60, font: SERIF, italic: true, color: '#7a6a55', align: 'left', alpha: a2 });
    c.font = `700 88px ${SERIF}`; const tw = c.measureText('«ladrón de aceite»').width;
    rect(128, 1178, (tw + 28) * hl, 118, GOLD); txt('«ladrón de aceite»', 140, 1236, { size: 88, font: SERIF, weight: 700, color: INK, align: 'left', alpha: a3 });
    if (lt > 0.5) { const p = back(seg(lt, 0.5, 0.75)); c.save(); c.translate(820, 1340); c.scale(8 * p, 8 * p); c.imageSmoothingEnabled = false; drawRoachSprite((a, b, w, h, col) => { c.fillStyle = col; c.fillRect(a, b, w, h); }, -10, -6, -1, Math.floor(t * 8), lt > 1.2); c.restore(); }
    c.restore();
  }
  if (t >= ask) { // la pregunta
    const lt = t - ask, k = seg(lt, 0, 0.16);
    rays(W / 2, 980, t, 0.08 * k);
    txt('¿Y SI FUERA', W / 2, 850, { size: 150, weight: 700, color: CREAM, alpha: k, scale: lerp(1.6, 1, back(k)), track: 4 });
    txt('LITERAL?', W / 2, 1060, { size: 236, weight: 900, color: GOLD, alpha: k, scale: lerp(2, 1, back(k)), shadow: '#7a3d00' });
    flash(0.6 * (1 - lt / 0.1));
  }
});

// 2 ── el juego ───────────────────────────────────────────────────────────────
game(tA, tA + BAR, () => { use(1); const h = g.world.hole; roach(h.x + 0.1, h.z, 0); g.R.head = 0; camera(h.x + 2.1, h.z + 0.3, 1.45, 0.3, true); }, (dt, k) => {
  const h = g.world.hole, walk = eo(seg(k, 0.02, 0.55));
  roach(lerp(h.x + 0.1, h.x + 3.7, walk), h.z + 0.2, k > 0.6 ? Math.PI * 0.86 : 0, k < 0.55 ? 5 : 0);
  g.R.y = k > 0.72 && k < 0.9 ? Math.sin(seg(k, 0.72, 0.9) * Math.PI) * 0.5 : 0;
  g.babies.forEach((b, i) => { if (b.hop <= 0 && Math.sin(k * 26 + i * 2.4) > 0.75) b.hop = 0.36; });
  camera(h.x + 2.1, h.z + 0.3, lerp(1.45, 1.7, k), 0.3);
}, (lt, dur) => lower(['UNA FAMILIA', 'CON HAMBRE.'], lt, dur));

game(tA + BAR, tA + 2 * BAR, () => { use(1); roach(-13, 6, 0); const o = g.world.oil[0]; camera(o.x - 5, o.z - 4, 1.0, 0, true); }, (dt, k) => {
  const o = g.world.oil[0], e = eio(k);
  camera(lerp(o.x - 5, o.x - 0.6, e), lerp(o.z - 4, o.z - 0.9, e), lerp(1.0, 1.75, e), 0.8 * e, false, 9);
  if (Math.random() < 0.5) g.burst(o.x + (Math.random() - 0.5) * 2.4, 0.4 + Math.random() * 2, o.z + (Math.random() - 0.5) * 2.4, '#fff6d6', 1, 0.3, 0.8, 0.5, 2);
}, (lt, dur) => lower(['UNA CASA', 'LLENA DE ZIT.'], lt, dur));

game(tA + 2 * BAR, tA + 3 * BAR, () => { use(1); roach(-13, 6, 0); const d = g.world.nodes[0]; g.world.doorGlow.visible = true; g.granny.visible = false; camera(d.x - 2.6, d.z + 3.6, 0.92, 2.4, true); }, (dt, k, lt) => {
  const d = g.world.nodes[0];
  if (k < 0.3) { if (Math.floor(lt * 5) !== Math.floor((lt - dt) * 5)) g.st.shake = 0.14; }
  else {
    if (!g.st.lightOn) { light(true); g.world.doorGlow.visible = false; g.st.kick = 0.08; }
    const adv = eo(seg(k, 0.4, 1)); granny(d.x - adv * 0.6, d.z + adv * 2.6, 1.9 + Math.sin(lt * 3) * 0.6, 'cine', k > 0.4);
  }
  camera(d.x - 2.6, d.z + 3.6, lerp(0.92, 1.05, k), 2.4);
}, (lt, dur) => lower(['Y UNA JADDA', 'DE SUEÑO LIGERO.'], lt, dur));

game(tA + 3 * BAR, tB, () => { use(1, true); roach(3.6, -3.2, 1.1); g.R.head = 1.1; granny(5, -6.3, 2.4, 'hunt', false); camera(4.2, -3.4, 1.0, 0.8, true); g.R.scared = 1; }, (dt, k, lt) => {
  const rx = lerp(3.6, 7.4, k), rz = lerp(-3.2, 4.8, k);
  roach(rx, rz, Math.atan2(8, 3.8), 9.5); g.R.scared = 1;
  granny(5, -6.3, Math.atan2(rz + 6.3, rx - 5), 'hunt', false);
  for (const at of [0.35, 1.3]) if (lt >= at && lt - dt < at) { g.S.st = 'fly'; g.S.t = 0; g.S.dur = 0.62; g.S.from.set(5, 4.6, -6.3); g.S.to.set(rx + 3.2, 0.15, rz + 3.0); } // cae cerca, pero no le da
  g.updateSlipper(dt);
  camera(rx + 0.4, rz - 1.4, 1.0, 0.8, false, 7);
}, (lt, dur) => {
  const k = seg(lt, 0, 0.14), out = 1 - seg(lt, 1.25, 1.45), sh = lt < 0.4 ? (rnd() - 0.5) * 24 : 0;
  if (out > 0) {
    c.save(); c.translate(W / 2, 430); c.rotate(-0.045); c.globalAlpha = out;
    rect(-700, -150 * k, 1400, 300 * k, RED, out); rect(-700, -150 * k, 1400, 12, GOLD, out); rect(-700, 150 * k - 12, 1400, 12, GOLD, out);
    c.globalAlpha = 1; c.restore();
    txt('¡¡SRAK ZIT!!', W / 2 + sh, 432 + sh * 0.5, { size: 196, weight: 900, color: '#ffffff', shadow: '#5a0a10', rot: -0.045, alpha: k * out, scale: lerp(1.8, 1, back(k)) });
    txt('«¡ladrona de aceite!»', W / 2, 650, { size: 78, font: SERIF, italic: true, weight: 700, color: CREAM, alpha: eo(seg(lt, 0.3, 0.55)) * out, stroke: INK, sw: 14 });
  }
  flash(0.8 * (1 - lt / 0.12), '#ff3030');
});

// 3 ── lo que se hace ─────────────────────────────────────────────────────────
const m = (i) => tB + i * CBAR;
game(m(0), m(1), () => { use(2, true); g.world.covers[0].hides = true; roach(-2.8, 1.5, 0.6); g.R.head = 0.6; g.R.scared = 0.8; camera(-2.2, 3.2, 0.9, 0.6, true); }, (dt, k, lt) => {
  granny(lerp(-9.5, 4.5, k), 6.7, -0.5 + Math.sin(lt * 4) * 0.7, 'patrol', true); g.R.head = 0.6 + Math.sin(lt * 6) * 0.25;
  camera(-2.2, 3.2, lerp(0.9, 1.0, k), 0.6);
}, (lt) => stamp('ESCÓNDETE', lt));

game(m(1), m(2), () => { use(2); roach(-9.6, -1.2, Math.PI); g.R.head = Math.PI * 0.9; camera(-11.5, -2, 1.25, 0.5, true); }, (dt, k) => {
  const fly = seg(k, 0.18, 0.74), x = lerp(-9.6, -13.6, eio(seg(k, 0, 0.74))), z = lerp(-1.2, -3.2, eio(seg(k, 0, 0.74)));
  roach(x, z, Math.atan2(-2, -4), k < 0.74 ? 8 : 0);
  g.R.y = fly < 1 ? Math.max(fly > 0.75 ? 3.25 : 0, Math.sin(fly * Math.PI * 0.62) * 4.6) : 3.25; g.R.air = fly > 0 && fly < 1 ? 1 : 0; g.R.wing = g.R.air;
  if (fly >= 1 && g.R.squash === 0 && k < 0.8) { g.R.squash = 1; g.burst(x, 3.4, z, '#e6dcc4', 8, 3, 1.5, 0.4); }
  g.R.squash = Math.max(0, g.R.squash - dt * 4); g.R.carry = k > 0.9 ? 2 : k > 0.82 ? 1 : 0;
  if (k > 0.8 && Math.random() < 0.5) g.burst(-13.9, 3.6, -3, '#ffd23f', 1, 1.5, 2.5, 0.5);
  camera(lerp(-11.5, -13, k), lerp(-2, -3, k), lerp(1.25, 1.5, k), 0.5 + g.R.y * 0.75, false, 8);
}, (lt) => stamp('VUELA', lt, { size: 320 }));

game(m(2), m(3), () => { use(2, true); roach(-7.2, 3.6, 0.4); g.R.head = 0.4; const s = g.slicks[0]; Object.assign(s, { on: true, x: -3.4, z: 6.6, t: 0 }); s.m.position.set(-3.4, 0.04, 6.6); s.m.visible = true; s.m.scale.setScalar(1); granny(-9.5, 6.6, 0, 'patrol', true); camera(-4.6, 5.9, 1.05, 1.2, true); }, (dt, k, lt) => {
  if (g.G.state !== 'slip') { granny(lerp(-9.5, -3.2, seg(k, 0, 0.3)), 6.6, 0, 'patrol', true); if (k >= 0.3) { g.G.state = 'slip'; g.G.t = 3.8; g.G.route = []; g.slicks[0].m.visible = false; g.slicks[0].on = false; g.burst(-3.4, 0.2, 6.6, '#f2b705', 12, 5, 4); } }
  else g.G.t = Math.max(1.4, g.G.t - dt * 1.5);
  g.R.y = k > 0.55 ? Math.abs(Math.sin((k - 0.55) * 16)) * 0.6 : 0; g.R.head = 0.4;
  camera(-4.6, 5.9, lerp(1.05, 1.2, k), 1.2);
}, (lt) => stamp('HAZLA RESBALAR', lt, { size: 168 }));

const PLACES = [[1, true, 'LA COCINA', [-3, 0.5]], [3, false, 'EL SALÓN', [1.5, -1.5]], [5, false, 'EL PATIO', [0, 0.5]], [7, true, 'EL HANOUT', [-1.5, 1]]];
PLACES.forEach(([n, lit, name, [cx, cz]], i) => game(m(3) + i * CBAR / 4, m(3) + (i + 1) * CBAR / 4, () => { use(n, lit); roach(g.world.hole.x + 1.5, g.world.hole.z, 0); camera(cx - 0.8, cz, 0.62, 1.2, true); }, (dt, k) => camera(cx - 0.8 + k * 1.6, cz, 0.62 + k * 0.04, 1.2, false, 9), (lt) => {
  const k = seg(lt, 0, 0.1);
  if (i === 0) stamp('4 SITIOS', lt + 0.001, { size: 240 }); else txt('4 SITIOS', W / 2, 330, { size: 240, weight: 900, color: GOLD, stroke: INK, sw: 26, rot: -0.05, track: 2 });
  c.save(); c.translate(W / 2, 1560); c.rotate(0.03);
  rect(-460, -92, 920, 184, INK, 0.92); rect(-460, -92, 920, 10, GOLD); rect(-460, 82, 920, 10, GOLD);
  c.restore();
  txt(name, W / 2, 1562, { size: 150, weight: 900, color: CREAM, rot: 0.03, scale: lerp(1.5, 1, back(k)), track: 4 });
  txt(`${i + 1}/4`, 940, 1700, { size: 60, weight: 700, color: GOLD, rot: 0.03 });
  if (i) flash(0.5 * (1 - lt / 0.07));
}));

const third = CBAR / 3;
game(m(4), m(4) + third, () => { use(4); Object.assign(g.K, { x: -5, z: 2.5, face: 0, state: 'alert', t: 0.3, dur: 0.4 }); roach(0.5, 3.5, 0.2); g.R.head = 0.2; g.R.scared = 1; camera(-2, 3.2, 1.1, 0.6, true); }, (dt, k) => {
  roach(lerp(0.5, 3.5, k), 3.5 + k, 0.3, 9);
  if (k > 0.35) { const p = seg(k, 0.35, 1); Object.assign(g.K, { state: 'pounce', x: lerp(-5, 0.5, p), z: lerp(2.5, 3.8, p), face: 0.2, t: (1 - p) * 0.4, dur: 0.4 }); }
  camera(lerp(-2, 0.5, k), 3.2, 1.1, 0.6, false, 9);
}, (lt) => stamp('GATOS', lt, { size: 300 }));
game(m(4) + third, m(4) + 2 * third, () => { use(5); roach(-2, 5, 0); g.R.head = 0; g.R.scared = 1; camera(0, 5.4, 1.05, 0.6, true); }, (dt, k) => {
  const rx = lerp(-2, 4.5, k); roach(rx, 5.2, 0, 9);
  g.C.forEach((ch, i) => { if (!ch.on) return; Object.assign(ch, { state: 'chase', x: rx - 2.6 - i * 1.7, z: 5.2 + (i ? 1.1 : -0.8), face: 0 }); ch.walk += 0.6; });
  camera(rx - 0.6, 5.4, 1.05, 0.6, false, 9);
}, (lt) => stamp('GALLINAS', lt, { size: 230 }));
game(m(4) + 2 * third, tC, () => { use(7, true); const s = g.world.snaps[1]; roach(s.x - 2.6, s.z + 0.1, 0); g.R.head = 0; granny(s.x + 5, s.z - 3.5, 2.6, 'patrol', true); camera(s.x, s.z + 0.6, 1.3, 0.5, true); }, (dt, k) => {
  const s = g.world.snaps[1]; roach(lerp(s.x - 2.4, s.x + 2.2, k), s.z + 0.1, 0, 8); g.R.y = Math.sin(seg(k, 0.25, 0.75) * Math.PI) * 1.3; g.R.air = g.R.y > 0.05 ? 1 : 0; g.R.wing = g.R.air;
  granny(s.x + 5 - k, s.z - 3.5 + k * 0.6, 2.6, 'patrol', true);
  camera(s.x, s.z + 0.6, 1.3, 0.5 + g.R.y * 0.4);
}, (lt) => stamp('Y CEPOS', lt, { size: 270 }));

// 4 ── el título ──────────────────────────────────────────────────────────────
const LW = 270, LH = 480, low = document.createElement('canvas'); low.width = LW; low.height = LH;
const lh = new Hud(low); lh.W = LW; lh.H = LH; lh.g.imageSmoothingEnabled = false;
const logoC = document.createElement('canvas'); logoC.width = 460; logoC.height = 150; const logoG = logoC.getContext('2d');
card(tC, END, (t) => {
  const lt = t - tC, lg = lh.g, moonY = Math.round(lerp(LH * 0.78, 150, eo(seg(lt, 0.15, 1.7))));
  drawCity(lg, LW, LH, t, 'night', 0, { reveal: clamp(lt / 1.7), behind: () => { drawMoon(lg, LW / 2, moonY, 62); drawClouds(lg, LW, LH, t); } });
  drawRoof(lg, LW, LH, t, lt > 3);
  const half = 28; // el logotipo va aparte, a más resolución
  if (lt > 2.75) lh.sysText('سراق الزيت', LW / 2, 150 + half + 20, 22, CREAM, 'bold {s}px "Geeza Pro", "Noto Naskh Arabic", sans-serif');
  if (lt > 3.1) lh.text('la cucaracha que roba el aceite'.slice(0, Math.floor((lt - 3.1) * 34)), LW / 2, 150 + half + 46, { color: '#ffd9a0' });
  c.imageSmoothingEnabled = false; c.drawImage(low, 0, 0, W, H);
  logoG.clearRect(0, 0, 460, 150); drawLogo(logoG, 230, 60, 460, t, lt - 0.95); c.drawImage(logoC, W / 2 - 460, 600 - 120, 920, 300); c.imageSmoothingEnabled = true;
  flash(0.9 * (1 - (lt - 2.4) / 0.2) * (lt >= 2.4 ? 1 : 0));
  flash(1 - lt / 0.25);
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
let current = null;
function draw(t, dt) {
  const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1], lt = t - shot.t0, dur = shot.t1 - shot.t0;
  if (shot !== current) { current = shot; shot.enter?.(); }
  c.clearRect(0, 0, W, H);
  if (shot.game) { shot.step(dt, clamp(lt / dur), lt); g.update(dt); }
  seed = Math.floor(t * FPS) * 131 + 5;
  shot.over?.(shot.game ? lt : t, dur);
  oilWipe(lerp(0, 1, seg(t, tA - 0.38, tA)) + seg(t, tA, tA + 0.42));         // de la pregunta al juego
  if (t >= tB - 0.02) flash(0.9 * (1 - (t - tB) / 0.12));                          // arranca la persecución
  if (t > tC - 0.3 && t < tC) { const k = eio(seg(t, tC - 0.3, tC)); rect(0, 0, W, H * k / 2 + 2, INK); rect(0, H - H * k / 2 - 2, W, H * k / 2 + 2, INK); } // se cierra antes del título
  grade(t);
}

const rendered = () => new Promise((r) => { const w = frameEl.contentWindow; w.requestAnimationFrame(() => w.requestAnimationFrame(r)); });

window.reel = {
  frames: Math.round(END * FPS), fps: FPS, marks: { tA, tB, tC, tD, END },
  async init() { await new Promise((r) => { const tick = () => (frameEl.contentWindow.game ? r() : setTimeout(tick, 50)); tick(); }); g = frameEl.contentWindow.game; await document.fonts.ready; },
  // dibuja el fotograma f; hay que pedirlos en orden dentro de cada plano
  async frame(f) { draw(f / FPS, 1 / FPS); await rendered(); },
  // salta a un fotograma simulando su plano desde el principio (para sacar fotos sueltas)
  async seek(f) { const t = f / FPS, shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1]; current = null; for (let i = Math.ceil(shot.t0 * FPS); i <= f; i++) draw(i / FPS, 1 / FPS); await rendered(); },

  // la banda sonora: el tema del juego en sus tres capas, cortado para que cada parte del vídeo caiga a compás
  async audio() {
    const rate = 44100, ctx = new OfflineAudioContext(2, Math.ceil((END + 0.4) * rate), rate), AC = window.AudioContext;
    window.AudioContext = function () { return ctx; }; const sfx = new Sfx(); sfx.init(); window.AudioContext = AC;
    sfx.step = 0; sfx.next = T0; sfx._fill('title', 0, tA - 0.01);
    sfx.step = 0; sfx.prev = {}; sfx._fill('title', 1, tB - 0.01);
    sfx.cstep = 0; sfx._fill('title', 2, tC - 0.01);
    sfx.step = 0; sfx.prev = {}; sfx._fill('title', 1, tD - 0.01);
    sfx.strings(293.66, tD, 1.5, 0.09); sfx.strings(146.83, tD, 1.5, 0.08); sfx.strings(440, tD, 1.5, 0.05); sfx.bass(73.42, tD, 1.4, 0.3); sfx.drum('D', tD, 0.26); sfx.qanun(587.33, tD, 1.1, 0.05); sfx.riq(tD, 0.08); // acorde final
    const hit = (at, v = 0.4) => { sfx.noise(0.2, { vol: v, freq: 700, at }); sfx.tone(140, 0.24, { type: 'sine', vol: v * 0.8, to: 48, at }); };
    const whoosh = (at, v = 0.14) => sfx.noise(0.34, { vol: v, freq: 900, type: 'bandpass', at: at - 0.2 });
    hit(T0 + BAR); whoosh(T0 + 2 * BAR); hit(6.5, 0.3); whoosh(tA, 0.2); sfx.tone(900, 0.09, { type: 'sine', vol: 0.12, to: 400, at: tA - 0.05 });
    const al = tA + 3 * BAR; sfx.tone(880, 0.12, { vol: 0.13, to: 1320, at: al }); sfx.tone(1320, 0.26, { vol: 0.13, to: 660, at: al + 0.12 }); hit(al, 0.3);
    for (let i = 0; i < 5; i++) hit(m(i), 0.22);
    hit(tC + 2.4, 0.42); whoosh(tC, 0.2);
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
