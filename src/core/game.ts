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
  getWave,
} from '../game/obstacles';
import { getClick } from '../engine/input';
import { drawUI, registerButton, hitUI, clearButtons } from '../ui/ui';
import { updateMessages, drawMessages, resetMessages, maybeSpawnAuto, spawnMilestoneMessage } from '../fx/messages';
import { audioInit, startMusic, stopMusic, setMusic, setSfx, playSfx } from '../fx/audio';

let running = false;
let raf = 0;
let last = 0;
let canvas!: HTMLCanvasElement;
let ctx!: CanvasRenderingContext2D;

const player = createPlayer();
const obs = createObSystem();

audioInit({ music: true, sfx: true });

const settings = {
  vibe: localStorage.getItem('br_vibe') === '1',
  fx: localStorage.getItem('br_fx') !== '0',
  low: localStorage.getItem('br_lowpower') === '1',
  music: localStorage.getItem('br_music') !== '0',
};

setSfx(settings.fx);
setMusic(settings.music);

let nextMilestone = 100;

function saveSettings() {
  localStorage.setItem('br_vibe', settings.vibe ? '1' : '0');
  localStorage.setItem('br_fx', settings.fx ? '1' : '0');
  localStorage.setItem('br_lowpower', settings.low ? '1' : '0');
  localStorage.setItem('br_music', settings.music ? '1' : '0');
  setSfx(settings.fx);
  setMusic(settings.music);
}

function resetRun() {
  player.x = VW / 2;
  player.y = VH * 0.8;
  resetObstacles(obs);
}

const goPlay = () => {
  resetRun();
  resetMessages();
  nextMilestone = 100;
  if (settings.music) startMusic();
  setState('playing');
};

export function bootGame(c: HTMLCanvasElement) {
  canvas = c;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D no disponible');
  ctx = g;
  running = false;

  clearButtons();
  // constantes de layout UI
  const BTN_W = 160;
  const BTN_H = 44;
  const GAP = 14;
  const centerX = VW * 0.5;
  const centerY = VH * 0.55;

  // MENU principal
  registerButton({
    id: 'start',
    x: centerX - BTN_W / 2,
    y: centerY - BTN_H - GAP,
    w: BTN_W,
    h: BTN_H,
    label: 'Start',
    visible: () => getState() === 'menu',
    onClick: () => goPlay(),
  });
  registerButton({
    id: 'settings',
    x: centerX - BTN_W / 2,
    y: centerY,
    w: BTN_W,
    h: BTN_H,
    label: 'Settings',
    visible: () => getState() === 'menu',
    onClick: () => setState('settings'),
  });

  // PLAYING: Pause arriba-dcha, lejos del score
  registerButton({
    id: 'pause',
    x: VW - 48 - 8,
    y: 8,
    w: 48,
    h: 32,
    label: 'II',
    visible: () => getState() === 'playing',
    onClick: () => {
      stopMusic();
      setState('pause');
    },
  });

  // PAUSE
  registerButton({
    id: 'resume',
    x: centerX - BTN_W / 2,
    y: centerY - (BTN_H + GAP),
    w: BTN_W,
    h: BTN_H,
    label: 'Resume',
    visible: () => getState() === 'pause',
    onClick: () => {
      if (settings.music) {
        void startMusic();
      }
      setState('playing');
    },
  });
  registerButton({
    id: 'restart',
    x: centerX - BTN_W / 2,
    y: centerY,
    w: BTN_W,
    h: BTN_H,
    label: 'Restart',
    visible: () => getState() === 'pause',
    onClick: () => goPlay(),
  });
  registerButton({
    id: 'menu',
    x: centerX - BTN_W / 2,
    y: centerY + (BTN_H + GAP),
    w: BTN_W,
    h: BTN_H,
    label: 'Menu',
    visible: () => getState() === 'pause',
    onClick: () => {
      stopMusic();
      resetMessages();
      setState('menu');
    },
  });

  // GAME OVER: Retry, Share, Menu (solo UNO)
  registerButton({
    id: 'retry',
    x: centerX - BTN_W / 2,
    y: centerY - (BTN_H + GAP),
    w: BTN_W,
    h: BTN_H,
    label: 'Retry',
    visible: () => getState() === 'gameover',
    onClick: () => goPlay(),
  });
  registerButton({
    id: 'share',
    x: centerX - BTN_W / 2,
    y: centerY,
    w: BTN_W,
    h: BTN_H,
    label: 'Share',
    visible: () => getState() === 'gameover',
    onClick: () => shareScoreSmart(),
  });
  registerButton({
    id: 'menu-go',
    x: centerX - BTN_W / 2,
    y: centerY + (BTN_H + GAP),
    w: BTN_W,
    h: BTN_H,
    label: 'Menu',
    visible: () => getState() === 'gameover',
    onClick: () => {
      stopMusic();
      resetMessages();
      setState('menu');
    },
  });

  // SETTINGS
  registerButton({
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
  });
  registerButton({
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
  });
  registerButton({
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
  });
  registerButton({
    id: 'tog-music',
    x: centerX - 90,
    y: centerY + 80,
    w: 180,
    h: 40,
    label: () => `Music: ${settings.music ? 'ON' : 'OFF'}`,
    visible: () => getState() === 'settings',
    onClick: () => {
      settings.music = !settings.music;
      saveSettings();
      if (settings.music) {
        if (getState() === 'playing') {
          void startMusic();
        }
      } else {
        stopMusic();
      }
    },
  });
  registerButton({
    id: 'back',
    x: centerX - 70,
    y: centerY + 140,
    w: 140,
    h: 40,
    label: 'Back',
    visible: () => getState() === 'settings',
    onClick: () => setState('menu'),
  });
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
  if (st === 'gameover') {
    nextMilestone = 100;
  }
  if (st === 'playing') {
    updatePlayer(player, dt);
    ensureKickstart(obs);
    updateObstacles(obs, dt);
    maybeSpawnAuto();

    const sc = getScore(obs);
    if (sc >= nextMilestone) {
      spawnMilestoneMessage();
      playSfx('level');
      nextMilestone += 100;
    }

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
        stopMusic();
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

  const wave = getWave(obs);
  drawReactiveBackground(ctx, wave);

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

  updateMessages(dt);
  drawMessages(ctx);
  drawUI(ctx);
  drawDebugHUD(ctx, dt, layout, canvas);
}

function drawReactiveBackground(ctx: CanvasRenderingContext2D, intensity: number) {
  const t = Math.max(0, Math.min(1, intensity));
  const from = { r: 7, g: 26, b: 42 };
  const to = { r: 32, g: 10, b: 34 };
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  const cx = VW * 0.5;
  const cy = VH * 0.45;
  const grd = ctx.createRadialGradient(
    cx,
    cy,
    Math.min(VW, VH) * 0.1,
    cx,
    cy,
    Math.max(VW, VH),
  );
  grd.addColorStop(0, `rgb(${r + 10}, ${g + 10}, ${b + 10})`);
  grd.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VW, VH);
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
