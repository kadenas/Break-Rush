export type PlayOptions = {
  loop?: boolean;
  vol?: number;
};

export type PlayHandle = AudioBufferSourceNode | HTMLAudioElement;

type AudioExtension = 'ogg' | 'mp3';

type SupportMap = Record<AudioExtension, boolean>;

type AudioContextCtor = typeof AudioContext & { new (): AudioContext };

declare global {
  interface Window {
    webkitAudioContext?: AudioContextCtor;
  }
}

const EXTENSIONS: AudioExtension[] = ['ogg', 'mp3'];

const audioSupport: SupportMap = (() => {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return { ogg: false, mp3: false };
  }

  try {
    const tester = new Audio();
    const canPlay = (type: string) => {
      const result = typeof tester.canPlayType === 'function' ? tester.canPlayType(type) : '';
      return result === 'probably' || result === 'maybe';
    };

    return {
      ogg: canPlay('audio/ogg; codecs="vorbis"'),
      mp3: canPlay('audio/mpeg'),
    };
  } catch {
    return { ogg: false, mp3: false };
  }
})();

const assetExistenceCache = new Map<string, boolean | Promise<boolean>>();
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();
const activeHtmlAudio = new Set<HTMLAudioElement>();
const htmlAudioBaseVolume = new WeakMap<HTMLAudioElement, number>();
const warnedMissing = new Set<string>();

let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterGainValue = 1;
let resumePromise: Promise<void> | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const decodeAudioBuffer = (ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> => {
  let settled = false;
  return new Promise<AudioBuffer>((resolve, reject) => {
    const onSuccess = (buffer: AudioBuffer) => {
      if (settled) return;
      settled = true;
      resolve(buffer);
    };
    const onError = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const maybePromise = ctx.decodeAudioData(data, onSuccess, (err) => onError(err));
    if (maybePromise && typeof (maybePromise as Promise<AudioBuffer>).then === 'function') {
      (maybePromise as Promise<AudioBuffer>).then(onSuccess).catch(onError);
    }
  });
};

const fetchArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  if (typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.arrayBuffer();
  } catch {
    return null;
  }
};

const ensureContext = (): AudioContext | null => {
  if (context) {
    return context;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) {
    return null;
  }

  try {
    context = new Ctor();
    masterGain = context.createGain();
    masterGain.gain.value = masterGainValue;
    masterGain.connect(context.destination);
  } catch {
    context = null;
    masterGain = null;
    return null;
  }

  return context;
};

const ensureMasterGain = (ctx: AudioContext): GainNode => {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = masterGainValue;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
};

