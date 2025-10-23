// src/input/inputGate.ts
// Bloquea taps/clicks inmediatamente después de un cambio de pantalla
// hasta que se detecte el primer pointerup. Evita activaciones fantasma.

let armed = false;

// Seguimiento global del puntero actual
let isPointerDown = false;
let lastPointerDown: PointerEvent | null = null;

function blockEvent(e: Event) {
  if (!armed) return;
  e.stopImmediatePropagation();
  // Es crucial preventDefault para frenar el click sintetizado en móviles
  if (typeof (e as any).preventDefault === 'function') (e as any).preventDefault();
}

function onPointerUpOnce(this: Window, ev: PointerEvent) {
  if (!armed) return;
  armed = false;
  window.removeEventListener('pointerdown', blockEvent, true);
  window.removeEventListener('click', blockEvent, true);
  window.removeEventListener('pointerup', onPointerUpOnce, true);
}

/**
 * Llamar justo ANTES o EN EL MOMENTO de cambiar de pantalla.
 * Bloquea pointerdown/click hasta el siguiente pointerup.
 */
export function armAfterScreenChange(): void {
  if (armed) return;
  armed = true;
  window.addEventListener('pointerdown', blockEvent, true);
  window.addEventListener('click', blockEvent, true);
  window.addEventListener('pointerup', onPointerUpOnce, true);
}

/**
 * Por si necesitas forzar desbloqueo (normalmente no).
 */
export function forceUnlockInputGate(): void {
  if (!armed) return;
  armed = false;
  window.removeEventListener('pointerdown', blockEvent, true);
  window.removeEventListener('click', blockEvent, true);
  window.removeEventListener('pointerup', onPointerUpOnce, true);
}

// Tracking en capture para enterarse siempre
(function initPointerTracking() {
  window.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    lastPointerDown = e;
  }, { capture: true, passive: false });

  const resetState = () => {
    isPointerDown = false;
    lastPointerDown = null;
  };

  window.addEventListener('pointerup', resetState, { capture: true, passive: false });
  window.addEventListener('pointercancel', resetState, { capture: true, passive: false });
})();

// Traspasa el "toque en curso" al elemento objetivo (p.ej. canvas del juego)
export function handOffActivePointerTo(target: Element): void {
  if (!isPointerDown || !lastPointerDown) return;
  const src = lastPointerDown;

  const ev = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: src.pointerId,
    pointerType: src.pointerType,
    isPrimary: src.isPrimary,
    buttons: src.buttons,
    pressure: src.pressure,
    clientX: src.clientX,
    clientY: src.clientY,
    screenX: src.screenX,
    screenY: src.screenY,
  });

  target.dispatchEvent(ev);
}
