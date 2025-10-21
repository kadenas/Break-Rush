type TrackMap = { [k: string]: HTMLAudioElement | null };

const tracks: TrackMap = {
  music: null,
  whoosh: null,
  level:  null,
  crash:  null,   // nueva pista mp3 para choque
};

let musicEnabled = true;
let sfxEnabled = true;

// WebAudio mini-sintetizador para fallback de "crash"
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

  // Música opcional (no falla si no existe)
  try {
    tracks.music = new Audio('/audio/loop.mp3');
    tracks.music.loop = true;
    tracks.music.volume = 0.35;
  } catch { tracks.music = null; }

  // SFX opcionales (no imprescindibles)
  try { tracks.whoosh = new Audio('/audio/whoosh.ogg'); tracks.whoosh.volume = 0.6; } catch { tracks.whoosh = null; }
  try { tracks.level  = new Audio('/audio/level.ogg');  tracks.level.volume  = 0.8; } catch { tracks.level  = null; }

  // Choque vía MP3 (tu archivo)
  try { tracks.crash = new Audio('/audio/loop3.mp3'); tracks.crash.volume = 0.8; } catch { tracks.crash = null; }
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

  if (name === 'crash') {
    // Intenta MP3 primero
    const a = tracks.crash;
    if (a) {
      try { const c = a.cloneNode(true) as HTMLAudioElement; void c.play(); return; } catch {}
    }
    // Fallback sintético
    return synthCrash();
  }

  const a = tracks[name];
  if (!a) return;
  try { const c = a.cloneNode(true) as HTMLAudioElement; void c.play(); } catch {}
}

// SFX sintetizado: golpe corto con barrido de frecuencia
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
