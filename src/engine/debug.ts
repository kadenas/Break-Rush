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

  const lines = [
    `FPS ${fpsEMA.toFixed(1)}  ms ${ms.toFixed(1)}  drop ${dropped}`,
    `state ${getState()}`,
    `dpr ${layout.dpr.toFixed(2)}  scale ${layout.scaleX.toFixed(3)}x${layout.scaleY.toFixed(3)}`,
    `offset ${layout.offsetX}|${layout.offsetY}  virt ${layout.vwVirt}x${layout.vhVirt}`,
    `css ${layout.vwCss.toFixed(0)}x${layout.vhCss.toFixed(0)}  px ${canvas.width}x${canvas.height}`,
  ];

  ctx.save();
  ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const padX = 12;
  const padY = 10;
  const lineGap = 2;
  const boxX = 8;
  const boxY = 8;

  const fontMetrics = ctx.measureText('M');
  const ascent = fontMetrics.actualBoundingBoxAscent ?? 8;
  const descent = fontMetrics.actualBoundingBoxDescent ?? 2;
  const baseHeight = ascent + descent;
  const textBlockHeight = baseHeight * lines.length + lineGap * Math.max(0, lines.length - 1);

  const maxTextWidth = lines.reduce((width, text) => Math.max(width, ctx.measureText(text).width), 0);
  const boxW = Math.ceil(maxTextWidth + padX * 2);
  const boxH = Math.ceil(textBlockHeight + padY * 2);

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#000';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#cde3ff';
  let y = boxY + padY + ascent;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], boxX + padX, y);
    y += baseHeight;
    if (i < lines.length - 1) y += lineGap;
  }

  ctx.restore();
}
