import { bootGame, startGame } from './core/game';
import { unlockAudio } from './engine/audio';
import { setState, getState } from './core/state';
import type { Layout } from './engine/input';

declare global {
  interface Window {
    brDebug?: {
      setState: typeof setState;
      startGame: typeof startGame;
      unlockAudio: typeof unlockAudio;
      log: (msg: string) => void;
    };
  }
}

const BASE_WIDTH = 360;
const BASE_HEIGHT = 640;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const log = (...args: unknown[]): void => {
  console.log('[BR]', ...args);
};

const startEvents = ['pointerdown', 'touchstart', 'keydown'] as const;

let canvasRef: HTMLCanvasElement | null = null;
let gateOverlay: HTMLElement | null = null;
let currentDpr = 1;
let startCallback: (() => void) | null = null;
let lastEventLabel = 'init';
let debugHudEl: HTMLDivElement | null = null;
let debugInfoEl: HTMLDivElement | null = null;
let debugForceBtn: HTMLButtonElement | null = null;

const layout: Layout = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dpr: 1,
  cssW: BASE_WIDTH,
  cssH: BASE_HEIGHT,
};

export const getLayout = (): Layout => layout;

const debugEnabled = (() => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') {
      return true;
    }

    return window.localStorage?.getItem('br_debug') === '1';
  } catch {
    return false;
  }
})();

function qs<T extends Element>(selector: string, root: Document | Element = document): T {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  canvasRef = canvas;
  const dpr = clamp(window.devicePixelRatio ?? 1, 1, 3);
  currentDpr = dpr;

  const viewportWidth = Math.max(
    window.innerWidth || document.documentElement.clientWidth || BASE_WIDTH,
    1
  );
  const viewportHeight = Math.max(
    window.innerHeight || document.documentElement.clientHeight || BASE_HEIGHT,
    1
  );
  const rawScale = Math.min(viewportWidth / BASE_WIDTH, viewportHeight / BASE_HEIGHT) || 1;
  const cssW = Math.max(1, Math.floor(BASE_WIDTH * rawScale));
  const cssH = Math.max(1, Math.floor(BASE_HEIGHT * rawScale));
  const offsetX = (viewportWidth - cssW) / 2;
  const offsetY = (viewportHeight - cssH) / 2;

  canvas.style.position = 'fixed';
  canvas.style.left = `${offsetX}px`;
  canvas.style.top = `${offsetY}px`;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.display = 'block';

  const bufferWidth = Math.floor(BASE_WIDTH * dpr);
  const bufferHeight = Math.floor(BASE_HEIGHT * dpr);

  if (canvas.width !== bufferWidth) {
    canvas.width = bufferWidth;
  }
  if (canvas.height !== bufferHeight) {
    canvas.height = bufferHeight;
  }

  const context = canvas.getContext('2d');
  if (context) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  layout.scale = cssW / BASE_WIDTH;
  layout.offsetX = offsetX;
  layout.offsetY = offsetY;
  layout.dpr = dpr;
  layout.cssW = cssW;
  layout.cssH = cssH;

  log('resizeCanvas applied', {
    dpr,
    bufferWidth,
    bufferHeight,
    cssW,
    cssH,
    scale: layout.scale,
    offsetX,
    offsetY,
  });
}

function sanityPaint(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) {
    console.warn('[BR] sanityPaint aborted: no 2D context');
    return;
  }

  context.save();
  context.globalAlpha = 1;
  context.fillStyle = '#cc1122';
  context.fillRect(16, 16, 160, 60);
  context.fillStyle = '#ffffff';
  context.font = '20px system-ui, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText('BOOT OK', 32, 46);
  context.restore();

  log('sanityPaint drew BOOT OK');
}

function makeDebugHud(): void {
  if (!debugEnabled) {
    if (debugHudEl) {
      debugHudEl.remove();
    }
    debugHudEl = null;
    debugInfoEl = null;
    debugForceBtn = null;
    return;
  }

  if (!document.body) {
    return;
  }

  if (!debugHudEl) {
    debugHudEl = document.createElement('div');
    debugHudEl.style.position = 'fixed';
    debugHudEl.style.left = '8px';
    debugHudEl.style.bottom = '8px';
    debugHudEl.style.padding = '8px';
    debugHudEl.style.background = 'rgba(0, 0, 0, 0.7)';
    debugHudEl.style.color = '#fff';
    debugHudEl.style.fontFamily = 'monospace';
    debugHudEl.style.fontSize = '12px';
    debugHudEl.style.lineHeight = '1.4';
    debugHudEl.style.zIndex = '2147483647';
    debugHudEl.style.pointerEvents = 'auto';

    debugInfoEl = document.createElement('div');
    debugHudEl.append(debugInfoEl);

    debugForceBtn = document.createElement('button');
    debugForceBtn.type = 'button';
    debugForceBtn.textContent = 'Force PLAYING';
    debugForceBtn.style.marginTop = '6px';
    debugForceBtn.style.width = '100%';
    debugForceBtn.addEventListener('click', () => {
      lastEventLabel = 'debug-force';
      log('debug force button pressed');
      runStartSequence('debug-force');
    });
    debugHudEl.append(debugForceBtn);

    document.body.append(debugHudEl);
  }

  if (!debugInfoEl) {
    return;
  }

  const canvas = canvasRef;
  const cssSize = canvas ? `${Math.round(canvas.clientWidth)}x${Math.round(canvas.clientHeight)}` : 'n/a';
  const bufferSize = canvas ? `${canvas.width}x${canvas.height}` : 'n/a';
  const info = [
    `state: ${getState()}`,
    `last: ${lastEventLabel}`,
    `dpr: ${currentDpr.toFixed(2)}`,
    `canvas: ${bufferSize} px (${cssSize} css)`
  ].join(' | ');
  debugInfoEl.textContent = info;
}

