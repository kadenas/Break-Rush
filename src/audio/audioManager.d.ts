export interface MusicHandle {
  id: number;
  kind: 'music';
  stopRequested: boolean;
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  context?: AudioContext;
  ready: Promise<void>;
}

export interface MusicPlayOptions {
  loop?: boolean;
  fadeIn?: number;
}

export interface MusicStopOptions {
  fadeOut?: number;
}

export interface SfxOptions {
  vol?: number;
}

export function playMusic(name: string, options?: MusicPlayOptions): MusicHandle | null;
export function stopMusic(handle: MusicHandle | null, options?: MusicStopOptions): void;
export function playSfx(name: string, options?: SfxOptions): Promise<boolean>;
export function setMaster(value: number): void;
export function resume(): Promise<void>;
export function getContext(): AudioContext | null;
