import { VW, VH } from '../engine/viewport';

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
  kicked: boolean;
}

export function createObSystem(): ObSystem {
  const best = Number(localStorage.getItem('br_best') || '0') || 0;
  return {
    pool: new Array(64)
      .fill(0)
      .map(() => ({ x: 0, y: -100, r: 10, vy: 100, alive: false, scored: false })),
    active: [],
    tSpawn: 0,
    spawnEvery: 0.9,
    elapsed: 0,
    score: 0,
    best,
    kicked: false,
  };
}

function alloc(sys: ObSystem): Ob | null {
  for (let i = 0; i < sys.pool.length; i++) {
    const o = sys.pool[i];
    if (!o.alive) {
      sys.active.push(i);
      o.alive = true;
      o.scored = false;
      return o;
    }
  }
  return null;
}

export function resetObstacles(sys: ObSystem) {
  for (const i of sys.active) sys.pool[i].alive = false;
  sys.active.length = 0;
  sys.tSpawn = 0;
  sys.spawnEvery = 0.9;
  sys.elapsed = 0;
  sys.score = 0;
  sys.kicked = false;
}

function spawn(sys: ObSystem) {
  const lanes = 5;
  const laneW = VW / lanes;
  const lane = Math.floor(Math.random() * lanes);
  const cx = laneW * (lane + 0.5);
  const t = sys.elapsed;
  const baseSpeed = 140;
  const speed = baseSpeed + Math.min(260, t * 12);
  const r = 10 + Math.min(14, t * 0.4);

  const o = alloc(sys);
  if (!o) return;
  o.x = cx + (Math.random() * 18 - 9);
  o.y = -r - 8;
  o.r = r;
  o.vy = speed;
  sys.kicked = true;
}

export function ensureKickstart(sys: ObSystem) {
  if (!sys.kicked && sys.elapsed > 0.4) {
    spawn(sys);
  }
}

export function updateObstacles(sys: ObSystem, dt: number) {
  sys.elapsed += dt;
  sys.tSpawn += dt;

  const targetEvery = Math.max(0.28, 0.9 - sys.elapsed * 0.015);
  sys.spawnEvery += (targetEvery - sys.spawnEvery) * 0.15;

  if (sys.tSpawn >= sys.spawnEvery) {
    sys.tSpawn = 0;
    spawn(sys);
  }

  for (let a = sys.active.length - 1; a >= 0; a--) {
    const i = sys.active[a];
    const o = sys.pool[i];
    if (!o.alive) {
      sys.active.splice(a, 1);
      continue;
    }
    o.y += o.vy * dt;

    if (!o.scored && o.y - o.r > VH) {
      sys.score += 10;
      o.scored = true;
    }
    if (o.y - o.r > VH + 40) {
      o.alive = false;
      sys.active.splice(a, 1);
    }
  }

  sys.score += dt * 5;
}

export function collideCircle(px: number, py: number, pr: number, o: Ob): boolean {
  const dx = o.x - px;
  const dy = o.y - py;
  const rr = o.r + pr;
  return dx * dx + dy * dy <= rr * rr;
}

export function drawObstacles(ctx: CanvasRenderingContext2D, sys: ObSystem) {
  for (const i of sys.active) {
    const o = sys.pool[i];
    // shadow
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(o.x, o.y + o.r * 0.35, o.r * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = '#041a28';
    ctx.fill();
    ctx.globalAlpha = 1;
    // body gradient
    const g = ctx.createRadialGradient(
      o.x - o.r * 0.35,
      o.y - o.r * 0.35,
      o.r * 0.1,
      o.x,
      o.y,
      o.r,
    );
    g.addColorStop(0.0, '#b8f7ff');
    g.addColorStop(0.45, '#54d0e0');
    g.addColorStop(1.0, '#1aa2b4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    // rim
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r - 0.7, -Math.PI * 0.2, Math.PI * 0.2);
    ctx.stroke();
  }
}

export function commitBest(sys: ObSystem) {
  if (sys.score > sys.best) {
    sys.best = Math.floor(sys.score);
    localStorage.setItem('br_best', String(sys.best));
  }
}

export function getActiveCount(sys: ObSystem) {
  return sys.active.length;
}

export function getScore(sys: ObSystem) {
  return Math.floor(sys.score);
}

export function getBest(sys: ObSystem) {
  return sys.best;
}
