export const VW = 360;
export const VH = 640;

export type ViewLayout = {
  dpr: number;
  vwCss: number;
  vhCss: number;
  vwVirt: number;
  vhVirt: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
};

export function computeLayout(): ViewLayout {
  const vv = (window as any).visualViewport;
  const offsetX = vv?.offsetLeft ?? 0;
  const offsetY = vv?.offsetTop ?? 0;
  const vwCss = vv?.width ?? window.innerWidth;
  const vhCss = vv?.height ?? window.innerHeight;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const scaleX = vwCss / VW;
  const scaleY = vhCss / VH;
  return {
    dpr,
    vwCss,
    vhCss,
    vwVirt: VW,
    vhVirt: VH,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
  };
}

export function applyRenderTransform(ctx: CanvasRenderingContext2D, layout: ViewLayout) {
  ctx.setTransform(layout.scaleX * layout.dpr, 0, 0, layout.scaleY * layout.dpr, 0, 0);
}

export function clientToVirtual(clientX: number, clientY: number, layout: ViewLayout) {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const cssX = clientX - rect.left + layout.offsetX;
  const cssY = clientY - rect.top + layout.offsetY;
  const x = Math.max(0, Math.min(layout.vwVirt, cssX / layout.scaleX));
  const y = Math.max(0, Math.min(layout.vhVirt, cssY / layout.scaleY));
  return { x, y };
}
