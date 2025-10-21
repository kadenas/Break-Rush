import { AUDIO } from '../audio/names';
import type { MusicHandle } from '../audio/audioManager';
import { getContext, playMusic, playSfx as playClip, stopMusic as haltMusic, unlock } from '../audio/audioManager';

type TrackName = 'level';

type MusicState = 'idle' | 'intro' | 'play' | 'hit' | 'game_over';

const MUSIC_FADE_IN_INTRO = 0.5;
const MUSIC_FADE_IN_PLAY = 0.3;
const MUSIC_FADE_OUT = 0.25;
const MUSIC_FADE_OUT_HIT = 0.1;

let musicEnabled = true;
let sfxEnabled = true;
let currentHandle: MusicHandle | null = null;
let desiredState: MusicState = 'idle';
let activeState: MusicState = 'idle';

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
  applyMusicState(desiredState);
}

export function setSfx(on: boolean) {
  sfxEnabled = on;
}

export function stopMusic() {
  desiredState = 'idle';
  activeState = 'idle';
  stopCurrentMusic(MUSIC_FADE_OUT);
}

export function toIntro() {
  transitionMusic('intro');
}

export function startGame() {
  transitionMusic('play');
}

export function onHit() {
  transitionMusic('hit');
}

export function onRetry() {
  transitionMusic('play');
}

export function playSfx(name: TrackName) {
  if (!sfxEnabled) {
    return;
  }
  if (name === 'level') {
    void playClip(AUDIO.LEVEL, { vol: 0.9 })
      .then((ok) => {
        if (!ok) {
          synthPing();
        }
      })
      .catch(() => {});
  }
}

function transitionMusic(next: MusicState) {
  if (desiredState === next && (!musicEnabled || (activeState === next && currentHandle))) {
    return;
  }
  desiredState = next;
  if (!musicEnabled) {
    if (next === 'idle' || next === 'game_over') {
      stopCurrentMusic(MUSIC_FADE_OUT);
      activeState = next;
    } else {
      activeState = next;
    }
    return;
  }
  applyMusicState(next);
}

function applyMusicState(next: MusicState) {
  switch (next) {
    case 'idle':
      activeState = 'idle';
      stopCurrentMusic(MUSIC_FADE_OUT);
      break;
    case 'intro':
      if (activeState === 'intro' && currentHandle) {
        break;
      }
      activeState = 'intro';
      startTrack(AUDIO.INTRO, MUSIC_FADE_IN_INTRO, true, MUSIC_FADE_OUT);
      break;
    case 'play':
      activeState = 'play';
      startTrack(AUDIO.PLAY, MUSIC_FADE_IN_PLAY, true, MUSIC_FADE_OUT);
      break;
    case 'hit':
      activeState = 'hit';
      stopCurrentMusic(MUSIC_FADE_OUT_HIT);
      startHitTrack();
      break;
    case 'game_over':
      activeState = 'game_over';
      stopCurrentMusic(MUSIC_FADE_OUT);
      break;
  }
}

function startTrack(name: string, fadeIn: number, loop: boolean, fadeOutBefore: number) {
  stopCurrentMusic(fadeOutBefore);
  const handle = playMusic(name, { loop, fadeIn });
  if (handle) {
    currentHandle = handle;
    handle.ready.then(() => {
      if (!handle.source && currentHandle === handle) {
        currentHandle = null;
      }
    });
  } else {
    currentHandle = null;
  }
}

function startHitTrack() {
  const handle = playMusic(AUDIO.HIT, { loop: false, fadeIn: 0 });
  if (!handle) {
    if (sfxEnabled) {
      synthCrash();
    }
    activeState = 'game_over';
    desiredState = 'game_over';
    return;
  }
  currentHandle = handle;
  handle.ready.then(() => {
    if (!handle.source && desiredState === 'hit') {
      currentHandle = null;
      if (sfxEnabled) {
        synthCrash();
      }
      transitionMusic('game_over');
    }
  });
  handle.ended.then(() => {
    if (desiredState === 'hit') {
      currentHandle = null;
      transitionMusic('game_over');
    }
  });
}

function stopCurrentMusic(fadeOut: number) {
  if (currentHandle) {
    haltMusic(currentHandle, { fadeOut });
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
