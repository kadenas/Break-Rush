import { gameDifficulty } from '../game/spawner';
import { triggerPlayerBonusFlash, triggerPlayerHitFlash, type Player } from '../game/player';
import { setMusicTempo, setMusicVolume } from './audio';

let timeSinceAudioUpdate = 0;
let flashTimer = 0;
let lastLevel = 0;
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
export function updateFeedback(dt: number, _canvas?: HTMLCanvasElement) {
  const level = Math.max(0, gameDifficulty.level);
  const speedMul = Math.max(0, gameDifficulty.currentSpeedMul);

  // --- AUDIO: actualizar solo una vez por segundo o cuando cambie el nivel ---
  timeSinceAudioUpdate += dt;
  if (timeSinceAudioUpdate > 1 || level !== lastLevel) {
    const targetTempo = 1 + level * 0.03;
    const targetVolume = 0.7 + Math.min(0.3, speedMul * 0.15);

    currentTempo += (targetTempo - currentTempo) * 0.25;
    currentVolume += (targetVolume - currentVolume) * 0.25;

    setMusicTempo(currentTempo);
    setMusicVolume(currentVolume);

    lastLevel = level;
    timeSinceAudioUpdate = 0;
  }

  // --- EFECTO VISUAL: parpadeo leve controlado por CSS ---
  flashTimer += dt * (0.4 + speedMul * 0.2);
  const brightness = 1 + 0.03 * Math.sin(flashTimer * Math.PI * 2);
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--scene-brightness', brightness.toFixed(3));
  }
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
