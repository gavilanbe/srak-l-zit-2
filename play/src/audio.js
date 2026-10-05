// Sonido generado con WebAudio.
//
// La música es una pequeña orquesta árabe sintetizada (cuerdas, acordeón, qanun, laúd, ney, bajo,
// darbuka, riq, palmas y qraqeb) tocando un único tema propio, escrito en grados de la escala para
// que cada sitio lo oiga en su maqam, su tempo y sus instrumentos:
//   R  estribillo de cuerdas (lazma) de dos compases: baja de la quinta a la tónica y vuelve a subir
//   V  estrofa: canta el solista y las cuerdas le contestan al final de cada frase
//   B  puente: sube a la cuarta y regresa por una cadencia descendente
// Encima va el motivo de quien vigila (grave, de semitono) y tres capas según el peligro:
// 0 sigilo (pizzicatos y laúd), 1 con la orquesta entera, 2 persecución.

const MAQAM = {
  kurd: [0, 1, 3, 5, 7, 8, 10], hijaz: [0, 1, 4, 5, 7, 8, 10], nahawand: [0, 2, 3, 5, 7, 8, 11],
  bayati: [0, 1.5, 3, 5, 7, 8, 10], rast: [0, 2, 3.5, 5, 7, 9, 10.5], ajam: [0, 2, 4, 5, 7, 9, 11],
};
const N = null;
// [grado, duración en pasos]; 7 = la octava. ch: acorde de cada medio compás, también en grados.
const SEC = {
  R: { bars: 2, ch: [[0, 0], [1, 0]],
    riff: [[4, 2], [4, 1], [3, 1], [4, 2], [5, 2], [4, 2], [3, 2], [2, 3], [3, 1],
      [2, 2], [1, 2], [0, 4], [N, 2], [0, 1], [1, 1], [2, 1], [3, 1], [4, 2]] },
  V: { bars: 4, ch: [[0, 0], [3, 3], [2, 1], [0, 0]],
    lead: [[7, 4], [6, 2], [7, 2], [5, 3], [4, 1], [5, 2], [4, 2],
      [3, 6], [4, 2], [3, 2], [2, 2], [3, 4],
      [4, 3], [5, 1], [4, 2], [3, 2], [2, 3], [3, 1], [2, 2], [1, 2],
      [0, 8], [N, 8]],
    answer: [[N, 16], [N, 12], [7, 1], [6, 1], [5, 1], [4, 1], [N, 16], [N, 8], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [4, 1], [3, 1]] },
  B: { bars: 4, ch: [[3, 3], [2, 2], [1, 1], [1, 0]],
    lead: [[3, 2], [4, 2], [5, 2], [6, 2], [7, 4], [6, 2], [5, 2],
      [6, 3], [5, 1], [4, 4], [5, 2], [4, 2], [3, 4],
      [5, 2], [4, 2], [3, 2], [2, 2], [4, 3], [3, 1], [2, 2], [1, 2],
      [2, 2], [1, 2], [0, 6], [N, 2], [0, 1], [1, 1], [2, 1], [3, 1]],
    answer: [[N, 16], [N, 8], [7, 2], [6, 2], [5, 2], [4, 2], [N, 16], [N, 16]] },
  // el mismo tema en 6/8, para el chaabi del hanout
  R6: { bars: 2, meter: 12, ch: [[0, 0], [1, 0]],
    riff: [[4, 2], [4, 1], [3, 1], [4, 2], [5, 2], [4, 2], [3, 2], [2, 2], [3, 1], [2, 1], [1, 2], [0, 3], [0, 1], [1, 1], [2, 1]] },
  V6: { bars: 4, meter: 12, ch: [[0, 0], [3, 3], [2, 1], [0, 0]],
    lead: [[7, 3], [6, 1], [7, 2], [5, 3], [4, 1], [5, 2], [3, 5], [4, 1], [3, 2], [2, 2], [3, 2],
      [4, 3], [5, 1], [4, 2], [2, 3], [3, 1], [2, 2], [1, 2], [0, 6], [N, 1], [0, 1], [1, 1], [2, 1]],
    answer: [[N, 12], [N, 9], [6, 1], [5, 1], [4, 1], [N, 12], [N, 12]] },
  B6: { bars: 4, meter: 12, ch: [[3, 3], [2, 2], [1, 1], [1, 0]],
    lead: [[3, 2], [4, 1], [5, 2], [6, 1], [7, 3], [6, 1], [5, 2], [6, 3], [5, 1], [4, 2], [5, 2], [4, 1], [3, 3],
      [5, 2], [4, 1], [3, 2], [2, 1], [4, 3], [3, 1], [2, 2], [2, 2], [1, 1], [0, 6], [0, 1], [1, 1], [2, 1]] },
};
const JADDA = [[0, 3], [0, 1], [1, 2], [0, 2], [N, 2], [-1, 2], [0, 4], [0, 3], [0, 1], [1, 2], [0, 2], [3, 2], [2, 2], [1, 2], [0, 2]]; // motivo de quien vigila
const CALL = [[7, 2], [N, 2], [7, 1], [8, 1], [7, 2], [6, 2], [5, 2], [4, 4], [N, 16], [9, 2], [N, 2], [8, 1], [9, 1], [8, 2], [7, 2], [6, 2], [7, 4], [N, 16]]; // llamada de la persecución
const PERC = { // D dum, T tek, k ka, . silencio
  maqsum: ['D.....T.....k...', 'D.T.k.T.D.k.T.kk'], malfuf: ['D.....T.........', 'D..T..T.D..T..Tk'],
  chaabi: ['D..T..D..T..', 'D.kT.kD.TT.k'], none: ['................', 'D.......k.......'], ayyub: 'D..kD.T.D..kD.T.',
};
const THEMES = {
  title: { maqam: 'kurd', root: 293.66, step: 0.15, form: ['R', 'R', 'V', 'R', 'B', 'R'], lead: ['oud', 'accordion'], leadOct: [1, 1], riff: ['pizz', 'strings'], perc: 'maqsum', double: true },
  cocina: { maqam: 'hijaz', root: 293.66, step: 0.158, form: ['R', 'V', 'R', 'B'], lead: ['oud', 'accordion'], leadOct: [1, 1], riff: ['pizz', 'strings'], perc: 'maqsum', double: true, threat: true },
  salon: { maqam: 'nahawand', root: 261.63, step: 0.215, form: ['V', 'R', 'B', 'R'], lead: ['bell', 'bell'], leadOct: [2, 2], riff: ['pizz', 'pizz'], perc: 'none', pad: true, threat: true },
  patio: { maqam: 'bayati', root: 293.66, step: 0.172, form: ['R', 'V', 'R', 'B'], lead: ['ney', 'ney'], leadOct: [2, 2], riff: ['qanun', 'qanun'], perc: 'malfuf', threat: true },
  hanout: { maqam: 'rast', root: 261.63, step: 0.125, form: ['R6', 'R6', 'V6', 'R6', 'B6', 'R6'], lead: ['oud', 'accordion'], leadOct: [1, 1], riff: ['qanun', 'strings'], perc: 'chaabi', double: true },
  dawn: { maqam: 'ajam', root: 293.66, step: 0.18, form: ['V', 'R', 'B', 'R'], lead: ['ney', 'ney'], leadOct: [2, 2], riff: ['pizz', 'strings'], perc: 'malfuf', pad: true },
};

