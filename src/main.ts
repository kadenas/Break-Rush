import { bootGame, startGame } from './core/game';
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
  context.fillText('BOOT OK', 24 + 90, 24 + 36);
  context.restore();
};

const setup = (): void => {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Game canvas not found');
  }

  const gate = document.getElementById('gate');
  const gateButton = document.getElementById('gate-btn') as HTMLButtonElement | null;
  let gameStarted = false;

  const handleResize = (): void => {
    resizeCanvas(canvas);
    if (!gameStarted) {
      bootGame(canvas);
      drawBootIndicator(canvas);
    }
  };

  handleResize();
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  const beginGame = (event: Event): void => {
    if (gameStarted) {
      return;
    }

    if (event.type === 'touchstart' || event.type === 'keydown') {
      event.preventDefault();
    }

    gameStarted = true;

    unlockAudio();
    startGame();

    if (gate && gate.isConnected) {
      gate.remove();
    }

    window.removeEventListener('keydown', beginGame);
    teardownCanvasListeners();
  };

  const fallbackStart = (event: Event): void => {
    beginGame(event);
  };

  function teardownCanvasListeners(): void {
    canvas.removeEventListener('pointerdown', fallbackStart);
    canvas.removeEventListener('touchstart', fallbackStart, { passive: false });
  }

  const registerStart = (
    target: EventTarget | null,
    type: string,
    options?: AddEventListenerOptions
  ): void => {
    if (!target) {
      return;
    }
    target.addEventListener(type, beginGame, options);
  };

  registerStart(gate, 'pointerdown');
  registerStart(gate, 'touchstart', { passive: false });
  registerStart(gate, 'keydown');

  registerStart(gateButton, 'pointerdown');
  registerStart(gateButton, 'touchstart', { passive: false });
  registerStart(gateButton, 'keydown');
  registerStart(window, 'keydown');

  if (gate instanceof HTMLElement) {
    gate.tabIndex = -1;
  }

  try {
    gateButton?.focus({ preventScroll: true });
  } catch {
    gateButton?.focus();
  }

  canvas.addEventListener('pointerdown', fallbackStart);
  canvas.addEventListener('touchstart', fallbackStart, { passive: false });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup, { once: true });
} else {
  setup();
}
