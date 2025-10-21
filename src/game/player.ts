import { getPointer, isKeyDown } from '../engine/input';
import { VW, VH } from '../engine/viewport';

type TrailPoint = { x: number; y: number };

export interface Player {
  x: number;
  y: number;
  r: number;
  speedMax: number;
  trail: TrailPoint[];
}

export function createPlayer(): Player {
  const player: Player = { x: VW / 2, y: VH * 0.8, r: 14, speedMax: 220, trail: [] };
  resetPlayerTrail(player);
  return player;
}

export function resetPlayerTrail(p: Player) {
  p.trail.length = 0;
  p.trail.push({ x: p.x, y: p.y });
}

const TOUCH_OFFSET = 110; // lift above finger for touch/pen

export function updatePlayer(p: Player, dt: number) {
  const pt = getPointer();
  if (pt.active) {
    const tx = Math.max(p.r, Math.min(VW - p.r, pt.x));
    const desiredY = pt.type === 'mouse' ? pt.y : pt.y - TOUCH_OFFSET;
    const ty = Math.max(p.r, Math.min(VH - p.r, desiredY));
    const k = 0.35;
    p.x += (tx - p.x) * k;
    p.y += (ty - p.y) * k;
  } else {
    let dx=0, dy=0;
    if (isKeyDown('ArrowLeft') || isKeyDown('KeyA')) dx -= 1;
    if (isKeyDown('ArrowRight')|| isKeyDown('KeyD')) dx += 1;
    if (isKeyDown('ArrowUp')   || isKeyDown('KeyW')) dy -= 1;
    if (isKeyDown('ArrowDown') || isKeyDown('KeyS')) dy += 1;
    if (dx || dy) {
      const n = Math.hypot(dx,dy) || 1; dx/=n; dy/=n;
      p.x += dx * p.speedMax * dt;
      p.y += dy * p.speedMax * dt;
    }
  }
  p.x = Math.max(p.r, Math.min(VW - p.r, p.x));
  p.y = Math.max(p.r, Math.min(VH - p.r, p.y));

  const trail = p.trail;
  const last = trail[trail.length - 1];
  if (!last || last.x !== p.x || last.y !== p.y) {
    trail.push({ x: p.x, y: p.y });
    if (trail.length > 12) trail.shift();
  }
}

export function drawTrail(ctx: CanvasRenderingContext2D, p: Player) {
  const len = p.trail.length - 1;
  if (len <= 0) return;

  for (let i = 0; i < len; i++) {
    const point = p.trail[len - i - 1];
    const t = (i + 1) / (len + 1);
    const radius = p.r * (0.6 - 0.35 * t);
    const alpha = 0.45 * (1 - t);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#5dd0ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, alpha = 1) {
  // soft ground halo
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(p.x, p.y + p.r*0.35, p.r*1.35, 0, Math.PI*2); ctx.fillStyle = '#052236'; ctx.fill();
  ctx.globalAlpha = alpha;

  // glossy gradient
  const g = ctx.createRadialGradient(p.x - p.r*0.35, p.y - p.r*0.35, p.r*0.1, p.x, p.y, p.r);
  g.addColorStop(0.00,'#e9ffff');
  g.addColorStop(0.25,'#bffbff');
  g.addColorStop(0.60,'#46e6f4');
  g.addColorStop(1.00,'#00cfe0');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();

  // rim light
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r-0.8, -Math.PI*0.2, Math.PI*0.2); ctx.stroke();

  // specular
  ctx.globalAlpha = Math.min(0.85, alpha);
  ctx.beginPath(); ctx.arc(p.x - p.r*0.35, p.y - p.r*0.38, p.r*0.28, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.globalAlpha = 1;
}
