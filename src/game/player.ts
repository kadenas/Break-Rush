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

const TOUCH_OFFSET = 72; // virtual px above the finger

export function updatePlayer(p: Player, dt: number) {
  const pt = getPointer();

  if (pt.active) {
    const targetX = pt.x;
    const targetY = pt.type === 'touch' ? pt.y - TOUCH_OFFSET : pt.y;

    const tx = Math.max(p.r, Math.min(VW - p.r, targetX));
    const ty = Math.max(p.r, Math.min(VH - p.r, targetY));

    const k = 0.35;
    p.x += (tx - p.x) * k;
    p.y += (ty - p.y) * k;
  } else {
    let dx = 0;
    let dy = 0;
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
  // soft halo shadow beneath the player
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(p.x, p.y + p.r * 0.35, p.r * 1.35, 0, Math.PI * 2);
  ctx.fillStyle = '#052236';
  ctx.fill();
  ctx.globalAlpha = 1;

  const grad = ctx.createRadialGradient(
    p.x - p.r * 0.35,
    p.y - p.r * 0.35,
    p.r * 0.1,
    p.x,
    p.y,
    p.r
  );
  grad.addColorStop(0.0, '#e9ffff');
  grad.addColorStop(0.25, '#bffbff');
  grad.addColorStop(0.6, '#46e6f4');
  grad.addColorStop(1.0, '#00cfe0');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r - 0.8, -Math.PI * 0.2, Math.PI * 0.2);
  ctx.stroke();

  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.38, p.r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.globalAlpha = 1;
}
