export type PlayOptions = {
  loop?: boolean;
  vol?: number;
};

export type PlayHandle = AudioBufferSourceNode;

type AudioContextCtor = typeof AudioContext & { new (): AudioContext };

declare global {
  interface Window {
    webkitAudioContext?: AudioContextCtor;
  }
}

export const AudioManager = (() => {
  let context: AudioContext | null = null;
  let unlocked = false;

  const resolveContext = (): AudioContext | null => {
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

    context = new Ctor();
    return context;
  };

  const getContext = (): AudioContext | null => resolveContext();

  const unlock = async (): Promise<void> => {
    const ctx = resolveContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore resume errors caused by autoplay restrictions.
      }
    }

    unlocked = ctx.state !== 'suspended';
  };

  const play = async (name: string, options: PlayOptions = {}): Promise<PlayHandle | undefined> => {
    const ctx = resolveContext();
    if (!ctx) {
      return undefined;
    }

    const { loop = false, vol = 1 } = options;
    const formats = [`/audio/${name}.ogg`, `/audio/${name}.mp3`];

    for (const url of formats) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }

        const buffer = await response.arrayBuffer();
        if (!unlocked && ctx.state === 'suspended') {
          await unlock();
        }

        const audioBuffer = await ctx.decodeAudioData(buffer.slice(0));
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = audioBuffer;
        source.loop = loop;
        gain.gain.value = vol;

        source.connect(gain).connect(ctx.destination);

        try {
          source.start();
        } catch {
          continue;
        }

        return source;
      } catch {
        // Try the next available format.
      }
    }

    console.warn('[AUDIO] Missing file:', name);
    return undefined;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(
      'pointerdown',
      () => {
        void unlock();
      },
      { once: true }
    );
  }

  return { play, unlock, getContext };
})();
