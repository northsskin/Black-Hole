/**
 * A synthesised ambient drone — no audio file to download, nothing to license.
 * Three detuned low oscillators through a slowly breathing low-pass filter, plus
 * a whisper of filtered noise for "solar wind". Everything fades in over a few
 * seconds so it arrives like something you notice rather than something that starts.
 */
class Drone {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.targetGain = 0.16;
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

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.Q.value = 0.8;
    filter.connect(master);

    // breathing filter
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const voices = [
      { type: 'sine', freq: 41.2, gain: 0.55 }, // E1
      { type: 'triangle', freq: 61.74, gain: 0.22, detune: -6 }, // B1
      { type: 'sine', freq: 82.41, gain: 0.18, detune: 5 }, // E2
      { type: 'sawtooth', freq: 123.47, gain: 0.05, detune: 3 }, // B2 (very quiet, adds grit)
    ];
    voices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      if (v.detune) osc.detune.value = v.detune;
      const g = ctx.createGain();
      g.gain.value = v.gain;
      // slow independent wobble on each voice
      const wob = ctx.createOscillator();
      wob.frequency.value = 0.08 + Math.random() * 0.1;
      const wobGain = ctx.createGain();
      wobGain.gain.value = 0.6 + Math.random();
      wob.connect(wobGain).connect(osc.detune);
      wob.start();
      osc.connect(g).connect(filter);
      osc.start();
    });

    // solar wind: band-passed noise
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brownish
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
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
    this.started = true;
    this.fadeTo(this.targetGain, 5);
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
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
}

export const drone = new Drone();
