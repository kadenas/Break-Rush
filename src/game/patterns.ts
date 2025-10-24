import { getGameBounds } from './bounds';
import { createAsteroid, AsteroidSpawnOpts } from '../entities/asteroid';
import { clampXByRadius } from './spawnUtils';

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

/**
 * Muralla con hueco garantizado y SOLO asteroides pequeños.
 */
export function spawnWallPattern(ctx: PatternContext): {
  update: (dt: number) => boolean;
  gapX0: number;
  gapX1: number;
  gapVy: number;
  gapHeightPx: number;
} {
  const { width } = getGameBounds();
  const widthPx = Math.floor(width);

  const playerW = Math.max(24, Math.floor(ctx.playerWidthPx ?? 36));
  const safety = Math.max(8, Math.floor(ctx.gapSafetyPx ?? 12));
  const minGapPx = playerW + 2 * safety;

  let cols = Math.max(6, Math.round(widthPx / 60));
  let colW = Math.max(1, Math.floor(widthPx / cols));

  // Asegurar hueco mínimo en columnas enteras
  let gapCols = Math.ceil(minGapPx / colW);
  while (cols - gapCols < 2 && cols > 4) {
    cols -= 1;
    colW = Math.max(1, Math.floor(widthPx / cols));
    gapCols = Math.ceil(minGapPx / colW);
  }

  // Hueco  = gapCols o gapCols+1, sin pasarse
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
  const corridorHeight = Math.max(120, Math.floor(playerW * 3.2));

  for (let c = 0; c < cols; c++) {
    if (c >= gapStartCol && c < gapStartCol + gapWidthCols) continue;

    const cellX0 = c * colW;
    const cellX1 = Math.min((c + 1) * colW, widthPx);
    const xCenter = (cellX0 + cellX1) * 0.5;

    // Forzamos SMALL; luego recortamos radio en bordes si es necesario
    let r = Math.floor(Math.random() * (12 - 8 + 1)) + 8; // 8..12

    // Si la celda es adyacente al hueco, recorta radio para respetar margen:
    const touchingLeft = cellX1 === gapX0; // celda justo a la izquierda del hueco
    const touchingRight = cellX0 === gapX1; // celda justo a la derecha del hueco

    if (touchingLeft) {
      const distToGapEdge = cellX1 - xCenter;
      const maxR = Math.floor(distToGapEdge - safety);
      r = Math.max(7, Math.min(r, maxR));
    } else if (touchingRight) {
      const distToGapEdge = xCenter - cellX0;
      const maxR = Math.floor(distToGapEdge - safety);
      r = Math.max(7, Math.min(r, maxR));
    }

    // Clamp final a bordes de pantalla
    const safeX = clampXByRadius(xCenter, r);

    const opts: AsteroidSpawnOpts = {
      x: safeX,
      y: startY,
      vx: 0,
      vy,
      size: 'small',
      radius: r,
      speedMul: 1,
    };
    ctx.push(createAsteroid(opts));
  }

  return {
    update: () => true,
    gapX0,
    gapX1,
    gapVy: vy,
    gapHeightPx: corridorHeight,
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
        const r = 14;
        const safeX = clampXByRadius(x, r);
        ctx.push(createAsteroid({ x: safeX, y, vx, vy, speedMul: 1, radius: r }));
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

  const r = 16;
  const leftX = clampXByRadius(width * 0.15, r);
  const rightX = clampXByRadius(width * 0.85, r);
  const left = createAsteroid({ x: leftX, y, vx: +vx, vy, radius: r });
  const right = createAsteroid({ x: rightX, y, vx: -vx, vy, radius: r });
  ctx.push(left);
  ctx.push(right);

  return { update: () => true };
}
