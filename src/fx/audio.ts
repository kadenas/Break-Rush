import { AudioManager, type PlayHandle } from '../audioManager';

type TrackName = 'whoosh' | 'level' | 'crash';

let musicEnabled = true;
let sfxEnabled = true;
let musicSource: PlayHandle | null = null;

export function audioInit(opts?: { music?: boolean; sfx?: boolean }) {
  musicEnabled = opts?.music ?? (localStorage.getItem('br_music') !== '0');
  sfxEnabled = opts?.sfx ?? (localStorage.getItem('br_fx') !== '0');

  AudioManager.getContext();
}

export async function unlockAudio() {
  try {
    await AudioManager.unlock();
  } catch {
    // ignore unlock errors caused by autoplay restrictions
  }
}

export function setMusic(on: boolean) {
  musicEnabled = on;
  localStorage.setItem('br_music', on ? '1' : '0');
  if (!on) stopMusic();
}

export function setSfx(on: boolean) {
  sfxEnabled = on;
  localStorage.setItem('br_fx', on ? '1' : '0');
}

export async function startMusic() {
  if (!musicEnabled) return;

  stopMusic();
  musicSource = (await AudioManager.play('loop', { loop: true, vol: 0.35 })) ?? null;
}

export function stopMusic() {
  if (!musicSource) return;
  if ('stop' in musicSource) {
    try {
      musicSource.stop();
    } catch {
      // ignore stop errors
    }
    try {
      musicSource.disconnect();
    } catch {
      // ignore disconnect errors
    }
  } else {
    musicSource.pause();
    musicSource.currentTime = 0;
  }
  musicSource = null;
}

export function playBrand() {
  void AudioManager.play('loop4', { vol: 0.5 });
}

export function playSfx(name: TrackName) {
  if (!sfxEnabled) return;

  if (name === 'crash') {
    void AudioManager.play('loop3', { vol: 0.8 }).then((src) => {
      if (!src) synthCrash();
    });
    return;
  }

  if (name === 'level') {
    void AudioManager.play('level', { vol: 0.8 }).then((src) => {
      if (!src) synthPing();
    });
    return;
  }

  void AudioManager.play('whoosh', { vol: 0.6 });
}

function getCtx() {
  const ctx = AudioManager.getContext();
  if (!ctx) return null;
  void AudioManager.unlock();
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
