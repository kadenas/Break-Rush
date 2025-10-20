import { ViewLayout, VW, VH } from './viewport';
import { getState } from '../core/state';

type Stats = {
  fps: number;          // EMA
  ms: number;           // last frame ms
  dropped: number;      // accumulated frames with dt > 20ms
  frames: number;       // total frames since start
};

let box: HTMLDivElement | null = null;
let enabled = false;
const stats: Stats = { fps: 0, ms: 0, dropped: 0, frames: 0 };

function wantEnabledFromEnv(): boolean {
  const u = new URL(location.href);
  if (u.searchParams.has('dbg')) return true;
  if (localStorage.getItem('br_dbg') === '1') return true;
  return false;
}

export function isDebugEnabled() { return enabled; }

export function initDebug() {
  enabled = wantEnabledFromEnv();
  if (!enabled) return;

  box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed',
    left: '8px',
    top: '8px',
    zIndex: '99',
    background: 'rgba(0,0,0,0.55)',
    color: '#cde3ff',
    font: '12px ui-monospace, Menlo, Consolas, monospace',
    padding: '6px 8px',
    borderRadius: '8px',
    pointerEvents: 'none',
    whiteSpace: 'pre',
    lineHeight: '1.25',
  } as CSSStyleDeclaration);
  document.body.appendChild(box);
}

export function toggleDebug() {
  enabled = !enabled;
  if (enabled) {
    localStorage.setItem('br_dbg', '1');
    if (!box) initDebug();
    if (box) box.style.display = 'block';
  } else {
    localStorage.removeItem('br_dbg');
    if (box) box.style.display = 'none';
  }
}

export function updateDebug(dt: number, layout: ViewLayout, canvas: HTMLCanvasElement) {
  if (!enabled || !box) return;

  // frametime and FPS (EMA)
  const ms = Math.max(0, Math.min(200, dt * 1000));
  stats.ms = ms;
  stats.frames++;
  const alpha = 0.1;
  if (stats.fps === 0) stats.fps = 1000 / Math.max(1, ms);
  else stats.fps = stats.fps + alpha * ((1000 / Math.max(1, ms)) - stats.fps);
  if (ms > 20) stats.dropped++;

  // memory (optional)
  let mem = '';
  const pm = (performance as any).memory;
  if (pm && pm.usedJSHeapSize && pm.jsHeapSizeLimit) {
    const used = Math.round(pm.usedJSHeapSize / 1048576);
    const limit = Math.round(pm.jsHeapSizeLimit / 1048576);
    mem = ` | mem ${used}/${limit} MB`;
  }

  box.textContent =
    `FPS ${stats.fps.toFixed(1)}  ` +
    `ms ${stats.ms.toFixed(1)}  ` +
    `drop ${stats.dropped}\n` +
    `state ${getState()}\n` +
    `dpr ${layout.dpr.toFixed(2)}  scale ${layout.scale.toFixed(3)}\n` +
    `off ${layout.offX}|${layout.offY}  virt ${VW}x${VH}\n` +
    `px ${canvas.width}x${canvas.height}${mem}`;
}
