import { clamp } from '../utils/math';

export type ControlMode = 'drag' | 'lanes';

interface InputTarget {
  x: number;
  y: number;
  active: boolean;
}

const LANE_POSITIONS = [0.2, 0.5, 0.8];

export class InputSystem extends EventTarget {
  private mode: ControlMode = 'drag';
  private canvas: HTMLCanvasElement;
  private enabled = false;
  private activePointers = new Map<number, number>();
  private primaryPointer: number | null = null;
  private pointerTarget: InputTarget = { x: 0.5, y: 0.8, active: false };
  private laneIndex = 1;
  private pauseRequested = false;
  private keyboardAxis = 0;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.attachPointerHandlers();
    this.attachKeyboardHandlers();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pointerTarget.active = false;
      this.keyboardAxis = 0;
      this.primaryPointer = null;
    }
  }

  setControlMode(mode: ControlMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      if (mode === 'lanes') {
        this.pointerTarget.x = LANE_POSITIONS[this.laneIndex];
      }
    }
  }

  get controlMode(): ControlMode {
    return this.mode;
  }

  getTarget(): InputTarget {
    if (this.mode === 'drag' && this.keyboardAxis !== 0) {
      const delta = this.keyboardAxis * 0.8;
      this.pointerTarget.x = clamp(this.pointerTarget.x + delta, 0.08, 0.92);
    }
    return { ...this.pointerTarget };
  }

  consumePauseRequest(): boolean {
    const flag = this.pauseRequested;
    this.pauseRequested = false;
    return flag;
  }

  private attachPointerHandlers(): void {
    const pointerDown = (event: PointerEvent) => {
      if (!this.enabled && event.pointerType === 'touch') {
        return;
      }
      if (event.pointerType !== 'mouse') {
        event.preventDefault();
      }
      this.activePointers.set(event.pointerId, performance.now());
      if (this.primaryPointer === null) {
        this.primaryPointer = event.pointerId;
      }
      if (this.activePointers.size >= 2) {
        const times = [...this.activePointers.values()];
        if (Math.max(...times) - Math.min(...times) < 220) {
          this.pauseRequested = true;
          this.dispatchEvent(new Event('pause'));
        }
      }
      if (!this.enabled) {
        return;
      }
      if (this.mode === 'lanes') {
        this.handleLaneTap(event);
      } else if (this.primaryPointer === event.pointerId) {
        this.pointerTarget.active = true;
        this.updatePointerTarget(event);
      }
      this.canvas.setPointerCapture(event.pointerId);
    };

    const pointerMove = (event: PointerEvent) => {
      if (!this.enabled) return;
      if (this.mode === 'drag' && this.pointerTarget.active && event.pointerId === this.primaryPointer) {
        this.updatePointerTarget(event);
      }
    };

    const pointerUp = (event: PointerEvent) => {
      this.activePointers.delete(event.pointerId);
      if (this.mode === 'drag' && event.pointerId === this.primaryPointer) {
        this.pointerTarget.active = false;
      }
      if (event.pointerId === this.primaryPointer) {
        this.primaryPointer = null;
      }
      if (this.mode === 'lanes' && this.enabled) {
        this.handleLaneTap(event);
      }
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if not captured
      }
    };

    this.canvas.addEventListener('pointerdown', pointerDown, { passive: false });
    this.canvas.addEventListener('pointermove', pointerMove, { passive: false });
    this.canvas.addEventListener('pointerup', pointerUp);
    this.canvas.addEventListener('pointercancel', pointerUp);
  }

  private handleLaneTap(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const xNorm = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const yNorm = (event.clientY - rect.top) / rect.height;
    if (yNorm < 0.3) return;
    let index = 0;
    if (xNorm < 1 / 3) index = 0;
    else if (xNorm < 2 / 3) index = 1;
    else index = 2;
    if (index !== this.laneIndex) {
      this.laneIndex = index;
      this.pointerTarget.x = LANE_POSITIONS[index];
      this.dispatchEvent(new CustomEvent('lane', { detail: index }));
    }
    this.pointerTarget.y = 0.85;
    this.pointerTarget.active = true;
  }

  private updatePointerTarget(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const yNorm = (event.clientY - rect.top) / rect.height;
    if (yNorm < 0.3) return;
    const xNorm = (event.clientX - rect.left) / rect.width;
    this.pointerTarget.x = clamp(xNorm, 0.05, 0.95);
    this.pointerTarget.y = clamp(yNorm, 0.3, 0.98);
  }

  private attachKeyboardHandlers(): void {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      switch (event.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          if (this.mode === 'lanes') {
            this.setLane(this.laneIndex - 1);
          } else {
            this.keyboardAxis = -1;
          }
          break;
        case 'arrowright':
        case 'd':
          if (this.mode === 'lanes') {
            this.setLane(this.laneIndex + 1);
          } else {
            this.keyboardAxis = 1;
          }
          break;
        case 'arrowup':
        case 'w':
          if (this.mode === 'drag') {
            this.pointerTarget.y = clamp(this.pointerTarget.y - 0.1, 0.3, 0.98);
          }
          break;
        case 'arrowdown':
        case 's':
          if (this.mode === 'drag') {
            this.pointerTarget.y = clamp(this.pointerTarget.y + 0.1, 0.3, 0.98);
          }
          break;
        case 'p':
        case 'escape':
          this.pauseRequested = true;
          break;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (['arrowleft', 'a'].includes(event.key.toLowerCase()) && this.keyboardAxis < 0) {
        this.keyboardAxis = 0;
      }
      if (['arrowright', 'd'].includes(event.key.toLowerCase()) && this.keyboardAxis > 0) {
        this.keyboardAxis = 0;
      }
    });
  }

  private setLane(index: number): void {
    this.laneIndex = clamp(index, 0, LANE_POSITIONS.length - 1) | 0;
    this.pointerTarget.x = LANE_POSITIONS[this.laneIndex];
    this.pointerTarget.y = 0.85;
    this.pointerTarget.active = true;
    this.dispatchEvent(new CustomEvent('lane', { detail: this.laneIndex }));
  }
}
