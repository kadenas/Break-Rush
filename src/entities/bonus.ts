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
};

function pickBonusType(): BonusType {
  const roll = Math.random();
  if (roll < 0.7) return 'score';
  if (roll < 0.85) return 'shield';
  return 'slowmo';
}

function colorFor(type: BonusType): string {
  switch (type) {
    case 'score':
      return '#FFD700';
    case 'shield':
      return '#00E0FF';
    case 'slowmo':
    default:
      return '#FF33AA';
  }
}

export function createBonus(x: number, y: number, speedMul: number): Bonus {
  const type = pickBonusType();
  return {
    x,
    y,
    r: 10,
    vy: 160 * speedMul,
    type,
    active: true,
    blinkTimer: 0,
    color: colorFor(type),
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
  const alpha = b.blinkTimer < 0.25 ? 1 : 0.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
