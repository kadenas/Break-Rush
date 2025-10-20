export type FrameCallback = (dt: number) => void;

export class GameLoop {
  private last = 0;
  private running = false;

  constructor(private readonly callback: FrameCallback) {}

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
  }

  private tick = (time: number) => {
    if (!this.running) {
      return;
    }
    const delta = (time - this.last) / 1000;
    this.last = time;
    const clamped = Math.min(delta, 0.1);
    this.callback(clamped);
    requestAnimationFrame(this.tick);
  };
}
