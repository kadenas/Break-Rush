import { VW, VH } from '../engine/viewport';

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  vy: number;
  alive: boolean;
  scored: boolean;
}

export interface ObstacleSystem {
  pool: Obstacle[];
  active: number[];
  tSpawn: number;
  spawnEvery: number;
  elapsed: number;
  score: number;
  best: number;
  kicked: boolean;
}

const POOL_SIZE = 64;

export function createObSystem(): ObstacleSystem {
  const best = Number(localStorage.getItem('br_best') || '0') || 0;
  return {
    pool: Array.from({ length: POOL_SIZE }, () => ({
      x: 0,
      y: -100,
      r: 12,
      vy: 120,
      alive: false,
      scored: false,
    })),
    active: [],
    tSpawn: 0,
    spawnEvery: 0.9,
    elapsed: 0,
    score: 0,
    best,
    kicked: false,
  };
}

export function resetObstacles(sys: ObstacleSystem) {
  for (const index of sys.active) {
    sys.pool[index].alive = false;
  }
  sys.active.length = 0;
  sys.tSpawn = 0;
  sys.spawnEvery = 0.9;
  sys.elapsed = 0;
  sys.score = 0;
  sys.kicked = false;
}

function allocate(sys: ObstacleSystem): Obstacle | null {
  for (let i = 0; i < sys.pool.length; i++) {
    const ob = sys.pool[i];
    if (!ob.alive) {
      sys.active.push(i);
      ob.alive = true;
      ob.scored = false;
      return ob;
    }
  }
  return null;
}

function spawn(sys: ObstacleSystem) {
  const obstacle = allocate(sys);
  if (!obstacle) return;

  const lanes = 5;
  const laneWidth = VW / lanes;
  const lane = Math.floor(Math.random() * lanes);
  const cx = laneWidth * (lane + 0.5);

  const elapsed = sys.elapsed;
  const baseSpeed = 140;
  const speedBoost = Math.min(260, elapsed * 12);
  const radius = 12 + Math.min(16, elapsed * 0.45);

  obstacle.x = cx + (Math.random() * 18 - 9);
  obstacle.y = -radius - 12;
  obstacle.r = radius;
  obstacle.vy = baseSpeed + speedBoost;
  sys.kicked = true;
}

export function ensureKickstart(sys: ObstacleSystem) {
  if (!sys.kicked && sys.elapsed > 0.4) {
    spawn(sys);
  }
}

export function updateObstacles(sys: ObstacleSystem, dt: number) {
  sys.elapsed += dt;
  sys.tSpawn += dt;

  const targetEvery = Math.max(0.28, 0.9 - sys.elapsed * 0.015);
  sys.spawnEvery += (targetEvery - sys.spawnEvery) * 0.15;

  if (sys.tSpawn >= sys.spawnEvery) {
    sys.tSpawn = 0;
    spawn(sys);
  }

  for (let idx = sys.active.length - 1; idx >= 0; idx--) {
    const poolIndex = sys.active[idx];
    const ob = sys.pool[poolIndex];
    if (!ob.alive) {
      sys.active.splice(idx, 1);
      continue;
    }

    ob.y += ob.vy * dt;

    if (!ob.scored && ob.y - ob.r > VH) {
      sys.score += 10;
      ob.scored = true;
    }

    if (ob.y - ob.r > VH + 48) {
      ob.alive = false;
      sys.active.splice(idx, 1);
    }
  }

  sys.score += dt * 5;
}

export function drawObstacles(ctx: CanvasRenderingContext2D, sys: ObstacleSystem) {
  for (const index of sys.active) {
    const ob = sys.pool[index];
    if (!ob.alive) continue;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y + ob.r * 0.4, ob.r * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = '#041521';
    ctx.fill();
    ctx.globalAlpha = 1;

    const gradient = ctx.createRadialGradient(
      ob.x - ob.r * 0.35,
      ob.y - ob.r * 0.35,
      ob.r * 0.25,
      ob.x,
      ob.y,
      ob.r,
    );
    gradient.addColorStop(0, '#b8f7ff');
    gradient.addColorStop(0.45, '#54d0e0');
    gradient.addColorStop(1, '#1aa2b4');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ob.r - 0.8, -Math.PI * 0.25, Math.PI * 0.25);
    ctx.stroke();
    ctx.restore();
  }
}

export function collideCircle(px: number, py: number, pr: number, ob: Obstacle) {
  const dx = ob.x - px;
  const dy = ob.y - py;
  const rr = pr + ob.r;
  return dx * dx + dy * dy <= rr * rr;
}

export function commitBest(sys: ObstacleSystem) {
  const score = Math.floor(sys.score);
  if (score > sys.best) {
    sys.best = score;
    localStorage.setItem('br_best', String(sys.best));
  }
}

export function getActiveCount(sys: ObstacleSystem) {
  return sys.active.length;
}
