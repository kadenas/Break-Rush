import { getPointer, isKeyDown } from '../engine/input';
import { VW, VH } from '../engine/viewport';

export interface Player {
  x: number;
  y: number;
  r: number;
  speedMax: number;
}

export function createPlayer(): Player {
  return { x: VW / 2, y: VH * 0.8, r: 14, speedMax: 220 };
}

export function updatePlayer(p: Player, dt: number) {
  const pt = getPointer();
  if (pt.active) {
    const k = 0.35;
    p.x += (pt.x - p.x) * k;
    p.y += (pt.y - p.y) * k;
  } else {
    let dx = 0,
      dy = 0;
    if (isKeyDown('ArrowLeft') || isKeyDown('KeyA')) dx -= 1;
    if (isKeyDown('ArrowRight') || isKeyDown('KeyD')) dx += 1;
    if (isKeyDown('ArrowUp') || isKeyDown('KeyW')) dy -= 1;
    if (isKeyDown('ArrowDown') || isKeyDown('KeyS')) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      p.x += dx * p.speedMax * dt;
      p.y += dy * p.speedMax * dt;
    }
  }
  p.x = Math.max(p.r, Math.min(VW - p.r, p.x));
  p.y = Math.max(p.r, Math.min(VH - p.r, p.y));
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(p.x + p.r * 0.15, p.y + p.r * 0.15, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
}
