const MP3_EXTENSION = '.mp3';
const AUDIO_BASE_PATH = '/audio/';
const WARMUP_DURATION = 0.05;

export type MusicHandle = {
  readonly id: number;
  readonly context: AudioContext;
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  stopRequested: boolean;
  ready: Promise<void>;
  ended: Promise<void>;
};

interface PlayMusicOptions {
  loop?: boolean;
  fadeIn?: number;
}

interface StopMusicOptions {
  fadeOut?: number;
}

interface PlaySfxOptions {
  vol?: number;
}

const bufferCache = new Map<string, Promise<AudioBuffer | null>>();
let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let masterVolume = 1;
let handleId = 0;
let warmupRunning: Promise<void> | null = null;
let warmupDone = false;

const readyResolvers = new WeakMap<MusicHandle, () => void>();
const endedResolvers = new WeakMap<MusicHandle, () => void>();

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function createContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  try {
    context = new Ctor();
    masterGain = null;
    musicBus = null;
    sfxBus = null;
    warmupRunning = null;
    warmupDone = false;
  } catch (error) {
    console.warn('[AUDIO] Unable to create AudioContext', error);
    context = null;
  }
  return context;
}

function ensureContext(): AudioContext | null {
  return context;
}

function ensureBuses(ctx: AudioContext) {
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }
  if (!musicBus || musicBus.context !== ctx) {
    musicBus = ctx.createGain();
    musicBus.connect(masterGain);
  }
  if (!sfxBus || sfxBus.context !== ctx) {
    sfxBus = ctx.createGain();
    sfxBus.connect(masterGain);
  }
  return { master: masterGain, music: musicBus, sfx: sfxBus };
}

async function decodeBuffer(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer | null> {
  try {
    const clone = data.slice(0);
    const promise = ctx.decodeAudioData(clone);
    if (promise instanceof Promise) {
      return await promise;
    }
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(clone, resolve, reject);
    });
  } catch (error) {
    console.warn('[AUDIO] decodeAudioData failed', error);
    return null;
  }
}

async function fetchBuffer(ctx: AudioContext, name: string): Promise<AudioBuffer | null> {
  if (typeof fetch !== 'function') {
    return null;
  }
  const key = `${name}${MP3_EXTENSION}`;
  let cached = bufferCache.get(key);
  if (!cached) {
    cached = (async () => {
      try {
        const response = await fetch(`${AUDIO_BASE_PATH}${key}`);
        if (!response.ok) {
          if (response.status !== 404) {
            console.warn(`[AUDIO] Failed request for ${name}: ${response.status}`);
          }
          return null;
        }
        const data = await response.arrayBuffer();
        return await decodeBuffer(ctx, data);
      } catch (error) {
        console.warn('[AUDIO] Failed to load buffer', name, error);
        return null;
      }
    })();
    bufferCache.set(key, cached);
  }
  const buffer = await cached;
  if (!buffer) {
    bufferCache.delete(key);
  }
  return buffer;
}

function cleanupHandle(handle: MusicHandle) {
  if (handle.source) {
    try {
      handle.source.onended = null;
      handle.source.disconnect();
    } catch (error) {
      console.warn('[AUDIO] Source disconnect failed', error);
    }
  }
  if (handle.gain) {
    try {
      handle.gain.disconnect();
    } catch (error) {
      console.warn('[AUDIO] Gain disconnect failed', error);
    }
  }
  handle.source = undefined;
  handle.gain = undefined;
}

function scheduleWarmup(ctx: AudioContext): void {
  if (warmupDone || warmupRunning) {
    return;
  }
  warmupRunning = (async () => {
    try {
      const { master } = ensureBuses(ctx);
      const frames = Math.max(1, Math.ceil(ctx.sampleRate * WARMUP_DURATION));
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(master);
      const now = ctx.currentTime;
      source.start(now);
      source.stop(now + WARMUP_DURATION);
      source.onended = () => {
        try {
          source.disconnect();
        } catch {
          /* ignore */
        }
        try {
          gain.disconnect();
        } catch {
          /* ignore */
        }
      };
    } catch (error) {
      console.warn('[AUDIO] Warmup failed', error);
    } finally {
      warmupDone = true;
      warmupRunning = null;
    }
  })();
}

async function warmupContext(ctx: AudioContext): Promise<void> {
  if (warmupDone) {
    return;
  }
  scheduleWarmup(ctx);
  const running = warmupRunning;
  if (running) {
    await running;
  }
}

export function unlockSync(): void {
  const ctx = ensureContext() ?? createContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === 'suspended') {
    try {
      const resumeResult = ctx.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') {
        resumeResult.catch((error) => {
          console.warn('[AUDIO] Resume failed', error);
        });
      }
    } catch (error) {
      console.warn('[AUDIO] Resume threw', error);
    }
  }
  scheduleWarmup(ctx);
}

