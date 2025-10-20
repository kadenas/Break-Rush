export interface ScoreSnapshot {
  score: number;
  multiplier: number;
  nearWindow: number;
}

export class ScoreSystem {
  score = 0;
  multiplier = 1;
  private streak = 0;
  private nearTimer = 0;

  reset(): void {
    this.score = 0;
    this.multiplier = 1;
    this.streak = 0;
    this.nearTimer = 0;
  }

  tick(dt: number): void {
    this.score += dt * 12 * this.multiplier;
    this.nearTimer = Math.max(0, this.nearTimer - dt);
    if (this.nearTimer === 0 && this.streak > 0) {
      this.streak = Math.max(0, this.streak - dt * 2);
      this.recalculateMultiplier();
    }
  }

  registerNearMiss(intensity: number): void {
    this.nearTimer = 2;
    this.streak = Math.min(20, this.streak + intensity * 2);
    this.recalculateMultiplier();
  }

  registerOrb(value: number): void {
    this.score += value * this.multiplier;
    this.nearTimer = Math.min(2.5, this.nearTimer + 0.3);
  }

  breakCombo(): void {
    this.streak = 0;
    this.multiplier = 1;
    this.nearTimer = 0;
  }

  snapshot(): ScoreSnapshot {
    return {
      score: Math.floor(this.score),
      multiplier: this.multiplier,
      nearWindow: this.nearTimer / 2,
    };
  }

  private recalculateMultiplier(): void {
    this.multiplier = 1 + Math.min(4, this.streak * 0.15);
  }
}
