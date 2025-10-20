const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

let canvasRef: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let running = false;
let rafId: number | null = null;
let lastTime = 0;
let pulse = 0;

export const bootGame = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  canvasRef = canvas;
  ctx = context;
  running = false;
  pulse = 0;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  lastTime = performance.now();
  update(0);
  render();
};

export const startGame = (): void => {
  if (!ctx || !canvasRef) {
    return;
  }
  if (running) {
    return;
  }

  running = true;
  lastTime = performance.now();

  const tick = (time: number): void => {
    if (!running) {
      return;
    }

    const dt = Math.min(Math.max((time - lastTime) / 1000, 0), 0.05);
    lastTime = time;

    update(dt);
    render();

    rafId = requestAnimationFrame(tick);
  };

  update(0);
  render();
  rafId = requestAnimationFrame(tick);
};

export const stopGame = (): void => {
  if (!running) {
    return;
  }

  running = false;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

const update = (dt: number): void => {
  pulse += dt * 2.4;
};

const render = (): void => {
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
  gradient.addColorStop(0, '#050b18');
  gradient.addColorStop(1, '#02040c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const glowStrength = 0.28 + Math.sin(pulse * 2) * 0.12;
  ctx.fillStyle = `rgba(239, 68, 68, ${glowStrength.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, 120 + Math.sin(pulse) * 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
  for (let i = 0; i < 12; i += 1) {
    const offset = ((pulse * 40 + i * 30) % (VIRTUAL_HEIGHT + 120)) - 60;
    ctx.fillRect(40 + (i % 3) * 90, offset, 12, 72);
  }

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '28px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Break Rush', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 18);

  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('Systems nominal', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 26);
};
