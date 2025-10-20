import { getState } from './state';
import { createPlayer, updatePlayer, drawPlayer } from '../game/player';
import { applyRenderTransform, computeLayout, VW, VH } from '../engine/viewport';
import { initDebug, drawDebugHUD, toggleDebug } from '../engine/debug';

let running = false;
let raf = 0;
let last = 0;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
const player = createPlayer();
let debugHotkeyBound = false;

export function bootGame(c: HTMLCanvasElement) {
  canvas = c;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D no disponible');
  ctx = g;
  running = false;
  initDebug();

  if (!debugHotkeyBound) {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyF') toggleDebug();
    });
    debugHotkeyBound = true;
  }
}

export function startGame() {
  if (running) return;
  running = true;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

export function stopGame() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
}

function loop(now: number) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (getState() === 'playing') updatePlayer(player, dt);

  const layout = computeLayout();

  const wantW = Math.floor(layout.vwCss * layout.dpr);
  const wantH = Math.floor(layout.vhCss * layout.dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW;
    canvas.height = wantH;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  applyRenderTransform(ctx, layout);
  ctx.fillStyle = '#0b1f33';
  ctx.fillRect(0, 0, VW, VH);

  if (getState() === 'menu') {
    ctx.fillStyle = 'rgba(150,40,40,0.45)';
    ctx.beginPath();
    ctx.arc(VW * 0.5, VH * 0.62, VW * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Break Rush', VW * 0.5, VH * 0.60);
    ctx.font = '18px system-ui';
    ctx.fillStyle = '#9cc2ff';
    ctx.fillText('Tap para jugar', VW * 0.5, VH * 0.68);
  } else {
    drawPlayer(ctx, player);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('PLAYING', VW - 8, 22);
  }

  drawDebugHUD(ctx, dt, layout, canvas);

  raf = requestAnimationFrame(loop);
}
