export type BonusType = 'score' | 'shield' | 'slowmo';

export type Bonus = {
  x: number;
  y: number;
  r: number;
  vy: number;
  type: BonusType;
  active: boolean;
  blinkTimer: number;
  color: string;
  stroke?: string;
  strokeWidth?: number;
};

const palette = {
  score: { fill: '#FFD700', stroke: '#FFF3A0' },
  shield: { fill: '#00FF88', stroke: '#C8FFE0' },
  slowmo: { fill: '#FF33AA', stroke: '#FFC0E6' },
} as const;

function pickBonusType(): BonusType {
  const roll = Math.random();
  if (roll < 0.7) return 'score';
  if (roll < 0.85) return 'shield';
  return 'slowmo';
}

export function createBonus(x: number, y: number, speedMul: number): Bonus {
  const type = pickBonusType();
  const col = palette[type];
  return {
    x,
    y,
    r: 10,
    vy: 160 * speedMul,
    type,
    active: true,
    blinkTimer: 0,
    color: col.fill,
    stroke: col.stroke,
    strokeWidth: 3,
  };
}

export function updateBonus(b: Bonus, dt: number): void {
  if (!b.active) return;
  b.y += b.vy * dt;
  b.blinkTimer += dt;
  if (b.blinkTimer > 0.5) {
    b.blinkTimer = 0;
  }
}

export function renderBonus(ctx: CanvasRenderingContext2D, b: Bonus): void {
  if (!b.active) return;
  const alpha = b.blinkTimer < 0.25 ? 1 : 0.75;

  if (b.stroke) {
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + (b.strokeWidth ?? 3), 0, Math.PI * 2);
    ctx.fillStyle = b.stroke;
    ctx.fill();
  }

  ctx.globalAlpha = alpha;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}
