// Módulo de audio sin binarios: no rompe si no existen los archivos
type TrackMap = { [k: string]: HTMLAudioElement | null };

const tracks: TrackMap = {
  music: null,
  whoosh: null,
  level: null,
};

let musicEnabled = true;
let sfxEnabled = true;

export function audioInit(opts?: { music?: boolean; sfx?: boolean }) {
  musicEnabled = opts?.music ?? (localStorage.getItem('br_music') !== '0');
  sfxEnabled = opts?.sfx ?? (localStorage.getItem('br_fx') !== '0');

  // Si existen los archivos, los usa; si no, ignora.
  try {
    tracks.music = new Audio('/audio/loop.mp3');
    tracks.music.loop = true;
    tracks.music.volume = 0.35;
  } catch {
    tracks.music = null;
  }

  try {
    tracks.whoosh = new Audio('/audio/whoosh.ogg');
    tracks.whoosh.volume = 0.6;
  } catch {
    tracks.whoosh = null;
  }
  try {
    tracks.level = new Audio('/audio/level.ogg');
    tracks.level.volume = 0.8;
  } catch {
    tracks.level = null;
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
  if (!musicEnabled || !tracks.music) return;
  try {
    await tracks.music.play();
  } catch {
    // ignore play rejection
  }
}

export function stopMusic() {
  const m = tracks.music;
  if (!m) return;
  try {
    m.pause();
    m.currentTime = 0;
  } catch {
    // ignore pause errors
  }
}

export function playSfx(name: 'whoosh' | 'level') {
  if (!sfxEnabled) return;
  const a = tracks[name];
  if (!a) return;
  try {
    const c = a.cloneNode(true) as HTMLAudioElement;
    c.play().catch(() => {});
  } catch {
    // ignore playback errors
  }
}
