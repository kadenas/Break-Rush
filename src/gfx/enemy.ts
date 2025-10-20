import { Enemy } from '../game/enemy';

export const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, pulse: number): void => {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.atan2(enemy.vy, enemy.vx));
  ctx.globalAlpha = 0.9;
  switch (enemy.kind) {
    case 'shard':
      drawShard(ctx, enemy.radius, pulse);
      break;
    case 'blade':
      drawBlade(ctx, enemy.radius, pulse);
      break;
    case 'pulse':
      drawPulse(ctx, enemy.radius, pulse);
      break;
  }
  ctx.restore();
};

const drawShard = (ctx: CanvasRenderingContext2D, radius: number, pulse: number) => {
  ctx.fillStyle = `rgba(255, 64, 100, ${0.8 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(radius * 1.4, 0);
  ctx.lineTo(-radius * 0.7, radius * 0.8);
  ctx.lineTo(-radius * 0.4, -radius * 0.8);
  ctx.closePath();
  ctx.fill();
};

const drawBlade = (ctx: CanvasRenderingContext2D, radius: number, pulse: number) => {
  ctx.fillStyle = `rgba(255, 170, 46, ${0.75 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(radius * 1.6, 0);
  ctx.lineTo(-radius * 0.6, radius * 1.1);
  ctx.lineTo(-radius * 0.6, -radius * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(250, 220, 120, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();
};

const drawPulse = (ctx: CanvasRenderingContext2D, radius: number, pulse: number) => {
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.4);
  gradient.addColorStop(0, `rgba(255, 90, 255, ${0.9})`);
  gradient.addColorStop(1, `rgba(255, 90, 255, ${0.1 + pulse * 0.2})`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (1.1 + pulse * 0.15), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5aff';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
};
