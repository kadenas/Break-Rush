import { getState, setState } from './state';
import { createPlayer, updatePlayer, drawPlayer } from '../game/player';
import { applyRenderTransform, computeLayout, VW, VH } from '../engine/viewport';
import { drawDebugHUD } from '../engine/debug';
import {
  createObSystem,
  drawObstacles,
  updateObstacles,
  collideCircle,
  resetObstacles,
  commitBest,
  ensureKickstart,
  getScore,
  getBest,
} from '../game/obstacles';
import { getClick } from '../engine/input';
import { UIButton, drawUI, registerButton, hitUI, clearButtons } from '../ui/ui';

let running = false;
let raf = 0;
let last = 0;
let canvas!: HTMLCanvasElement;
let ctx!: CanvasRenderingContext2D;

const player = createPlayer();
const obs = createObSystem();

const settings = {
  vibe: localStorage.getItem('br_vibe') === '1',
  fx: localStorage.getItem('br_fx') !== '0',
  low: localStorage.getItem('br_lowpower') === '1',
};

function saveSettings() {
  localStorage.setItem('br_vibe', settings.vibe ? '1' : '0');
  localStorage.setItem('br_fx', settings.fx ? '1' : '0');
  localStorage.setItem('br_lowpower', settings.low ? '1' : '0');
}

function resetRun() {
  player.x = VW / 2;
  player.y = VH * 0.8;
  resetObstacles(obs);
}

export function bootGame(c: HTMLCanvasElement) {
  canvas = c;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D no disponible');
  ctx = g;
  running = false;

  clearButtons();
  const centerX = VW * 0.5;
  const centerY = VH * 0.55;
  const pad = 8;

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
      id: 'settings',
      x: centerX - 70,
      y: centerY + 36,
      w: 140,
      h: 44,
      label: 'Settings',
      visible: () => getState() === 'menu',
      onClick: () => setState('settings'),
    },
    {
      id: 'pause',
      x: VW - 48 - pad,
      y: pad,
      w: 48,
      h: 32,
      label: 'II',
      visible: () => getState() === 'playing',
      onClick: () => setState('pause'),
    },
    {
      id: 'resume',
      x: centerX - 70,
      y: centerY - 68,
      w: 140,
      h: 44,
      label: 'Resume',
      visible: () => getState() === 'pause',
      onClick: () => setState('playing'),
    },
    {
      id: 'restart',
      x: centerX - 70,
      y: centerY - 16,
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
      y: centerY + 36,
      w: 140,
      h: 44,
      label: 'Menu',
      visible: () => {
        const st = getState();
        return st === 'pause' || st === 'gameover';
      },
      onClick: () => setState('menu'),
    },
    {
      id: 'retry',
      x: centerX - 70,
      y: centerY - 10,
      w: 140,
      h: 44,
      label: 'Retry',
      visible: () => getState() === 'gameover',
      onClick: () => {
        resetRun();
        setState('playing');
      },
    },
    {
      id: 'share',
      x: centerX - 70,
      y: centerY + 40,
      w: 140,
      h: 44,
      label: 'Share',
      visible: () => getState() === 'gameover',
      onClick: () => shareScoreSmart(),
    },
    {
      id: 'gomenu',
      x: centerX - 70,
      y: centerY + 90,
      w: 140,
      h: 44,
      label: 'Menu',
      visible: () => getState() === 'gameover',
      onClick: () => setState('menu'),
    },
    {
      id: 'tog-vibe',
      x: centerX - 90,
      y: centerY - 70,
      w: 180,
      h: 40,
      label: () => `Vibration: ${settings.vibe ? 'ON' : 'OFF'}`,
      visible: () => getState() === 'settings',
      onClick: () => {
        settings.vibe = !settings.vibe;
        saveSettings();
      },
    },
    {
      id: 'tog-fx',
      x: centerX - 90,
      y: centerY - 20,
      w: 180,
      h: 40,
      label: () => `FX: ${settings.fx ? 'ON' : 'OFF'}`,
      visible: () => getState() === 'settings',
      onClick: () => {
        settings.fx = !settings.fx;
        saveSettings();
      },
    },
    {
      id: 'tog-low',
      x: centerX - 90,
      y: centerY + 30,
      w: 180,
      h: 40,
      label: () => `Low Power: ${settings.low ? 'ON' : 'OFF'}`,
      visible: () => getState() === 'settings',
      onClick: () => {
        settings.low = !settings.low;
        saveSettings();
      },
    },
    {
      id: 'back',
      x: centerX - 70,
      y: centerY + 90,
      w: 140,
      h: 40,
      label: 'Back',
      visible: () => getState() === 'settings',
      onClick: () => setState('menu'),
    },
  ];

  buttons.forEach(registerButton);
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

function loop(now: number) {
  if (!running) return;

  if (settings.low) {
    const elapsed = now - last;
    if (elapsed < 1000 / 45) {
      raf = requestAnimationFrame(loop);
      return;
    }
  }

  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const click = getClick();
  if (click) {
    hitUI(click.x, click.y);
  }

  const st = getState();
  if (st === 'playing') {
    updatePlayer(player, dt);
    ensureKickstart(obs);
    updateObstacles(obs, dt);

    for (const idx of obs.active) {
      const o = obs.pool[idx];
      if (!o.alive) continue;
      if (collideCircle(player.x, player.y, player.r, o)) {
        commitBest(obs);
        if (settings.vibe && 'vibrate' in navigator) {
          try {
            (navigator as any).vibrate(50);
          } catch {
            /* ignore */
          }
        }
        setState('gameover');
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
  applyRenderTransform(ctx, layout);

  ctx.fillStyle = '#0b1f33';
  ctx.fillRect(0, 0, VW, VH);

  const st = getState();
  if (st === 'menu') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Break Rush', VW * 0.5, VH * 0.42);
    ctx.fillStyle = '#9cc2ff';
    ctx.font = '16px system-ui';
    ctx.fillText('Evita los meteoritos', VW * 0.5, VH * 0.48);
  } else if (st === 'settings') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Settings', VW * 0.5, VH * 0.34);
  } else {
    drawObstacles(ctx, obs);
    drawPlayer(ctx, player);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Score ${getScore(obs)}`, 8, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px system-ui';
    ctx.fillText(`Best ${getBest(obs)}`, 8, 38);

    if (st === 'pause' || st === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px system-ui';
      ctx.fillText(st === 'pause' ? 'PAUSE' : 'GAME OVER', VW * 0.5, VH * 0.40);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('PLAYING', VW - 8, 22);
    }
  }

  drawUI(ctx);
  drawDebugHUD(ctx, dt, layout, canvas);
}

function shareScoreSmart() {
  const score = getScore(obs);
  const url = `${location.origin}${location.pathname}`;
  const text = `Mi puntuación en Break Rush: ${score} pts`;
  if (navigator.share) {
    navigator.share({ title: 'Break Rush', text, url }).catch(() => {});
  } else {
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    const useWhatsapp = window.confirm('Share via WhatsApp? Cancel for Telegram.');
    const href = useWhatsapp ? whatsapp : telegram;
    window.open(href, '_blank', 'noreferrer');
  }
}
