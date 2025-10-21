import { computeLayout } from './engine/viewport';
import { initInput } from './engine/input';
import { initControls } from './engine/controls';
import { bootGame, startGame } from './core/game';
import { setState } from './core/state';
import { installGlobalErrorOverlay, errorBanner } from './boot/errorOverlay';

function sizeCanvas(c: HTMLCanvasElement){
  const L = computeLayout();
  c.width  = Math.floor(L.vwCss * L.dpr);
  c.height = Math.floor(L.vhCss * L.dpr);
  Object.assign(c.style, { position:'fixed', left:'0px', top:'0px', width:'100vw', height:'100vh' } as CSSStyleDeclaration);
}
function qs<T extends HTMLElement>(sel:string){ const el=document.querySelector(sel) as T|null; if(!el) throw new Error(`No encontrado: ${sel}`); return el; }

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
    startGame();

    // Botón del gate directo
    const gate = document.getElementById('gate');
    const btn  = document.getElementById('gate-btn');
    const fire = ()=>{ try{ setState('menu'); }catch{}; gate?.remove(); };
    btn?.addEventListener('pointerdown', fire, { once:true });
    btn?.addEventListener('click', fire, { once:true });
  }catch(e:any){
    errorBanner(`BOOT FAIL: ${e?.message||e}`);
    console.error(e);
  }
});
