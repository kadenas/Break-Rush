export type PowerUpType = 'slow' | 'shield' | 'bomb';

export interface PowerUp {
  type: PowerUpType;
  x: number;
  y: number;
  radius: number;
  active: boolean;
  time: number;
}

export interface Orb {
  x: number;
  y: number;
  radius: number;
  value: number;
  active: boolean;
}

export const createPowerUp = (type: PowerUpType, x: number, y: number): PowerUp => ({
  type,
  x,
  y,
  radius: 16,
  active: true,
  time: 0,
});

export const createOrb = (x: number, y: number, value: number): Orb => ({
  x,
  y,
  radius: 12,
  value,
  active: true,
});
