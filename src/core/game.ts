import { initInput, type Layout } from '../engine/input';
import { createPlayer, drawPlayer, Player, updatePlayer } from '../game/player';
import { getState } from './state';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

let ctx: CanvasRenderingContext2D | null = null;
let running = false;
let rafId: number | null = null;
let time = 0;
let player: Player | null = null;

export const bootGame = (
  canvas: HTMLCanvasElement,
  getLayout: () => Layout
): void => {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  initInput(canvas, getLayout);

  ctx = context;
  player = createPlayer();
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

  if (!player) {
    return;
  }

  if (getState() === 'playing') {
    updatePlayer(player, dt);
  }
};

const render = (): void => {
  if (!ctx) {
    return;
  }

  const canvas = ctx.canvas;
  const dpr = canvas.width / VIRTUAL_WIDTH || 1;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.fillStyle = '#041225';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const currentState = getState();

  if (currentState === 'menu') {
    drawMenu();
    return;
  }

  if (currentState === 'playing') {
    drawGameplay(dpr);
    return;
  }

  drawFallback(currentState);
};

const drawMenu = (): void => {
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#e2f3ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Break Rush', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 36);

  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('Tap to start', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 8);
};

const drawGameplay = (dpr: number): void => {
  if (!ctx || !player) {
    return;
  }

  ctx.save();

  const glowRadius = 90;
  const gradient = ctx.createRadialGradient(
    VIRTUAL_WIDTH / 2,
    VIRTUAL_HEIGHT / 2,
    24,
    VIRTUAL_WIDTH / 2,
    VIRTUAL_HEIGHT / 2,
    glowRadius
  );
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(0, VIRTUAL_HEIGHT - 120 + Math.sin(time * 1.8) * 6);
  ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 120 + Math.sin(time * 1.8) * 6);
  ctx.stroke();

  ctx.restore();

  drawPlayer(ctx, player, dpr);

  ctx.fillStyle = 'rgba(226, 243, 255, 0.85)';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('PLAYING', VIRTUAL_WIDTH - 12, 16);
};

const drawFallback = (state: ReturnType<typeof getState>): void => {
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#e2f3ff';
  ctx.font = '24px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.toUpperCase(), VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
};
