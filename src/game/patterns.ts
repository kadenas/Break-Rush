import { getGameBounds } from './bounds';
import { createAsteroid, AsteroidSpawnOpts } from '../entities/asteroid';

export type PatternContext = {
  speedMul: number;
  push: (a: ReturnType<typeof createAsteroid>) => void;
  playerWidthPx?: number;
  gapSafetyPx?: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export type PatternRunner = {
  update(dt: number): boolean;
};

export function spawnWallPattern(
  ctx: PatternContext,
): PatternRunner & { gapX0: number; gapX1: number } {
  const { width } = getGameBounds();

  const playerW = Math.max(24, Math.floor(ctx.playerWidthPx ?? 36));
  const safety = Math.max(6, Math.floor(ctx.gapSafetyPx ?? 10));
  const minGapPx = playerW + 2 * safety;

  let cols = Math.max(6, Math.round(width / 60));
  let colW = width / cols;

  let gapCols = Math.ceil(minGapPx / colW);
  while (cols - gapCols < 2 && cols > 4) {
    cols -= 1;
    colW = width / cols;
    gapCols = Math.ceil(minGapPx / colW);
  }

  const gapWidthCols = clamp(
    gapCols + (Math.random() < 0.35 ? 1 : 0),
    gapCols,
    cols - 2,
  );
  const gapStartCol = Math.floor(Math.random() * (cols - gapWidthCols + 1));
  const gapX0 = gapStartCol * colW;
  const gapX1 = (gapStartCol + gapWidthCols) * colW;

  const startY = -30;
  const vy = 220 * (ctx.speedMul || 1);

  for (let c = 0; c < cols; c++) {
    if (c >= gapStartCol && c < gapStartCol + gapWidthCols) continue;
    const xCenter = c * colW + colW * 0.5;

    const rMax = Math.floor(Math.min(colW * 0.42, 22));
    const r = Math.max(9, rMax);

    const safeX = clamp(xCenter, r, width - r);

    const opts: AsteroidSpawnOpts = {
      x: safeX,
      y: startY,
      vx: 0,
      vy,
      speedMul: 1,
      radius: r,
    };
    ctx.push(createAsteroid(opts));
  }

  return {
    update: () => true,
    gapX0,
    gapX1,
  };
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
