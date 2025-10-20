const KEY = 'break-rush-highscore';

export class HighScoreStore {
  private value = 0;

  constructor() {
    this.load();
  }

  get(): number {
    return this.value;
  }

  submit(score: number): number {
    if (score > this.value) {
      this.value = score;
      this.persist();
    }
    return this.value;
  }

  reset(): void {
    this.value = 0;
    this.persist();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.value = Number(raw) || 0;
      }
    } catch (error) {
      console.warn('No se pudo leer el récord', error);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(KEY, String(this.value));
    } catch (error) {
      console.warn('No se pudo guardar el récord', error);
    }
  }
}
