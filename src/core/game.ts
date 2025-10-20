const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

let canvasRef: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let running = false;
let rafId = 0;
let lastTime = 0;

export const bootGame = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D rendering context unavailable');
  }

  canvasRef = canvas;
  ctx = context;
  running = false;
  lastTime = 0;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  render();
};

export const startGame = (): void => {
  if (running) {
    return;
  }
  if (!ctx || !canvasRef) {
    throw new Error('Game has not been booted');
  }

  running = true;

  const tick = (time: number): void => {
    if (!running) return;
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    update(delta);
    render();
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame((time) => {
    lastTime = time;
    update(0);
    render();
    rafId = requestAnimationFrame(tick);
  });
};

export const stopGame = (): void => {
  if (!running) {
    return;
  }
  running = false;
  cancelAnimationFrame(rafId);
};

export const isGameRunning = (): boolean => running;

export const renderFrame = (): void => {
  render();
};

const update = (dt: number): void => {
  void dt;
};

const render = (): void => {
  if (!ctx || !canvasRef) {
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#1f6feb';
  ctx.fillRect(24, 24, VIRTUAL_WIDTH - 48, VIRTUAL_HEIGHT - 48);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '28px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Break Rush', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 20);

  ctx.fillStyle = '#7dd3fc';
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Stay tuned for action!', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 22);

  ctx.restore();
};
