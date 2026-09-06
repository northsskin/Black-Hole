/**
 * A synthesised ambient drone plus a handful of one-shot cues — no audio files.
 * Three detuned low oscillators through a slowly breathing low-pass filter, a
 * whisper of filtered noise for "solar wind", and short synthesised cues for the
 * warp arrival and the time-jumps (whine, crackle, boom, ping).
 */
class Drone {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.fxBus = null;
    this.started = false;
    this.targetGain = 0.16;
    this.filter = null;
  }

  start() {
    if (this.started) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.connect(ctx.destination);

    // one-shot cues bypass the drone fade but respect mute via fxBus
    const fxBus = ctx.createGain();
    fxBus.gain.value = 0.9;
    fxBus.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.Q.value = 0.8;
    filter.connect(master);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const voices = [
      { type: 'sine', freq: 41.2, gain: 0.55 },
      { type: 'triangle', freq: 61.74, gain: 0.22, detune: -6 },
      { type: 'sine', freq: 82.41, gain: 0.18, detune: 5 },
      { type: 'sawtooth', freq: 123.47, gain: 0.05, detune: 3 },
    ];
    voices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      if (v.detune) osc.detune.value = v.detune;
      const g = ctx.createGain();
      g.gain.value = v.gain;
      const wob = ctx.createOscillator();
      wob.frequency.value = 0.08 + Math.random() * 0.1;
      const wobGain = ctx.createGain();
      wobGain.gain.value = 0.6 + Math.random();
      wob.connect(wobGain).connect(osc.detune);
      wob.start();
      osc.connect(g).connect(filter);
      osc.start();
    });

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 4);
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 320;
    nf.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    noise.connect(nf).connect(ng).connect(filter);
    noise.start();

    this.ctx = ctx;
    this.master = master;
    this.fxBus = fxBus;
    this.filter = filter;
    this.started = true;
    this.fadeTo(this.targetGain, 5);
  }

  noiseBuffer(ctx, seconds, brown = true) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  fadeTo(value, seconds) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.exponentialRampToValueAtTime(Math.max(value, 0.0001), now + seconds);
  }

  setMuted(muted) {
    if (!this.started) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.fadeTo(muted ? 0.0001 : this.targetGain, muted ? 0.8 : 2.5);
    const now = this.ctx.currentTime;
    this.fxBus.gain.cancelScheduledValues(now);
    this.fxBus.gain.linearRampToValueAtTime(muted ? 0 : 0.9, now + 0.3);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /* ---------- one-shot cues ---------- */

  /** the drone opens up: filter sweeps wide and back over a few seconds */
  swell(duration = 4) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const f = this.filter.frequency;
    f.cancelScheduledValues(now);
    f.setValueAtTime(220, now);
    f.exponentialRampToValueAtTime(1400, now + duration * 0.35);
    f.exponentialRampToValueAtTime(240, now + duration);
  }

  /** rising whine for the charge-up, ends in a snap */
  whine(duration = 1.1) {
    if (!this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(1900, now + duration);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, now);
    lp.frequency.exponentialRampToValueAtTime(5000, now + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + duration * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.08);
    osc.connect(lp).connect(g).connect(this.fxBus);
    osc.start(now);
    osc.stop(now + duration + 0.1);
    this.crackle(duration);
  }

  /** electric crackle: bursts of high-passed white noise */
  crackle(duration = 1) {
    if (!this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 2, false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    // stutter envelope
    const steps = Math.floor(duration / 0.06);
    for (let i = 0; i < steps; i++) {
      const t = now + i * 0.06;
      const on = Math.random() < 0.55 + (i / steps) * 0.4;
      g.gain.setValueAtTime(on ? 0.03 + (i / steps) * 0.05 : 0.0001, t);
    }
    g.gain.setValueAtTime(0.0001, now + duration);
    src.connect(hp).connect(g).connect(this.fxBus);
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  /** the jump itself: a deep thump with a bright transient */
  boom() {
    if (!this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(g).connect(this.fxBus);
    osc.start(now);
    osc.stop(now + 1.3);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 1, false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    src.connect(bp).connect(ng).connect(this.fxBus);
    src.start(now);
    src.stop(now + 0.6);
  }

  /** soft high ping for hover / UI */
  ping(freq = 1320) {
    if (!this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(g).connect(this.fxBus);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const drone = new Drone();
