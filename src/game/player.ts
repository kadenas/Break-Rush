import { getPointer, isKeyDown } from '../engine/input';
import { clamp } from '../utils/math';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

export interface Player {
  x: number;
  y: number;
  r: number;
  tx: number;
  ty: number;
  speedMax: number;
}

export const createPlayer = (): Player => {
  const startX = VIRTUAL_WIDTH / 2;
  const startY = 520;

  return {
    x: startX,
    y: startY,
    r: 14,
    tx: startX,
    ty: startY,
    speedMax: 220,
  };
};

export const updatePlayer = (player: Player, dt: number): void => {
  const pointer = getPointer();

  if (pointer.active) {
    player.tx = clamp(pointer.x, player.r, VIRTUAL_WIDTH - player.r);
    player.ty = clamp(pointer.y, player.r, VIRTUAL_HEIGHT - player.r);

    const follow = 1 - Math.exp(-dt * 14);
    player.x += (player.tx - player.x) * follow;
    player.y += (player.ty - player.y) * follow;
  } else {
    let dx = 0;
    let dy = 0;

    if (isKeyDown('ArrowLeft') || isKeyDown('KeyA')) {
      dx -= 1;
    }
    if (isKeyDown('ArrowRight') || isKeyDown('KeyD')) {
      dx += 1;
    }
    if (isKeyDown('ArrowUp') || isKeyDown('KeyW')) {
      dy -= 1;
    }
    if (isKeyDown('ArrowDown') || isKeyDown('KeyS')) {
      dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;

      player.x += dx * player.speedMax * dt;
      player.y += dy * player.speedMax * dt;

      player.tx = player.x;
      player.ty = player.y;
    }
  }

  player.x = clamp(player.x, player.r, VIRTUAL_WIDTH - player.r);
  player.y = clamp(player.y, player.r, VIRTUAL_HEIGHT - player.r);
};

export const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  dpr: number
): void => {
  const px = player.x * dpr;
  const py = player.y * dpr;
  const radius = player.r * dpr;

  ctx.save();

  ctx.fillStyle = 'rgba(6, 22, 36, 0.35)';
  ctx.beginPath();
  ctx.arc(px, py + radius * 0.55, radius * 1.05, 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createRadialGradient(
    px - radius * 0.4,
    py - radius * 0.6,
    radius * 0.25,
    px,
    py,
    radius
  );
  gradient.addColorStop(0, '#e0faff');
  gradient.addColorStop(0.5, '#5eead4');
  gradient.addColorStop(1, '#0891b2');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
