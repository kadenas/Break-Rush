import { bootGame, startGame } from './core/game';
import { getState, isPlaying, setState } from './core/state';
import { unlockAudio } from './engine/audio';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const resizeCanvas = (canvas: HTMLCanvasElement): void => {
  const dpr = clamp(window.devicePixelRatio ?? 1, 1, 3);
  const width = Math.floor(VIRTUAL_WIDTH * dpr);
  const height = Math.floor(VIRTUAL_HEIGHT * dpr);

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  canvas.style.width = '100vw';
  canvas.style.height = '100vh';

  const context = canvas.getContext('2d');
  if (context) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
};

const drawBootIndicator = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.save();
  context.fillStyle = '#b4002f';
  context.fillRect(24, 24, 180, 72);
  context.fillStyle = '#ffffff';
  context.font = '24px "Segoe UI", system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('BOOT OK', 114, 60);
  context.restore();
};

type ListenerDisposer = () => void;

type EventTuple = [EventTarget | null, string, EventListenerOrEventListenerObject, AddEventListenerOptions?];

const addListeners = (tuples: EventTuple[]): ListenerDisposer => {
  const disposers: ListenerDisposer[] = [];

  tuples.forEach(([target, type, listener, options]) => {
    if (!target) {
      return;
    }
    target.addEventListener(type, listener as EventListener, options);
    disposers.push(() => {
      target.removeEventListener(type, listener as EventListener, options);
    });
  });

  return () => {
    disposers.forEach((dispose) => dispose());
  };
};

const setup = (): void => {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Game canvas not found');
  }

  resizeCanvas(canvas);
  bootGame(canvas);

  const gate = document.getElementById('gate');
  const gateButton = document.getElementById('gate-btn');

  const cleanupListeners: ListenerDisposer[] = [];

  const cleanupAll = (): void => {
    while (cleanupListeners.length > 0) {
      const dispose = cleanupListeners.pop();
      dispose?.();
    }
  };

  const beginGame = (event: Event): void => {
    if (isPlaying()) {
      return;
    }

    if (event.type === 'touchstart' || event.type === 'keydown') {
      event.preventDefault();
    }

    unlockAudio();
    setState('playing');
    startGame();
    drawBootIndicator(canvas);

    if (gate && gate.isConnected) {
      gate.remove();
    }

    cleanupAll();
  };

  const gateHandlers: EventTuple[] = [
    [gate, 'pointerdown', beginGame],
    [gate, 'touchstart', beginGame, { passive: false }],
    [gate, 'keydown', beginGame],
    [gateButton, 'pointerdown', beginGame],
    [gateButton, 'touchstart', beginGame, { passive: false }],
    [gateButton, 'keydown', beginGame],
  ];

  cleanupListeners.push(addListeners(gateHandlers));

  const canvasFallback = (event: Event): void => {
    if (getState() !== 'menu') {
      return;
    }
    beginGame(event);
  };

  cleanupListeners.push(
    addListeners([
      [canvas, 'pointerdown', canvasFallback],
      [canvas, 'touchstart', canvasFallback, { passive: false }],
    ])
  );

  const handleResize = (): void => {
    resizeCanvas(canvas);
    if (!isPlaying()) {
      bootGame(canvas);
    }
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  cleanupListeners.push(() => window.removeEventListener('resize', handleResize));
  cleanupListeners.push(() => window.removeEventListener('orientationchange', handleResize));

  if (gate instanceof HTMLElement) {
    gate.tabIndex = -1;
  }

  if (gateButton instanceof HTMLButtonElement) {
    try {
      gateButton.focus({ preventScroll: true });
    } catch {
      gateButton.focus();
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup, { once: true });
} else {
  setup();
}
