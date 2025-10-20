export interface CircleBody {
  x: number;
  y: number;
  radius: number;
}

export const distanceSquared = (a: CircleBody, b: CircleBody): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const overlaps = (a: CircleBody, b: CircleBody): boolean => {
  const r = a.radius + b.radius;
  return distanceSquared(a, b) < r * r;
};

export const nearMiss = (a: CircleBody, b: CircleBody, threshold: number): boolean => {
  const r = a.radius + threshold;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < r * r;
};
