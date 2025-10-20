const VW = 360;
const VH = 640;

export type PointerState = {
  active: boolean;
  x: number;
  y: number;
};

const pointer: PointerState = {
  active: false,
  x: VW / 2,
  y: (VH * 4) / 5,
};

const pressedKeys = new Set<string>();
let keyboardAttached = false;

let canvasRef: HTMLCanvasElement | null = null;
let pointerDownHandler: ((event: PointerEvent) => void) | null = null;
let pointerMoveHandler: ((event: PointerEvent) => void) | null = null;
let pointerUpHandler: ((event: PointerEvent) => void) | null = null;

let activePointerId: number | null = null;
let lastClientX: number | null = null;
let lastClientY: number | null = null;

let visualViewportAttached = false;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ensureKeyboardListeners(): void {
  if (keyboardAttached) {
    return;
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    pressedKeys.add(event.code);
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.code);
  };

  const onBlur = (): void => {
    pressedKeys.clear();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  keyboardAttached = true;
}

function clientToVirtual(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;

  let cssX = clientX - rect.left;
  let cssY = clientY - rect.top;

  cssX = clamp(cssX, 0, width);
  cssY = clamp(cssY, 0, height);

  const virtualX = (cssX / width) * VW;
  const virtualY = (cssY / height) * VH;

  return {
    x: clamp(virtualX, 0, VW),
    y: clamp(virtualY, 0, VH),
  };
}

function updatePointerFromEvent(event: PointerEvent): void {
  if (!canvasRef) {
    return;
  }

  lastClientX = event.clientX;
  lastClientY = event.clientY;

  const { x, y } = clientToVirtual(canvasRef, event.clientX, event.clientY);
  pointer.x = x;
  pointer.y = y;
}

function attachVisualViewportListeners(): void {
  if (visualViewportAttached) {
    return;
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    visualViewportAttached = true;
    return;
  }

  const handleViewportChange = (): void => {
    if (!canvasRef) {
      return;
    }
    if (!pointer.active) {
      return;
    }
    if (lastClientX === null || lastClientY === null) {
      return;
    }

    const { x, y } = clientToVirtual(canvasRef, lastClientX, lastClientY);
    pointer.x = x;
    pointer.y = y;
  };

  viewport.addEventListener('resize', handleViewportChange);
  viewport.addEventListener('scroll', handleViewportChange);

  visualViewportAttached = true;
}

function detachPointerListeners(): void {
  if (!canvasRef) {
    return;
  }

  if (pointerDownHandler) {
    canvasRef.removeEventListener('pointerdown', pointerDownHandler);
  }
  if (pointerMoveHandler) {
    canvasRef.removeEventListener('pointermove', pointerMoveHandler);
  }
  if (pointerUpHandler) {
    canvasRef.removeEventListener('pointerup', pointerUpHandler);
    canvasRef.removeEventListener('pointercancel', pointerUpHandler);
    canvasRef.removeEventListener('pointerleave', pointerUpHandler);
    canvasRef.removeEventListener('pointerout', pointerUpHandler);
  }

  pointerDownHandler = null;
  pointerMoveHandler = null;
  pointerUpHandler = null;
  canvasRef = null;
  activePointerId = null;
  lastClientX = null;
  lastClientY = null;
  pointer.active = false;
}

export function initInput(canvas: HTMLCanvasElement): void {
  ensureKeyboardListeners();
  attachVisualViewportListeners();

  if (canvasRef === canvas) {
    return;
  }

  detachPointerListeners();

  canvasRef = canvas;
  canvasRef.style.touchAction = 'none';
  canvasRef.style.userSelect = 'none';

  pointerDownHandler = (event: PointerEvent): void => {
    if (!canvasRef) {
      return;
    }

    activePointerId = event.pointerId;
    pointer.active = true;
    updatePointerFromEvent(event);

    try {
      canvasRef.setPointerCapture(event.pointerId);
    } catch {
      // ignore if pointer capture is not supported
    }

    event.preventDefault();
  };

  pointerMoveHandler = (event: PointerEvent): void => {
    if (!canvasRef) {
      return;
    }

    if (activePointerId !== event.pointerId) {
      return;
    }

    updatePointerFromEvent(event);
    event.preventDefault();
  };

  pointerUpHandler = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    pointer.active = false;
    activePointerId = null;
    lastClientX = event.clientX;
    lastClientY = event.clientY;

    try {
      canvasRef?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore if capture wasn't set
    }

    event.preventDefault();
  };

  const options = { passive: false } as const;
  canvasRef.addEventListener('pointerdown', pointerDownHandler, options);
  canvasRef.addEventListener('pointermove', pointerMoveHandler, options);
  canvasRef.addEventListener('pointerup', pointerUpHandler, options);
  canvasRef.addEventListener('pointercancel', pointerUpHandler, options);
  canvasRef.addEventListener('pointerleave', pointerUpHandler, options);
  canvasRef.addEventListener('pointerout', pointerUpHandler, options);
}

export function getPointer(): PointerState {
  return { ...pointer };
}

export function isKeyDown(code: string): boolean {
  return pressedKeys.has(code);
}
