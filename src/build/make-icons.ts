import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { encodePNG } from './png-encoder.ts';

interface Canvas {
  width: number;
  height: number;
  data: Uint8Array;
}

const createCanvas = (size: number): Canvas => ({
  width: size,
  height: size,
  data: new Uint8Array(size * size * 4),
});

const setPixel = (canvas: Canvas, x: number, y: number, r: number, g: number, b: number, a: number) => {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const offset = (y * canvas.width + x) * 4;
  canvas.data[offset] = r;
  canvas.data[offset + 1] = g;
  canvas.data[offset + 2] = b;
  canvas.data[offset + 3] = a;
};

const fill = (canvas: Canvas, r: number, g: number, b: number) => {
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = r;
    canvas.data[i + 1] = g;
    canvas.data[i + 2] = b;
    canvas.data[i + 3] = 255;
  }
};

const drawCircle = (canvas: Canvas, cx: number, cy: number, radius: number, color: [number, number, number, number]) => {
  const [r, g, b, a] = color;
  for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(canvas, x, y, r, g, b, a);
      }
    }
  }
};

const drawPolygon = (canvas: Canvas, points: Array<[number, number]>, color: [number, number, number, number]) => {
  const [r, g, b, a] = color;
  const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1]))));
  const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(...points.map((p) => p[1]))));
  for (let y = minY; y <= maxY; y++) {
    const intersections: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if (y >= Math.min(y1, y2) && y < Math.max(y1, y2)) {
        const t = (y - y1) / (y2 - y1);
        intersections.push(x1 + (x2 - x1) * t);
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const xStart = Math.max(0, Math.floor(intersections[i]));
      const xEnd = Math.min(canvas.width - 1, Math.ceil(intersections[i + 1]));
      for (let x = xStart; x <= xEnd; x++) {
        setPixel(canvas, x, y, r, g, b, a);
      }
    }
  }
};

const createIcon = (size: number): Buffer => {
  const canvas = createCanvas(size);
  fill(canvas, 5, 8, 15);
  drawCircle(canvas, size / 2, size * 0.72, size * 0.18, [11, 215, 255, 90]);
  drawPolygon(
    canvas,
    [
      [size * 0.25, size * 0.75],
      [size * 0.42, size * 0.18],
      [size * 0.55, size * 0.18],
      [size * 0.46, size * 0.52],
      [size * 0.78, size * 0.52],
      [size * 0.62, size * 0.82],
    ],
    [0, 209, 255, 255]
  );
  drawCircle(canvas, size * 0.4, size * 0.6, size * 0.07, [240, 248, 255, 255]);
  return encodePNG(canvas.width, canvas.height, canvas.data);
};

export const generateIcons = async () => {
  const outputDir = resolve('dist', 'icons');
  await fs.mkdir(outputDir, { recursive: true });
  for (const size of [192, 512]) {
    const buffer = createIcon(size);
    const file = resolve(outputDir, `icon-${size}.png`);
    await fs.writeFile(file, buffer);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  generateIcons().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
