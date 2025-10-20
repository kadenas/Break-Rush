export type GameState = 'menu' | 'playing' | 'pause' | 'gameover';

interface Listener {
  (state: GameState, payload?: unknown): void;
}

export class StateMachine {
  private current: GameState = 'menu';
  private listeners = new Set<Listener>();

  get value(): GameState {
    return this.current;
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  transition(state: GameState, payload?: unknown): void {
    if (this.current === state) return;
    this.current = state;
    this.listeners.forEach((listener) => listener(state, payload));
  }
}
