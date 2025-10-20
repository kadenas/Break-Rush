const KEY = 'break-rush:highscore';

export const loadHighScore = (): number => {
  const raw = localStorage.getItem(KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
};

export const saveHighScore = (score: number): void => {
  try {
    localStorage.setItem(KEY, String(Math.floor(score)));
  } catch (err) {
    console.warn('Failed to store hi-score', err);
  }
};
