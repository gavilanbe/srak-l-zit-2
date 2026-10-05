// Sonido generado con WebAudio. La música es un secuenciador con instrumentos sintetizados
// (laúd, ney, campanas, bajo y darbuka) y un tema por escenario, en maqamat con cuartos de tono;
// cambia de capa según el peligro: sigilo, vigilancia o persecución.

const MAQAM = {
  hijaz: [0, 1, 4, 5, 7, 8, 10], nahawand: [0, 2, 3, 5, 7, 8, 11], bayati: [0, 1.5, 3, 5, 7, 8, 10],
  rast: [0, 2, 3.5, 5, 7, 9, 10.5], ajam: [0, 2, 4, 5, 7, 9, 11],
};
// ritmos de darbuka en semicorcheas: D = dum, T = tek, k = ka
const RHYTHM = {
  maqsum: 'D.T.k.T.D.k.T.k.', malfuf: 'D..T..T.D..T..T.', saidi: 'D.T...D.D...T.k.', ayyub: 'D..kD.T.D..kD.T.', nana: 'D.......k.......',
};
const N = null;
// melodías: [grado de la escala, duración en semicorcheas]; 7 = una octava arriba
const TUNES = {
  title: [[4, 8], [5, 4], [4, 4], [3, 6], [2, 2], [1, 4], [2, 4], [0, 12], [N, 4], [2, 4], [1, 4], [0, 8],
    [7, 8], [6, 4], [5, 4], [4, 6], [5, 2], [6, 4], [4, 4], [3, 4], [2, 4], [1, 4], [2, 4], [0, 14], [N, 2]],
  cocina: [[0, 2], [N, 2], [1, 1], [2, 1], [1, 2], [0, 2], [N, 2], [2, 2], [3, 2], [4, 3], [3, 1], [2, 2], [1, 2], [0, 4], [N, 4],
    [4, 2], [N, 2], [5, 1], [4, 1], [3, 2], [4, 2], [N, 2], [6, 2], [5, 2], [4, 2], [3, 2], [2, 2], [1, 2], [2, 1], [1, 1], [0, 6],
    [0, 2], [N, 2], [1, 1], [2, 1], [1, 2], [0, 2], [N, 2], [2, 2], [4, 2], [7, 3], [6, 1], [5, 2], [4, 2], [5, 4], [N, 4],
    [4, 1], [5, 1], [4, 1], [3, 1], [2, 2], [3, 2], [2, 1], [3, 1], [2, 1], [1, 1], [0, 2], [1, 2], [2, 2], [1, 2], [0, 2], [-1, 2], [0, 6], [N, 2]],
  salon: [[0, 4], [2, 4], [4, 4], [2, 4], [5, 4], [4, 4], [2, 4], [N, 4], [4, 4], [2, 4], [1, 4], [0, 4], [1, 4], [2, 4], [0, 8],
    [4, 4], [5, 4], [7, 4], [5, 4], [6, 4], [5, 4], [4, 4], [N, 4], [5, 4], [4, 4], [2, 4], [1, 4], [2, 4], [1, 4], [0, 8]],
  patio: [[0, 6], [1, 2], [2, 4], [1, 4], [3, 6], [2, 2], [1, 4], [0, 4], [4, 4], [3, 2], [2, 2], [3, 4], [1, 4], [2, 3], [1, 1], [0, 12],
    [4, 6], [5, 2], [4, 4], [3, 4], [5, 3], [4, 1], [3, 2], [2, 2], [3, 4], [1, 4], [2, 2], [3, 2], [2, 2], [1, 2], [0, 8], [1, 3], [0, 1], [-1, 4], [0, 8]],
  hanout: [[0, 1], [0, 1], [2, 2], [4, 2], [2, 2], [4, 1], [5, 1], [4, 2], [2, 2], [0, 2], [1, 2], [2, 2], [3, 2], [2, 2], [1, 2], [0, 2], [-1, 2], [0, 2],
    [4, 1], [4, 1], [5, 2], [7, 2], [5, 2], [4, 1], [5, 1], [4, 2], [3, 2], [2, 2], [3, 1], [4, 1], [3, 2], [2, 2], [1, 2], [2, 1], [1, 1], [0, 4], [N, 2]],
};
const THEMES = {
  title: { tune: 'title', maqam: 'hijaz', root: 293.66, step: 0.21, lead: 'ney', oct: 2, bass: [0, 0, 3, 0, 0, 4, 3, 0], rhythm: 'nana', arp: true },
  dawn: { tune: 'title', maqam: 'ajam', root: 293.66, step: 0.2, lead: 'ney', oct: 2, bass: [0, 0, 3, 0, 0, 4, 3, 0], rhythm: 'malfuf', arp: true },
  cocina: { tune: 'cocina', maqam: 'hijaz', root: 293.66, step: 0.148, lead: 'oud', oct: 1, bass: [0, 0, 3, 0, 0, 4, 3, 0], rhythm: 'maqsum' },
  salon: { tune: 'salon', maqam: 'nahawand', root: 261.63, step: 0.2, lead: 'bell', oct: 2, bass: [0, 3, 4, 0], rhythm: 'nana' },
  patio: { tune: 'patio', maqam: 'bayati', root: 293.66, step: 0.165, lead: 'ney', oct: 2, bass: [0, 0, 3, 0, 4, 3, 0, 0], rhythm: 'malfuf', arp: true },
  hanout: { tune: 'hanout', maqam: 'rast', root: 261.63, step: 0.132, lead: 'oud', oct: 1, bass: [0, 3, 4, 0], rhythm: 'saidi' },
};
const CHASE = [0, 7, 4, 7, 1, 7, 4, 7, 2, 7, 4, 7, 1, 7, 5, 7];

