const DESIGN_WIDTH = 360;
const DESIGN_HEIGHT = 640;

export interface CanvasDimensions {
  width: number;
  height: number;
  scale: number;
  dpr: number;
}

export class CanvasManager {
  readonly ctx: CanvasRenderingContext2D;
  dimensions: CanvasDimensions;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo crear el contexto 2D');
    }
    this.ctx = context;
    this.dimensions = {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      scale: 1,
      dpr: window.devicePixelRatio || 1
    };
    this.configureCanvas();
    window.addEventListener('resize', () => this.configureCanvas());
    window.addEventListener('orientationchange', () => this.configureCanvas());
  }

  private configureCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    const targetHeight = availableHeight;
    const targetWidth = Math.min(availableWidth, (DESIGN_WIDTH / DESIGN_HEIGHT) * targetHeight);

    this.canvas.style.width = `${targetWidth}px`;
    this.canvas.style.height = `${targetHeight}px`;

    const pixelWidth = Math.floor(targetWidth * dpr);
    const pixelHeight = Math.floor(targetHeight * dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    const scale = Math.min(pixelWidth / DESIGN_WIDTH, pixelHeight / DESIGN_HEIGHT);
    this.dimensions = {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      scale,
      dpr
    };
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }
}

export function toCanvasSpace(dim: CanvasDimensions, clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  const x = ((clientX - rect.left) * dim.dpr) / dim.scale;
  const y = ((clientY - rect.top) * dim.dpr) / dim.scale;
  return { x, y };
}

export function getDesignSize() {
  return { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
}
