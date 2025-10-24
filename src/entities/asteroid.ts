import { getGameBounds } from '../game/bounds';
import { clampXByRadius, clampYTopByRadius } from '../game/spawnUtils';

export type AsteroidSize = 'small' | 'medium' | 'large';

export type AsteroidSpawnOpts = {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  speedMul?: number;
  radius?: number;
  big?: boolean;
  size?: AsteroidSize;
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

function radiusFromSize(size: AsteroidSize): number {
  switch (size) {
    case 'small':
      return Math.floor(randomBetween(8, 12));
    case 'large':
      return Math.floor(randomBetween(20, 26));
    case 'medium':
    default:
      return Math.floor(randomBetween(13, 19));
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function createAsteroid(opts: AsteroidSpawnOpts = {}): Asteroid {
  const { width } = getGameBounds();

  const baseSpeed = randomBetween(BASE_SPEED_MIN, BASE_SPEED_MAX);
  const mul = opts.speedMul ?? 1;
  const sizeFactor = opts.big ? 0.75 : 1;
  const speed = Math.round(baseSpeed * mul * sizeFactor);

  const radius =
    typeof opts.radius === 'number'
      ? opts.radius
      : opts.size
      ? radiusFromSize(opts.size)
      : randomBetween(10, 18);

  const rawX = typeof opts.x === 'number' ? opts.x : randomBetween(0, width);
  const rawY = typeof opts.y === 'number' ? opts.y : -radius;
  const x = clampXByRadius(rawX, radius);
  const y = clampYTopByRadius(rawY, radius);
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
