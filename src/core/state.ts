export type GameState = 'menu' | 'settings' | 'playing' | 'pause' | 'gameover';

let state: GameState = 'menu';
const listeners = new Set<(state: GameState) => void>();

export function setState(s: GameState) {
  const changed = state !== s;
  state = s;
  if (!changed && listeners.size === 0) {
    return;
  }
  for (const listener of listeners) {
    listener(state);
  }
}

export function getState(): GameState {
  return state;
}

export function onStateChange(listener: (state: GameState) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isPlaying() {
  return state === 'playing';
}
