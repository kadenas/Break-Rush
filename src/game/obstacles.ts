import { VW, VH } from '../engine/viewport';

const BEST_KEY = 'br_best';

function readBest(): number {
  try {
    if (typeof localStorage === 'undefined') return 0;
    const raw = localStorage.getItem(BEST_KEY);
    const num = raw == null ? 0 : Number(raw);
    return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
  } catch {
    return 0;
  }
}

function writeBest(value: number) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* ignore */
  }
}

export interface Ob {
  x: number;
  y: number;
  r: number;
  vy: number;
  alive: boolean;
  scored: boolean;
}

export interface ObSystem {
  pool: Ob[];
  active: number[];
  tSpawn: number;
  spawnEvery: number;
  elapsed: number;
  score: number;
  best: number;
}

const POOL_SIZE = 64;
const LANES = 5;
const BASE_SPAWN = 0.9;
const MIN_SPAWN = 0.28;
const BASE_SPEED = 140;
const MAX_SPEED_BONUS = 260;
const SPEED_GAIN = 12;
const BASE_RADIUS = 10;
const MAX_RADIUS_BONUS = 14;
const RADIUS_GAIN = 0.4;
const PASS_SCORE = 10;
const SURVIVE_PER_SEC = 5;

export function createObSystem(): ObSystem {
  return {
    pool: new Array(POOL_SIZE).fill(0).map(() => ({
      x: 0,
      y: -200,
      r: BASE_RADIUS,
      vy: BASE_SPEED,
      alive: false,
      scored: false,
    })),
    active: [],
    tSpawn: 0,
    spawnEvery: BASE_SPAWN,
    elapsed: 0,
    score: 0,
    best: readBest(),
  };
}

function alloc(sys: ObSystem): Ob | null {
  for (let i = 0; i < sys.pool.length; i++) {
    const ob = sys.pool[i];
    if (!ob.alive) {
      ob.alive = true;
      ob.scored = false;
      sys.active.push(i);
      return ob;
    }
  }
  return null;
}

function free(sys: ObSystem, index: number) {
  const ob = sys.pool[index];
  ob.alive = false;
  ob.y = -200;
}

function spawn(sys: ObSystem) {
  const laneWidth = VW / LANES;
  const lane = Math.floor(Math.random() * LANES);
  const cx = laneWidth * (lane + 0.5);

  const t = sys.elapsed;
  const vy = BASE_SPEED + Math.min(MAX_SPEED_BONUS, t * SPEED_GAIN);
  const r = BASE_RADIUS + Math.min(MAX_RADIUS_BONUS, t * RADIUS_GAIN);

  const ob = alloc(sys);
  if (!ob) return;

  ob.x = cx + (Math.random() * 18 - 9);
  ob.y = -r - 8;
  ob.r = r;
  ob.vy = vy;
}

export function resetObstacles(sys: ObSystem) {
  for (let i = sys.active.length - 1; i >= 0; i--) {
    const idx = sys.active[i];
    sys.pool[idx].alive = false;
  }
  sys.active.length = 0;
  sys.tSpawn = 0;
  sys.spawnEvery = BASE_SPAWN;
  sys.elapsed = 0;
  sys.score = 0;
}

export function updateObstacles(sys: ObSystem, dt: number) {
  sys.elapsed += dt;
  sys.tSpawn += dt;

  const targetSpawn = Math.max(MIN_SPAWN, BASE_SPAWN - sys.elapsed * 0.015);
  sys.spawnEvery += (targetSpawn - sys.spawnEvery) * 0.15;

  if (sys.tSpawn >= sys.spawnEvery) {
    sys.tSpawn = 0;
    spawn(sys);
  }

  for (let a = sys.active.length - 1; a >= 0; a--) {
    const idx = sys.active[a];
    const ob = sys.pool[idx];
    if (!ob.alive) {
      sys.active.splice(a, 1);
      continue;
    }

    ob.y += ob.vy * dt;

    if (!ob.scored && ob.y - ob.r > VH) {
      ob.scored = true;
      sys.score += PASS_SCORE;
    }

    if (ob.y - ob.r > VH + 40) {
      free(sys, idx);
      sys.active.splice(a, 1);
    }
  }

  sys.score += dt * SURVIVE_PER_SEC;
}

export function collideCircle(px: number, py: number, pr: number, ob: Ob) {
  const dx = ob.x - px;
  const dy = ob.y - py;
  const rr = ob.r + pr;
  return dx * dx + dy * dy <= rr * rr;
}

export function drawObstacles(ctx: CanvasRenderingContext2D, sys: ObSystem) {
  for (let i = 0; i < sys.active.length; i++) {
    const ob = sys.pool[sys.active[i]];

    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y + ob.r * 0.35, ob.r * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = '#041a28';
    ctx.fill();
    ctx.globalAlpha = 1;

    const grad = ctx.createRadialGradient(
      ob.x - ob.r * 0.35,
      ob.y - ob.r * 0.35,
      ob.r * 0.1,
      ob.x,
      ob.y,
      ob.r,
    );
    grad.addColorStop(0.0, '#b8f7ff');
    grad.addColorStop(0.45, '#54d0e0');
    grad.addColorStop(1.0, '#1aa2b4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ob.r - 0.7, -Math.PI * 0.2, Math.PI * 0.2);
    ctx.stroke();
  }
}

export function commitBest(sys: ObSystem) {
  const s = Math.floor(sys.score);
  if (s > sys.best) {
    sys.best = s;
    writeBest(sys.best);
  }
}
