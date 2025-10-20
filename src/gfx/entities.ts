import type { Enemy, Orb, Particle, Player, PowerUp } from '../game/types';
import type { ThemeColors } from '../ui/theme';

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  theme: ThemeColors,
  halo: number
): void {
  ctx.save();
  ctx.translate(player.position.x, player.position.y);
  if (halo > 0) {
    const radius = player.radius + halo * 22;
    const gradient = ctx.createRadialGradient(0, 0, player.radius * 0.2, 0, 0, radius);
    gradient.addColorStop(0, `${theme.accentSecondary}`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const bodyGradient = ctx.createRadialGradient(0, -player.radius * 0.5, player.radius, 0, 0, player.radius);
  bodyGradient.addColorStop(0, theme.accentSecondary);
  bodyGradient.addColorStop(1, theme.accent);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  if (player.shield > 0) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.shield;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, theme: ThemeColors): void {
  ctx.save();
  ctx.translate(enemy.position.x, enemy.position.y);
  ctx.rotate(Math.atan2(enemy.velocity.y, enemy.velocity.x) + Math.PI / 2);
  ctx.fillStyle = theme.enemy;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.radius * 1.3);
  ctx.lineTo(enemy.radius * 0.8, enemy.radius * 1.1);
  ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
  ctx.restore();
}

export function drawOrb(ctx: CanvasRenderingContext2D, orb: Orb, theme: ThemeColors): void {
  ctx.save();
  ctx.translate(orb.position.x, orb.position.y);
  const gradient = ctx.createRadialGradient(0, 0, orb.radius * 0.2, 0, 0, orb.radius);
  gradient.addColorStop(0, theme.orb);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.orb;
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPowerUp(ctx: CanvasRenderingContext2D, power: PowerUp, theme: ThemeColors): void {
  ctx.save();
  ctx.translate(power.position.x, power.position.y);
  ctx.rotate((performance.now() / 500) % (Math.PI * 2));
  ctx.strokeStyle = theme.accentSecondary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(-power.radius, -power.radius, power.radius * 2, power.radius * 2);
  ctx.stroke();
  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = 0.65;
  ctx.fillRect(-power.radius * 0.6, -power.radius * 0.6, power.radius * 1.2, power.radius * 1.2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.foreground;
  ctx.font = `${power.radius}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = power.type === 'slow' ? 'S' : power.type === 'shield' ? '⛨' : '⚡';
  ctx.fillText(label, 0, 2);
  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  ctx.save();
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.position.x, particle.position.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
