import { computeLayout } from './viewport';

type Click = { x:number; y:number } | null;
let lastClick: Click = null;

export function getClick(): Click {
  const c = lastClick; lastClick = null; return c;
}

export function initInput(canvas: HTMLCanvasElement) {
  const toVirtual = (clientX: number, clientY: number) => {
    // Usa solo el rect del canvas en CSS px. Nada de visualViewport aquí.
    const rect = canvas.getBoundingClientRect();

    // coords dentro del canvas en CSS px
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    // escala de CSS->virtual basada en el tamaño pintado real del canvas
    // rect.width/height ya reflejan el tamaño CSS actual del canvas
    const L = computeLayout();
    const sx = rect.width  / L.vwVirt; // css px por unidad virtual
    const sy = rect.height / L.vhVirt;

    return { x: cssX / sx, y: cssY / sy };
  };

  const fire = (clientX: number, clientY: number, e?: Event) => {
    lastClick = toVirtual(clientX, clientY);
    if (e && (e as any).preventDefault) (e as any).preventDefault();
  };

  // Usa pointerup para que el dedo no dispare antes de estabilizar el layout móvil
  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    fire(e.clientX, e.clientY, e);
  }, { passive: false });

  // fallback click por si algún navegador no va fino con pointer
  canvas.addEventListener('click', (e: MouseEvent) => {
    fire(e.clientX, e.clientY, e);
  }, { passive: false });
}
