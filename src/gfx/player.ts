import { PlayerSnapshot } from '../game/player';

export const drawPlayer = (ctx: CanvasRenderingContext2D, player: PlayerSnapshot, alpha: number): void => {
  ctx.save();
  ctx.translate(player.x, player.y);
  const baseRadius = player.radius * (0.9 + alpha * 0.1);
  const gradient = ctx.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius * 1.3);
  gradient.addColorStop(0, 'rgba(11, 215, 255, 0.95)');
  gradient.addColorStop(1, 'rgba(3, 18, 31, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0bd7ff';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#03121f';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  if (player.shield > 0) {
    ctx.strokeStyle = player.shield === 2 ? '#ffe066' : '#75f0ff';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};
