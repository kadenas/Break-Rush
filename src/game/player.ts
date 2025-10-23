import { getPointer, isKeyDown } from '../engine/controls';
import { VW, VH } from '../engine/viewport';

type TrailPoint = { x: number; y: number };

export interface Player {
  x: number;
  y: number;
  r: number;
  speedMax: number;
  trail: TrailPoint[];
  shieldTimer: number;
  flashTimer: number;
  flashDuration: number;
  flashColor: string;
}

export function createPlayer(): Player {
  const player: Player = {
    x: VW / 2,
    y: VH * 0.8,
    r: 14,
    speedMax: 220,
    trail: [],
    shieldTimer: 0,
    flashTimer: 0,
    flashDuration: 0,
    flashColor: '#ffffff',
  };
  resetPlayerTrail(player);
  return player;
}

export function resetPlayerTrail(p: Player) {
  p.trail.length = 0;
  p.trail.push({ x: p.x, y: p.y });
}

const TOUCH_OFFSET = 110; // lift above finger for touch/pen

export function updatePlayer(p: Player, dt: number) {
  const pt = getPointer();
  if (pt.active) {
    const tx = Math.max(p.r, Math.min(VW - p.r, pt.x));
    const desiredY = pt.type === 'mouse' ? pt.y : pt.y - TOUCH_OFFSET;
    const ty = Math.max(p.r, Math.min(VH - p.r, desiredY));
    const k = 0.35;
    p.x += (tx - p.x) * k;
    p.y += (ty - p.y) * k;
  } else {
    let dx=0, dy=0;
    if (isKeyDown('ArrowLeft') || isKeyDown('KeyA')) dx -= 1;
    if (isKeyDown('ArrowRight')|| isKeyDown('KeyD')) dx += 1;
    if (isKeyDown('ArrowUp')   || isKeyDown('KeyW')) dy -= 1;
    if (isKeyDown('ArrowDown') || isKeyDown('KeyS')) dy += 1;
    if (dx || dy) {
      const n = Math.hypot(dx,dy) || 1; dx/=n; dy/=n;
      p.x += dx * p.speedMax * dt;
      p.y += dy * p.speedMax * dt;
    }
  }
  p.x = Math.max(p.r, Math.min(VW - p.r, p.x));
  p.y = Math.max(p.r, Math.min(VH - p.r, p.y));

  const trail = p.trail;
  const last = trail[trail.length - 1];
  if (!last || last.x !== p.x || last.y !== p.y) {
    trail.push({ x: p.x, y: p.y });
    if (trail.length > 12) trail.shift();
  }

  if (p.shieldTimer > 0) {
    p.shieldTimer = Math.max(0, p.shieldTimer - dt);
  }

  if (p.flashTimer > 0) {
    p.flashTimer = Math.max(0, p.flashTimer - dt);
    if (p.flashTimer === 0) {
      p.flashDuration = 0;
    }
  }
}

export function drawTrail(ctx: CanvasRenderingContext2D, p: Player) {
  const len = p.trail.length - 1;
  if (len <= 0) return;

  for (let i = 0; i < len; i++) {
    const point = p.trail[len - i - 1];
    const t = (i + 1) / (len + 1);
    const radius = p.r * (0.6 - 0.35 * t);
    const alpha = 0.45 * (1 - t);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#5dd0ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  const flashStrength = p.flashDuration > 0 ? Math.min(1, p.flashTimer / p.flashDuration) : 0;
  const flashMix = flashStrength > 0 ? Math.pow(flashStrength, 0.45) : 0;

  const g = ctx.createRadialGradient(
    p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.1,
    p.x,             p.y,             p.r,
  );
  const mixColor = flashMix > 0 ? p.flashColor : '#baf5ff';
  const edgeColor = flashMix > 0 ? blendColor('#178ba4', p.flashColor, flashMix * 0.3) : '#178ba4';
  g.addColorStop(0, blendColor('#baf5ff', mixColor, flashMix * 0.7));
  g.addColorStop(0.4, blendColor('#3fd0e9', mixColor, flashMix * 0.5));
  g.addColorStop(1, edgeColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  if (p.shieldTimer > 0) {
    const alpha = Math.min(1, 0.3 + (p.shieldTimer % 0.6) / 1.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#71f5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (flashStrength > 0) {
    const progress = 1 - flashStrength;
    const pulse = 0.5 + 0.5 * Math.sin((p.flashDuration - p.flashTimer) * 24);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.35 + 0.45 * pulse) * flashStrength;
    ctx.fillStyle = p.flashColor;
    const radius = p.r + 4 + 6 * (1 - progress);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const SHIELD_DEFAULT_DURATION = 6;

export function activateShield(p: Player, duration = SHIELD_DEFAULT_DURATION) {
  p.shieldTimer = Math.max(p.shieldTimer, duration);
}

export function isShieldActive(p: Player): boolean {
  return p.shieldTimer > 0;
}

export function consumeShield(p: Player) {
  p.shieldTimer = 0;
}

function startFlash(p: Player, duration: number, color: string) {
  p.flashDuration = duration;
  p.flashTimer = duration;
  p.flashColor = color;
}

export function triggerPlayerHitFlash(p: Player) {
  startFlash(p, 0.35, '#ff3860');
}

export function triggerPlayerBonusFlash(p: Player) {
  startFlash(p, 0.4, '#ffe066');
}

function blendColor(base: string, tint: string, t: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };
  const baseRgb = parse(base);
  const tintRgb = parse(tint);
  const mix = {
    r: clamp(baseRgb.r + (tintRgb.r - baseRgb.r) * t),
    g: clamp(baseRgb.g + (tintRgb.g - baseRgb.g) * t),
    b: clamp(baseRgb.b + (tintRgb.b - baseRgb.b) * t),
  };
  return `rgb(${mix.r}, ${mix.g}, ${mix.b})`;
}
