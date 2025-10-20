export const VW = 360;
export const VH = 640;

export type ViewLayout = {
  dpr: number;
  vwCss: number; // window.innerWidth
  vhCss: number; // window.innerHeight
  scale: number; // CSS px to virtual units
  offX: number;  // CSS px
  offY: number;  // CSS px
};

// Compute layout from current viewport (no guessing).
export function computeLayout(): ViewLayout {
  const vwCss = Math.max(1, Math.floor(window.innerWidth));
  const vhCss = Math.max(1, Math.floor(window.innerHeight));
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  const scale = Math.min(vwCss / VW, vhCss / VH);
  const offX = Math.floor((vwCss - VW * scale) / 2);
  const offY = Math.floor((vhCss - VH * scale) / 2);
  return { dpr, vwCss, vhCss, scale, offX, offY };
}

// Apply render transform for virtual drawing (0..VW, 0..VH).
export function applyRenderTransform(ctx: CanvasRenderingContext2D, L: ViewLayout) {
  ctx.setTransform(L.scale * L.dpr, 0, 0, L.scale * L.dpr, L.offX * L.dpr, L.offY * L.dpr);
}

// Map client coords to virtual coords using current layout.
export function clientToVirtual(clientX: number, clientY: number, L: ViewLayout) {
  // Read canvas rect in case of browser UI overlays.
  const rect = (document.getElementById('game') as HTMLCanvasElement).getBoundingClientRect();
  // client -> CSS coords relative to viewport
  const xCss = clientX - rect.left - L.offX;
  const yCss = clientY - rect.top  - L.offY;
  // CSS -> virtual
  let x = xCss / L.scale;
  let y = yCss / L.scale;
  // clamp
  x = Math.max(0, Math.min(VW, x));
  y = Math.max(0, Math.min(VH, y));
  return { x, y };
}