export async function unlock(): Promise<AudioContext | null> {
  unlockSync();
  const ctx = ensureContext();
  if (!ctx) {
    return null;
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (error) {
      console.warn('[AUDIO] Resume failed', error);
    }
  }
  await warmupContext(ctx);
  return ctx;
}

export function playMusic(name: string, options: PlayMusicOptions = {}): MusicHandle | null {
  const ctx = ensureContext();
  if (!ctx) {
    return null;
  }
  const { music } = ensureBuses(ctx);
  const handle: MusicHandle = {
    id: ++handleId,
    context: ctx,
    stopRequested: false,
    ready: Promise.resolve(),
    ended: Promise.resolve(),
  };

  let readySettled = false;
  let endedSettled = false;
  let resolveReady: () => void = () => {};
  let resolveEnded: () => void = () => {};

  handle.ready = new Promise<void>((resolve) => {
    resolveReady = () => {
      if (!readySettled) {
        readySettled = true;
        resolve();
      }
    };
  });

  handle.ended = new Promise<void>((resolve) => {
    resolveEnded = () => {
      if (!endedSettled) {
        endedSettled = true;
        resolve();
      }
    };
  });

  readyResolvers.set(handle, resolveReady);
  endedResolvers.set(handle, resolveEnded);

  fetchBuffer(ctx, name)
    .then((buffer) => {
      if (!buffer || handle.stopRequested) {
        resolveReady();
        resolveEnded();
        cleanupHandle(handle);
        readyResolvers.delete(handle);
        endedResolvers.delete(handle);
        return;
      }
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      source.loop = options.loop ?? true;
      const now = ctx.currentTime;
      const fadeIn = Math.max(0, options.fadeIn ?? 0);
      if (fadeIn > 0) {
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(1, now + fadeIn);
      } else {
        gainNode.gain.setValueAtTime(1, now);
      }
      source.connect(gainNode);
      gainNode.connect(music);
      source.onended = () => {
        resolveEnded();
        cleanupHandle(handle);
        readyResolvers.delete(handle);
        endedResolvers.delete(handle);
      };
      try {
        source.start(now);
      } catch (error) {
        console.warn('[AUDIO] Failed to start music source', error);
        resolveReady();
        resolveEnded();
        cleanupHandle(handle);
        readyResolvers.delete(handle);
        endedResolvers.delete(handle);
        return;
      }
      handle.source = source;
      handle.gain = gainNode;
      resolveReady();
    })
    .catch((error) => {
      console.warn('[AUDIO] playMusic failed', name, error);
      resolveReady();
      resolveEnded();
      cleanupHandle(handle);
      readyResolvers.delete(handle);
      endedResolvers.delete(handle);
    });

  return handle;
}

export function stopMusic(handle: MusicHandle | null | undefined, options: StopMusicOptions = {}): void {
  if (!handle) {
    return;
  }
  handle.stopRequested = true;
  const source = handle.source;
  const gain = handle.gain;
  const ctx = handle.context;
  if (!source || !gain) {
    readyResolvers.get(handle)?.();
    endedResolvers.get(handle)?.();
    readyResolvers.delete(handle);
    endedResolvers.delete(handle);
    return;
  }
  const fadeOut = Math.max(0, options.fadeOut ?? 0.2);
  const now = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(now);
    const currentValue = Math.max(0.0001, gain.gain.value || 0.0001);
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(currentValue, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
      source.stop(now + fadeOut + 0.02);
    } else {
      gain.gain.setValueAtTime(0.0001, now);
      source.stop(now + 0.02);
    }
  } catch (error) {
    console.warn('[AUDIO] stopMusic failed', error);
    try {
      source.stop();
    } catch {
      /* ignore */
    }
  }
}

export async function playSfx(name: string, options: PlaySfxOptions = {}): Promise<boolean> {
  const ctx = ensureContext();
  if (!ctx) {
    return false;
  }
  const { sfx } = ensureBuses(ctx);
  try {
    const buffer = await fetchBuffer(ctx, name);
    if (!buffer) {
      return false;
    }
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const volume = clamp01(options.vol ?? 1);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    source.buffer = buffer;
    source.loop = false;
    source.connect(gainNode);
    gainNode.connect(sfx);
    source.onended = () => {
      try {
        source.disconnect();
      } catch (error) {
        console.warn('[AUDIO] SFX source disconnect failed', error);
      }
      try {
        gainNode.disconnect();
      } catch (error) {
        console.warn('[AUDIO] SFX gain disconnect failed', error);
      }
    };
    source.start();
    return true;
  } catch (error) {
    console.warn('[AUDIO] playSfx failed', name, error);
    return false;
  }
}

export function setMaster(value: number): void {
  if (!Number.isFinite(value)) {
    return;
  }
  masterVolume = Math.max(0, value);
  if (masterGain) {
    masterGain.gain.setValueAtTime(masterVolume, masterGain.context.currentTime);
  }
}

export function getContext(): AudioContext | null {
  return context;
}
