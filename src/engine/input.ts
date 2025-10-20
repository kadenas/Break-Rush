import { CanvasDimensions, toCanvasSpace } from './canvas';
import { Vec2 } from '../utils/math';

export interface InputSnapshot {
  pointerActive: boolean;
  pointerPosition: Vec2;
  pointerDelta: Vec2;
  pointerReleased: boolean;
  pointerReleasePosition: Vec2;
  laneTap: number | null;
  keyboardDirection: Vec2;
  pausePressed: boolean;
  retryPressed: boolean;
  twoFingerPause: boolean;
  toggleSound: boolean;
  toggleHaptics: boolean;
  toggleTheme: boolean;
  toggleLaneMode: boolean;
}

const ZERO_VEC: Vec2 = { x: 0, y: 0 };

export class InputManager {
  private pointerActive = false;
  private pointerPos: Vec2 = { x: 0, y: 0 };
  private pointerDelta: Vec2 = { x: 0, y: 0 };
  private pointerStart: Vec2 = { x: 0, y: 0 };
  private pointerStartTime = 0;
  private pointerReleased = false;
  private pointerReleasePos: Vec2 = { x: 0, y: 0 };
  private laneTap: number | null = null;
  private pausePressed = false;
  private retryPressed = false;
  private twoFingerPause = false;
  private keyboardDirection: Vec2 = { x: 0, y: 0 };
  private toggleSound = false;
  private toggleHaptics = false;
  private toggleTheme = false;
  private toggleLaneMode = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly dimensions: () => CanvasDimensions) {
    canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', this.onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', this.onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', this.onPointerUp, { passive: false });
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });

    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  capture(): InputSnapshot {
    const snapshot: InputSnapshot = {
      pointerActive: this.pointerActive,
      pointerPosition: { ...this.pointerPos },
      pointerDelta: { ...this.pointerDelta },
      pointerReleased: this.pointerReleased,
      pointerReleasePosition: { ...this.pointerReleasePos },
      laneTap: this.laneTap,
      keyboardDirection: { ...this.keyboardDirection },
      pausePressed: this.pausePressed,
      retryPressed: this.retryPressed,
      twoFingerPause: this.twoFingerPause,
      toggleSound: this.toggleSound,
      toggleHaptics: this.toggleHaptics,
      toggleTheme: this.toggleTheme,
      toggleLaneMode: this.toggleLaneMode
    };
    this.pointerDelta = { ...ZERO_VEC };
    this.laneTap = null;
    this.pausePressed = false;
    this.retryPressed = false;
    this.twoFingerPause = false;
    this.toggleSound = false;
    this.toggleHaptics = false;
    this.toggleTheme = false;
    this.toggleLaneMode = false;
    this.pointerReleased = false;
    return snapshot;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && event.isPrimary === false) {
      return;
    }
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const point = toCanvasSpace(this.dimensions(), event.clientX, event.clientY, rect);
    this.pointerActive = true;
    this.pointerPos = point;
    this.pointerStart = point;
    this.pointerStartTime = performance.now();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.pointerActive) {
      return;
    }
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const point = toCanvasSpace(this.dimensions(), event.clientX, event.clientY, rect);
    this.pointerDelta = { x: point.x - this.pointerPos.x, y: point.y - this.pointerPos.y };
    this.pointerPos = point;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.pointerActive) {
      return;
    }
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const point = toCanvasSpace(this.dimensions(), event.clientX, event.clientY, rect);
    const time = performance.now() - this.pointerStartTime;
    const dx = point.x - this.pointerStart.x;
    const dy = point.y - this.pointerStart.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 20 && time < 250) {
      const dim = this.dimensions();
      const laneWidth = dim.width / 3;
      const lane = Math.min(2, Math.max(0, Math.floor(point.x / laneWidth)));
      this.laneTap = lane;
    }
    this.pointerReleasePos = point;
    this.pointerReleased = true;
    this.pointerActive = false;
  };

  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length >= 2) {
      event.preventDefault();
      this.twoFingerPause = true;
    }
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'w'].includes(key)) {
      this.keyboardDirection.y = -1;
      event.preventDefault();
    }
    if (['arrowdown', 's'].includes(key)) {
      this.keyboardDirection.y = 1;
      event.preventDefault();
    }
    if (['arrowleft', 'a'].includes(key)) {
      this.keyboardDirection.x = -1;
      event.preventDefault();
    }
    if (['arrowright', 'd'].includes(key)) {
      this.keyboardDirection.x = 1;
      event.preventDefault();
    }
    if (key === 'p' || key === 'escape' || key === ' ') {
      this.pausePressed = true;
      event.preventDefault();
    }
    if (key === 'r') {
      this.retryPressed = true;
      event.preventDefault();
    }
    if (key === 'm') {
      this.toggleSound = true;
      event.preventDefault();
    }
    if (key === 'h') {
      this.toggleHaptics = true;
      event.preventDefault();
    }
    if (key === 'c' || key === 't') {
      this.toggleTheme = true;
      event.preventDefault();
    }
    if (key === 'l') {
      this.toggleLaneMode = true;
      event.preventDefault();
    }
    if (['1', '2', '3'].includes(key)) {
      this.laneTap = parseInt(key, 10) - 1;
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'w'].includes(key) && this.keyboardDirection.y < 0) {
      this.keyboardDirection.y = 0;
    }
    if (['arrowdown', 's'].includes(key) && this.keyboardDirection.y > 0) {
      this.keyboardDirection.y = 0;
    }
    if (['arrowleft', 'a'].includes(key) && this.keyboardDirection.x < 0) {
      this.keyboardDirection.x = 0;
    }
    if (['arrowright', 'd'].includes(key) && this.keyboardDirection.x > 0) {
      this.keyboardDirection.x = 0;
    }
  };
}
