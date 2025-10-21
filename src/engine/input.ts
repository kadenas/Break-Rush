import { computeLayout, VW, VH } from './viewport';

export type PointerKind = 'mouse' | 'touch' | 'pen';
export type PointerState = { active: boolean; x: number; y: number; type: PointerKind };

type Click = { x: number; y: number } | null;

let canvasRef: HTMLCanvasElement | null = null;
let pointer: PointerState = { active: false, x: VW / 2, y: VH / 2, type: 'mouse' };
let activeId: number | null = null;
const keys = new Set<string>();
let lastDown = { x: 0, y: 0, t: 0 };
let lastClick: Click = null;

const CLICK_TIME_MS = 250;
const CLICK_DIST = 12;

function toVirtual(clientX: number, clientY: number) {
  const canvas = canvasRef ?? (document.getElementById('game') as HTMLCanvasElement | null);
  if (!canvas) return { x: pointer.x, y: pointer.y };
  const rect = canvas.getBoundingClientRect();
  const vv = (window as any).visualViewport;
  const offsetX = vv?.offsetLeft ?? 0;
  const offsetY = vv?.offsetTop ?? 0;
  const cssX = clientX - rect.left + offsetX;
  const cssY = clientY - rect.top + offsetY;

  const layout = computeLayout();
  const scaleX = layout.vwCss / layout.vwVirt;
  const scaleY = layout.vhCss / layout.vhVirt;
  const x = Math.max(0, Math.min(layout.vwVirt, cssX / scaleX));
  const y = Math.max(0, Math.min(layout.vhVirt, cssY / scaleY));
  return { x, y };
}

export function getClick(): Click {
  const c = lastClick;
  lastClick = null;
  return c;
}

export function initInput(canvas: HTMLCanvasElement) {
  canvasRef = canvas;

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
    lastDown = { x: v.x, y: v.y, t: performance.now() };
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
      const dt = performance.now() - lastDown.t;
      const dx = Math.abs(v.x - lastDown.x);
      const dy = Math.abs(v.y - lastDown.y);
      if (dt <= CLICK_TIME_MS && dx < CLICK_DIST && dy < CLICK_DIST) {
        lastClick = { x: v.x, y: v.y };
      }
      activeId = null;
      pointer.active = false;
      e.preventDefault();
    }
  };

  const onClick = (e: MouseEvent) => {
    const v = toVirtual(e.clientX, e.clientY);
    lastClick = v;
    e.preventDefault?.();
  };

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerEnd, { passive: false });
  canvas.addEventListener('pointercancel', onPointerEnd, { passive: false });
  canvas.addEventListener('pointerleave', onPointerEnd, { passive: false });
  canvas.addEventListener('click', onClick, { passive: false });

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