// de lista de notas a mapa paso → [grado, duración]; hold: grado que suena en cada paso
function compile(notes, total, label) {
  const at = [], hold = []; let s = 0;
  for (const [deg, len] of notes) { if (deg !== N) { at[s] = [deg, len]; for (let i = 0; i < len; i++) hold[s + i] = deg; } s += len; }
  if (total && s !== total) console.warn(`música: ${label} suma ${s} pasos y deberían ser ${total}`);
  return { at, hold, len: s };
}
for (const [name, S] of Object.entries(SEC)) {
  S.meter ??= 16;
  for (const k of ['riff', 'lead', 'answer']) if (S[k]) S[k] = compile(S[k], S.bars * S.meter, `${name}.${k}`);
}
const JADDA_T = compile(JADDA, 32, 'JADDA'), CALL_T = compile(CALL, 64, 'CALL'), RIFF = SEC.R.riff;
for (const th of Object.values(THEMES)) { th.map = []; for (const n of th.form) for (let i = 0; i < SEC[n].bars * SEC[n].meter; i++) th.map.push([n, i]); }

export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.theme = null; this.step = 0; this.cstep = 0; this.next = 0; this.inten = 0; this.prev = {}; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.out = ctx.createGain(); this.out.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.out.connect(comp); comp.connect(ctx.destination);
    this.fx = ctx.createGain(); this.fx.gain.value = 0.6; this.fx.connect(this.out);     // efectos
    this.mus = ctx.createGain(); this.mus.gain.value = 0.9; this.mus.connect(this.out);   // música
    // reverberación: una respuesta de ruido que se apaga, como una sala de azulejo
    const len = ctx.sampleRate * 2.1 | 0, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4; }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.55; this.rev.connect(wet); wet.connect(this.out);
    const nb = this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // cada familia de instrumentos tiene su sitio en el estéreo y su cantidad de sala
    const bus = (pan, send) => {
      const g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), s = ctx.createGain();
      if (p.pan) p.pan.value = pan; s.gain.value = send; g.connect(p); p.connect(this.mus); g.connect(s); s.connect(this.rev);
      return g;
    };
    this.bus = { strings: bus(-0.3, 0.45), lead: bus(0.12, 0.35), pluck: bus(0.4, 0.3), bass: bus(0, 0.04), perc: bus(-0.05, 0.14), riq: bus(0.45, 0.2) };
  }

  toggleMute() { this.muted = !this.muted; if (this.out) this.out.gain.value = this.muted ? 0 : 0.85; }

  // ---------- piezas básicas ----------
  _env(t, vol, attack, dur, bus, send) { // ataque y caída exponencial (pulsados y golpes)
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(bus);
    if (send) { const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.rev); }
    return g;
  }

  _hold(t, vol, attack, dur, release, bus) { // nota sostenida (arcos y fuelle)
    const g = this.ctx.createGain(), end = t + Math.max(attack + 0.02, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.setValueAtTime(vol, end); g.gain.linearRampToValueAtTime(0.0001, end + release);
    g.connect(bus);
    return g;
  }

  _osc(type, f, t, dur, dest, to, from) {
    const o = this.ctx.createOscillator(); o.type = type;
    if (from) { o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); } else o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  _noise(t, dur, dest, type, freq, q = 1) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); f.connect(dest); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }

  _vibrato(oscs, f, t, dur, depth, rate = 5.6, delay = 0.16) {
    const lfo = this.ctx.createOscillator(), d = this.ctx.createGain(); lfo.frequency.value = rate;
    d.gain.setValueAtTime(0, t + delay * 0.5); d.gain.linearRampToValueAtTime(f * depth, t + delay + 0.15);
    lfo.connect(d); for (const o of oscs) d.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.2);
  }

  tone(f, dur, { type = 'square', vol = 0.12, to = null, at = 0, send = 0.12 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    this._osc(type, f, t, dur, this._env(t, vol, 0.004, dur, this.fx, send), to);
  }

  noise(dur, { vol = 0.15, freq = 1200, type = 'lowpass', at = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    this._noise(t, dur, this._env(t, vol, 0.003, dur, this.fx, 0.1), type, freq);
  }

  // ---------- la orquesta ----------
  // from: frecuencia de la nota anterior, para llegar deslizando como un violín; marc: ataque seco
  strings(f, t, dur, vol, { from = null, marc = false } = {}) {
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 0.7;
    fl.frequency.setValueAtTime(1300, t); fl.frequency.linearRampToValueAtTime(Math.min(4200, 1800 + f * 2), t + 0.09);
    fl.connect(this._hold(t, vol, marc ? 0.012 : 0.045, dur, marc ? 0.07 : 0.13, this.bus.strings));
    const oscs = [-9, 0, 8].map((c) => { const k = 2 ** (c / 1200); return this._osc('sawtooth', f * k, t, dur + 0.15, fl, null, from && from * k); });
    const up = this.ctx.createGain(); up.gain.value = 0.22; up.connect(fl); oscs.push(this._osc('sawtooth', f * 2.003, t, dur + 0.15, up, null, from && from * 2));
    if (dur > 0.3) this._vibrato(oscs, f, t, dur, 0.007);
  }

  pizz(f, t, dur, vol) {
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(2400, t); fl.frequency.exponentialRampToValueAtTime(420, t + 0.12);
    fl.connect(this._env(t, vol * 1.5, 0.004, 0.26, this.bus.strings)); this._osc('sawtooth', f, t, 0.3, fl); this._osc('triangle', f * 1.004, t, 0.3, fl);
  }

  accordion(f, t, dur, vol, { from = null } = {}) { // dos lengüetas algo desafinadas y el temblor del fuelle
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = Math.min(3600, 1500 + f * 1.6); fl.Q.value = 1.1;
    const g = this._hold(t, vol, 0.028, dur, 0.09, this.bus.lead); fl.connect(g);
    const oscs = [this._osc('square', f * 0.997, t, dur + 0.12, fl, null, from), this._osc('square', f * 1.004, t, dur + 0.12, fl, null, from)];
    const hi = this.ctx.createGain(); hi.gain.value = 0.3; hi.connect(fl); oscs.push(this._osc('sawtooth', f * 2, t, dur + 0.12, hi, null, from && from * 2));
    const lfo = this.ctx.createOscillator(), d = this.ctx.createGain(); lfo.frequency.value = 6.2; d.gain.value = vol * 0.16; lfo.connect(d); d.connect(g.gain); lfo.start(t); lfo.stop(t + dur + 0.2);
    if (dur > 0.35) this._vibrato(oscs, f, t, dur, 0.005, 5.2, 0.2);
  }

  qanun(f, t, dur, vol) { // pulsado brillante; las notas largas se sostienen en trémolo
    const hit = (at, v) => {
      const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 3; fl.frequency.setValueAtTime(6500, at); fl.frequency.exponentialRampToValueAtTime(1300, at + 0.1);
      fl.connect(this._env(at, v, 0.002, 0.34, this.bus.pluck)); this._osc('sawtooth', f, at, 0.36, fl); const h = this.ctx.createGain(); h.gain.value = 0.35; h.connect(fl); this._osc('square', f * 2, at, 0.36, h);
    };
    hit(t, vol);
    for (let at = t + 0.09; at < t + dur - 0.05; at += 0.09) hit(at, vol * 0.55);
  }

  oud(f, t, dur, vol, bright = 3000) { // cuerda pulsada grave: dos sierras y un filtro que se cierra
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2.5;
    fl.frequency.setValueAtTime(bright, t); fl.frequency.exponentialRampToValueAtTime(Math.max(260, f * 1.4), t + 0.14);
    fl.connect(this._env(t, vol, 0.004, Math.max(0.3, dur * 1.1), this.bus.pluck));
    this._osc('sawtooth', f, t, dur + 0.3, fl); this._osc('sawtooth', f * 1.005, t, dur + 0.3, fl); this._osc('triangle', f * 2, t, dur + 0.3, fl);
  }

  ney(f, t, dur, vol, { from = null } = {}) { // flauta de caña: seno con vibrato tardío y soplido
    const g = this._hold(t, vol, 0.07, dur, 0.1, this.bus.lead);
    const o = this._osc('sine', f, t, dur + 0.15, g, null, from), tri = this.ctx.createGain(); tri.gain.value = 0.16; tri.connect(g);
    this._vibrato([o, this._osc('triangle', f * 2, t, dur + 0.15, tri, null, from && from * 2)], f, t, dur, 0.012, 5.3, 0.12);
    const b = this.ctx.createGain(); b.gain.value = 0.2; b.connect(g); this._noise(t, dur + 0.1, b, 'bandpass', f * 2, 3);
  }

  bell(f, t, dur, vol) { // cajita de música
    const g = this._env(t, vol, 0.003, Math.max(0.9, dur * 1.6), this.bus.lead, 0.2);
    this._osc('sine', f, t, dur * 1.6 + 0.9, g); const h = this.ctx.createGain(); h.gain.value = 0.22; h.connect(g); this._osc('sine', f * 3.01, t, 0.5, h);
  }

  bass(f, t, dur, vol) {
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(320, t + 0.12);
    fl.connect(this._env(t, vol, 0.006, Math.max(0.18, dur), this.bus.bass)); this._osc('sawtooth', f, t, dur + 0.1, fl, null, f * 0.94); this._osc('sine', f, t, dur + 0.1, fl);
  }

  drum(kind, t, vol) {
    const P = this.bus.perc;
    if (kind === 'D') { this._osc('sine', 165, t, 0.22, this._env(t, vol * 1.6, 0.002, 0.26, P), 50); this._noise(t, 0.03, this._env(t, vol * 0.6, 0.001, 0.035, P), 'lowpass', 1100); }
    else if (kind === 'T') { this._noise(t, 0.08, this._env(t, vol, 0.001, 0.08, P), 'bandpass', 2500, 3.5); this._osc('triangle', 1150, t, 0.05, this._env(t, vol * 0.35, 0.001, 0.06, P), 900); }
    else if (kind === 'k') this._noise(t, 0.04, this._env(t, vol * 0.55, 0.001, 0.045, P), 'bandpass', 3700, 4);
    else if (kind === 'B') { this._osc('sine', 125, t, 0.24, this._env(t, vol * 1.5, 0.003, 0.28, P), 70); this._noise(t, 0.16, this._env(t, vol * 0.5, 0.004, 0.17, P), 'bandpass', 380, 2); } // bendir
  }

  riq(t, vol) { // sonajas del pandero
    const g = this._env(t, vol, 0.001, 0.06, this.bus.riq); this._noise(t, 0.06, g, 'highpass', 6500);
    const m = this._env(t, vol * 0.18, 0.001, 0.035, this.bus.riq); this._osc('square', 5400, t, 0.03, m); this._osc('square', 7300, t, 0.03, m);
  }

  clap(t, vol) { for (const d of [0, 0.011, 0.023]) this._noise(t + d, 0.09, this._env(t + d, vol, 0.001, d ? 0.11 : 0.05, this.bus.perc), 'bandpass', 1250, 1.3); }

  qraqeb(t, vol) { // crótalos de hierro gnawa
    this._noise(t, 0.045, this._env(t, vol, 0.001, 0.05, this.bus.riq), 'bandpass', 3300, 7); this._osc('square', 2650, t, 0.02, this._env(t, vol * 0.2, 0.001, 0.025, this.bus.riq));
  }

  // ---------- secuenciador ----------
  // theme: 'title' | 'dawn' | 'cocina' | 'salon' | 'patio' | 'hanout'; intensity: 0 sigilo, 1 orquesta, 2 persecución
  music(theme, intensity) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (theme !== this.theme) { this.theme = theme; this.step = 0; this.next = now + 0.3; this.prev = {}; }
    if (intensity === 2 && this.inten !== 2) this.cstep = 0; // la persecución siempre arranca en el primer tiempo
    this.inten = intensity;
    if (this.next < now - 0.3) this.next = now + 0.05;
    this._fill(theme, intensity, now + 0.2);
  }

  _fill(theme, intensity, until) { // programa los pasos que caen antes de `until`
    const th = THEMES[theme], len = intensity === 2 ? Math.max(0.095, Math.min(0.11, th.step * 0.66)) : th.step;
    while (this.next < until) { this._step(th, this.step++, this.next, intensity, len); this.next += len; }
  }

  // toca una nota de una voz recordando la anterior, para que arcos y fuelle lleguen deslizando
  _voice(key, inst, f, t, dur, vol) {
    const last = this.prev[key], near = last && t - last.t < 0.5 && Math.abs(Math.log2(f / last.f)) < 0.28;
    this.prev[key] = { f, t: t + dur };
    if (inst === 'strings' || inst === 'accordion' || inst === 'ney') this[inst](f, t, dur, vol, { from: near ? last.f : null }); else this[inst](f, t, dur, vol);
  }

  _step(th, step, t, inten, len) {
    const scale = MAQAM[th.maqam], hz = (deg, oct = 1) => {
      const n = scale.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
      return th.root * oct * 2 ** ((scale[i] + 12 * o) / 12);
    };
    if (inten === 2) return this._chase(hz, this.cstep++, t, len);
    const [name, local] = th.map[step % th.map.length], S = SEC[name], M = S.meter, s = local % M, bar = Math.floor(local / M), half = M >> 1;
    const full = inten === 1, ch = S.ch[bar], root = s < half ? ch[0] : ch[1], last = bar === S.bars - 1;
    let ev;
    if ((ev = S.riff?.at[local])) { // el estribillo: cuerdas (o pizzicato a escondidas) con el qanun doblando a la octava
      this._voice('riff', th.riff[inten], hz(ev[0]), t, ev[1] * len * 0.93, full ? 0.075 : 0.07);
      if (full && th.double) this.qanun(hz(ev[0], 2), t, ev[1] * len * 0.9, 0.03);
    }
    if ((ev = S.lead?.at[local])) this._voice('lead', th.lead[inten], hz(ev[0], th.leadOct[inten]), t, ev[1] * len * 0.94, { accordion: 0.085, ney: 0.11, bell: 0.13, oud: 0.11 }[th.lead[inten]]);
    if ((ev = S.answer?.at[local])) { if (full) this._voice('ans', 'strings', hz(ev[0], 2), t, ev[1] * len * 0.9, 0.05); else this.pizz(hz(ev[0], 2), t, len, 0.035); }
    if ((full || th.pad) && (s === 0 || s === half) && S.lead) { // colchón de cuerdas bajo la estrofa
      const v = full ? 0.022 : 0.014; this.strings(hz(root + 2, 0.5), t, half * len * 0.98, v); this.strings(hz(root + 4, 0.5), t, half * len * 0.98, v);
    }
    // bajo: a escondidas solo marca el compás; con la orquesta camina con el dum
    if (!full) { if (s === 0) this.bass(hz(ch[0], 0.25), t, len * half * 1.6, 0.16); }
    else if (M === 16) {
      const b = { 0: [ch[0], 3, 0.24], 3: [ch[0], 2, 0.13], 6: [ch[0] + 4, 2, 0.17], 8: [ch[1], 3, 0.22], 11: [ch[1], 2, 0.13], 14: [ch[1] - 1, 2, 0.16] }[s];
      if (b) this.bass(hz(b[0], 0.25), t, b[1] * len, b[2]);
    } else { const b = { 0: [ch[0], 3, 0.24], 3: [ch[0] + 4, 2, 0.15], 6: [ch[1], 3, 0.22], 9: [ch[1] + 4, 2, 0.15], 11: [ch[1] - 1, 1, 0.14] }[s]; if (b) this.bass(hz(b[0], 0.25), t, b[1] * len, b[2]); }
    // el motivo de quien vigila, grave, bajo cada estribillo cuando hay guardia
    if (full && th.threat && name === 'R' && (ev = JADDA_T.at[local])) this.strings(hz(ev[0], 0.5), t, ev[1] * len * 0.8, 0.045, { marc: true });
    // percusión
    const hit = PERC[th.perc][inten][s], chaabi = th.perc === 'chaabi';
    if (full && last && s >= M - 4 && th.perc !== 'none') this.drum('TkTT'[s - (M - 4)], t, 0.1 + (s - (M - 4)) * 0.025); // redoble de cierre
    else if (hit !== '.') this.drum(chaabi && hit === 'D' ? 'B' : hit, t, full ? 0.15 : 0.07);
    if (th.perc !== 'none') {
      if (chaabi) { if (full || s % 3 === 2) this.qraqeb(t, s % 3 === 2 ? (full ? 0.075 : 0.03) : 0.03); }
      else if (full ? s % 2 === 0 : s % 4 === 2) this.riq(t, full ? (s % 8 === 4 ? 0.06 : 0.032) : 0.02);
      if (full && S.riff && (chaabi ? s === 6 : s % 8 === 4)) this.clap(t, 0.07);
    }
  }

  // persecución: el motivo de quien vigila manda en los graves, el estribillo va en trémolo y el solista llama
  _chase(hz, c, t, len) {
    const s = c % 16, r = c % 32; let ev;
    if ((ev = RIFF.at[r])) this.strings(hz(ev[0]), t, ev[1] * len * 0.9, 0.06, { marc: true });
    if (RIFF.hold[r] !== undefined) this.qanun(hz(RIFF.hold[r], 2), t, len, 0.032);
    if ((ev = JADDA_T.at[r])) { this.strings(hz(ev[0], 0.5), t, ev[1] * len * 0.85, 0.085, { marc: true }); this.bass(hz(ev[0], 0.25), t, ev[1] * len, 0.26); }
    else if (s % 2 === 0 && JADDA_T.hold[r] === undefined) this.bass(hz(0, 0.25), t, len * 1.6, 0.18);
    if ((ev = CALL_T.at[c % 64])) this._voice('lead', 'accordion', hz(ev[0]), t, ev[1] * len * 0.92, 0.08);
    const hit = PERC.ayyub[s]; if (hit !== '.') this.drum(hit, t, 0.2);
    this.qraqeb(t, [0, 3, 6, 8, 11, 14].includes(s) ? 0.085 : 0.035);
    if (s === 4 || s === 12) this.clap(t, 0.08);
  }

  // ---------- efectos ----------
  sip() { this.tone(520, 0.09, { type: 'triangle', vol: 0.16, to: 880 }); }
  pickup() { this.tone(660, 0.07, { vol: 0.1 }); this.tone(990, 0.1, { vol: 0.1, at: 0.07 }); }
  deliver() { [0, 4, 7, 12].forEach((s, i) => this.tone(440 * 2 ** (s / 12), 0.14, { vol: 0.11, at: i * 0.08 })); }
  step_() { this.noise(0.12, { vol: 0.2, freq: 180 }); this.tone(70, 0.12, { type: 'sine', vol: 0.2, to: 45 }); }
  click() { this.noise(0.03, { vol: 0.2, freq: 3000, type: 'highpass' }); }
  alarm() { this.tone(880, 0.12, { vol: 0.14, to: 1320 }); this.tone(1320, 0.25, { vol: 0.14, to: 660, at: 0.12 }); this.noise(0.5, { vol: 0.12, freq: 5000, type: 'highpass' }); }
  whoosh() { this.noise(0.3, { vol: 0.12, freq: 900, type: 'bandpass' }); }
  slap() { this.noise(0.18, { vol: 0.4, freq: 700 }); this.tone(140, 0.2, { type: 'sine', vol: 0.3, to: 50 }); }
  squash() { this.noise(0.25, { vol: 0.3, freq: 400 }); this.tone(300, 0.4, { type: 'sawtooth', vol: 0.12, to: 60 }); }
  spray() { this.noise(0.6, { vol: 0.14, freq: 4500, type: 'highpass' }); }
  glue() { this.tone(180, 0.15, { type: 'sawtooth', vol: 0.08, to: 110 }); }
  win() { [0, 4, 5, 7, 12, 16].forEach((s, i) => this.tone(293.66 * 2 ** (s / 12), 0.22, { type: 'triangle', vol: 0.14, at: i * 0.11, send: 0.4 })); }
  lose() { [7, 5, 4, 1, 0].forEach((s, i) => this.tone(220 * 2 ** (s / 12), 0.3, { type: 'triangle', vol: 0.14, at: i * 0.2, send: 0.4 })); }
  dash() { this.tone(170, 0.22, { type: 'sawtooth', vol: 0.09, to: 320 }); this.noise(0.2, { vol: 0.08, freq: 2200, type: 'bandpass' }); }
  hop() { this.tone(260, 0.1, { type: 'triangle', vol: 0.12, to: 420 }); }
  flap() { this.noise(0.07, { vol: 0.07, freq: 1500, type: 'bandpass' }); this.tone(190, 0.06, { type: 'sawtooth', vol: 0.03, to: 150, send: 0 }); }
  drip() { this.tone(900, 0.07, { type: 'sine', vol: 0.12, to: 400 }); }
  meow() { this.tone(620, 0.16, { type: 'triangle', vol: 0.13, to: 880 }); this.tone(880, 0.28, { type: 'triangle', vol: 0.13, to: 520, at: 0.16 }); }
  hiss() { this.noise(0.4, { vol: 0.16, freq: 5000, type: 'highpass' }); }
  slip() { this.tone(1100, 0.45, { type: 'sine', vol: 0.14, to: 180 }); this.noise(0.3, { vol: 0.4, freq: 500, at: 0.45 }); this.tone(90, 0.3, { type: 'sine', vol: 0.3, to: 40, at: 0.45 }); }
  tick() { this.tone(1200, 0.04, { vol: 0.07 }); }
  blip() { this.tone(520 + Math.random() * 80, 0.03, { vol: 0.035, send: 0 }); }
  bonus() { [7, 12, 16].forEach((s, i) => this.tone(587.33 * 2 ** (s / 12), 0.1, { vol: 0.09, at: i * 0.06 })); }
  coin(i) { this.tone(523.25 * 2 ** (MAQAM.hijaz[i % 7] / 12), 0.14, { type: 'triangle', vol: 0.16, send: 0.3 }); }
  cluck() { [0, 0.09, 0.2].forEach((at, i) => this.tone(520 + i * 90, 0.07, { type: 'square', vol: 0.08, to: 380, at })); }
  peck() { this.noise(0.05, { vol: 0.25, freq: 1800 }); this.tone(240, 0.06, { type: 'square', vol: 0.1, to: 120 }); }
  gulp() { this.tone(300, 0.1, { type: 'sine', vol: 0.15, to: 140 }); }
}
