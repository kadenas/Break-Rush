export class Stopwatch {
  private elapsed = 0;
  private running = false;

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.elapsed = 0;
  }

  update(dt: number): void {
    if (this.running) {
      this.elapsed += dt;
    }
  }

  get time(): number {
    return this.elapsed;
  }
}

export class Countdown {
  private remaining = 0;

  set(duration: number): void {
    this.remaining = duration;
  }

  tick(dt: number): void {
    this.remaining = Math.max(0, this.remaining - dt);
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  get time(): number {
    return this.remaining;
  }
}
