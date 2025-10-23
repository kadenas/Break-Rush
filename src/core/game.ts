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
import {
  audioInit,
  stopMusic,
  setMusic,
  setSfx,
  playSfx,
  toIntro as audioToIntro,
  startGame as audioStartGame,
  onHit as audioOnHit,
  onRetry as audioOnRetry,
} from '../fx/audio';
import { unlockSync } from '../audio/audioManager';

let started = false;
function startGameSafe() {
  if (started) return;
  started = true;
  startGame();
}

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
  music: localStorage.getItem('br_music') !== '0',
};

setSfx(settings.fx);
setMusic(settings.music);

let nextMilestone = 100;
let aliveTime = 0;
let levelBannerT = 0;
let levelShown = 1;

type Flash = { t:number, life:number, x:number, y:number, r:number };
let flashes: Flash[] = [];

let totalRank = Number(localStorage.getItem('br_rank') || '0') || 0;
function beltName(points:number) {
  if (points >= 10000) return 'Mastodonte Cósmico';
  if (points >= 5000)  return 'León Estelar';
  if (points >= 2000)  return 'Tritón Galáctico';
  if (points >= 1000)  return 'Albatros de Meteoro';
  if (points >= 500)   return 'Timón de Acero';
  return 'Grumete Meteoro';
}

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
  const prevState = getState();
  resetRun();
  resetMessages();
  flashes = [];
  aliveTime = 0;
  levelBannerT = 0;
  levelShown = 1;
  nextMilestone = 100;
  if (started && settings.music) {
    if (prevState === 'gameover') {
      audioOnRetry();
    } else {
      audioStartGame();
    }
  }
  setState('playing');
};

export function requestMenuStart() {
  goPlay();
}

export function requestMenuSettings() {
  setState('settings');
}

