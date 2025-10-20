import { clamp, damp } from '../utils/math';

export interface PlayerSnapshot {
  x: number;
  y: number;
  radius: number;
  shield: number;
}

export class Player {
  x = 180;
  y = 540;
  radius = 16;
  speed = 8;
  shieldCharges = 0;
  invulnerableTime = 0;
  private targetX = this.x;
  private targetY = this.y;

  reset(): void {
    this.x = 180;
    this.y = 540;
    this.targetX = this.x;
    this.targetY = this.y;
    this.shieldCharges = 0;
    this.invulnerableTime = 0;
  }

  setTarget(x: number, y: number): void {
    this.targetX = clamp(x, 18, 342);
    this.targetY = clamp(y, 120, 620);
  }

  giveShield(): void {
    this.shieldCharges = 1;
  }

  addShieldLayer(): void {
    this.shieldCharges = Math.min(2, this.shieldCharges + 1);
  }

  takeHit(): boolean {
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.invulnerableTime = 1.2;
      return false;
    }
    return true;
  }

  update(dt: number, slowFactor: number): void {
    this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
    const lambda = this.speed * slowFactor;
    this.x = damp(this.x, this.targetX, lambda, dt);
    this.y = damp(this.y, this.targetY, lambda, dt);
  }

  snapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius,
      shield: this.shieldCharges,
    };
  }
}
