import { computeLayout } from './engine/viewport';
import { initInput } from './engine/input';
import { initControls } from './engine/controls';
import { bootGame } from './core/game';
import { installGlobalErrorOverlay, errorBanner } from './boot/errorOverlay';

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
    const canvas = qs<HTMLCanvasElement>('#game');
    sizeCanvas(canvas);
    window.addEventListener('resize', ()=>sizeCanvas(canvas));
    (window as any).visualViewport?.addEventListener('resize', ()=>sizeCanvas(canvas));

    // Arranque del juego SIEMPRE
    initInput(canvas);
    initControls(canvas);
    bootGame(canvas);

  }catch(e:any){
    errorBanner(`BOOT FAIL: ${e?.message||e}`);
    console.error(e);
  }
});
