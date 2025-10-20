type SoundName = 'hit' | 'near-miss' | 'pickup' | 'bomb' | 'slow-on' | 'slow-off';

type Envelope = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

const DEFAULT_ENV: Envelope = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.5,
  release: 0.2,
};

export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private volume = 0.6;
  private unlocked = false;

  constructor() {
    window.addEventListener('user-start', () => this.unlock(), { once: true });
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    master.connect(ctx.destination);
    this.context = ctx;
    this.master = master;
    return ctx;
  }

  unlock(): void {
    if (this.unlocked) return;
    try {
      const ctx = this.ensureContext();
      ctx.resume();
      this.unlocked = true;
    } catch (err) {
      console.warn('Audio unlock failed', err);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : this.volume;
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master && !this.muted) {
      this.master.gain.value = volume;
    }
  }

  play(name: SoundName): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    switch (name) {
      case 'hit':
        this.noiseBurst(ctx, 0.18, 800, DEFAULT_ENV);
        break;
      case 'near-miss':
        this.tone(ctx, 880, 0.12, { attack: 0.005, decay: 0.08, sustain: 0.3, release: 0.12 });
        break;
      case 'pickup':
        this.arpeggio(ctx, [440, 660, 990], 0.15);
        break;
      case 'bomb':
        this.noiseSweep(ctx, 0.35);
        break;
      case 'slow-on':
        this.tone(ctx, 240, 0.4, { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.2 });
        break;
      case 'slow-off':
        this.tone(ctx, 520, 0.25, { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.15 });
        break;
    }
  }

  private tone(ctx: AudioContext, freq: number, duration: number, env: Envelope): void {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    this.applyEnvelope(ctx, gain.gain, env, duration);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration + env.release + env.decay);
  }

  private noiseBurst(ctx: AudioContext, duration: number, cutoff: number, env: Envelope): void {
    if (!this.master) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    this.applyEnvelope(ctx, gain.gain, env, duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    source.stop(ctx.currentTime + duration + env.release);
  }

  private noiseSweep(ctx: AudioContext, duration: number): void {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);
    this.applyEnvelope(ctx, gain.gain, { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.3 }, duration);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.3);
  }

  private arpeggio(ctx: AudioContext, freqs: number[], step: number): void {
    if (!this.master) return;
    freqs.forEach((freq, index) => {
      const when = ctx.currentTime + index * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, when);
      this.applyEnvelope(ctx, gain.gain, { attack: 0.005, decay: 0.05, sustain: 0.4, release: 0.2 }, step);
      osc.connect(gain).connect(this.master!);
      osc.start(when);
      osc.stop(when + step + 0.2);
    });
  }

  private applyEnvelope(ctx: AudioContext, param: AudioParam, env: Envelope, duration: number): void {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(0.0001, now);
    param.linearRampToValueAtTime(1, now + env.attack);
    param.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
    param.setValueAtTime(env.sustain, now + duration);
    param.linearRampToValueAtTime(0.0001, now + duration + env.release);
  }
}
