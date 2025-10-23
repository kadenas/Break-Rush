import { gameDifficulty } from '../game/spawner';
import { triggerPlayerBonusFlash, triggerPlayerHitFlash, type Player } from '../game/player';
import { setMusicTempo, setMusicVolume } from './audio';

let pulseTimer = 0;
let currentTempo = 1;
let currentVolume = 0.8;
let vibrationEnabled = true;

/**
 * Permite habilitar o deshabilitar vibraciones dinámicas.
 */
export function setFeedbackVibration(on: boolean) {
  vibrationEnabled = on;
}

/**
 * Llamar en cada frame: ajusta feedback global según dificultad.
 */
export function updateFeedback(dt: number, canvas: HTMLCanvasElement) {
  const level = Math.max(0, gameDifficulty.level);
  const speedMul = Math.max(0, gameDifficulty.currentSpeedMul);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    pulseTimer += dt * (0.4 + speedMul * 0.3);
    const pulse = 0.04 * Math.sin(pulseTimer * Math.PI * 2);
    ctx.filter = `brightness(${(1 + pulse).toFixed(3)})`;
  }

  const targetTempo = 1 + level * 0.03;
  const targetVolume = 0.7 + Math.min(0.3, speedMul * 0.15);

  currentTempo += (targetTempo - currentTempo) * 0.05;
  currentVolume += (targetVolume - currentVolume) * 0.05;

  setMusicTempo(currentTempo);
  setMusicVolume(currentVolume);
}

export function triggerHitFeedback(player?: Player) {
  if (player) {
    triggerPlayerHitFlash(player);
  }
  vibrate(100);
  flashScreen('#FF0033');
}

export function triggerBonusFeedback(player?: Player) {
  if (player) {
    triggerPlayerBonusFlash(player);
  }
  vibrate([20, 30, 20]);
  flashScreen('#FFE033');
}

function vibrate(pattern: number | number[]) {
  if (!vibrationEnabled) {
    return;
  }
  if (typeof navigator === 'undefined') {
    return;
  }
  try {
    const vib = navigator.vibrate?.bind(navigator);
    if (vib) {
      vib(pattern);
    }
  } catch {
    /* ignore */
  }
}

function flashScreen(color: string) {
  if (typeof document === 'undefined') {
    return;
  }
  const flash = document.createElement('div');
  flash.style.position = 'fixed';
  flash.style.inset = '0';
  flash.style.background = color;
  flash.style.opacity = '0.4';
  flash.style.transition = 'opacity 0.35s ease';
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '9999';
  document.body.appendChild(flash);
  const fade = () => {
    flash.style.opacity = '0';
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(fade);
  } else {
    setTimeout(fade, 30);
  }
  setTimeout(() => flash.remove(), 400);
}
