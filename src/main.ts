import { bootGame, startGame } from './core/game';
import { unlockAudio } from './engine/audio';
import { setState } from './core/state';
import { initInput } from './engine/input';
import { computeLayout } from './engine/viewport';

function qs<T extends HTMLElement>(sel: string): T {
  const el = document.querySelector(sel) as T | null;
  if (!el) throw new Error(`No encontrado: ${sel}`);
  return el;
}

function sizeCanvas(c: HTMLCanvasElement) {
  const L = computeLayout();
  c.width = Math.floor(L.vwCss * L.dpr);
  c.height = Math.floor(L.vhCss * L.dpr);
  Object.assign(c.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '100vw',
    height: '100vh',
  } as CSSStyleDeclaration);
}

function wireGate(startCb: () => void) {
  const gate = document.getElementById('gate');
  const btn = document.getElementById('gate-btn');
  const fire = () => {
    try {
      unlockAudio();
    } catch {}
    setState('menu');
    startCb();
    gate?.remove();
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => {
    gate?.addEventListener(ev, fire, { once: true });
    btn?.addEventListener(ev, fire, { once: true });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = qs<HTMLCanvasElement>('#game');

  canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('gesturestart', (e) => e.preventDefault());

  sizeCanvas(canvas);
  window.addEventListener('resize', () => sizeCanvas(canvas));
  window.addEventListener('orientationchange', () => setTimeout(() => sizeCanvas(canvas), 0));
  (window as any).visualViewport?.addEventListener('resize', () => sizeCanvas(canvas));

  initInput(canvas);
  bootGame(canvas);
  startGame();

  wireGate(() => {
    /* loop arrancado arriba */
  });
});
