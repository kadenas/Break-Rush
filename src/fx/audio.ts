import { AUDIO_NAMES } from '../audio/names.js';
import {
  playMusic as playMusicTrack,
  stopMusic as stopMusicTrack,
  playSfx as playSfxClip,
  resume as resumeContext,
  getContext as getAudioContext,
} from '../audio/audioManager.js';
import type { MusicHandle } from '../audio/audioManager.js';

type TrackName = 'whoosh' | 'level';

type AudioState = 'INTRO' | 'PLAYING' | 'GAME_OVER';

const MUSIC_FADE_IN_INTRO = 0.6;
const MUSIC_FADE_IN_PLAY = 0.4;
const MUSIC_FADE_OUT = 0.35;

let musicEnabled = true;
let sfxEnabled = true;
let currentState: AudioState = 'INTRO';
let currentHandle: MusicHandle | null = null;
let currentTrack: string | null = null;
let desiredTrack: string | null = null;

export function audioInit(opts?: { music?: boolean; sfx?: boolean }) {
  musicEnabled = opts?.music ?? musicEnabled;
  sfxEnabled = opts?.sfx ?? sfxEnabled;
  void resumeContext();
  desiredTrack = null;
}

export function unlockAudio() {
  return resumeContext().then(() => {
    ensureMusicForState();
  });
}

export function setMusic(on: boolean) {
  musicEnabled = on;
  if (!on) {
    stopCurrentMusic(MUSIC_FADE_OUT);
    return;
  }
  if (!desiredTrack) {
    if (currentState === 'INTRO') {
      desiredTrack = AUDIO_NAMES.INTRO;
    } else if (currentState === 'PLAYING') {
      desiredTrack = AUDIO_NAMES.PLAY;
    }
  }
  ensureMusicForState();
}

export function setSfx(on: boolean) {
  sfxEnabled = on;
}

export function stopMusic() {
  stopCurrentMusic(MUSIC_FADE_OUT);
}

export function toIntro() {
  currentState = 'INTRO';
  desiredTrack = AUDIO_NAMES.INTRO;
  ensureMusicForState(MUSIC_FADE_IN_INTRO);
}

export function startGame() {
  currentState = 'PLAYING';
  desiredTrack = AUDIO_NAMES.PLAY;
  ensureMusicForState(MUSIC_FADE_IN_PLAY);
}

export function onHit() {
  currentState = 'GAME_OVER';
  desiredTrack = null;
  stopCurrentMusic(0.2);
  if (sfxEnabled) {
    void playSfxClip(AUDIO_NAMES.HIT, { vol: 0.9 }).then((ok) => {
      if (!ok) {
        synthCrash();
      }
    });
  }
}

export function onRetry() {
  currentState = 'PLAYING';
  desiredTrack = AUDIO_NAMES.PLAY;
  ensureMusicForState(MUSIC_FADE_IN_PLAY);
}

export function playSfx(name: TrackName) {
  if (!sfxEnabled) {
    return;
  }
  if (name === 'level') {
    void playSfxClip(AUDIO_NAMES.LVL, { vol: 0.8 }).then((ok) => {
      if (!ok) {
        synthPing();
      }
    });
    return;
  }
  void playSfxClip(AUDIO_NAMES.HIT, { vol: 0.45 });
}

function ensureMusicForState(fadeIn?: number) {
  if (currentState === 'GAME_OVER') {
    stopCurrentMusic(MUSIC_FADE_OUT);
    return;
  }
  if (!musicEnabled || !desiredTrack) {
    stopCurrentMusic(MUSIC_FADE_OUT);
    return;
  }
  if (currentTrack === desiredTrack && currentHandle) {
    return;
  }
  const fade = fadeIn ?? (desiredTrack === AUDIO_NAMES.INTRO ? MUSIC_FADE_IN_INTRO : MUSIC_FADE_IN_PLAY);
  startTrack(desiredTrack, fade);
}

function startTrack(name: string, fadeIn: number) {
  stopCurrentMusic(MUSIC_FADE_OUT);
  const handle = playMusicTrack(name, { loop: true, fadeIn });
  currentHandle = handle;
  if (handle) {
    currentTrack = name;
  } else {
    currentTrack = null;
  }
}

function stopCurrentMusic(fadeOut: number) {
  if (currentHandle) {
    stopMusicTrack(currentHandle, { fadeOut });
  }
  currentHandle = null;
  currentTrack = null;
}

function getCtx() {
  const ctx = getAudioContext();
  if (!ctx) {
    return null;
  }
  void resumeContext();
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
