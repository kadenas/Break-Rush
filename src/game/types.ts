import type { Vec2 } from '../utils/math';

export type GameStateName = 'menu' | 'playing' | 'pause' | 'gameover';

export interface Player {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  shield: number;
  slowTime: number;
}

export interface Enemy {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  dangerous: boolean;
  nearMissed: boolean;
  lifetime: number;
}

export type PowerUpType = 'slow' | 'shield' | 'bomb';

export interface PowerUp {
  id: number;
  type: PowerUpType;
  position: Vec2;
  radius: number;
  duration: number;
}

export interface Orb {
  id: number;
  position: Vec2;
  radius: number;
  lifetime: number;
}

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  life: number;
  color: string;
}

export interface GameMetrics {
  score: number;
  highScore: number;
  combo: number;
  multiplier: number;
  dangerTime: number;
  timeElapsed: number;
  lives: number;
}

export interface GameEvents {
  onScore: (value: number) => void;
  onHit: () => void;
  onPower: (type: PowerUpType) => void;
  onOrb: () => void;
  onCombo: (multiplier: number) => void;
}
