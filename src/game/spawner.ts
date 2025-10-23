import { DifficultyManager } from './difficulty';
import { createAsteroid } from '../entities/asteroid';
import {
  spawnWallPattern,
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
  const ctx = {
    speedMul: difficulty.currentSpeedMul,
    push: (asteroid: ReturnType<typeof createAsteroid>) => {
      spawnAsteroid({ speedMul: difficulty.currentSpeedMul, asteroid });
    },
  };

  const r = Math.random();
  let runner: PatternRunner;
  if (r < 0.5) {
    runner = spawnWallPattern(ctx);
  } else if (r < 0.8) {
    runner = spawnDiagonalPattern(ctx);
  } else {
    runner = spawnTwinClampPattern(ctx);
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
    spawnAsteroid({ speedMul: difficulty.currentSpeedMul });
  }
}

export function resetSpawner(): void {
  difficulty.reset();
  spawnTimerMs = 0;
  currentTargetIntervalMs = difficulty.currentSpawnIntervalMs;
  activePattern = null;
  patternCooldown = 0;
}

export function notifySpawn(): void {
  spawnTimerMs = 0;
}

export function getGlobalSpeedMul(): number {
  return difficulty.currentSpeedMul;
}

export const gameDifficulty = difficulty;
