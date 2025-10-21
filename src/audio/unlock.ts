import { unlockSync } from './audioManager';

type StartFn = () => void;

let installed = false;

const GLOBAL_EVENTS: Array<keyof DocumentEventMap> = ['pointerdown', 'touchend', 'mousedown', 'keydown'];

export function installGlobalUnlock(start: StartFn): void {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;
  let fired = false;
  const listener = () => {
    if (fired) {
      return;
    }
    fired = true;
    void unlockThenStart(start);
  };
  const options: AddEventListenerOptions = {
    once: true,
    passive: true,
    capture: true,
  };
  for (const event of GLOBAL_EVENTS) {
    window.addEventListener(event, listener, options);
  }
}

export async function unlockThenStart(start: StartFn): Promise<void> {
  try {
    unlockSync();
  } catch (error) {
    console.warn('[AUDIO] Unlock failed', error);
  }
  try {
    start();
  } catch (error) {
    console.error('[AUDIO] Start callback failed', error);
  }
}
