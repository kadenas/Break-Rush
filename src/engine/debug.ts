import { ViewLayout } from './viewport';
import { getState } from '../core/state';

let enabled = false;
let fpsEMA = 0;
let dropped = 0;

function wantsEnabled(): boolean {
  const query = new URL(location.href).searchParams;
  if (query.has('dbg')) return true;
  if (localStorage.getItem('br_dbg') === '1') return true;
  return false;
}

export function initDebug() {
  enabled = wantsEnabled();
  fpsEMA = 0;
  dropped = 0;
}

export function toggleDebug() {
  enabled = !enabled;
  if (enabled) localStorage.setItem('br_dbg', '1');
  else localStorage.removeItem('br_dbg');
}

export function isDebugEnabled() {
  return enabled;
}

export function drawDebugHUD(
  ctx: CanvasRenderingContext2D,
  dt: number,
  layout: ViewLayout,
  canvas: HTMLCanvasElement,
) {
  if (!enabled) return;

  const ms = Math.max(0, Math.min(200, dt * 1000));
  const fps = 1000 / Math.max(1, ms);
  if (fpsEMA === 0) fpsEMA = fps;
  else fpsEMA += 0.1 * (fps - fpsEMA);
  if (ms > 20) dropped++;

  ctx.save();

  const pad = 6;
  const line = 12;
  const width = 190;
  const height = 5 * line + pad * 2;

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#000';
  ctx.fillRect(8, 8, width, height);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#cde3ff';
  ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
  let y = 8 + pad + 9;

  ctx.fillText(`FPS ${fpsEMA.toFixed(1)}  ms ${ms.toFixed(1)}  drop ${dropped}`, 12, y); y += line;
  ctx.fillText(`state ${getState()}`, 12, y); y += line;
  ctx.fillText(`dpr ${layout.dpr.toFixed(2)}  scale ${layout.scale.toFixed(3)}`, 12, y); y += line;
  ctx.fillText(`off ${layout.offX}|${layout.offY}  virt 360x640`, 12, y); y += line;
  ctx.fillText(`px ${canvas.width}x${canvas.height}`, 12, y);

  ctx.restore();
}