const assetExists = async (name: string, ext: AudioExtension): Promise<boolean> => {
  const key = `${name}.${ext}`;
  const cached = assetExistenceCache.get(key);
  if (typeof cached === 'boolean') {
    return cached;
  }

  if (cached) {
    const result = await cached;
    return result;
  }

  const promise = (async () => {
    if (typeof fetch !== 'function') {
      return true;
    }

    try {
      const response = await fetch(`/audio/${key}`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  })();

  assetExistenceCache.set(key, promise);
  const exists = await promise;
  assetExistenceCache.set(key, exists);
  return exists;
};

const loadBuffer = async (ctx: AudioContext, url: string): Promise<AudioBuffer | null> => {
  let cached = bufferCache.get(url);
  if (!cached) {
    cached = (async () => {
      const data = await fetchArrayBuffer(url);
      if (!data) {
        return null;
      }
      try {
        return await decodeAudioBuffer(ctx, data);
      } catch {
        return null;
      }
    })();
    bufferCache.set(url, cached);
  }

  const buffer = await cached;
  if (!buffer) {
    bufferCache.delete(url);
    return null;
  }

  return buffer;
};

const registerHtmlAudio = (element: HTMLAudioElement, baseVolume: number) => {
  htmlAudioBaseVolume.set(element, baseVolume);
  activeHtmlAudio.add(element);
  applyElementVolume(element);

  const cleanup = () => {
    activeHtmlAudio.delete(element);
    htmlAudioBaseVolume.delete(element);
    element.removeEventListener('ended', cleanup);
    element.removeEventListener('pause', cleanup);
    element.removeEventListener('error', cleanup);
  };

  element.addEventListener('ended', cleanup);
  element.addEventListener('pause', cleanup);
  element.addEventListener('error', cleanup);
};

const applyElementVolume = (element: HTMLAudioElement) => {
  const base = htmlAudioBaseVolume.get(element) ?? 1;
  element.volume = clamp(base * masterGainValue, 0, 1);
};

const pickAssetUrl = async (name: string): Promise<string | null> => {
  for (const ext of EXTENSIONS) {
    if (!audioSupport[ext]) {
      continue;
    }
    if (!(await assetExists(name, ext))) {
      continue;
    }
    return `/audio/${name}.${ext}`;
  }
  return null;
};

const playWithContext = async (
  ctx: AudioContext,
  url: string,
  options: PlayOptions
): Promise<AudioBufferSourceNode | undefined> => {
  const buffer = await loadBuffer(ctx, url);
  if (!buffer) {
    return undefined;
  }

  await unlock();

  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;
  source.loop = options.loop ?? false;
  gainNode.gain.value = options.vol ?? 1;

  const destination = ensureMasterGain(ctx);
  source.connect(gainNode);
  gainNode.connect(destination);

  source.onended = () => {
    source.onended = null;
    try {
      source.disconnect();
    } catch {
      // ignore
    }
    try {
      gainNode.disconnect();
    } catch {
      // ignore
    }
  };

  try {
    source.start();
  } catch {
    try {
      source.disconnect();
    } catch {
      // ignore
    }
    try {
      gainNode.disconnect();
    } catch {
      // ignore
    }
    return undefined;
  }

  return source;
};

const playWithHtmlAudio = async (
  url: string,
  options: PlayOptions
): Promise<HTMLAudioElement | undefined> => {
  if (typeof Audio === 'undefined') {
    return undefined;
  }

  const element = new Audio(url);
  element.loop = options.loop ?? false;
  registerHtmlAudio(element, options.vol ?? 1);

  try {
    const playPromise = element.play();
    if (playPromise && typeof playPromise.then === 'function') {
      await playPromise;
    }
    return element;
  } catch {
    element.pause();
    return undefined;
  }
};

const resolveAssetName = (name: string): string => SFX_MAP[name] ?? name;

const missingWarning = (name: string) => {
  if (warnedMissing.has(name)) {
    return;
  }
  warnedMissing.add(name);
  console.warn('[AUDIO] missing:', name);
};

const unlock = async (): Promise<void> => {
  const ctx = ensureContext();
  if (!ctx) {
    return;
  }

  if (ctx.state !== 'suspended') {
    return;
  }

  if (!resumePromise) {
    resumePromise = ctx
      .resume()
      .catch(() => {
        // ignore autoplay restriction errors
      })
      .then(() => {
        resumePromise = null;
      });
  }

  await resumePromise;
};

const play = async (name: string, options: PlayOptions = {}): Promise<PlayHandle | undefined> => {
  try {
    const assetName = resolveAssetName(name);
    const url = await pickAssetUrl(assetName);
    if (!url) {
      missingWarning(name);
      return undefined;
    }

    const ctx = ensureContext();
    if (ctx) {
      const source = await playWithContext(ctx, url, options);
      if (source) {
        return source;
      }
    }

    const element = await playWithHtmlAudio(url, options);
    if (element) {
      return element;
    }
  } catch (error) {
    console.warn('[AUDIO] playback error:', name, error);
  }

  return undefined;
};

const setMasterGain = (value: number): void => {
  if (!Number.isFinite(value)) {
    return;
  }

  masterGainValue = Math.max(0, value);
  if (masterGain) {
    masterGain.gain.value = masterGainValue;
  }

  for (const element of activeHtmlAudio) {
    applyElementVolume(element);
  }
};

const getContext = (): AudioContext | null => ensureContext();

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    () => {
      void unlock();
    },
    { once: true }
  );
}

export const SFX_MAP: Record<string, string> = {
  whoosh: 'loop3',
  level: 'loop3',
  loop: 'loop4',
};

export const AudioManager = {
  unlock,
  play,
  setMasterGain,
  getContext,
};
