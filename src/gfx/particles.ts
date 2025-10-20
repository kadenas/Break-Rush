import { randRange } from '../utils/math';
import { RNG } from '../core/rng';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export const spawnBurst = (
  rng: RNG,
  particles: Particle[],
  x: number,
  y: number,
  count: number,
  color: string,
  speed = 80
): void => {
  for (let i = 0; i < count; i++) {
    const angle = randRange(rng, 0, Math.PI * 2);
    const magnitude = randRange(rng, speed * 0.5, speed);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life: 0,
      maxLife: randRange(rng, 0.4, 0.9),
      color,
    });
  }
};

export const updateParticles = (particles: Particle[], dt: number): void => {
  for (const particle of particles) {
    particle.life += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
  }
  particles.splice(0, particles.length, ...particles.filter((p) => p.life < p.maxLife));
};

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: readonly Particle[]): void => {
  ctx.save();
  particles.forEach((p) => {
    const alpha = 1 - p.life / p.maxLife;
    ctx.fillStyle = p.color.replace('ALPHA', alpha.toFixed(2));
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + 2 * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};
