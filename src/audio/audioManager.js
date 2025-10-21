const bufferCache = new Map();
let context = null;
let masterGain = null;
let musicBus = null;
let sfxBus = null;
let masterVolume = 1;
let handleId = 0;
let pointerUnlockRegistered = false;

const MP3_EXTENSION = '.mp3';

function ensurePointerUnlock() {
  if (pointerUnlockRegistered || typeof window === 'undefined') {
    return;
  }
  pointerUnlockRegistered = true;
  window.addEventListener(
    'pointerdown',
    () => {
      void resume();
    },
    { once: true }
  );
}

function getAudioContext() {
  if (context) {
    return context;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  try {
    context = new AudioContextCtor();
    masterGain = context.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(context.destination);
    musicBus = context.createGain();
    sfxBus = context.createGain();
    musicBus.connect(masterGain);
    sfxBus.connect(masterGain);
    ensurePointerUnlock();
  } catch (error) {
    console.warn('[AUDIO] Unable to create AudioContext', error);
    context = null;
    masterGain = null;
    musicBus = null;
    sfxBus = null;
    return null;
  }
  return context;
}

function getBuses(ctx) {
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
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
  return { music: musicBus, sfx: sfxBus };
}

async function fetchBuffer(ctx, name) {
  if (typeof fetch !== 'function') {
    return null;
  }
  const key = `${name}${MP3_EXTENSION}`;
  let cached = bufferCache.get(key);
  if (!cached) {
    cached = (async () => {
      try {
        const response = await fetch(`/audio/${key}`);
        if (!response.ok) {
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

function decodeBuffer(ctx, data) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    try {
      const result = ctx.decodeAudioData(
        data.slice(0),
        (buffer) => done(buffer),
        (err) => fail(err)
      );
      if (result && typeof result.then === 'function') {
        result.then(done).catch(fail);
      }
    } catch (error) {
      fail(error);
    }
  });
}

function createHandle(kind) {
  return {
    id: ++handleId,
    kind,
    stopRequested: false,
    source: undefined,
    gain: undefined,
    context: undefined,
    ready: Promise.resolve(),
  };
}

function cleanupHandle(handle) {
  if (handle.source) {
    try {
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
  handle.context = undefined;
}

export function playMusic(name, options = {}) {
  const ctx = getAudioContext();
  if (!ctx) {
    return null;
  }
  const handle = createHandle('music');
  const { music } = getBuses(ctx);
  let resolveReady;
  handle.ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  fetchBuffer(ctx, name)
    .then((buffer) => {
      if (!buffer || handle.stopRequested) {
        resolveReady();
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
      source.start();
      source.onended = () => {
        cleanupHandle(handle);
      };
      handle.source = source;
      handle.gain = gainNode;
      handle.context = ctx;
      resolveReady();
    })
    .catch((error) => {
      console.warn('[AUDIO] playMusic failed', name, error);
      resolveReady();
    });

  return handle;
}

export function stopMusic(handle, options = {}) {
  if (!handle) {
    return;
  }
  handle.stopRequested = true;
  if (!handle.source || !handle.gain || !handle.context) {
    return;
  }
  const { source, gain, context: ctx } = handle;
  const fadeOut = Math.max(0, options.fadeOut ?? 0);
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  const currentValue = gain.gain.value;
  if (fadeOut > 0) {
    gain.gain.setValueAtTime(currentValue, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
    try {
      source.stop(now + fadeOut + 0.05);
    } catch (error) {
      console.warn('[AUDIO] stopMusic stop failed', error);
    }
  } else {
    gain.gain.setValueAtTime(0.0001, now);
    try {
      source.stop(now + 0.05);
    } catch (error) {
      console.warn('[AUDIO] stopMusic stop failed', error);
    }
  }
}

export function playSfx(name, options = {}) {
  const ctx = getAudioContext();
  if (!ctx) {
    return Promise.resolve(false);
  }
  const { sfx } = getBuses(ctx);
  const volume = Math.max(0, Math.min(1, options.vol ?? 1));
  return fetchBuffer(ctx, name)
    .then((buffer) => {
      if (!buffer) {
        return false;
      }
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      source.loop = false;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
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
    })
    .catch((error) => {
      console.warn('[AUDIO] playSfx failed', name, error);
      return false;
    });
}

export function setMaster(value) {
  if (!Number.isFinite(value)) {
    return;
  }
  masterVolume = Math.max(0, value);
  if (masterGain) {
    masterGain.gain.value = masterVolume;
  }
}

export function resume() {
  const ctx = getAudioContext();
  if (!ctx) {
    return Promise.resolve();
  }
  if (ctx.state !== 'suspended') {
    return Promise.resolve();
  }
  return ctx.resume().catch(() => {});
}

export function getContext() {
  return getAudioContext();
}
