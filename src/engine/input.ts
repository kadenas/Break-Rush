import { computeLayout, VW, VH } from './viewport';

export type PointerKind = 'mouse' | 'touch' | 'pen';
export type PointerState = { active: boolean; x: number; y: number; type: PointerKind };

let canvasRef: HTMLCanvasElement | null = null;
let pointer: PointerState = { active: false, x: VW / 2, y: VH / 2, type: 'mouse' };
let activeId: number | null = null;
const keys = new Set<string>();

function clientToVirtual(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const layout = computeLayout(canvas);
  const xCss = clientX - layout.offX;
  const yCss = clientY - layout.offY;
  const xVirt = xCss / layout.scale;
  const yVirt = yCss / layout.scale;
  return {
    x: Math.max(0, Math.min(VW, xVirt)),
    y: Math.max(0, Math.min(VH, yVirt)),
  };
}

export function initInput(canvas: HTMLCanvasElement) {
  canvasRef = canvas;

  const onDown = (e: PointerEvent) => {
    if (!canvasRef) return;
    canvasRef.setPointerCapture?.(e.pointerId);
    activeId = e.pointerId;
    const v = clientToVirtual(canvasRef, e.clientX, e.clientY);
    pointer = {
      active: true,
      x: v.x,
      y: v.y,
      type: e.pointerType === 'touch' || e.pointerType === 'pen' ? (e.pointerType as PointerKind) : 'mouse',
    };
    e.preventDefault();
  };

  const onMove = (e: PointerEvent) => {
    if (!canvasRef) return;
    if (activeId !== null && e.pointerId === activeId) {
      const v = clientToVirtual(canvasRef, e.clientX, e.clientY);
      pointer.x = v.x;
      pointer.y = v.y;
      e.preventDefault();
    }
  };

  const onEnd = (e: PointerEvent) => {
    if (activeId !== null && e.pointerId === activeId) {
      activeId = null;
      pointer.active = false;
      e.preventDefault();
    }
  };

  canvas.addEventListener('pointerdown', onDown, { passive: false });
  canvas.addEventListener('pointermove', onMove, { passive: false });
  canvas.addEventListener('pointerup', onEnd, { passive: false });
  canvas.addEventListener('pointercancel', onEnd, { passive: false });
  canvas.addEventListener('pointerleave', onEnd, { passive: false });
  canvas.addEventListener('pointerout', onEnd, { passive: false });

  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  (window as any).visualViewport?.addEventListener(
    'resize',
    () => {
      activeId = null;
      pointer.active = false;
    },
    { passive: true }
  );
}

export function getPointer(): PointerState {
  return pointer;
}

export function isKeyDown(code: string): boolean {
  return keys.has(code);
}
