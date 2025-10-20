import { getState } from './state';
import { createPlayer, updatePlayer, drawPlayer } from '../game/player';
import { applyRenderTransform, computeLayout, VW, VH } from '../engine/viewport';
import { initInput } from '../engine/input';

let running = false;
let raf = 0;
let last = 0;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
const player = createPlayer();

export function bootGame(c: HTMLCanvasElement) {
  canvas = c;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D no disponible');
  ctx = g;
  initInput(canvas);
  running = false;
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
  update(dt);
  render();
  raf = requestAnimationFrame(loop);
}

function update(dt: number) {
  if (getState() === 'playing') updatePlayer(player, dt);
}

function render() {
  const layout = computeLayout(canvas);
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
    ctx.fillText('Break Rush', VW * 0.5, VH * 0.6);
    ctx.font = '18px system-ui';
    ctx.fillStyle = '#9cc2ff';
    ctx.fillText('Tap para jugar', VW * 0.5, VH * 0.68);
    return;
  }

  drawPlayer(ctx, player);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('PLAYING', VW - 8, 22);
}