export function bootGame(c: HTMLCanvasElement) {
  canvas = c;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D no disponible');
  ctx = g;
  running = false;

  audioInit({ music: true, sfx: true });

  const gate = document.getElementById('gate');
  const btn = document.getElementById('gate-btn');
  let gateFired = false;
  const fireGate = () => {
    if (gateFired) return;
    gateFired = true;
    if (started) {
      audioToIntro();
    }
    setState('menu');
    gate?.remove();
  };
  if (btn) {
    btn.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        unlockSync();
        startGameSafe();
        fireGate();
      },
      { once: true, capture: true }
    );
  }
  const touchOptions: AddEventListenerOptions = { once: true, capture: true, passive: true };
  window.addEventListener(
    'touchend',
    () => {
      unlockSync();
      startGameSafe();
      fireGate();
    },
    touchOptions
  );
  const pointerOptions: AddEventListenerOptions = { once: true, capture: true };
  window.addEventListener(
    'pointerdown',
    () => {
      unlockSync();
      startGameSafe();
      fireGate();
    },
    pointerOptions
  );
  window.addEventListener(
    'keydown',
    () => {
      unlockSync();
      startGameSafe();
      fireGate();
    },
    pointerOptions
  );

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
      if (started) {
        stopMusic();
      }
      setState('pause');
    },
  });

  // PAUSE
  registerButton({
    id: 'resume',
    x: centerX - BTN_W / 2,
    y: centerY - (BTN_H * 1.5 + GAP),
    w: BTN_W,
    h: BTN_H,
    label: 'Resume',
    visible: () => getState() === 'pause',
    onClick: () => {
      if (started && settings.music) {
        audioStartGame();
      }
      setState('playing');
    },
  });
  registerButton({
    id: 'settings-from-pause',
    x: centerX - BTN_W / 2,
    y: centerY - (BTN_H * 0.5),
    w: BTN_W,
    h: BTN_H,
    label: 'Settings',
    visible: () => getState() === 'pause',
    onClick: () => setState('settings'),
  });
  registerButton({
    id: 'restart',
    x: centerX - BTN_W / 2,
    y: centerY + (BTN_H * 0.5 + GAP),
    w: BTN_W,
    h: BTN_H,
    label: 'Restart',
    visible: () => getState() === 'pause',
    onClick: () => goPlay(),
  });
  registerButton({
    id: 'menu',
    x: centerX - BTN_W / 2,
    y: centerY + (BTN_H * 1.5 + GAP * 2),
    w: BTN_W,
    h: BTN_H,
    label: 'Menu',
    visible: () => getState() === 'pause',
    onClick: () => {
      if (started) {
        stopMusic();
      }
      resetMessages();
      setState('menu');
      if (started) {
        audioToIntro();
      }
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
      if (started) {
        stopMusic();
      }
      resetMessages();
      setState('menu');
      if (started) {
        audioToIntro();
      }
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
    onClick: () => {
      setState('menu');
      if (started) {
        audioToIntro();
      }
    },
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
    aliveTime += dt;
    updatePlayer(player, dt);
    ensureKickstart(obs);
    updateObstacles(obs, dt);
    maybeSpawnAuto();

    const sc = getScore(obs);
    if (sc >= nextMilestone) {
      spawnMilestoneMessage();
      playSfx('level');
      levelShown = Math.floor(sc / 100) + 1;
      levelBannerT = 1.2;
      flashes.push({ t:0, life:0.25, x:player.x, y:player.y, r:80 });
      nextMilestone += 100;
    }

    for (const idx of obs.active) {
      const o = obs.pool[idx];
      if (!o.alive) continue;
      if (collideCircle(player.x, player.y, player.r, o)) {
        if (started) {
          audioOnHit();
        }
        commitBest(obs);
        if (settings.vibe && 'vibrate' in navigator) {
          try {
            (navigator as any).vibrate(50);
          } catch {
            /* ignore */
          }
        }
        const earned = Math.floor(sc / 50);
        totalRank += earned;
        localStorage.setItem('br_rank', String(totalRank));
        setState('gameover');
        break;
      }
    }
  }

  render(dt);
  raf = requestAnimationFrame(loop);
}

function render(dt: number) {
  // Resize canvas si cambia el viewport
  const L = computeLayout();
  const wantW = Math.floor(L.vwCss * L.dpr);
  const wantH = Math.floor(L.vhCss * L.dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) { canvas.width = wantW; canvas.height = wantH; }

  // Reset transform y aplicar escala virtual
  ctx.setTransform(1,0,0,1,0,0);
  applyRenderTransform(ctx, L);

  // 1) Fading de frame para crear estela (NO clearRect)
  applyFrameFade(ctx, 0.12);  // 12% de oscurecido suave

  // 2) Fondo dinámico con alpha, para no borrar la estela
  const wave = getWave(obs);
  const timeTint = Math.min(1, Math.max(0, (aliveTime - 30) / 60));
  drawReactiveBackgroundWithTime(ctx, wave, timeTint, 0.35);

  const st = getState();

  // 3) Dibujo del juego
  if (st !== 'menu' && st !== 'settings') {
    drawObstacles(ctx, obs);
    drawPlayer(ctx, player);

    // HUD (score y best)
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.font='16px system-ui'; ctx.textAlign='left';
    ctx.fillText(`Score ${getScore(obs)}`, 8, 22);
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.font='12px system-ui'; ctx.fillText(`Best ${getBest(obs)}`, 8, 38);

    if (st === 'pause' || st === 'gameover') {
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,VW,VH);
      ctx.fillStyle='#fff'; ctx.textAlign='center';
      ctx.font='bold 26px system-ui';
      ctx.fillText(st==='pause'?'PAUSE':'GAME OVER', VW*0.5, VH*0.40);
    } else {
      ctx.fillStyle='rgba(255,255,255,0.85)';
      ctx.font='16px system-ui'; ctx.textAlign='right';
      ctx.fillText('PLAYING', VW-8, 22);
    }
  } else {
    // Menús
    if (st === 'menu') {
      // Overlay menu handles presentation.
    }
    if (st === 'settings') {
      ctx.fillStyle='#fff'; ctx.font='bold 24px system-ui'; ctx.textAlign='center';
      ctx.fillText('Settings', VW*0.5, VH*0.34);
    }
  }

  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.t += dt;
    const a = 1 - f.t / f.life;
    if (a <= 0) { flashes.splice(i,1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a)) * 0.8;
    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (1 + f.t * 4));
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,VW,VH);
    ctx.restore();
  }

  if (levelBannerT > 0) {
    levelBannerT -= dt;
    const a = Math.min(1, levelBannerT * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(`Nivel ${levelShown}`, VW*0.5, VH*0.18);
    ctx.restore();
  }

  // Mensajes motivacionales
  updateMessages(dt);
  drawMessages(ctx);

  if (st === 'gameover') {
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.textAlign='center';
    ctx.font='14px system-ui';
    const belt = beltName(totalRank);
    ctx.fillText(`Rango total: ${totalRank} · ${belt}`, VW*0.5, VH*0.48);
  }

  // UI (botones)
  drawUI(ctx);

  drawDebugHUD(ctx, dt, L, canvas);
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

function applyFrameFade(ctx: CanvasRenderingContext2D, alpha: number) {
  // Oscurece todo el frame con un rect semi-transparente para crear estela
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}

function drawReactiveBackgroundWithTime(ctx: CanvasRenderingContext2D, intensity: number, timeTint: number, alpha: number) {
  const clamp = (v:number)=>Math.max(0,Math.min(1,v));
  const w = clamp(intensity);
  const t = clamp(timeTint);

  const base = { r: 7, g: 26, b: 42 };
  const vio  = { r:32, g:10, b:34 };
  const red  = { r:54, g:8,  b:10 };

  const mix1 = {
    r: Math.round(base.r + (vio.r - base.r) * w),
    g: Math.round(base.g + (vio.g - base.g) * w),
    b: Math.round(base.b + (vio.b - base.b) * w),
  };
  const mix2 = {
    r: Math.round(mix1.r + (red.r - mix1.r) * t),
    g: Math.round(mix1.g + (red.g - mix1.g) * t),
    b: Math.round(mix1.b + (red.b - mix1.b) * t),
  };

  const cx = VW * 0.5, cy = VH * 0.45;
  const grd = ctx.createRadialGradient(cx, cy, Math.min(VW, VH) * 0.1, cx, cy, Math.max(VW, VH));
  grd.addColorStop(0, `rgb(${mix2.r+10}, ${mix2.g+10}, ${mix2.b+10})`);
  grd.addColorStop(1, `rgb(${mix2.r}, ${mix2.g}, ${mix2.b})`);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,VW,VH);
  ctx.restore();
}
