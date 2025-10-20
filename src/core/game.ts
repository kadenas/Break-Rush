import { getState } from './state';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

let ctx: CanvasRenderingContext2D | null = null;
let running = false;
let rafId: number | null = null;
let time = 0;

export const bootGame = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  ctx = context;
  time = 0;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  running = false;
  render();
};

export const startGame = (): void => {
  if (!ctx) {
    return;
  }
  if (running) {
    return;
  }

  running = true;
  let lastTime = performance.now();

  const loop = (now: number): void => {
    if (!running) {
      return;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    update(dt);
    render();

    rafId = requestAnimationFrame(loop);
  };

  update(0);
  render();
  rafId = requestAnimationFrame(loop);
};

export const stopGame = (): void => {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

const update = (dt: number): void => {
  time += dt;
};

const render = (): void => {
  if (!ctx) {
    return;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  ctx.fillStyle = '#11263f';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const currentState = getState();

  if (currentState === 'menu') {
    drawMenu();
    return;
  }

  if (currentState === 'playing') {
    drawGameplay();
    return;
  }

  drawFallback(currentState);
};

const drawMenu = (): void => {
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '28px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Break Rush', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 28);

  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('Tap para jugar', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 12);
};

const drawGameplay = (): void => {
  if (!ctx) {
    return;
  }

  const markerX = VIRTUAL_WIDTH / 2 + Math.sin(time * 1.8) * 60;
  const markerY = VIRTUAL_HEIGHT / 2 + Math.cos(time * 2.1) * 32;

  ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 18 + Math.sin(time * 3) * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('PLAYING', VIRTUAL_WIDTH / 2, 24);
};

const drawFallback = (state: ReturnType<typeof getState>): void => {
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = '24px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.toUpperCase(), VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
};
