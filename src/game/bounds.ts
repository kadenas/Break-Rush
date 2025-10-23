export type GameBounds = { width: number; height: number; left?: number; top?: number };

let BOUNDS: GameBounds = { width: 360, height: 640, left: 0, top: 0 };

export function setGameBounds(b: GameBounds) {
  BOUNDS = { ...BOUNDS, ...b };
}

export function getGameBounds(): GameBounds {
  return BOUNDS;
}
