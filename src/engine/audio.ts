let audioContext: AudioContext | null = null;

type AudioContextCtor = typeof AudioContext;

const resolveConstructor = (): AudioContextCtor | undefined => {
  const global = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? global.webkitAudioContext;
};

export const getAudio = (): AudioContext | null => {
  if (audioContext) {
    return audioContext;
  }

  const Ctor = resolveConstructor();
  if (!Ctor) {
    return null;
  }

  audioContext = new Ctor();
  return audioContext;
};

export const unlockAudio = (): void => {
  const ctx = getAudio();
  if (!ctx) {
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      // Some browsers reject resume() when autoplay policies block audio.
    });
  }
};
