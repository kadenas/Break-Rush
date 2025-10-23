// src/input/inputGate.ts
// Bloquea taps/clicks inmediatamente después de un cambio de pantalla
// hasta que se detecte el primer pointerup. Evita activaciones fantasma.

let armed = false;

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
