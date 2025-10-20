export type SoundName = 'hit' | 'near-miss' | 'pickup' | 'bomb' | 'slow-on' | 'slow-off';

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

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
let muted = false;
let volume = 0.6;

const ensureMaster = (ctx: AudioContext): GainNode => {
  if (!master) {
    const gain = ctx.createGain();
    gain.gain.value = muted ? 0 : volume;
    gain.connect(ctx.destination);
    master = gain;
  }
  return master;
};

export const getAudio = (): AudioContext => {
  if (ac) {
    return ac;
  }
  const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) {
    throw new Error('Web Audio API unavailable');
  }
  const context = new Ctor();
  ac = context;
  ensureMaster(context);
  return context;
};

export const unlockAudio = (): void => {
  try {
    const ctx = getAudio();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    unlocked = true;
  } catch {
    // Ignore unlock errors; some platforms block audio entirely.
  }
};

export const setMuted = (value: boolean): void => {
  muted = value;
  if (master) {
    master.gain.value = muted ? 0 : volume;
  }
};

export const setVolume = (value: number): void => {
  volume = value;
  if (master && !muted) {
    master.gain.value = volume;
  }
};

export const play = (name: SoundName): void => {
  if (muted || !unlocked) return;
  let ctx: AudioContext;
  try {
    ctx = getAudio();
  } catch {
    return;
  }
  const output = ensureMaster(ctx);
  switch (name) {
    case 'hit':
      noiseBurst(ctx, output, 0.18, 800, DEFAULT_ENV);
      break;
    case 'near-miss':
      tone(ctx, output, 880, 0.12, { attack: 0.005, decay: 0.08, sustain: 0.3, release: 0.12 });
      break;
    case 'pickup':
      arpeggio(ctx, output, [440, 660, 990], 0.15);
      break;
    case 'bomb':
      noiseSweep(ctx, output, 0.35);
      break;
    case 'slow-on':
      tone(ctx, output, 240, 0.4, { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.2 });
      break;
    case 'slow-off':
      tone(ctx, output, 520, 0.25, { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.15 });
      break;
  }
};

const tone = (ctx: AudioContext, destination: AudioNode, freq: number, duration: number, env: Envelope): void => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  applyEnvelope(ctx, gain.gain, env, duration);
  osc.connect(gain).connect(destination);
  const stopTime = ctx.currentTime + duration + env.release + env.decay;
  osc.start();
  osc.stop(stopTime);
};

const noiseBurst = (
  ctx: AudioContext,
  destination: AudioNode,
  duration: number,
  cutoff: number,
  env: Envelope
): void => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  applyEnvelope(ctx, gain.gain, env, duration);
  source.connect(filter).connect(gain).connect(destination);
  const stopTime = ctx.currentTime + duration + env.release;
  source.start();
  source.stop(stopTime);
};

const noiseSweep = (ctx: AudioContext, destination: AudioNode, duration: number): void => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);
  applyEnvelope(ctx, gain.gain, { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.3 }, duration);
  osc.connect(gain).connect(destination);
  const stopTime = ctx.currentTime + duration + 0.3;
  osc.start();
  osc.stop(stopTime);
};

const arpeggio = (ctx: AudioContext, destination: AudioNode, freqs: number[], step: number): void => {
  freqs.forEach((freq, index) => {
    const when = ctx.currentTime + index * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    applyEnvelope(ctx, gain.gain, { attack: 0.005, decay: 0.05, sustain: 0.4, release: 0.2 }, step);
    osc.connect(gain).connect(destination);
    osc.start(when);
    osc.stop(when + step + 0.2);
  });
};

const applyEnvelope = (ctx: AudioContext, param: AudioParam, env: Envelope, duration: number): void => {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(0.0001, now);
  param.linearRampToValueAtTime(1, now + env.attack);
  param.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
  param.setValueAtTime(env.sustain, now + duration);
  param.linearRampToValueAtTime(0.0001, now + duration + env.release);
};
