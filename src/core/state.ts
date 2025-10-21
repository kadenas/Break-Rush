export type GameState = 'menu' | 'settings' | 'playing' | 'pause' | 'gameover';

let state: GameState = 'menu';

export function setState(s: GameState) {
  state = s;
}

export function getState(): GameState {
  return state;
}

export function isPlaying() {
  return state === 'playing';
}
