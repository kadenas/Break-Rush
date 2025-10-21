type TrackMap = { [k: string]: HTMLAudioElement | null };

const tracks: TrackMap = {
  music: null,
  whoosh: null,
  level:  null,
};

let musicEnabled = true;
let sfxEnabled = true;

// WebAudio mini-sintetizador para "crash"
let audioCtx: AudioContext | null = null;
function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
    catch { audioCtx = null; }
  }
  return audioCtx;
}

export function audioInit(opts?: { music?: boolean; sfx?: boolean }) {
  musicEnabled = opts?.music ?? (localStorage.getItem('br_music') !== '0');
  sfxEnabled   = opts?.sfx   ?? (localStorage.getItem('br_fx') !== '0');

  try {
    tracks.music = new Audio('/audio/loop.mp3'); // opcional; si no existe, no rompe
    tracks.music.loop = true;
    tracks.music.volume = 0.35;
  } catch { tracks.music = null; }

  try { tracks.whoosh = new Audio('/audio/whoosh.ogg'); tracks.whoosh.volume = 0.6; } catch { tracks.whoosh = null; }
  try { tracks.level  = new Audio('/audio/level.ogg');  tracks.level.volume  = 0.8; } catch { tracks.level  = null; }
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
  try { await tracks.music.play(); } catch {}
}

export function stopMusic() {
  const m = tracks.music;
  if (!m) return;
  try { m.pause(); m.currentTime = 0; } catch {}
}

export function playSfx(name: 'whoosh' | 'level' | 'crash') {
  if (!sfxEnabled) return;
  if (name === 'crash') return synthCrash();
  const a = tracks[name];
  if (!a) return;
  try { const c = a.cloneNode(true) as HTMLAudioElement; c.play().catch(()=>{}); } catch {}
}

// SFX sintetizado: golpe corto con barrido de frecuencia
function synthCrash() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const dur = 0.18; // 180 ms
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(480, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + dur);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur + 0.01);
}
