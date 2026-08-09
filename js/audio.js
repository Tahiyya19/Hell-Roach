/* Hellroach — audio. Everything is synthesized with Web Audio (no asset files),
   except background music, which can optionally be a royalty-free .mp3/.ogg you
   drop into CONFIG.musicUrl — no game code changes needed. */
'use strict';

const AudioSys = {
  ctx: null,
  master: null,        // everything (mute lives here)
  sfxBus: null,        // sound effects
  musicBus: null,      // music (has its own lowpass for the disco "chill" filter)
  musicFilter: null,
  noiseBuf: null,
  muted: false,
  musicStarted: false,
  htmlAudio: null,
  synth: null,

  /* Must be called from a user gesture (browser autoplay policy). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = CONFIG.sfxVolume;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = CONFIG.musicVolume;
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 12000;
    this.musicBus.connect(this.musicFilter);
    this.musicFilter.connect(this.master);

    // shared white-noise buffer for hats & crashes
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.startMusic();
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) { /* private mode */ }
    if (this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  },

  /* Disco mode: duck the main music and switch to the disco track for the
     5-second window; the lowpass "chill" filter stays as a fallback texture
     if the disco file is missing. */
  setDisco(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? 0.15 : CONFIG.musicVolume, t, 0.2);
    this.musicFilter.frequency.setTargetAtTime(on ? 1500 : 12000, t, 0.25);
    if (on) this._playDiscoTrack();
    else this._stopDiscoTrack();
  },

  /* Route an <audio> element through the WebAudio graph so the master
     gain (mute button) and music bus ducking apply to it too. */
  _attachMedia(el, dest) {
    const ctx = this.ctx;
    if (ctx && ctx.createMediaElementSource) {
      try {
        const src = ctx.createMediaElementSource(el);
        const g = ctx.createGain();
        g.gain.value = CONFIG.musicVolume;
        src.connect(g);
        g.connect(dest);
        return;
      } catch (e) { /* fall through to el.volume */ }
    }
    el.volume = CONFIG.musicVolume;
  },

  _playDiscoTrack() {
    if (!CONFIG.discoMusicUrl) return;
    if (!this.discoAudio) {
      const a = new Audio(CONFIG.discoMusicUrl);
      a.loop = true;
      this.discoAudio = a;
      this._attachMedia(a, this.master);
    }
    this.discoAudio.currentTime = 0;
    this.discoAudio.play().catch(() => { /* gesture race; next activation retries */ });
  },

  _stopDiscoTrack() {
    if (!this.discoAudio) return;
    try { this.discoAudio.pause(); this.discoAudio.currentTime = 0; } catch (e) { /* ignore */ }
  },

  /* ------------------------------------------------------------ music -- */

  startMusic() {
    if (this.musicStarted) return;
    this.musicStarted = true;
    if (CONFIG.musicUrl) {
      const a = new Audio(CONFIG.musicUrl);
      a.loop = true;
      this.htmlAudio = a;
      this._attachMedia(a, this.musicBus);
      a.play().catch(() => { /* user hasn't gestured yet; retried in ensure() */ });
    } else {
      this.synth = new MusicSynth(this.ctx, this.musicBus);
      this.synth.start();
    }
  },

  /* --------------------------------------------------------------- SFX -- */

  _blip(type, f0, f1, dur, gain, when, dest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = when === undefined ? ctx.currentTime : when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  _noise(dur, gain, filterType, freq, when) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = when === undefined ? ctx.currentTime : when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },

  flap() {
    // comedic roach buzz: two quick descending chirps
    this._blip('sawtooth', 340, 170, 0.09, 0.14);
    this._blip('square', 560, 300, 0.06, 0.05, this.ctx ? this.ctx.currentTime + 0.05 : 0);
    this._noise(0.06, 0.06, 'bandpass', 2400);
  },

  score() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this._blip('sine', 660, undefined, 0.08, 0.18, t);
    this._blip('sine', 990, undefined, 0.12, 0.16, t + 0.08);
  },

  death() {
    this._blip('sawtooth', 420, 55, 0.45, 0.3);
    this._blip('square', 220, 40, 0.5, 0.18, this.ctx ? this.ctx.currentTime + 0.06 : 0);
    this._noise(0.35, 0.22, 'lowpass', 900);
  },

  discoOn() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this._blip('triangle', f, undefined, 0.16, 0.2, t + i * 0.055));
    this._noise(0.3, 0.05, 'highpass', 5000, t);
  },

  discoOff() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    const notes = [1046.5, 783.99, 659.25];
    notes.forEach((f, i) => this._blip('triangle', f, undefined, 0.12, 0.14, t + i * 0.045));
  },

  deny() {
    // meter not full yet: a flat, dismissive buzz
    this._blip('square', 140, 90, 0.12, 0.1);
  },
};

