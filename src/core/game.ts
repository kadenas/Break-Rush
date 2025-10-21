import { getState, setState } from './state';
import { createPlayer, updatePlayer, drawPlayer, drawTrail, resetPlayerTrail } from '../game/player';
import { applyRenderTransform, computeLayout, VW, VH } from '../engine/viewport';
import { initDebug, drawDebugHUD, toggleDebug } from '../engine/debug';
import {
  createObSystem,
  drawObstacles,
  updateObstacles,
  collideCircle,
  resetObstacles,
  commitBest,
  ensureKickstart,
  getActiveCount,
} from '../game/obstacles';
import { getClick } from '../engine/input';
import { initUI, UIButton, drawUI, registerButton, hitUI } from '../ui/ui';

let running = false;
let raf = 0;
let last = 0;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let debugHotkeyBound = false;

const player = createPlayer();
const obstacles = createObSystem();

const INVULN_DURATION = 0.8;
const INVULN_BLINK_INTERVAL = 0.09;
const CAMERA_SHAKE_DURATION = 0.35;
const CAMERA_SHAKE_AMPLITUDE = 6;

let invulnTimer = 0;
let cameraShakeTimer = 0;

function resetRun() {
  player.x = VW / 2;
  player.y = VH * 0.8;
  resetPlayerTrail(player);
  resetObstacles(obstacles);
  invulnTimer = INVULN_DURATION;
  cameraShakeTimer = 0;
}

function registerButtons() {
  const centerX = VW * 0.5;
  const centerY = VH * 0.55;

  const buttons: UIButton[] = [
    {
      id: 'start',
      x: centerX - 70,
      y: centerY - 24,
      w: 140,
      h: 48,
      label: 'Start',
      visible: () => getState() === 'menu',
      onClick: () => {
        resetRun();
        setState('playing');
      },
    },
    {
      id: 'pause',
      x: 10,
      y: 10,
      w: 34,
      h: 28,
      label: 'II',
      visible: () => getState() === 'playing',
      onClick: () => setState('pause'),
    },
    {
      id: 'resume',
      x: centerX - 70,
      y: centerY - 80,
      w: 140,
      h: 44,
      label: 'Resume',
      visible: () => getState() === 'pause',
      onClick: () => setState('playing'),
    },
    {
      id: 'restart',
      x: centerX - 70,
      y: centerY - 24,
      w: 140,
      h: 44,
      label: 'Restart',
      visible: () => getState() === 'pause',
      onClick: () => {
        resetRun();
        setState('playing');
      },
    },
    {
      id: 'menu',
      x: centerX - 70,
      y: centerY + 32,
      w: 140,
      h: 44,
      label: 'Menu',
      visible: () => {
        const state = getState();
        return state === 'pause' || state === 'gameover';
      },
      onClick: () => setState('menu'),
    },
    {
      id: 'retry',
      x: centerX - 70,
      y: centerY - 24,
      w: 140,
      h: 48,
      label: 'Retry',
      visible: () => getState() === 'gameover',
      onClick: () => {
        resetRun();
        setState('playing');
      },
    },
  ];

  for (const button of buttons) registerButton(button);
}

export function bootGame(c: HTMLCanvasElement) {
  canvas = c;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D no disponible');
  ctx = g;
  running = false;

  initDebug();
  initUI(() => {});
  registerButtons();

  if (!debugHotkeyBound) {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyF') toggleDebug();
    });
    debugHotkeyBound = true;
  }
}

export function startGame() {
  if (running) return;
  running = true;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

export function stopGame() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
}

function processClick(x: number, y: number) {
  const consumed = hitUI(x, y);
  if (consumed) return;

  const state = getState();
  if (state === 'gameover') {
    resetRun();
    setState('playing');
  } else if (state === 'menu') {
    resetRun();
    setState('playing');
  }
}

function loop(now: number) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const click = getClick();
  if (click) processClick(click.x, click.y);

  const state = getState();
  if (state === 'playing') {
    if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
    updatePlayer(player, dt);
    ensureKickstart(obstacles);
    updateObstacles(obstacles, dt);

    for (const index of obstacles.active) {
      const obstacle = obstacles.pool[index];
      if (!obstacle.alive) continue;
      if (invulnTimer <= 0 && collideCircle(player.x, player.y, player.r, obstacle)) {
        commitBest(obstacles);
        setState('gameover');
        invulnTimer = 0;
        cameraShakeTimer = CAMERA_SHAKE_DURATION;
        break;
      }
    }
  }

  render(dt);
  raf = requestAnimationFrame(loop);
}

function render(dt: number) {
  const layout = computeLayout();
  const wantW = Math.floor(layout.vwCss * layout.dpr);
  const wantH = Math.floor(layout.vhCss * layout.dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW;
    canvas.height = wantH;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let shakeX = 0;
  let shakeY = 0;
  if (cameraShakeTimer > 0) {
    const t = cameraShakeTimer / CAMERA_SHAKE_DURATION;
    const amplitude = CAMERA_SHAKE_AMPLITUDE * t;
    const angle = Math.random() * Math.PI * 2;
    shakeX = Math.cos(angle) * amplitude;
    shakeY = Math.sin(angle) * amplitude;
    cameraShakeTimer = Math.max(0, cameraShakeTimer - dt);
  }

  applyRenderTransform(ctx, layout);
  if (shakeX || shakeY) ctx.translate(shakeX / layout.scale, shakeY / layout.scale);
  ctx.fillStyle = '#0b1f33';
  ctx.fillRect(0, 0, VW, VH);

  const state = getState();
  if (state === 'menu') {
    ctx.fillStyle = 'rgba(150,40,40,0.45)';
    ctx.beginPath();
    ctx.arc(VW * 0.5, VH * 0.6, VW * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Break Rush', VW * 0.5, VH * 0.55);
    ctx.font = '16px system-ui';
    ctx.fillStyle = '#9cc2ff';
    ctx.fillText('Evita los meteoritos', VW * 0.5, VH * 0.62);
  } else {
    drawObstacles(ctx, obstacles);
    drawTrail(ctx, player);

    const blinkElapsed = Math.max(0, INVULN_DURATION - invulnTimer);
    const blinkToggle = Math.floor(blinkElapsed / INVULN_BLINK_INTERVAL) % 2 === 0;
    const playerAlpha = invulnTimer > 0 ? (blinkToggle ? 1 : 0.35) : 1;
    drawPlayer(ctx, player, playerAlpha);

    const score = Math.floor(obstacles.score);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Score ${score}`, 8, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px system-ui';
    ctx.fillText(`Best ${obstacles.best}`, 8, 38);

    ctx.textAlign = 'right';
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Meteors ${getActiveCount(obstacles)}`, VW - 8, 38);

    if (state === 'playing') {
      ctx.font = '16px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('PLAYING', VW - 8, 22);
    }

    if (state === 'pause' || state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, VW, VH);

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      if (state === 'pause') {
        ctx.font = 'bold 26px system-ui';
        ctx.fillText('PAUSE', VW * 0.5, VH * 0.4);
      } else {
        ctx.font = 'bold 28px system-ui';
        ctx.fillText('GAME OVER', VW * 0.5, VH * 0.45);
        ctx.font = '16px system-ui';
        ctx.fillText('Tap para reintentar', VW * 0.5, VH * 0.54);
      }
    }
  }

  drawUI(ctx);
  drawDebugHUD(ctx, dt, layout, canvas);
}

export function restartRun() {
  resetRun();
  setState('playing');
}
