import { getGameBounds } from './bounds';
import { createAsteroid, AsteroidSpawnOpts } from '../entities/asteroid';

export type PatternContext = {
  speedMul: number;
  push: (a: ReturnType<typeof createAsteroid>) => void;
  // Opcional: si dispones del ancho real de la nave, pásalo aquí
  playerWidthPx?: number;
  // margen extra a cada lado del jugador
  gapSafetyPx?: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export type PatternRunner = {
  update(dt: number): boolean;
};

/**
 * Muralla horizontal con hueco garantizado:
 * - el hueco tiene ancho >= playerWidthPx + 2*gapSafetyPx
 * - si no hay ancho suficiente, reduce nº columnas
 */
export function spawnWallPattern(ctx: PatternContext): PatternRunner {
  const { width } = getGameBounds();

  // Config por defecto si no se proporciona
  const playerW = Math.max(24, Math.floor(ctx.playerWidthPx ?? 36));
  const safety = Math.max(6, Math.floor(ctx.gapSafetyPx ?? 8));

  // Número base de columnas (más fino a mayor ancho)
  let cols = Math.max(6, Math.round(width / 60));

  // Recalcula hasta que quepa el hueco mínimo
  // hueco mínimo en px:
  const minGapPx = playerW + 2 * safety;

  // si la celda es muy angosta, baja columnas hasta que al menos 1-2 celdas sumen el hueco
  // Usaremos gap en columnas enteras
  let colWidth = width / cols;
  let minGapCols = Math.ceil(minGapPx / colWidth);

  while (cols - minGapCols < 2 && cols > 4) {
    // si no dejamos al menos 2 columnas sólidas, reduce columnas para hacer celdas más anchas
    cols -= 1;
    colWidth = width / cols;
    minGapCols = Math.ceil(minGapPx / colWidth);
  }

  // Por variedad: hueco de 1..minGapCols+1, pero nunca menor a minGapCols
  const gapWidthCols = Math.max(minGapCols, Math.min(minGapCols + 1, cols - 2));

  // Elegir inicio de hueco garantizando que cabe entero
  const gapStart = Math.floor(Math.random() * (cols - gapWidthCols + 1));

  // Parámetros de caída
  const startY = -30;
  const vy = 220 * ctx.speedMul;

  for (let c = 0; c < cols; c++) {
    if (c >= gapStart && c < gapStart + gapWidthCols) continue; // deja el hueco

    // Centro de la celda
    const xCenter = c * colWidth + colWidth * 0.5;

    // Radio adaptado al ancho de celda para no invadir el hueco:
    const r = Math.max(10, Math.floor(colWidth * 0.35));

    // Asegurar que el meteorito no sale fuera ni pisa el hueco por desborde
    const safeX = clamp(xCenter, r, width - r);

    const opts: AsteroidSpawnOpts = {
      x: safeX,
      y: startY,
      vy,
      vx: 0,
      speedMul: 1, // vy ya fijado
      radius: r,
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
