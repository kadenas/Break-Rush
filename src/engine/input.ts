import { computeLayout, VW, VH } from './viewport';

export type PointerKind = 'mouse' | 'touch' | 'pen';
export type PointerState = { active: boolean; x: number; y: number; type: PointerKind };

let canvasRef: HTMLCanvasElement | null = null;
let pointer: PointerState = { active: false, x: VW / 2, y: VH / 2, type: 'mouse' };
let activeId: number | null = null;
const keys = new Set<string>();

let lastDown = { x: 0, y: 0, t: 0 };
let lastClick: { x: number; y: number } | null = null;

function clientToVirtual(clientX: number, clientY: number) {
  const layout = computeLayout();
  const canvas = canvasRef ?? (document.getElementById('game') as HTMLCanvasElement | null);
  const rect = canvas?.getBoundingClientRect();
  const offX = rect ? rect.left : 0;
  const offY = rect ? rect.top : 0;
  const xCss = clientX - offX - layout.offX;
  const yCss = clientY - offY - layout.offY;
  let x = xCss / layout.scale;
  let y = yCss / layout.scale;
  x = Math.max(0, Math.min(VW, x));
  y = Math.max(0, Math.min(VH, y));
  return { x, y };
}

export function initInput(canvas: HTMLCanvasElement) {
  canvasRef = canvas;

  const onDown = (e: PointerEvent) => {
    const v = clientToVirtual(e.clientX, e.clientY);
    canvas.setPointerCapture?.(e.pointerId);
    activeId = e.pointerId;
    pointer = {
      active: true,
      x: v.x,
      y: v.y,
      type: e.pointerType === 'touch' || e.pointerType === 'pen' ? (e.pointerType as PointerKind) : 'mouse',
    };
    lastDown = { x: v.x, y: v.y, t: performance.now() };
    e.preventDefault();
  };

  const onMove = (e: PointerEvent) => {
    if (activeId !== null && e.pointerId === activeId) {
      const v = clientToVirtual(e.clientX, e.clientY);
      pointer.x = v.x;
      pointer.y = v.y;
      e.preventDefault();
    }
  };

  const onEnd = (e: PointerEvent) => {
    if (activeId !== null && e.pointerId === activeId) {
      const v = clientToVirtual(e.clientX, e.clientY);
      const dt = performance.now() - lastDown.t;
      const dx = Math.abs(v.x - lastDown.x);
      const dy = Math.abs(v.y - lastDown.y);
      if (dt <= 250 && dx < 12 && dy < 12) {
        lastClick = { x: v.x, y: v.y };
      }
      activeId = null;
      pointer.active = false;
      e.preventDefault();
    }
  };

  canvas.addEventListener('pointerdown', onDown, { passive: false });
  canvas.addEventListener('pointermove', onMove, { passive: false });
  canvas.addEventListener('pointerup', onEnd, { passive: false });
  canvas.addEventListener('pointercancel', onEnd, { passive: false });
  canvas.addEventListener('pointerout', onEnd, { passive: false });
  canvas.addEventListener('pointerleave', onEnd, { passive: false });

  window.addEventListener('keydown', (event) => keys.add(event.code));
  window.addEventListener('keyup', (event) => keys.delete(event.code));

  (window as any).visualViewport?.addEventListener(
    'resize',
    () => {
      activeId = null;
      pointer.active = false;
    },
    { passive: true },
  );
}

export function getPointer(): PointerState {
  return pointer;
}

export function isKeyDown(code: string) {
  return keys.has(code);
}

export function getClick(): { x: number; y: number } | null {
  const click = lastClick;
  lastClick = null;
  return click;
}
