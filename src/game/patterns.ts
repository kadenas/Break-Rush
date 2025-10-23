import { getGameBounds } from './bounds';
import { createAsteroid, AsteroidSpawnOpts } from '../entities/asteroid';

export type PatternContext = {
  speedMul: number;
  push: (a: ReturnType<typeof createAsteroid>) => void;
};

export type PatternRunner = {
  update(dt: number): boolean;
};

export function spawnWallPattern(ctx: PatternContext): PatternRunner {
  const { width } = getGameBounds();
  const cols = Math.max(6, Math.round(width / 60));
  const colWidth = width / cols;
  const gapWidthCols = Math.random() < 0.5 ? 1 : 2;
  const gapStart = Math.floor(Math.random() * (cols - gapWidthCols));
  const startY = -30;

  for (let c = 0; c < cols; c++) {
    if (c >= gapStart && c < gapStart + gapWidthCols) continue;
    const xCenter = c * colWidth + colWidth * 0.5;
    const opts: AsteroidSpawnOpts = {
      x: xCenter,
      y: startY,
      vy: 220 * ctx.speedMul,
      vx: 0,
      speedMul: 1,
      radius: Math.max(10, Math.floor(colWidth * 0.35)),
    };
    ctx.push(createAsteroid(opts));
  }

  return { update: () => true };
}

export function spawnDiagonalPattern(ctx: PatternContext): PatternRunner {
  const { width } = getGameBounds();
  const count = 6 + Math.floor(Math.random() * 4);
  const spacing = Math.max(48, width / (count + 1));
  const leftToRight = Math.random() < 0.5;

  const baseX = leftToRight ? -spacing : width + spacing;
  const dx = leftToRight ? spacing : -spacing;
  const startY = -40;
  const vy = 210 * ctx.speedMul;
  const vx = leftToRight ? 70 * ctx.speedMul : -70 * ctx.speedMul;

  let emitted = 0;
  let timer = 0;
  const delayBetween = 0.06;

  return {
    update(dt: number) {
      timer += dt;
      while (timer >= delayBetween && emitted < count) {
        timer -= delayBetween;
        const x = baseX + emitted * dx;
        const y = startY - emitted * 6;
        ctx.push(createAsteroid({ x, y, vx, vy, speedMul: 1, radius: 14 }));
        emitted++;
      }
      return emitted >= count;
    },
  };
}

export function spawnTwinClampPattern(ctx: PatternContext): PatternRunner {
  const { width } = getGameBounds();
  const y = -30;
  const vy = 200 * ctx.speedMul;
  const vx = 90 * ctx.speedMul;

  const left = createAsteroid({ x: width * 0.15, y, vx: +vx, vy, radius: 16 });
  const right = createAsteroid({ x: width * 0.85, y, vx: -vx, vy, radius: 16 });
  ctx.push(left);
  ctx.push(right);

  return { update: () => true };
}
