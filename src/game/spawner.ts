import { DifficultyManager } from './difficulty';
import { createAsteroid } from '../entities/asteroid';
import { getGameBounds } from './bounds';
import {
  spawnWallPattern as _spawnWallPattern,
  spawnDiagonalPattern,
  spawnTwinClampPattern,
  PatternRunner,
} from './patterns';

type SpawnAsteroidArgs = {
  speedMul: number;
  asteroid?: ReturnType<typeof createAsteroid>;
};

type SpawnAsteroidCallback = (args: SpawnAsteroidArgs) => void;

const difficulty = new DifficultyManager();

// ========= Gap Reservation =========
type GapReservation = {
  active: boolean;
  x0: number;
  x1: number;
  ttl: number;
  topBandPx: number;
};

let gapReservation: GapReservation = {
  active: false,
  x0: 0,
  x1: 0,
  ttl: 0,
  topBandPx: 140,
};

function reserveGap(x0: number, x1: number, seconds = 1.6) {
  gapReservation = {
    active: true,
    x0,
    x1,
    ttl: seconds,
    topBandPx: 140,
  };
}

function updateGapReservation(dt: number) {
  if (!gapReservation.active) return;
  gapReservation.ttl -= dt;
  if (gapReservation.ttl <= 0) {
    gapReservation.active = false;
  }
}

function isXInReservedGap(x: number): boolean {
  return gapReservation.active && x >= gapReservation.x0 && x <= gapReservation.x1;
}

function shouldAvoidTopBand(y: number): boolean {
  return gapReservation.active && y <= gapReservation.topBandPx;
}
// ===================================

let spawnTimerMs = 0;
let currentTargetIntervalMs = difficulty.currentSpawnIntervalMs;

let activePattern: PatternRunner | null = null;
let patternCooldown = 0;
const minPatternCooldown = 3.5;
const maxPatternCooldown = 7.0;

function rollPatternChance(level: number): number {
  const p = 0.06 + level * 0.012;
  return Math.min(0.22, p);
}

function randRange(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function tryStartPattern(spawnAsteroid: SpawnAsteroidCallback): PatternRunner {
  const baseCtx = {
    speedMul: difficulty.currentSpeedMul,
  };

  const r = Math.random();
  let runner: PatternRunner & { gapX0?: number; gapX1?: number };
  if (r < 0.5) {
    const res = _spawnWallPattern({
      ...baseCtx,
      playerWidthPx: 36,
      gapSafetyPx: 10,
      push: (asteroid) => {
        spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
      },
    });
    reserveGap(res.gapX0, res.gapX1, 1.6);
    runner = res;
  } else if (r < 0.8) {
    runner = spawnDiagonalPattern({
      ...baseCtx,
      push: (asteroid) => {
        const y0 = asteroid.y ?? -40;
        const x0 = asteroid.x ?? 0;
        if (shouldAvoidTopBand(y0) && isXInReservedGap(x0)) return;
        spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
      },
    });
  } else {
    runner = spawnTwinClampPattern({
      ...baseCtx,
      push: (asteroid) => {
        const y0 = asteroid.y ?? -30;
        const x0 = asteroid.x ?? 0;
        if (shouldAvoidTopBand(y0) && isXInReservedGap(x0)) return;
        spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
      },
    });
  }

  patternCooldown = randRange(minPatternCooldown, maxPatternCooldown);
  spawnTimerMs = 0;
  return runner;
}

export function updateSpawner(
  dt: number,
  score: number,
  spawnAsteroid: SpawnAsteroidCallback,
): void {
  const dtMs = dt * 1000;

  difficulty.update(dt, score);
  updateGapReservation(dt);

  if (activePattern) {
    const done = activePattern.update(dt);
    if (!done) {
      return;
    }
    activePattern = null;
  }

  if (patternCooldown > 0) {
    patternCooldown = Math.max(0, patternCooldown - dt);
  } else {
    const chance = rollPatternChance(difficulty.level);
    if (Math.random() < chance) {
      activePattern = tryStartPattern(spawnAsteroid);
      return;
    }
  }

  const target = difficulty.currentSpawnIntervalMs;
  if (target !== currentTargetIntervalMs) {
    currentTargetIntervalMs = target;
    spawnTimerMs = 0;
  }

  spawnTimerMs += dtMs;
  while (spawnTimerMs >= currentTargetIntervalMs) {
    spawnTimerMs -= currentTargetIntervalMs;

    const asteroid = createAsteroid({ speedMul: difficulty.currentSpeedMul });
    const y0 = asteroid.y ?? 0;
    if (shouldAvoidTopBand(y0) && isXInReservedGap(asteroid.x)) {
      const { width } = getGameBounds();
      const leftOk = gapReservation.x0 > 20;
      const rightOk = gapReservation.x1 < width - 20;
      if (leftOk || rightOk) {
        const goLeft = leftOk && (!rightOk || Math.random() < 0.5);
        const minX = goLeft ? 20 : gapReservation.x1 + 10;
        const maxX = goLeft ? gapReservation.x0 - 10 : width - 20;
        if (maxX > minX) {
          asteroid.x = randRange(minX, maxX);
          spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
          continue;
        }
      }
      continue;
    }

    spawnAsteroid({ speedMul: difficulty.currentSpeedMul });
  }
}

export function resetSpawner(): void {
  difficulty.reset();
  spawnTimerMs = 0;
  currentTargetIntervalMs = difficulty.currentSpawnIntervalMs;
  activePattern = null;
  patternCooldown = 0;
  gapReservation = {
    active: false,
    x0: 0,
    x1: 0,
    ttl: 0,
    topBandPx: 140,
  };
}

export function notifySpawn(): void {
  spawnTimerMs = 0;
}

export function getGlobalSpeedMul(): number {
  return difficulty.currentSpeedMul;
}

export const gameDifficulty = difficulty;
