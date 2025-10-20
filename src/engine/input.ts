import { clientToVirtual, computeLayout, VW, VH } from './viewport';

export type PointerKind = 'mouse' | 'touch' | 'pen';
export type PointerState = { active: boolean; x: number; y: number; type: PointerKind };

let pointer: PointerState = { active: false, x: VW/2, y: VH/2, type: 'mouse' };
let activeId: number | null = null;
const keys = new Set<string>();
let canvas: HTMLCanvasElement;

export function initInput(c: HTMLCanvasElement) {
  canvas = c;

  const onDown = (e: PointerEvent) => {
    const L = computeLayout();
    const v = clientToVirtual(e.clientX, e.clientY, L);
    canvas.setPointerCapture?.(e.pointerId);
    activeId = e.pointerId;
    pointer = {
      active: true,
      x: v.x, y: v.y,
      type: (e.pointerType === 'touch' || e.pointerType === 'pen') ? (e.pointerType as PointerKind) : 'mouse'
    };
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    if (activeId !== null && e.pointerId === activeId) {
      const L = computeLayout();
      const v = clientToVirtual(e.clientX, e.clientY, L);
      pointer.x = v.x; pointer.y = v.y;
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

  c.addEventListener('pointerdown', onDown, { passive: false });
  c.addEventListener('pointermove', onMove, { passive: false });
  c.addEventListener('pointerup', onEnd, { passive: false });
  c.addEventListener('pointercancel', onEnd, { passive: false });
  c.addEventListener('pointerout', onEnd, { passive: false });
  c.addEventListener('pointerleave', onEnd, { passive: false });

  window.addEventListener('keydown', e => keys.add(e.code));
  window.addEventListener('keyup',   e => keys.delete(e.code));

  (window as any).visualViewport?.addEventListener('resize', () => {
    activeId = null; pointer.active = false;
  }, { passive: true });
}

export function getPointer(): PointerState { return pointer; }
export function isKeyDown(code: string) { return keys.has(code); }
