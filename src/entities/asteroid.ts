import { getGameBounds } from '../game/bounds';

export type AsteroidSpawnOpts = {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  speedMul?: number;
  radius?: number;
  big?: boolean;
};

export type Asteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  big: boolean;
};

const BASE_SPEED_MIN = 140;
const BASE_SPEED_MAX = 220;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function createAsteroid(opts: AsteroidSpawnOpts = {}): Asteroid {
  const { width, left = 0, top = 0 } = getGameBounds();

  const baseSpeed = randomBetween(BASE_SPEED_MIN, BASE_SPEED_MAX);
  const mul = opts.speedMul ?? 1;
  const sizeFactor = opts.big ? 0.75 : 1;
  const speed = Math.round(baseSpeed * mul * sizeFactor);

  const radius = opts.radius ?? randomBetween(10, 18);

  const x = opts.x ?? left + randomBetween(0, width);
  const y = opts.y ?? top - radius;
  const vx = typeof opts.vx === 'number' ? opts.vx : 0;
  const vy = typeof opts.vy === 'number' ? opts.vy : speed;

  return {
    x,
    y,
    vx,
    vy,
    r: radius,
    big: opts.big ?? false,
  };
}
