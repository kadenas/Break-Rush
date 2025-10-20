import { clamp } from '../utils/math';

export type EnemyKind = 'shard' | 'blade' | 'pulse';

export interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  speed: number;
  danger: number;
  active: boolean;
  nearMissed: boolean;
}

export const createEnemy = (kind: EnemyKind, x: number, y: number, angle: number, speed: number): Enemy => {
  const radius = kind === 'blade' ? 26 : kind === 'pulse' ? 20 : 16;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  return {
    kind,
    x,
    y,
    radius,
    vx,
    vy,
    speed,
    danger: clamp(speed / 160, 0.4, 1.2),
    active: true,
    nearMissed: false,
  };
};

export const updateEnemy = (enemy: Enemy, dt: number, slowFactor: number): void => {
  enemy.x += enemy.vx * dt * slowFactor;
  enemy.y += enemy.vy * dt * slowFactor;
  const margin = 64;
  if (enemy.x < -margin || enemy.x > 360 + margin || enemy.y < -margin || enemy.y > 640 + margin) {
    enemy.active = false;
  }
};
