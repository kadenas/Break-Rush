export type GameState = 'menu' | 'playing' | 'pause' | 'gameover';

let currentState: GameState = 'menu';

export const setState = (state: GameState): GameState => {
  currentState = state;
  return currentState;
};

export const getState = (): GameState => {
  return currentState;
};

export const isPlaying = (): boolean => {
  return currentState === 'playing';
};
