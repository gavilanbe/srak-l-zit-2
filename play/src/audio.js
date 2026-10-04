// Sonido generado con WebAudio: efectos y una melodía en escala hijaz con ritmo de darbuka.
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
const LEAD = [0, null, 2, 3, 4, null, 3, 2, 1, null, 0, null, 2, 1, 0, null, 4, null, 5, 4, 3, null, 2, null, 3, 2, 1, null, 0, null, null, null];
const BASS = [0, 0, 3, 0, 4, 4, 3, 0];
const DRUM = ['d', null, 't', null, null, 't', 'd', null, 'd', null, 't', null, null, null, 't', 't'];

export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.step = 0; this.acc = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    this.ctx = new C();
    this.out = this.ctx.createGain(); this.out.gain.value = 0.5; this.out.connect(this.ctx.destination);
  }

  toggleMute() { this.muted = !this.muted; if (this.out) this.out.gain.value = this.muted ? 0 : 0.5; }

  tone(f, dur, { type = 'square', vol = 0.12, to = null, at = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.15, freq = 1200, type = 'lowpass', at = 0 } = {}) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const t = this.ctx.currentTime + at, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t);
  }

  sip() { this.tone(520, 0.09, { type: 'triangle', vol: 0.16, to: 880 }); }
  pickup() { this.tone(660, 0.07, { vol: 0.1 }); this.tone(990, 0.1, { vol: 0.1, at: 0.07 }); }
  deliver() { [0, 4, 7, 12].forEach((s, i) => this.tone(440 * 2 ** (s / 12), 0.14, { vol: 0.11, at: i * 0.08 })); }
  step_() { this.noise(0.12, { vol: 0.2, freq: 180 }); this.tone(70, 0.12, { type: 'sine', vol: 0.2, to: 45 }); }
  click() { this.noise(0.03, { vol: 0.2, freq: 3000, type: 'highpass' }); }
  alarm() { this.tone(880, 0.12, { vol: 0.14, to: 1320 }); this.tone(1320, 0.25, { vol: 0.14, to: 660, at: 0.12 }); }
  whoosh() { this.noise(0.3, { vol: 0.12, freq: 900, type: 'bandpass' }); }
  slap() { this.noise(0.18, { vol: 0.4, freq: 700 }); this.tone(140, 0.2, { type: 'sine', vol: 0.3, to: 50 }); }
  squash() { this.noise(0.25, { vol: 0.3, freq: 400 }); this.tone(300, 0.4, { type: 'sawtooth', vol: 0.12, to: 60 }); }
  spray() { this.noise(0.6, { vol: 0.14, freq: 4500, type: 'highpass' }); }
  glue() { this.tone(180, 0.15, { type: 'sawtooth', vol: 0.08, to: 110 }); }
  win() { [0, 4, 5, 7, 12, 16].forEach((s, i) => this.tone(293.66 * 2 ** (s / 12), 0.2, { vol: 0.11, at: i * 0.11 })); }
  lose() { [7, 5, 4, 1, 0].forEach((s, i) => this.tone(220 * 2 ** (s / 12), 0.28, { type: 'triangle', vol: 0.14, at: i * 0.2 })); }

  // intensity: 0 = a oscuras, 1 = la jadda en la cocina, 2 = persecución
  music(dt, intensity) {
    if (!this.ctx) return;
    this.acc += dt;
    const len = intensity === 2 ? 0.115 : 0.19;
    while (this.acc >= len) {
      this.acc -= len;
      const i = this.step++, n = LEAD[i % LEAD.length];
      const hz = (s, base) => base * 2 ** (HIJAZ[s] / 12);
      if (n !== null) this.tone(hz(n, 293.66), len * 1.6, { type: intensity ? 'square' : 'triangle', vol: intensity ? 0.05 : 0.06 });
      if (i % 4 === 0) this.tone(hz(BASS[(i / 4) % BASS.length | 0], 73.42), len * 3, { type: 'triangle', vol: 0.11 });
      const d = DRUM[i % DRUM.length];
      if (intensity > 0 && d === 'd') this.tone(110, 0.12, { type: 'sine', vol: 0.16 * intensity, to: 55 });
      if (intensity > 0 && d === 't') this.noise(0.04, { vol: 0.05 * intensity, freq: 2500, type: 'highpass' });
    }
  }
}