/* --------------------------------------------------------- music synth -- */
/* A small funky synth-pop loop (A minor, ~112 BPM) so the game ships with
   music even before you drop in a licensed track. Replace with your own file
   via CONFIG.musicUrl and this never runs. */

const NOTE = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
};

class MusicSynth {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    this.bpm = 112;
    this.stepDur = 60 / this.bpm / 4; // 16th note
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;

    // 16-step bass lines per bar (Am / Am / G7 / Dm)
    this.bassBars = [
      [NOTE.A2, 0, NOTE.A2, 0, NOTE.C3, 0, NOTE.A2, NOTE.A2, 0, NOTE.G2, 0, NOTE.G2, NOTE.E3, 0, NOTE.A2, 0],
      [NOTE.A2, 0, NOTE.A2, 0, NOTE.C3, 0, NOTE.A2, NOTE.A2, 0, NOTE.G2, 0, NOTE.G2, NOTE.F3, 0, NOTE.E3, 0],
      [NOTE.G2, 0, NOTE.G2, 0, NOTE.B2, 0, NOTE.D3, NOTE.D3, 0, NOTE.F3, 0, NOTE.F3, NOTE.D3, 0, NOTE.B2, 0],
      [NOTE.D3, 0, NOTE.D3, 0, NOTE.F3, 0, NOTE.D3, NOTE.D3, 0, NOTE.C3, 0, NOTE.C3, NOTE.A2, 0, NOTE.D3, 0],
    ];
    this.chordBars = [
      [NOTE.A3, NOTE.C4, NOTE.E4],
      [NOTE.A3, NOTE.C4, NOTE.E4],
      [NOTE.G3, NOTE.B3, NOTE.D4],
      [NOTE.D3, NOTE.F3, NOTE.A3],
    ];
  }

  start() {
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._scheduler(), 25);
  }

  _scheduler() {
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this._scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  _scheduleStep(step, t) {
    const bar = Math.floor(step / 16);
    const s = step % 16;

    // kick: four-on-the-floor
    if (s % 4 === 0) this._kick(t);
    // hats: offbeat eighths + a splash on bar ends
    if (s % 2 === 1) this._hat(t, s === 15 ? 0.16 : 0.07);
    // bass
    const bn = this.bassBars[bar][s];
    if (bn) this._bass(bn, t);
    // chord stabs on offbeats
    if (s % 4 === 2) this._stab(this.chordBars[bar], t);
    // sparse lead motif
    if (s === 0 && bar % 2 === 0) this._lead(bar === 0 ? NOTE.E5 : NOTE.D5, t);
    if (s === 10 && bar === 0) this._lead(NOTE.C5, t + 0.134);
  }

  _voice(type, freq, t, dur, peak, filterFreq, q) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = filterFreq || 4000;
    f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f); f.connect(g); g.connect(this.out);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _kick(t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g); g.connect(this.out);
    osc.start(t); osc.stop(t + 0.25);
  }

  _hat(t, gain) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = AudioSys.noiseBuf;
    src.playbackRate.value = 1.6;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t); src.stop(t + 0.06);
  }

  _bass(freq, t) {
    this._voice('sawtooth', freq, t, 0.2, 0.24, 550, 2);
    this._voice('square', freq / 2, t, 0.2, 0.08, 300, 1);
  }

  _stab(chord, t) {
    for (const f of chord) this._voice('sawtooth', f, t, 0.16, 0.06, 2000, 0.8);
  }

  _lead(freq, t) {
    this._voice('triangle', freq, t, 0.22, 0.07, 4000, 0.5);
  }
}
