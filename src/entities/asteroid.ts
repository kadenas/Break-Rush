export type AsteroidSpawnOpts = {
  speedMul?: number;
  big?: boolean;
};

const BASE_SPEED_MIN = 140;
const BASE_SPEED_MAX = 220;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function createAsteroid(opts: AsteroidSpawnOpts = {}) {
  const baseSpeed = randomBetween(BASE_SPEED_MIN, BASE_SPEED_MAX);
  const mul = opts.speedMul ?? 1;
  const sizeFactor = opts.big ? 0.75 : 1;
  const speed = Math.round(baseSpeed * mul * sizeFactor);

  return {
    vx: 0,
    vy: speed,
  };
}
