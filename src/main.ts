import { GameManager } from './game/game-manager';
import { registerServiceWorker } from './pwa/register';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('No se encontró el canvas principal.');
  }

  new GameManager(canvas);

  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length === 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
  document.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
  document.addEventListener('dblclick', (event) => event.preventDefault());
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
