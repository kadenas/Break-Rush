import { RNG } from '../core/rng';
import { randRange } from '../utils/math';
import { createEnemy, Enemy, EnemyKind } from './enemy';
import { createOrb, createPowerUp, Orb, PowerUp } from './powerups';

export interface SpawnCallbacks {
  enemy: (enemy: Enemy) => void;
  orb: (orb: Orb) => void;
  power: (power: PowerUp) => void;
}

export class Spawner {
  private enemyTimer = 0;
  private orbTimer = 4;
  private powerTimer = 12;
  private burstCooldown = 6;

  constructor(private rng: RNG) {}

  reset(): void {
    this.enemyTimer = 0.5;
    this.orbTimer = 4;
    this.powerTimer = 10;
    this.burstCooldown = 4;
  }

  update(dt: number, elapsed: number, callbacks: SpawnCallbacks): void {
    const difficulty = Math.min(1, elapsed / 60);
    const spawnRate = 1.1 - difficulty * 0.6;
    this.enemyTimer -= dt;
    this.orbTimer -= dt;
    this.powerTimer -= dt;
    this.burstCooldown -= dt;

    if (this.enemyTimer <= 0) {
      this.enemyTimer = randRange(this.rng, spawnRate * 0.6, spawnRate * 1.2);
      const batch = this.burstCooldown <= 0 && this.rng() > 0.7;
      if (batch) {
        this.burstCooldown = randRange(this.rng, 4, 7);
        const count = 4 + Math.floor(this.rng() * 3);
        const baseAngle = this.rng() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          callbacks.enemy(this.makeEnemy(baseAngle + (i / count) * Math.PI * 2, difficulty));
        }
      } else {
        callbacks.enemy(this.makeEnemy(this.rng() * Math.PI * 2, difficulty));
      }
    }

    if (this.orbTimer <= 0) {
      this.orbTimer = randRange(this.rng, 6, 9);
      callbacks.orb(this.makeOrb());
    }

    if (this.powerTimer <= 0) {
      this.powerTimer = randRange(this.rng, 12, 18);
      callbacks.power(this.makePowerUp());
    }
  }

  private makeEnemy(direction: number, difficulty: number): Enemy {
    const speed = 140 + difficulty * 180;
    const kind: EnemyKind = this.rng() > 0.6 ? (this.rng() > 0.75 ? 'blade' : 'pulse') : 'shard';
    const spawnRadius = 420;
    const x = 180 + Math.cos(direction) * spawnRadius;
    const y = 320 + Math.sin(direction) * spawnRadius;
    const targetOffset = (this.rng() - 0.5) * 120;
    const targetX = 180 + targetOffset;
    const targetY = this.rng() > 0.5 ? 540 : 320;
    const angle = Math.atan2(targetY - y, targetX - x);
    return createEnemy(kind, x, y, angle, speed);
  }

  private makeOrb(): Orb {
    const x = randRange(this.rng, 60, 300);
    const y = randRange(this.rng, 220, 580);
    return createOrb(x, y, 40 + Math.floor(this.rng() * 40));
  }

  private makePowerUp(): PowerUp {
    const roll = this.rng();
    const type = roll > 0.66 ? 'bomb' : roll > 0.33 ? 'slow' : 'shield';
    const x = randRange(this.rng, 70, 290);
    const y = randRange(this.rng, 200, 560);
    return createPowerUp(type, x, y);
  }
}
