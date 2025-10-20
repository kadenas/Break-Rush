import { RNG } from '../core/rng';
import { AudioSystem } from '../engine/audio';
import { nearMiss, overlaps } from '../engine/collisions';
import { Haptics } from '../engine/haptics';
import { InputSystem } from '../engine/input';
import { drawBackground, drawNearMissHalo } from '../gfx/common';
import { drawEnemy } from '../gfx/enemy';
import { drawOrb, drawPowerUp } from '../gfx/orb';
import { drawPlayer } from '../gfx/player';
import { Particle, drawParticles, spawnBurst, updateParticles } from '../gfx/particles';
import { Enemy, updateEnemy } from './enemy';
import { Player, PlayerSnapshot } from './player';
import { Orb, PowerUp } from './powerups';
import { ScoreSnapshot, ScoreSystem } from './scoring';
import { Spawner } from './spawner';

export interface WorldOptions {
  rng: RNG;
  audio: AudioSystem;
  haptics: Haptics;
  input: InputSystem;
}

export interface WorldSnapshot {
  player: PlayerSnapshot;
  score: ScoreSnapshot;
  elapsed: number;
  slowFactor: number;
}

export class GameWorld {
  private player = new Player();
  private score = new ScoreSystem();
  private spawner: Spawner;
  private enemies: Enemy[] = [];
  private orbs: Orb[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private elapsed = 0;
  private slowTimer = 0;
  private slowFactor = 1;
  private nearMissFlash = 0;
  private dead = false;

  constructor(private options: WorldOptions) {
    this.spawner = new Spawner(options.rng);
  }

  reset(): void {
    this.player.reset();
    this.score.reset();
    this.spawner.reset();
    this.enemies = [];
    this.orbs = [];
    this.powerUps = [];
    this.particles = [];
    this.elapsed = 0;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.nearMissFlash = 0;
    this.dead = false;
  }

  update(dt: number): boolean {
    if (this.dead) return true;
    this.elapsed += dt;
    this.score.tick(dt);
    this.updateSlow(dt);

    const target = this.options.input.getTarget();
    if (target.active) {
      const x = target.x * 360;
      const y = target.y * 640;
      this.player.setTarget(x, y);
    }
    this.player.update(dt, this.slowFactor);

    this.spawner.update(dt, this.elapsed, {
      enemy: (enemy) => this.enemies.push(enemy),
      orb: (orb) => this.orbs.push(orb),
      power: (power) => this.powerUps.push(power),
    });

    this.enemies.forEach((enemy) => updateEnemy(enemy, dt, this.slowFactor));
    this.orbs.forEach((orb) => {
      orb.radius = 12 + Math.sin((this.elapsed + orb.x) * 0.8) * 2;
    });
    this.powerUps.forEach((power) => {
      power.time += dt;
    });

    this.handleCollisions();

    updateParticles(this.particles, dt);

    this.enemies = this.enemies.filter((enemy) => enemy.active);
    this.orbs = this.orbs.filter((orb) => orb.active);
    this.powerUps = this.powerUps.filter((power) => power.active);

    this.nearMissFlash = Math.max(0, this.nearMissFlash - dt * 1.5);
    return this.dead;
  }

  private updateSlow(dt: number): void {
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
    }
    const wasSlow = this.slowFactor < 1;
    this.slowFactor = this.slowTimer > 0 ? 0.45 : 1;
    const isSlow = this.slowFactor < 1;
    if (wasSlow !== isSlow) {
      this.options.audio.play(isSlow ? 'slow-on' : 'slow-off');
    }
  }

  private handleCollisions(): void {
    if (this.dead) return;
    const playerBody = this.player.snapshot();
    const nearThreshold = 38;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const enemyBody = { x: enemy.x, y: enemy.y, radius: enemy.radius };
      if (overlaps(playerBody, enemyBody)) {
        if (this.player.invulnerableTime > 0) {
          enemy.active = false;
          continue;
        }
        const lethal = this.player.takeHit();
        this.options.audio.play('hit');
        this.options.haptics.pulse([0, 60, 30, 60]);
        spawnBurst(this.options.rng, this.particles, enemy.x, enemy.y, 20, 'rgba(255,64,120,ALPHA)');
        enemy.active = false;
        this.score.breakCombo();
        if (lethal) {
          this.dead = true;
          return;
        }
        continue;
      }
      if (!enemy.nearMissed && nearMiss(playerBody, enemyBody, nearThreshold)) {
        enemy.nearMissed = true;
        this.nearMissFlash = 1;
        this.score.registerNearMiss(enemy.danger);
        this.options.audio.play('near-miss');
        this.options.haptics.pulse(30);
      }
    }

    for (const orb of this.orbs) {
      if (!orb.active) continue;
      if (overlaps(playerBody, orb)) {
        orb.active = false;
        this.score.registerOrb(orb.value);
        this.options.audio.play('pickup');
        this.options.haptics.pulse(15);
        spawnBurst(this.options.rng, this.particles, orb.x, orb.y, 12, 'rgba(120,255,200,ALPHA)', 60);
      }
    }

    for (const power of this.powerUps) {
      if (!power.active) continue;
      if (overlaps(playerBody, power)) {
        power.active = false;
        switch (power.type) {
          case 'slow':
            this.slowTimer = 2;
            break;
          case 'shield':
            this.player.addShieldLayer();
            break;
          case 'bomb':
            this.clearEnemies();
            break;
        }
        this.options.audio.play(power.type === 'slow' ? 'slow-on' : power.type === 'shield' ? 'pickup' : 'bomb');
        this.options.haptics.pulse([0, 25, 40, 25]);
      }
    }
  }

  private clearEnemies(): void {
    this.enemies.forEach((enemy) => {
      if (enemy.active) {
        spawnBurst(this.options.rng, this.particles, enemy.x, enemy.y, 18, 'rgba(255,120,180,ALPHA)', 120);
      }
    });
    this.enemies = [];
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    drawBackground(ctx, 360, 640, this.elapsed);
    drawParticles(ctx, this.particles);
    this.orbs.forEach((orb) => drawOrb(ctx, orb, Math.sin(this.elapsed + orb.x * 0.02) * 0.5 + 0.5));
    this.powerUps.forEach((power) => drawPowerUp(ctx, power, this.elapsed));
    const pulse = Math.sin(this.elapsed * 3) * 0.5 + 0.5;
    this.enemies.forEach((enemy) => drawEnemy(ctx, enemy, pulse));
    const playerSnapshot = this.player.snapshot();
    if (this.nearMissFlash > 0) {
      drawNearMissHalo(ctx, playerSnapshot.x, playerSnapshot.y, playerSnapshot.radius, 1 - this.nearMissFlash);
    }
    drawPlayer(ctx, playerSnapshot, alpha);
  }

  snapshot(): WorldSnapshot {
    return {
      player: this.player.snapshot(),
      score: this.score.snapshot(),
      elapsed: this.elapsed,
      slowFactor: this.slowFactor,
    };
  }
}
