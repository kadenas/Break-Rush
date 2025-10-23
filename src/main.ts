import { computeLayout } from './engine/viewport';
import { initInput } from './engine/input';
import { initControls } from './engine/controls';
import { bootGame, requestMenuStart, requestMenuSettings, requestMenuReturn, getGameOverInfo } from './core/game';
import { installGlobalErrorOverlay, errorBanner } from './boot/errorOverlay';
import { preloadMenuBackground, showMainMenu, hideMainMenu } from './ui/menu';
import { armAfterScreenChange, handOffActivePointerTo } from './input/inputGate';
import { onStateChange, getState } from './core/state';
import { ensureGameOverDOM, showGameOver, hideGameOver } from './ui/gameOver';
import { gameDifficulty } from './game/spawner';

const loadMenuBackground = (() => {
  let promise: Promise<void> | null = null;
  return () => {
    if (!promise) {
      promise = preloadMenuBackground();
    }
    return promise;
  };
})();

function sizeCanvas(c: HTMLCanvasElement){
  const L = computeLayout();
  c.width  = Math.floor(L.vwCss * L.dpr);
  c.height = Math.floor(L.vhCss * L.dpr);
  Object.assign(c.style, { position:'fixed', left:'0px', top:'0px', width:'100vw', height:'100vh' } as CSSStyleDeclaration);
}
function qs<T extends HTMLElement>(sel:string){ const el=document.querySelector(sel) as T|null; if(!el) throw new Error(`No encontrado: ${sel}`); return el; }

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[UNHANDLED]', event.reason);
  });
}

window.addEventListener('DOMContentLoaded', ()=>{
  try{
    installGlobalErrorOverlay();
    if (import.meta.env.DEV) {
      (window as any).gameDifficulty = gameDifficulty;
    }
    const canvas = qs<HTMLCanvasElement>('#game');
    sizeCanvas(canvas);
    window.addEventListener('resize', ()=>sizeCanvas(canvas));
    (window as any).visualViewport?.addEventListener('resize', ()=>sizeCanvas(canvas));

    // Arranque del juego SIEMPRE
    initInput(canvas);
    initControls(canvas);
    bootGame(canvas);

    ensureGameOverDOM({
      onRetry: () => {
        hideGameOver();
        requestMenuStart();
        handOffActivePointerTo(canvas);
      },
      onMenu: () => {
        hideGameOver();
        requestMenuReturn();
        armAfterScreenChange();
      },
    });

    const menuHandlers = {
      onStart: () => {
        hideMainMenu();
        requestMenuStart();

        handOffActivePointerTo(canvas);
      },
      onSettings: () => {
        hideMainMenu();
        armAfterScreenChange();
        requestMenuSettings();
      },
    };

    const showMenuOverlay = () => {
      armAfterScreenChange();
      showMainMenu(menuHandlers);
    };

    const gateBtn = document.getElementById('gate-btn');
    gateBtn?.addEventListener('click', async () => {
      await loadMenuBackground();
      if (getState() === 'menu') {
        armAfterScreenChange();
        showMenuOverlay();
      }
    });

    onStateChange((state) => {
      if (state === 'menu') {
        loadMenuBackground().then(() => {
          if (getState() === 'menu') {
            armAfterScreenChange();
            showMenuOverlay();
          }
        });
        hideGameOver();
      } else if (state === 'gameover') {
        hideMainMenu();
        const { points, rankText } = getGameOverInfo();
        showGameOver(points, rankText);
      } else {
        hideMainMenu();
        hideGameOver();
      }
    });

  }catch(e:any){
    errorBanner(`BOOT FAIL: ${e?.message||e}`);
    console.error(e);
  }
});
