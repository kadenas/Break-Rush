const STEP = 1 / 60;
const MAX_STEPS = 5;

type Handler = (dt: number) => void;

type RenderHandler = (alpha: number) => void;

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private frameHandle = 0;
  private running = false;

  constructor(private update: Handler, private render: RenderHandler) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now() / 1000;
    const tick = () => {
      if (!this.running) return;
      const now = performance.now() / 1000;
      let frameTime = now - this.lastTime;
      this.lastTime = now;
      frameTime = Math.min(frameTime, STEP * MAX_STEPS);
      this.accumulator += frameTime;
      let steps = 0;
      while (this.accumulator >= STEP && steps < MAX_STEPS) {
        this.update(STEP);
        this.accumulator -= STEP;
        steps += 1;
      }
      const alpha = this.accumulator / STEP;
      this.render(alpha);
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
  }
}

export const FIXED_STEP = STEP;
