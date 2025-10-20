export const VW = 360;
export const VH = 640;

export type Layout = {
  dpr: number;
  scale: number;
  offX: number;
  offY: number;
  rect: DOMRectReadOnly;
};

export function computeLayout(canvas: HTMLCanvasElement): Layout {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  const scale = Math.min(rect.width / VW, rect.height / VH);
  const contentW = scale * VW;
  const contentH = scale * VH;
  const offX = rect.left + (rect.width - contentW) / 2;
  const offY = rect.top + (rect.height - contentH) / 2;
  return { dpr, scale, offX, offY, rect };
}

export function applyRenderTransform(
  ctx: CanvasRenderingContext2D,
  layout: Layout
) {
  ctx.setTransform(
    layout.scale * layout.dpr,
    0,
    0,
    layout.scale * layout.dpr,
    (layout.offX - layout.rect.left) * layout.dpr,
    (layout.offY - layout.rect.top) * layout.dpr
  );
}

export function clientToVirtual(
  layout: Layout,
  clientX: number,
  clientY: number
) {
  const xCss = clientX - layout.offX;
  const yCss = clientY - layout.offY;
  const xVirt = xCss / layout.scale;
  const yVirt = yCss / layout.scale;
  return {
    x: Math.max(0, Math.min(VW, xVirt)),
    y: Math.max(0, Math.min(VH, yVirt)),
  };
}