function runStartSequence(origin: string): void {
  log(`start sequence triggered by ${origin}`);

  try {
    const result = unlockAudio();
    log('unlockAudio() invoked');
    if (result instanceof Promise) {
      result.catch((err) => console.warn('[BR] unlockAudio promise rejected', err));
    }
  } catch (error) {
    console.warn('[BR] unlockAudio threw', error);
  }

  log('setState("playing")');
  setState('playing');

  if (startCallback) {
    log('executing start callback');
    startCallback();
  } else {
    log('start callback missing');
  }

  if (gateOverlay) {
    log('removing gate overlay');
    gateOverlay.remove();
    gateOverlay = null;
  } else {
    log('gate overlay already removed');
  }

  makeDebugHud();
}

function wireGate(startCb: () => void): void {
  startCallback = startCb;
  const gate = qs<HTMLElement>('#gate');
  const gateButton = qs<HTMLElement>('#gate-btn');

  gateOverlay = gate;

  const attach = (target: HTMLElement, label: string): void => {
    for (const type of startEvents) {
      const listener = (event: Event): void => {
        event.preventDefault();
        lastEventLabel = `${label}:${event.type}`;
        log(`event ${lastEventLabel}`);
        runStartSequence(label);
      };
      const options = type === 'touchstart' ? { passive: false } : undefined;
      target.addEventListener(type, listener as EventListener, options);
    }
  };

  attach(gate, 'gate');
  attach(gateButton, 'gate-btn');
  log('gate wired');
}

const handleDOMContentLoaded = (): void => {
  try {
    log('DOMContentLoaded');
    const canvas = qs<HTMLCanvasElement>('#game');
    canvasRef = canvas;

    const start = (): void => {
      sanityPaint(canvas);
      startGame();
      makeDebugHud();
    };

    resizeCanvas(canvas);
    bootGame(canvas, getLayout);
    log('bootGame invoked');

    const handleResize = (): void => {
      resizeCanvas(canvas);
      makeDebugHud();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    wireGate(start);

    document.addEventListener(
      'pointerdown',
      () => {
        if (getState() === 'menu') {
          lastEventLabel = 'document:pointerdown';
          log('failsafe fired');
          runStartSequence('document');
        }
      },
      { once: true }
    );

    canvas.addEventListener('pointerdown', () => {
      if (getState() === 'menu') {
        lastEventLabel = 'canvas:pointerdown';
        log('failsafe fired');
        runStartSequence('canvas');
      }
    });

    lastEventLabel = 'domcontentloaded';
    makeDebugHud();

    if (typeof window !== 'undefined') {
      window.brDebug = {
        setState,
        startGame,
        unlockAudio,
        log: (msg: string) => log(`debug: ${msg}`)
      };
    }
  } catch (error) {
    console.error('[BR] ERROR', error);
    const message = error instanceof Error ? error.message : String(error);
    const fallbackCanvas = canvasRef ?? document.querySelector<HTMLCanvasElement>('#game');
    if (fallbackCanvas) {
      const width = fallbackCanvas.width || Math.round(BASE_WIDTH * currentDpr);
      const height = fallbackCanvas.height || Math.round(BASE_HEIGHT * currentDpr);
      if (fallbackCanvas.width === 0) {
        fallbackCanvas.width = width;
      }
      if (fallbackCanvas.height === 0) {
        fallbackCanvas.height = height;
      }
      const context = fallbackCanvas.getContext('2d');
      if (context) {
        context.save();
        context.fillStyle = 'rgba(200, 0, 0, 0.95)';
        context.fillRect(0, 0, fallbackCanvas.width, 48);
        context.fillStyle = '#ffffff';
        context.font = '16px system-ui, sans-serif';
        context.textBaseline = 'top';
        context.fillText(message, 8, 8, fallbackCanvas.width - 16);
        context.restore();
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
