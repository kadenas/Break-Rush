import { Orb, PowerUp } from '../game/powerups';

export const drawOrb = (ctx: CanvasRenderingContext2D, orb: Orb, pulse: number): void => {
  ctx.save();
  ctx.translate(orb.x, orb.y);
  const glow = ctx.createRadialGradient(0, 0, orb.radius * 0.4, 0, 0, orb.radius * 1.6);
  glow.addColorStop(0, `rgba(80, 255, 160, ${0.9 - pulse * 0.2})`);
  glow.addColorStop(1, 'rgba(80, 255, 160, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8affce';
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const drawPowerUp = (ctx: CanvasRenderingContext2D, power: PowerUp, t: number): void => {
  ctx.save();
  ctx.translate(power.x, power.y);
  const baseColor =
    power.type === 'slow' ? '#7dd3ff' : power.type === 'shield' ? '#ffe066' : '#ff7a9e';
  ctx.fillStyle = `rgba(0, 0, 0, 0.25)`;
  ctx.beginPath();
  ctx.ellipse(0, power.radius * 1.1, power.radius, power.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = Math.sin(t * 2 + power.x * 0.1) * 4;
  ctx.translate(0, bob * 0.5);
  ctx.fillStyle = baseColor;
  const r = power.radius;
  ctx.beginPath();
  ctx.moveTo(-r + 12, -r);
  ctx.lineTo(r - 12, -r);
  ctx.quadraticCurveTo(r, -r, r, -r + 12);
  ctx.lineTo(r, r - 12);
  ctx.quadraticCurveTo(r, r, r - 12, r);
  ctx.lineTo(-r + 12, r);
  ctx.quadraticCurveTo(-r, r, -r, r - 12);
  ctx.lineTo(-r, -r + 12);
  ctx.quadraticCurveTo(-r, -r, -r + 12, -r);
  ctx.fill();
  ctx.strokeStyle = '#03121f';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#03121f';
  ctx.font = '16px "Segoe UI", system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbolFor(power.type), 0, 0);
  ctx.restore();
};

const symbolFor = (type: PowerUp['type']): string => {
  switch (type) {
    case 'slow':
      return '⏱';
    case 'shield':
      return '🛡';
    case 'bomb':
      return '💣';
  }
};
