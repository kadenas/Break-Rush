import './styles.css';
import { bootGame, isGameRunning, renderFrame, startGame } from './core/game';
import { unlockAudio } from './engine/audio';
import { registerServiceWorker } from './pwa/registerSW';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const qs = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
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

const sanityPaint = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#b4002f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.max(24, Math.round(canvas.width / 12));
  ctx.font = `${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('BOOT OK', canvas.width / 2, canvas.height / 2);
  ctx.restore();
};

const init = (): void => {
  const canvas = qs<HTMLCanvasElement>('#game');

  const applyResize = () => {
    resizeCanvas(canvas);
    if (isGameRunning()) {
      renderFrame();
    } else {
      bootGame(canvas);
    }
  };

  applyResize();
  window.addEventListener('resize', applyResize);

  window.addEventListener(
    'user-start',
    () => {
      unlockAudio();
      sanityPaint(canvas);
      startGame();
    },
    { once: true }
  );

  canvas.addEventListener(
    'pointerdown',
    () => {
      startGame();
    },
    { once: true }
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

registerServiceWorker();
