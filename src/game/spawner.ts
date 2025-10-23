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

// ========== Corredor dinámico ==========
type Corridor = {
  active: boolean;
  x0: number;
  x1: number;
  yTop: number;
  height: number;
  vy: number;
  ttl: number;
};

let corridor: Corridor = {
  active: false,
  x0: 0,
  x1: 0,
  yTop: -9999,
  height: 0,
  vy: 0,
  ttl: 0,
};

function startCorridor(
  x0: number,
  x1: number,
  vy: number,
  height: number,
  seconds = 1.8,
) {
  corridor = {
    active: true,
    x0,
    x1,
    yTop: -40,
    height,
    vy,
    ttl: seconds,
  };
}

function updateCorridor(dt: number) {
  if (!corridor.active) return;
  corridor.yTop += corridor.vy * dt;
  corridor.ttl -= dt;
  const { height } = getGameBounds();
  if (corridor.ttl <= 0 || corridor.yTop - 20 > height) {
    corridor.active = false;
  }
}

function pointInCorridor(x: number, y: number): boolean {
  if (!corridor.active) return false;
  const y0 = corridor.yTop;
  const y1 = corridor.yTop + corridor.height;
  return x >= corridor.x0 && x <= corridor.x1 && y >= y0 && y <= y1;
}
// ======================================

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
  let runner: PatternRunner;
  if (r < 0.5) {
    const res = _spawnWallPattern({
      ...baseCtx,
      playerWidthPx: 36,
      gapSafetyPx: 12,
      push: (asteroid) => {
        spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
      },
    });
    startCorridor(res.gapX0, res.gapX1, res.gapVy, res.gapHeightPx, 1.8);
    runner = res;
  } else if (r < 0.8) {
    runner = spawnDiagonalPattern({
      ...baseCtx,
      push: (asteroid) => {
        const x0 = asteroid.x ?? 0;
        const y0 = asteroid.y ?? -40;
        if (pointInCorridor(x0, y0)) return;
        spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
      },
    });
  } else {
    runner = spawnTwinClampPattern({
      ...baseCtx,
      push: (asteroid) => {
        const x0 = asteroid.x ?? 0;
        const y0 = asteroid.y ?? -30;
        if (pointInCorridor(x0, y0)) return;
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
  updateCorridor(dt);

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
    if (corridor.active) {
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
  corridor = {
    active: false,
    x0: 0,
    x1: 0,
    yTop: -9999,
    height: 0,
    vy: 0,
    ttl: 0,
  };
}

export function notifySpawn(): void {
  spawnTimerMs = 0;
}

export function getGlobalSpeedMul(): number {
  return difficulty.currentSpeedMul;
}

export const gameDifficulty = difficulty;
