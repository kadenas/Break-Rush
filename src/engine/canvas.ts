const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

export class CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private dpr = window.devicePixelRatio || 1;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Unable to acquire 2D context');
    }
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const pixelWidth = rect ? rect.width * this.dpr : window.innerWidth * this.dpr;
    const pixelHeight = rect ? rect.height * this.dpr : window.innerHeight * this.dpr;
    const scale = Math.min(pixelWidth / VIRTUAL_WIDTH, pixelHeight / VIRTUAL_HEIGHT);
    const width = Math.floor(VIRTUAL_WIDTH * scale);
    const height = Math.floor(VIRTUAL_HEIGHT * scale);
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  clear(fill: string): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  get width(): number {
    return VIRTUAL_WIDTH;
  }

  get height(): number {
    return VIRTUAL_HEIGHT;
  }
}

export const setPageInteractive = (interactive: boolean): void => {
  const body = document.body;
  if (interactive) {
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
  } else {
    body.style.overflow = '';
    body.style.touchAction = 'manipulation';
  }
};
