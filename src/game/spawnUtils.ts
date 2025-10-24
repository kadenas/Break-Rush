import { getGameBounds } from './bounds';

export function clampXByRadius(x: number, r: number): number {
  const { width } = getGameBounds();
  return Math.max(r, Math.min(width - r, x));
}

export function clampYTopByRadius(y: number, r: number): number {
  return Math.min(-r, y);
}
