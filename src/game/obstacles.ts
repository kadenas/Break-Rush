import { VW, VH } from '../engine/viewport';

export interface Ob {
  x: number;
  y: number;
  r: number;
  vy: number;
  alive: boolean;
  scored: boolean;
  lane: number;
  spawnTime: number;
  scoreValue: number;
  big: boolean;
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
  waveTimer: number;
  waveIntensity: number;
}

export function createObSystem(): ObSystem {
  const best = Number(localStorage.getItem('br_best') || '0') || 0;
  return {
    pool: Array.from({ length: POOL_SIZE }, () => ({
      x: 0,
      y: -100,
      r: 12,
      vy: 120,
      alive: false,
      scored: false,
      lane: -1,
      spawnTime: -1,
      scoreValue: 10,
      big: false,
    })),
    active: [],
    tSpawn: 0,
    spawnEvery: 0.9,
    elapsed: 0,
    score: 0,
    best,
    kicked: false,
    waveTimer: 0,
    waveIntensity: 0,
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
  sys.waveTimer = 0;
  sys.waveIntensity = 0;
}

function allocate(sys: ObstacleSystem): Obstacle | null {
  for (let i = 0; i < sys.pool.length; i++) {
    const ob = sys.pool[i];
    if (!ob.alive) {
      sys.active.push(i);
      ob.alive = true;
      ob.scored = false;
      ob.big = false;
      return ob;
    }
  }
  return null;
}

const LANES = 5;

function shuffleLanes(): number[] {
  const order = Array.from({ length: LANES }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function easeOutCubic(t: number) {
  const inv = 1 - Math.min(Math.max(t, 0), 1);
  return 1 - inv * inv * inv;
}

function getWaveIntensity(sys: ObstacleSystem) {
  const WAVE_LENGTH = 15;
  const COOL_LENGTH = 5;
  const TOTAL = WAVE_LENGTH + COOL_LENGTH;
  let t = sys.waveTimer % TOTAL;
  if (t < WAVE_LENGTH) {
    return t / WAVE_LENGTH;
  }
  const coolT = (t - WAVE_LENGTH) / COOL_LENGTH;
  return 1 - easeOutCubic(coolT) * 0.4;
}

function canSpawnInLane(
  sys: ObstacleSystem,
  lane: number,
  spawnY: number,
): boolean {
  for (const index of sys.active) {
    const other = sys.pool[index];
    if (!other.alive || other.lane !== lane) continue;
    if (other.spawnTime < 0) continue;
    if (sys.elapsed - other.spawnTime > 0.6) continue;
    if (Math.abs(other.y - spawnY) < 70) {
      return false;
    }
  }
  return true;
}

function spawn(sys: ObstacleSystem) {
  const obstacle = allocate(sys);
  if (!obstacle) return;

  const laneWidth = VW / LANES;
  const waveIntensity = sys.waveIntensity;
  const baseSpeed = 140;
  const baseRadius = 12 + Math.min(16, sys.elapsed * 0.35);
  const isBig = Math.random() < 0.1;
  const radiusMultiplier = isBig ? 1.6 : 1;
  const radius = baseRadius * radiusMultiplier;

  const laneOrder = shuffleLanes();
  let selectedLane = -1;
  let spawnX = 0;
  let spawnY = 0;
  let laneCenter = 0;

  for (const lane of laneOrder) {
    laneCenter = laneWidth * (lane + 0.5);
    const proposedY = -radius - 12;
    if (!canSpawnInLane(sys, lane, proposedY)) {
      continue;
    }
    selectedLane = lane;
    spawnX = laneCenter + (Math.random() * (laneWidth * 0.45) - laneWidth * 0.225);
    spawnY = proposedY;
    break;
  }

  if (selectedLane === -1) {
    obstacle.alive = false;
    obstacle.lane = -1;
    sys.active.pop();
    return;
  }

  const speedBonus = waveIntensity * 120;
  const vy = (baseSpeed + speedBonus) * (isBig ? 0.75 : 1);

  obstacle.x = spawnX;
  obstacle.y = spawnY;
  obstacle.r = radius;
  obstacle.vy = vy;
  obstacle.lane = selectedLane;
  obstacle.spawnTime = sys.elapsed;
  obstacle.scoreValue = isBig ? 30 : 10;
  obstacle.big = isBig;
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
  sys.waveTimer += dt;

  const waveIntensity = getWaveIntensity(sys);
  sys.waveIntensity = waveIntensity;

  const baseSpawn = 0.9;
  const targetEvery = Math.max(0.35, baseSpawn - waveIntensity * 0.25);
  sys.spawnEvery = targetEvery;

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

    ob.y += ob.vy * dt;

    if (!ob.scored && ob.y - ob.r > VH) {
      sys.score += ob.scoreValue;
      ob.scored = true;
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
