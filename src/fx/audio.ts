import { AUDIO } from '../audio/names';
import type { MusicHandle } from '../audio/audioManager';
import { getContext, playMusic, playSfx, stopMusic, unlock } from '../audio/audioManager';

type TrackName = 'level';

const MUSIC_FADE_IN_INTRO = 0.5;
const MUSIC_FADE_IN_PLAY = 0.3;
const MUSIC_FADE_OUT = 0.25;

let musicEnabled = true;
let sfxEnabled = true;
let currentHandle: MusicHandle | null = null;
let desiredTrack: string | null = null;

export function audioInit(opts?: { music?: boolean; sfx?: boolean }) {
  musicEnabled = opts?.music ?? musicEnabled;
  sfxEnabled = opts?.sfx ?? sfxEnabled;
}

export function unlockAudio() {
  return unlock();
}

export function setMusic(on: boolean) {
  musicEnabled = on;
  if (!on) {
    stopCurrentMusic(MUSIC_FADE_OUT);
    return;
  }
  if (desiredTrack) {
    startTrack(desiredTrack, desiredTrack === AUDIO.INTRO ? MUSIC_FADE_IN_INTRO : MUSIC_FADE_IN_PLAY);
  }
}

export function setSfx(on: boolean) {
  sfxEnabled = on;
}

export function stopMusic() {
  stopCurrentMusic(MUSIC_FADE_OUT);
}

export function toIntro() {
  desiredTrack = AUDIO.INTRO;
  if (musicEnabled) {
    startTrack(AUDIO.INTRO, MUSIC_FADE_IN_INTRO);
  }
}

export function startGame() {
  desiredTrack = AUDIO.PLAY;
  if (musicEnabled) {
    startTrack(AUDIO.PLAY, MUSIC_FADE_IN_PLAY);
  }
}

export function onHit() {
  desiredTrack = null;
  stopCurrentMusic(0.25);
  if (!sfxEnabled) {
    return;
  }
  void playSfx(AUDIO.HIT, { vol: 1 }).then((ok) => {
    if (!ok) {
      synthCrash();
    }
  });
}

export function onRetry() {
  desiredTrack = AUDIO.PLAY;
  if (musicEnabled) {
    startTrack(AUDIO.PLAY, MUSIC_FADE_IN_PLAY);
  }
}

export function playSfx(name: TrackName) {
  if (!sfxEnabled) {
    return;
  }
  if (name === 'level') {
    void playSfx(AUDIO.LEVEL, { vol: 0.9 }).then((ok) => {
      if (!ok) {
        synthPing();
      }
    });
  }
}

function startTrack(name: string, fadeIn: number) {
  stopCurrentMusic(MUSIC_FADE_OUT);
  const handle = playMusic(name, { loop: true, fadeIn });
  if (handle) {
    currentHandle = handle;
  } else {
    currentHandle = null;
  }
}

function stopCurrentMusic(fadeOut: number) {
  if (currentHandle) {
    stopMusic(currentHandle, { fadeOut });
  }
  currentHandle = null;
}

function getCtx() {
  const ctx = getContext();
  if (!ctx) {
    return null;
  }
  return ctx;
}

function synthCrash() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.18;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.7, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.01);
}

function synthPing() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.12;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.01);
}
