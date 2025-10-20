import { clamp } from '../utils/math';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;

type PointerState = {
  active: boolean;
  x: number;
  y: number;
};

export interface Layout {
  scale: number;
  offsetX: number;
  offsetY: number;
  dpr: number;
  cssW: number;
  cssH: number;
}

let pointerState: PointerState = {
  active: false,
  x: VIRTUAL_WIDTH / 2,
  y: (VIRTUAL_HEIGHT * 4) / 5,
};

let activePointerId: number | null = null;
let attachedCanvas: HTMLCanvasElement | null = null;
let layoutGetter: (() => Layout) | null = null;

let handlePointerDown: ((event: PointerEvent) => void) | null = null;
let handlePointerMove: ((event: PointerEvent) => void) | null = null;
let handlePointerUp: ((event: PointerEvent) => void) | null = null;

const pressedKeys = new Set<string>();
let keyboardAttached = false;

const ensureKeyboardListeners = (): void => {
  if (keyboardAttached) {
    return;
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    pressedKeys.add(event.code);

    if (
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      event.preventDefault();
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.code);
  };

  const onBlur = (): void => {
    pressedKeys.clear();
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  keyboardAttached = true;
};

const detachPointerListeners = (): void => {
  if (!attachedCanvas) {
    return;
  }
  if (handlePointerDown) {
    attachedCanvas.removeEventListener('pointerdown', handlePointerDown);
  }
  if (handlePointerMove) {
    attachedCanvas.removeEventListener('pointermove', handlePointerMove);
  }
  if (handlePointerUp) {
    attachedCanvas.removeEventListener('pointerup', handlePointerUp);
    attachedCanvas.removeEventListener('pointercancel', handlePointerUp);
    attachedCanvas.removeEventListener('pointerout', handlePointerUp);
  }
  handlePointerDown = null;
  handlePointerMove = null;
  handlePointerUp = null;
  attachedCanvas = null;
  activePointerId = null;
  pointerState = {
    active: false,
    x: VIRTUAL_WIDTH / 2,
    y: (VIRTUAL_HEIGHT * 4) / 5,
  };
  layoutGetter = null;
};

export function clientToVirtual(
  clientX: number,
  clientY: number,
  layout: Layout
): { x: number; y: number } {
  const safeScale = layout.scale || layout.cssW / VIRTUAL_WIDTH || 1;
  const virtualX = (clientX - layout.offsetX) / safeScale;
  const virtualY = (clientY - layout.offsetY) / safeScale;

  return {
    x: clamp(virtualX, 0, VIRTUAL_WIDTH),
    y: clamp(virtualY, 0, VIRTUAL_HEIGHT),
  };
}

export const initInput = (
  canvas: HTMLCanvasElement,
  getLayout: () => Layout
): void => {
  if (attachedCanvas === canvas) {
    layoutGetter = getLayout;
    ensureKeyboardListeners();
    return;
  }

  detachPointerListeners();
  ensureKeyboardListeners();

  attachedCanvas = canvas;
  layoutGetter = getLayout;

  handlePointerDown = (event: PointerEvent): void => {
    if (!attachedCanvas || !layoutGetter) {
      return;
    }

    if (activePointerId !== null && activePointerId !== event.pointerId) {
      return;
    }

    const layout = layoutGetter();
    const { x, y } = clientToVirtual(event.clientX, event.clientY, layout);

    pointerState = {
      active: true,
      x,
      y,
    };
    activePointerId = event.pointerId;

    try {
      attachedCanvas.setPointerCapture(event.pointerId);
    } catch {
      // ignore platforms without pointer capture
    }

    event.preventDefault();
  };

  handlePointerMove = (event: PointerEvent): void => {
    if (!attachedCanvas || !layoutGetter) {
      return;
    }

    if (pointerState.active && activePointerId === event.pointerId) {
      const layout = layoutGetter();
      const { x, y } = clientToVirtual(event.clientX, event.clientY, layout);
      pointerState = {
        active: true,
        x,
        y,
      };
      event.preventDefault();
    }
  };

  handlePointerUp = (event: PointerEvent): void => {
    if (!attachedCanvas || !layoutGetter) {
      return;
    }

    if (activePointerId === event.pointerId) {
      pointerState = {
        ...pointerState,
        active: false,
      };
      activePointerId = null;
      try {
        attachedCanvas.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if capture was not set
      }
      event.preventDefault();
    }
  };

  const passiveFalse = { passive: false } as const;
  canvas.addEventListener('pointerdown', handlePointerDown, passiveFalse);
  canvas.addEventListener('pointermove', handlePointerMove as EventListener, passiveFalse);
  canvas.addEventListener('pointerup', handlePointerUp as EventListener, passiveFalse);
  canvas.addEventListener('pointercancel', handlePointerUp as EventListener, passiveFalse);
  canvas.addEventListener('pointerout', handlePointerUp as EventListener, passiveFalse);
};

export const getPointer = (): PointerState => ({ ...pointerState });

export const isKeyDown = (code: string): boolean => pressedKeys.has(code);
