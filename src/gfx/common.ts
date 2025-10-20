const bgGradientCache = new Map<number, CanvasGradient>();

export const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, t: number): void => {
  const key = width + height;
  let gradient = bgGradientCache.get(key);
  if (!gradient) {
    gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#051224');
    gradient.addColorStop(0.5, '#05080f');
    gradient.addColorStop(1, '#020409');
    bgGradientCache.set(key, gradient);
  }
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const pulse = Math.sin(t * 0.5) * 0.05 + 0.1;
  ctx.fillStyle = `rgba(11, 215, 255, ${0.08 + pulse})`;
  ctx.beginPath();
  ctx.ellipse(width / 2, height * 0.82, width * 0.45, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const drawNearMissHalo = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number
): void => {
  ctx.save();
  ctx.strokeStyle = `rgba(240, 240, 240, ${0.5 * (1 - progress)})`;
  ctx.lineWidth = 3 + 6 * (1 - progress);
  ctx.beginPath();
  ctx.arc(x, y, radius + 20 * progress, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};
