import { VW, VH } from '../engine/viewport';

// Mensajes motivacionales con animación flotante
type Msg = {
  text: string;
  x: number;
  y: number;
  t: number;
  life: number;
  vy: number;
  scale: number;
  alive: boolean;
};

const ACTIVE: Msg[] = [];
const CHOICES = [
  '¡Genial!',
  '¡Perfecto!',
  '¡Muy bien!',
  '¡Imparable!',
  '¡Vas fino!',
  '¡Crack!',
  '¡Seguimos!',
  '¡De fábula!',
  '¡Fabuloso!',
  '¡A tope!',
  '¡Fiera!',
  '¡Máquina!',
  '¡Animal!',
  '¡Vas en la llama!',
  '¡León!',
  '¡Plus ultra!',
  '¡Excavadora!',
  '¡Champion!',
  '¡Fenómeno!',
  '¡Fastuoso!',
  '¡Estamos orgullosos!',
  '¡Mastodonte!',
];

let cooldown = 0;

export function resetMessages() {
  ACTIVE.length = 0;
  cooldown = 0;
}

export function maybeSpawnAuto(dt: number) {
  cooldown -= dt;
  if (cooldown > 0) return;
  cooldown = 6 + Math.random() * 2;
  spawnMessage();
}

export function spawnMessage(text?: string) {
  const msg: Msg = {
    text: text || CHOICES[(Math.random() * CHOICES.length) | 0],
    x: VW * (0.35 + Math.random() * 0.3),
    y: VH * (0.25 + Math.random() * 0.25),
    t: 0,
    life: 1.0,
    vy: -22 - Math.random() * 8,
    scale: 0.9 + Math.random() * 0.25,
    alive: true,
  };
  ACTIVE.push(msg);
}

export function updateMessages(dt: number) {
  for (let i = ACTIVE.length - 1; i >= 0; i--) {
    const m = ACTIVE[i];
    if (!m.alive) { ACTIVE.splice(i, 1); continue; }
    m.t += dt;
    m.y += m.vy * dt;
    if (m.t >= m.life) { m.alive = false; ACTIVE.splice(i, 1); }
  }
}

export function drawMessages(ctx: CanvasRenderingContext2D) {
  for (const m of ACTIVE) {
    const a = Math.max(0, 1 - m.t / m.life);
    const t = m.t / m.life;
    const scale = m.scale * (1 + 0.2 * Math.sin(t * Math.PI));
    ctx.save();
    ctx.globalAlpha = a * 0.95;
    ctx.translate(m.x, m.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#e8f4ff';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText(m.text, 0, 0);
    ctx.restore();
  }
}
