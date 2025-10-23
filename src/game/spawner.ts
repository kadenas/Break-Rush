import { DifficultyManager } from './difficulty';

type SpawnAsteroidArgs = {
  speedMul: number;
};

type SpawnAsteroidCallback = (args: SpawnAsteroidArgs) => void;

const difficulty = new DifficultyManager();

let spawnTimerMs = 0;
let currentTargetIntervalMs = difficulty.currentSpawnIntervalMs;

export function updateSpawner(
  dt: number,
  score: number,
  spawnAsteroid: SpawnAsteroidCallback,
): void {
  const dtMs = dt * 1000;

  difficulty.update(dt, score);

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
}

export function notifySpawn(): void {
  spawnTimerMs = 0;
}

export function getGlobalSpeedMul(): number {
  return difficulty.currentSpeedMul;
}

export const gameDifficulty = difficulty;
