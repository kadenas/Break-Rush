import { VW, VH } from '../engine/viewport';

// Configuración de ritmo
const MIN_GAP = 7;      // segundos mínimos entre mensajes auto
const MAX_GAP = 12;     // segundos máximos entre mensajes auto
const MAX_ACTIVE = 2;   // no más de 2 simultáneos en pantalla
const RECENT_SIZE = 4;  // evitemos repetir de los últimos 4

// Pool general (sin "Subidón")
type Phrase = { text: string; weight: number };
export const messages: Phrase[] = [
  { text: '¡Genial!', weight: 3 },
  { text: '¡Muy bien!', weight: 3 },
  { text: '¡Vas fino!', weight: 2 },
  { text: '¡Crack!', weight: 3 },
  { text: '¡Capibara!', weight: 2 },
  { text: '¡A tope!', weight: 2 },
  { text: '¡Fiera!', weight: 3 },
  { text: '¡Máquina!', weight: 2 },
  { text: '¡Animal!', weight: 2 },
  { text: '¡Vas en la llama!', weight: 1 },
  { text: '¡León!', weight: 1 },
  { text: '¡Excavadora!', weight: 2 },
  { text: '¡Eres un fenómeno!', weight: 3 },
  { text: '¡Estamos orgullosos!', weight: 1 },
  { text: '¡Mastodonte!', weight: 2 },
  { text: '¡Bonus de oro!', weight: 1 },
  { text: '¡Escudo activado!', weight: 1 },
  { text: '¡Tiempo lento!', weight: 1 },
];

// Pool específico para hito
const MILESTONE_CHOICES: Phrase[] = [
  { text: '¡Subidón!', weight: 3 },
  { text: '¡Nivel superado!', weight: 2 },
  { text: '¡Racha brutal!', weight: 2 },
  { text: '¡Sigues a tope!', weight: 1 },
];

// Mensaje animado
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
let cooldown = randGap(MIN_GAP, MAX_GAP);
const recent: string[] = [];

let milestoneCooldown = 0; // enfriamiento para mensajes de hito

export function resetMessages() {
  ACTIVE.length = 0;
  cooldown = randGap(MIN_GAP, MAX_GAP);
  recent.length = 0;
  milestoneCooldown = 0;
}

export function updateMessages(dt: number) {
  // actualizar animaciones
  for (let i = ACTIVE.length - 1; i >= 0; i--) {
    const m = ACTIVE[i];
    if (!m.alive) { ACTIVE.splice(i, 1); continue; }
    m.t += dt;
    m.y += m.vy * dt;
    if (m.t >= m.life) { m.alive = false; ACTIVE.splice(i, 1); }
  }
  // timers
  cooldown -= dt;
  milestoneCooldown = Math.max(0, milestoneCooldown - dt);
}

export function maybeSpawnAuto() {
  if (ACTIVE.length >= MAX_ACTIVE) return;
  if (cooldown > 0) return;
  // próxima ventana
  cooldown = randGap(MIN_GAP, MAX_GAP);
  spawnMessage(pickWeighted(messages));
}

export function spawnMilestoneMessage() {
  if (milestoneCooldown > 0) return;
  milestoneCooldown = 8; // segundos entre mensajes de hito
  spawnMessage(pickWeighted(MILESTONE_CHOICES));
}

export function spawnMessage(text?: string) {
  const msg: Msg = {
    text: text || pickWeighted(messages),
    x: VW * (0.35 + Math.random() * 0.3),
    y: VH * (0.25 + Math.random() * 0.25),
    t: 0,
    life: 1.0,
    vy: -22 - Math.random() * 8,
    scale: 0.9 + Math.random() * 0.25,
    alive: true,
  };
  ACTIVE.push(msg);
  remember(msg.text);
}

export function playMessage(text: string) {
  spawnMessage(text);
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

// utilidades

function randGap(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function remember(text: string) {
  recent.push(text);
  if (recent.length > RECENT_SIZE) recent.shift();
}

function pickWeighted(pool: Phrase[]): string {
  // evita repetir de los últimos RECENT_SIZE cuando sea posible
  const filtered = pool.filter(p => !recent.includes(p.text));
  const list = filtered.length > 0 ? filtered : pool;
  const total = list.reduce((s, p) => s + (p.weight > 0 ? p.weight : 1), 0);
  let r = Math.random() * total;
  for (const p of list) {
    const w = p.weight > 0 ? p.weight : 1;
    if ((r -= w) <= 0) return p.text;
  }
  return list[list.length - 1].text;
}