export class Sfx {
  constructor() {
    this.ctx = null; this.muted = false; this.theme = null; this.step = 0; this.next = 0;
    this.tunes = {};
    for (const [k, notes] of Object.entries(TUNES)) { // de lista de notas a mapa paso → nota
      const at = []; let s = 0;
      for (const [deg, len] of notes) { if (deg !== N) at[s] = [deg, len]; s += len; }
      this.tunes[k] = { at, len: s };
    }
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.out = ctx.createGain(); this.out.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.out.connect(comp); comp.connect(ctx.destination);
    this.fx = ctx.createGain(); this.fx.gain.value = 0.6; this.fx.connect(this.out);     // efectos
    this.mus = ctx.createGain(); this.mus.gain.value = 0.8; this.mus.connect(this.out);   // música
    // reverberación: una respuesta de ruido que se apaga, como un patio de azulejo
    const len = ctx.sampleRate * 1.9 | 0, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5; this.rev.connect(wet); wet.connect(this.out);
    const nb = this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  toggleMute() { this.muted = !this.muted; if (this.out) this.out.gain.value = this.muted ? 0 : 0.85; }

  // ---------- piezas básicas ----------
  _env(t, vol, attack, dur, bus, send) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(bus);
    if (send) { const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.rev); }
    return g;
  }

  _osc(type, f, t, dur, dest, to) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  _noise(t, dur, dest, type, freq, q = 1) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); f.connect(dest); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
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

  // ---------- instrumentos ----------
  oud(f, t, dur, vol, bright = 3000) { // cuerda pulsada: dos sierras algo desafinadas y un filtro que se cierra
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2.5;
    fl.frequency.setValueAtTime(bright, t); fl.frequency.exponentialRampToValueAtTime(Math.max(260, f * 1.4), t + 0.14);
    fl.connect(this._env(t, vol, 0.004, Math.max(0.25, dur), this.mus, 0.22));
    this._osc('sawtooth', f, t, dur + 0.2, fl); this._osc('sawtooth', f * 1.005, t, dur + 0.2, fl); this._osc('triangle', f * 2, t, dur + 0.2, fl);
  }

  ney(f, t, dur, vol) { // flauta de caña: seno con vibrato que entra tarde y algo de soplido
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.07); g.gain.setValueAtTime(vol, t + Math.max(0.08, dur - 0.1)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.08);
    g.connect(this.mus); const s = this.ctx.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(this.rev);
    const o = this._osc('sine', f, t, dur + 0.1, g), tri = this.ctx.createGain(); tri.gain.value = 0.16; tri.connect(g);
    const o2 = this._osc('triangle', f * 2, t, dur + 0.1, tri);
    const lfo = this.ctx.createOscillator(), depth = this.ctx.createGain(); lfo.frequency.value = 5.3;
    depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.35, dur));
    lfo.connect(depth); depth.connect(o.frequency); depth.connect(o2.frequency); lfo.start(t); lfo.stop(t + dur + 0.15);
    const b = this.ctx.createGain(); b.gain.value = 0.22; b.connect(g); this._noise(t, dur + 0.1, b, 'bandpass', f * 2, 3);
  }

  bell(f, t, dur, vol) { // cajita de música
    const g = this._env(t, vol, 0.003, Math.max(0.9, dur * 1.6), this.mus, 0.4);
    this._osc('sine', f, t, dur * 1.6 + 0.9, g); const h = this.ctx.createGain(); h.gain.value = 0.22; h.connect(g); this._osc('sine', f * 3.01, t, 0.5, h);
  }

  bass(f, t, dur, vol) {
    const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420;
    fl.connect(this._env(t, vol, 0.006, dur, this.mus, 0.05)); this._osc('triangle', f, t, dur, fl); this._osc('sine', f / 2, t, dur, fl);
  }

  drum(kind, t, vol) {
    if (kind === 'D') { this._osc('sine', 150, t, 0.2, this._env(t, vol * 1.5, 0.002, 0.24, this.mus, 0.12), 52); this._noise(t, 0.03, this._env(t, vol * 0.5, 0.001, 0.03, this.mus, 0), 'lowpass', 900); }
    else if (kind === 'T') { this._noise(t, 0.07, this._env(t, vol, 0.001, 0.07, this.mus, 0.15), 'bandpass', 2400, 3); this._osc('triangle', 540, t, 0.04, this._env(t, vol * 0.5, 0.001, 0.05, this.mus, 0)); }
    else if (kind === 'k') this._noise(t, 0.04, this._env(t, vol * 0.55, 0.001, 0.045, this.mus, 0.1), 'bandpass', 3600, 4);
    else this._noise(t, 0.03, this._env(t, vol, 0.001, 0.03, this.mus, 0), 'highpass', 7000); // sonajas
  }

  // ---------- secuenciador ----------
  // theme: 'title' | 'dawn' | 'cocina' | 'salon' | 'patio' | 'hanout'; intensity: 0 sigilo, 1 vigilancia, 2 persecución
  music(theme, intensity) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (theme !== this.theme) { this.theme = theme; this.step = 0; this.next = now + 0.25; }
    if (this.next < now - 0.3) this.next = now + 0.05;
    this._fill(theme, intensity, now + 0.2);
  }

  _fill(theme, intensity, until) { // programa los pasos que caen antes de `until`
    const th = THEMES[theme], len = th.step * (intensity === 2 ? 0.62 : 1);
    while (this.next < until) { this._step(th, this.step++, this.next, intensity, len); this.next += len; }
  }

  _step(th, step, t, inten, len) {
    const scale = MAQAM[th.maqam], hz = (deg, oct = 1) => {
      const n = scale.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
      return th.root * oct * 2 ** ((scale[i] + 12 * o) / 12);
    };
    const s = step % 16, bar = Math.floor(step / 16), root = th.bass[bar % th.bass.length];
    if (inten < 2) {
      const tune = this.tunes[th.tune], ev = tune.at[step % tune.len];
      if (ev) this[th.lead](hz(ev[0], th.oct), t, ev[1] * len * 0.92, th.lead === 'ney' ? 0.11 : th.lead === 'bell' ? 0.13 : 0.1);
      if (th.arp && s % 4 === 2) this.oud(hz(root + [0, 4, 2, 4][(s >> 2) % 4], 0.5), t, len * 3, 0.035, 1500);
      if (s === 0) this.bass(hz(root, 0.25), t, len * (inten ? 6 : 14), inten ? 0.2 : 0.14);
      if (inten === 1 && (s === 8 || s === 14)) this.bass(hz(root + (s === 14 ? 4 : 0), 0.25), t, len * 4, 0.16);
    } else { // persecución: ostinato de laúd agudo, bajo a corcheas y golpes al principio de cada compás
      this.oud(hz(root + CHASE[s], 2), t, len * 1.2, 0.05, 4200);
      if (s % 2 === 0) this.bass(hz(root + (s % 8 === 6 ? 4 : 0), 0.25), t, len * 1.8, 0.22);
      if (s === 0 || s === 10) this.oud(hz(root, 0.5), t, len * 5, 0.11, 2200);
      if (s === 0 && bar % 2 === 0) this.ney(hz(root + 7, 2), t, len * 12, 0.05);
    }
    const hit = RHYTHM[inten === 2 ? 'ayyub' : th.rhythm][s];
    if (inten === 0) { if (hit === 'D' && s === 0) this.drum('D', t, 0.07); if (s % 4 === 2) this.drum('s', t, 0.02); }
    else { if (hit !== '.') this.drum(hit, t, inten === 2 ? 0.2 : 0.13); if (s % 2 === 0) this.drum('s', t, inten === 2 ? 0.05 : 0.03); }
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
  flap() { this.noise(0.07, { vol: 0.07, freq: 1500, type: 'bandpass' }); this.tone(190, 0.06, { type: 'sawtooth', vol: 0.03, to: 150, send: 0 }); }
  hop() { this.tone(260, 0.1, { type: 'triangle', vol: 0.12, to: 420 }); }
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
