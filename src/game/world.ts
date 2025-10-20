import { InputSnapshot } from '../engine/input';
import type { SettingsData } from '../storage/settings';
import { add, angleToVector, clamp, distance, normalize, randRange, scale } from '../utils/math';
import type {
  Enemy,
  GameEvents,
  GameMetrics,
  Orb,
  Particle,
  Player,
  PowerUp,
  PowerUpType
} from './types';

let idCounter = 1;

function nextId(): number {
  return idCounter++;
}

export class GameWorld {
  readonly player: Player;
  readonly enemies: Enemy[] = [];
  readonly powerUps: PowerUp[] = [];
  readonly orbs: Orb[] = [];
  readonly particles: Particle[] = [];
  metrics: GameMetrics;
  haloIntensity = 0;

  private spawnTimer = 1;
  private orbTimer = 3;
  private powerTimer = 6;
  private laneTargetX: number | null = null;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly events: GameEvents
  ) {
    this.player = {
      position: { x: width / 2, y: height * 0.8 },
      velocity: { x: 0, y: 0 },
      radius: 16,
      shield: 0,
      slowTime: 0
    };
    this.metrics = {
      score: 0,
      highScore: 0,
      combo: 0,
      multiplier: 1,
      dangerTime: 0,
      timeElapsed: 0,
      lives: 3
    };
  }

  reset(highScore: number): void {
    this.metrics = {
      score: 0,
      highScore,
      combo: 0,
      multiplier: 1,
      dangerTime: 0,
      timeElapsed: 0,
      lives: 3
    };
    this.enemies.length = 0;
    this.orbs.length = 0;
    this.powerUps.length = 0;
    this.particles.length = 0;
    this.haloIntensity = 0;
    this.player.position = { x: this.width / 2, y: this.height * 0.8 };
    this.player.velocity = { x: 0, y: 0 };
    this.player.shield = 0;
    this.player.slowTime = 0;
    this.spawnTimer = 1;
    this.orbTimer = 3;
    this.powerTimer = 6;
    this.laneTargetX = null;
  }

  update(dt: number, input: InputSnapshot, settings: SettingsData): { gameOver: boolean } {
    const prevPos = { ...this.player.position };
    this.metrics.timeElapsed += dt;
    this.player.slowTime = Math.max(0, this.player.slowTime - dt);
    this.haloIntensity = Math.max(0, this.haloIntensity - dt * 2);
    this.metrics.dangerTime = Math.max(0, this.metrics.dangerTime - dt * 1.2);

    if (input.pointerActive) {
      this.player.position = add(this.player.position, input.pointerDelta);
      this.laneTargetX = null;
    } else if (input.laneTap !== null && settings.useLaneMode) {
      const laneWidth = this.width / 3;
      this.laneTargetX = laneWidth * (input.laneTap + 0.5);
    }

    if (!input.pointerActive && this.laneTargetX !== null) {
      const dx = this.laneTargetX - this.player.position.x;
      this.player.position.x += clamp(dx, -200 * dt, 200 * dt);
      if (Math.abs(dx) < 2) {
        this.laneTargetX = null;
      }
    }

    const keyboard = input.keyboardDirection;
    if (!input.pointerActive && (keyboard.x !== 0 || keyboard.y !== 0)) {
      const dir = normalize(keyboard);
      const speed = 180;
      this.player.position.x += dir.x * speed * dt;
      this.player.position.y += dir.y * speed * dt;
    }

    this.player.position.x = clamp(this.player.position.x, this.player.radius, this.width - this.player.radius);
    this.player.position.y = clamp(this.player.position.y, this.player.radius, this.height - this.player.radius);
    const safeDt = dt > 0 ? dt : 0.016;
    this.player.velocity = {
      x: (this.player.position.x - prevPos.x) / safeDt,
      y: (this.player.position.y - prevPos.y) / safeDt
    };

    this.spawnTimer -= dt;
    this.orbTimer -= dt;
    this.powerTimer -= dt;

    const difficulty = 1 + this.metrics.timeElapsed * 0.1;
    const slowFactor = this.player.slowTime > 0 ? 0.45 : 1;

    if (this.spawnTimer <= 0) {
      this.spawnEnemy(difficulty);
      const base = Math.max(0.35, 1 - this.metrics.timeElapsed * 0.02);
      this.spawnTimer = base;
    }

    if (this.orbTimer <= 0) {
      this.spawnOrb();
      this.orbTimer = randRange(4, 8);
    }

    if (this.powerTimer <= 0) {
      this.spawnPowerUp();
      this.powerTimer = randRange(10, 16);
    }

    for (const enemy of this.enemies) {
      enemy.position = add(enemy.position, scale(enemy.velocity, dt * slowFactor));
      enemy.lifetime += dt;
    }

    for (const orb of this.orbs) {
      orb.lifetime -= dt;
    }

    for (const power of this.powerUps) {
      power.duration -= dt;
    }

    this.resolveCollisions();

    this.cleanup();

    this.metrics.score += dt * 12 * this.metrics.multiplier;
    this.metrics.highScore = Math.max(this.metrics.highScore, Math.floor(this.metrics.score));

    this.updateParticles(dt);

    return { gameOver: this.metrics.lives <= 0 };
  }

  private resolveCollisions(): void {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const dist = distance(enemy.position, this.player.position);
      const sum = enemy.radius + this.player.radius;
      if (dist < sum) {
        if (this.player.shield > 0) {
          this.player.shield -= 1;
          this.events.onPower('shield');
          this.spawnParticles(enemy.position, '#9dffb0', 18);
        } else {
          this.metrics.lives -= 1;
          this.metrics.combo = 0;
          this.metrics.multiplier = 1;
          this.events.onHit();
          this.spawnParticles(enemy.position, '#ff3366', 24);
        }
        this.enemies.splice(i, 1);
        continue;
      }
      if (!enemy.nearMissed && dist < sum + 26) {
        enemy.nearMissed = true;
        this.metrics.combo += 1;
        this.metrics.multiplier = 1 + this.metrics.combo * 0.2;
        this.haloIntensity = 1;
        this.metrics.score += 15 * this.metrics.multiplier;
        this.events.onCombo(this.metrics.multiplier);
        this.metrics.dangerTime = 0.6;
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i -= 1) {
      const power = this.powerUps[i];
      if (distance(power.position, this.player.position) < power.radius + this.player.radius) {
        this.applyPower(power.type);
        this.powerUps.splice(i, 1);
        continue;
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const orb = this.orbs[i];
      if (distance(orb.position, this.player.position) < orb.radius + this.player.radius) {
        const value = Math.round(40 * this.metrics.multiplier);
        this.metrics.score += value;
        this.events.onScore(value);
        this.events.onOrb();
        this.orbs.splice(i, 1);
        this.spawnParticles(orb.position, '#ffd166', 14);
      }
    }
  }

  private cleanup(): void {
    const margin = 48;
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      if (
        e.position.x < -margin ||
        e.position.y < -margin ||
        e.position.x > this.width + margin ||
        e.position.y > this.height + margin ||
        e.lifetime > 12
      ) {
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i -= 1) {
      if (this.powerUps[i].duration <= 0) {
        this.powerUps.splice(i, 1);
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      if (this.orbs[i].lifetime <= 0) {
        this.orbs.splice(i, 1);
      }
    }
  }

  private spawnEnemy(difficulty: number): void {
    const edge = Math.floor(Math.random() * 4);
    const radius = randRange(14, 28);
    let position = { x: 0, y: 0 };
    const speed = randRange(60, 90) * difficulty;
    switch (edge) {
      case 0:
        position = { x: randRange(0, this.width), y: -radius };
        break;
      case 1:
        position = { x: this.width + radius, y: randRange(0, this.height) };
        break;
      case 2:
        position = { x: randRange(0, this.width), y: this.height + radius };
        break;
      default:
        position = { x: -radius, y: randRange(0, this.height) };
    }
    const target = {
      x: this.player.position.x + randRange(-40, 40),
      y: this.player.position.y + randRange(-60, 60)
    };
    const direction = normalize({ x: target.x - position.x, y: target.y - position.y });
    this.enemies.push({
      position,
      velocity: scale(direction, speed),
      radius,
      dangerous: true,
      nearMissed: false,
      lifetime: 0
    });
  }

  private spawnPowerUp(): void {
    const typePool: PowerUpType[] = ['slow', 'shield', 'bomb'];
    const type = typePool[Math.floor(Math.random() * typePool.length)];
    const position = {
      x: randRange(40, this.width - 40),
      y: randRange(80, this.height - 120)
    };
    this.powerUps.push({
      id: nextId(),
      type,
      position,
      radius: 18,
      duration: randRange(6, 10)
    });
  }

  private spawnOrb(): void {
    this.orbs.push({
      id: nextId(),
      position: {
        x: randRange(30, this.width - 30),
        y: randRange(60, this.height - 80)
      },
      radius: 10,
      lifetime: randRange(5, 8)
    });
  }

  private applyPower(type: PowerUpType): void {
    switch (type) {
      case 'slow':
        this.player.slowTime = 2.2;
        break;
      case 'shield':
        this.player.shield = Math.min(2, this.player.shield + 1);
        break;
      case 'bomb':
        this.spawnParticles(this.player.position, '#6cfafc', 32);
        this.enemies.length = 0;
        break;
    }
    this.events.onPower(type);
  }

  private spawnParticles(origin: { x: number; y: number }, color: string, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(40, 120);
      const velocity = angleToVector(angle);
      this.particles.push({
        position: { ...origin },
        velocity: scale(velocity, speed),
        life: randRange(0.4, 0.8),
        color
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      p.position = add(p.position, scale(p.velocity, dt));
      p.velocity = scale(p.velocity, 0.96);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}
