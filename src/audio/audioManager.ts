const MP3_EXTENSION = '.mp3';
const AUDIO_BASE_PATH = '/audio/';
const WARMUP_DURATION = 0.05;

interface HandleBase {
  id: number;
  context: AudioContext;
  gain?: GainNode;
  source?: AudioBufferSourceNode;
  stopRequested: boolean;
  ready: Promise<void>;
}

export interface MusicHandle extends HandleBase {
  kind: 'music';
}

export interface PlayMusicOptions {
  loop?: boolean;
  fadeIn?: number;
}

export interface StopMusicOptions {
  fadeOut?: number;
}

export interface PlaySfxOptions {
  vol?: number;
}

const bufferCache = new Map<string, Promise<AudioBuffer | null>>();
let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let masterVolume = 1;
let handleId = 0;
let warmupDone = false;
let warmupRunning: Promise<void> | null = null;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function createContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  try {
    context = new Ctor();
    masterGain = null;
    musicBus = null;
    sfxBus = null;
    warmupDone = false;
    warmupRunning = null;
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
  return new Promise<AudioBuffer | null>((resolve) => {
    let settled = false;
    const done = (buffer: AudioBuffer | null) => {
      if (settled) return;
      settled = true;
      resolve(buffer);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      console.warn('[AUDIO] decodeAudioData failed', error);
      resolve(null);
    };
    try {
      const result = ctx.decodeAudioData(
        data.slice(0),
        (buffer) => done(buffer),
        (err) => fail(err)
      );
      if (result && typeof (result as Promise<AudioBuffer>).then === 'function') {
        (result as Promise<AudioBuffer>).then(done).catch(fail);
      }
    } catch (error) {
      fail(error);
    }
  });
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
          } else {
            console.info(`[AUDIO] Audio asset missing: ${name}`);
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

async function warmupContext(ctx: AudioContext): Promise<void> {
  if (warmupDone) {
    return;
  }
  if (warmupRunning) {
    return warmupRunning;
  }
  warmupRunning = (async () => {
    try {
      const { master } = ensureBuses(ctx);
      const frameCount = Math.max(1, Math.ceil(ctx.sampleRate * WARMUP_DURATION));
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(master);
      const now = ctx.currentTime;
      source.start(now);
      source.stop(now + WARMUP_DURATION);
    } catch (error) {
      console.warn('[AUDIO] Warmup failed', error);
    } finally {
      warmupDone = true;
      warmupRunning = null;
    }
  })();
  return warmupRunning;
}

export async function unlock(): Promise<AudioContext | null> {
  const ctx = ensureContext() ?? createContext();
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
    kind: 'music',
    context: ctx,
    stopRequested: false,
    ready: Promise.resolve(),
  };

  let resolveReady: (() => void) | null = null;
  handle.ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  fetchBuffer(ctx, name)
    .then((buffer) => {
      if (!buffer || handle.stopRequested) {
        resolveReady?.();
        return;
      }
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      source.loop = options.loop ?? true;
      const now = ctx.currentTime;
      const fadeIn = Math.max(0, options.fadeIn ?? 0.3);
      if (fadeIn > 0) {
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(1, now + fadeIn);
      } else {
        gainNode.gain.setValueAtTime(1, now);
      }
      source.connect(gainNode);
      gainNode.connect(music);
      source.onended = () => {
        cleanupHandle(handle);
      };
      try {
        source.start(now);
      } catch (error) {
        console.warn('[AUDIO] Failed to start music source', error);
        cleanupHandle(handle);
        resolveReady?.();
        return;
      }
      handle.source = source;
      handle.gain = gainNode;
      resolveReady?.();
    })
    .catch((error) => {
      console.warn('[AUDIO] playMusic failed', name, error);
      resolveReady?.();
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
    return;
  }
  const fadeOut = Math.max(0, options.fadeOut ?? 0.2);
  const now = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(now);
    const currentValue = gain.gain.value;
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(currentValue, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
      source.stop(now + fadeOut + 0.05);
    } else {
      gain.gain.setValueAtTime(0.0001, now);
      source.stop(now + 0.05);
    }
  } catch (error) {
    console.warn('[AUDIO] stopMusic failed', error);
    try {
      source.stop();
    } catch {/* ignore */}
  }
}

export async function playSfx(name: string, options: PlaySfxOptions = {}): Promise<boolean | null> {
  const ctx = ensureContext();
  if (!ctx) {
    return null;
  }
  const { sfx } = ensureBuses(ctx);
  try {
    const buffer = await fetchBuffer(ctx, name);
    if (!buffer) {
      return null;
    }
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const vol = clamp01(options.vol ?? 1);
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
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
    return null;
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

export const AudioMgr = {
  unlock,
  getContext,
  playMusic,
  playSfx,
  stopMusic,
};
