import { computeLayout, VW, VH } from './viewport';

export type PointerKind = 'mouse' | 'touch' | 'pen';
export type PointerState = { active: boolean; x: number; y: number; type: PointerKind };

let canvasRef: HTMLCanvasElement | null = null;
let initialized = false;
let pointer: PointerState = { active: false, x: VW / 2, y: VH / 2, type: 'mouse' };
let activeId: number | null = null;
const keys = new Set<string>();

function toVirtual(clientX: number, clientY: number) {
  const canvas = canvasRef;
  if (!canvas) return { x: pointer.x, y: pointer.y };
  const rect = canvas.getBoundingClientRect();
  const cssX = clientX - rect.left;
  const cssY = clientY - rect.top;

  const layout = computeLayout();
  const scaleX = rect.width / layout.vwVirt;
  const scaleY = rect.height / layout.vhVirt;
  const x = Math.max(0, Math.min(layout.vwVirt, cssX / scaleX));
  const y = Math.max(0, Math.min(layout.vhVirt, cssY / scaleY));
  return { x, y };
}

export function initControls(canvas: HTMLCanvasElement) {
  canvasRef = canvas;
  if (initialized) return;
  initialized = true;

  const onPointerDown = (e: PointerEvent) => {
    const v = toVirtual(e.clientX, e.clientY);
    canvas.setPointerCapture?.(e.pointerId);
    activeId = e.pointerId;
    pointer = {
      active: true,
      x: v.x,
      y: v.y,
      type: e.pointerType === 'touch' || e.pointerType === 'pen' ? (e.pointerType as PointerKind) : 'mouse',
    };
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (activeId !== null && e.pointerId === activeId) {
      const v = toVirtual(e.clientX, e.clientY);
      pointer.x = v.x;
      pointer.y = v.y;
      e.preventDefault();
    }
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (activeId !== null && e.pointerId === activeId) {
      const v = toVirtual(e.clientX, e.clientY);
      pointer.x = v.x;
      pointer.y = v.y;
      activeId = null;
      pointer.active = false;
      e.preventDefault();
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerEnd, { passive: false });
  canvas.addEventListener('pointercancel', onPointerEnd, { passive: false });
  canvas.addEventListener('pointerleave', onPointerEnd, { passive: false });

  window.addEventListener('keydown', (event) => keys.add(event.code));
  window.addEventListener('keyup', (event) => keys.delete(event.code));
}

export function getPointer(): PointerState {
  return pointer;
}

export function isKeyDown(code: string) {
  return keys.has(code);
}
