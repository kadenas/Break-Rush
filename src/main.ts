import { computeLayout } from './engine/viewport';
import { initInput } from './engine/input';
import { bootGame, startGame } from './core/game';
import { setState } from './core/state';
import { installGlobalErrorOverlay, errorBanner } from './boot/errorOverlay';

// Size helper
function sizeCanvas(c: HTMLCanvasElement){
  const L = computeLayout();
  c.width  = Math.floor(L.vwCss * L.dpr);
  c.height = Math.floor(L.vhCss * L.dpr);
  Object.assign(c.style, {
    position:'fixed', left:'0px', top:'0px', width:'100vw', height:'100vh'
  } as CSSStyleDeclaration);
}

function qs<T extends HTMLElement>(sel: string): T {
  const el = document.querySelector(sel) as T | null;
  if (!el) throw new Error(`No encontrado: ${sel}`);
  return el;
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    installGlobalErrorOverlay();

    const canvas = qs<HTMLCanvasElement>('#game');
    sizeCanvas(canvas);
    window.addEventListener('resize', ()=>sizeCanvas(canvas));
    (window as any).visualViewport?.addEventListener('resize', ()=>sizeCanvas(canvas));

    // Attach the START button directly. No “wireGate” mágicas.
    const gate = document.getElementById('gate');
    const btn = document.getElementById('gate-btn');
    if (btn) {
      btn.addEventListener('pointerdown', () => {
        try { setState('menu'); } catch {}
        gate?.remove();
      }, { passive: true, once: true });
      // Touch fallback
      btn.addEventListener('click', () => {
        try { setState('menu'); } catch {}
        gate?.remove();
      }, { once: true });
    }

    // Init input + game loop regardless of the gate state
    initInput(canvas);
    bootGame(canvas);
    startGame();

  } catch (e: any) {
    errorBanner(`BOOT FAIL: ${e?.message || e}`);
    console.error(e);
  }
});
