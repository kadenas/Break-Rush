export type SoundName =
  | 'start'
  | 'menu'
  | 'collect'
  | 'power'
  | 'danger'
  | 'hit'
  | 'pause';

type ToneConfig = {
  type: OscillatorType;
  frequency: number;
  duration: number;
  gain: number;
};

const SOUND_LIBRARY: Record<SoundName, ToneConfig[]> = {
  start: [
    { type: 'triangle', frequency: 220, duration: 0.2, gain: 0.2 },
    { type: 'triangle', frequency: 330, duration: 0.25, gain: 0.18 }
  ],
  menu: [{ type: 'sine', frequency: 440, duration: 0.12, gain: 0.1 }],
  collect: [
    { type: 'sine', frequency: 660, duration: 0.1, gain: 0.18 },
    { type: 'sine', frequency: 880, duration: 0.12, gain: 0.12 }
  ],
  power: [
    { type: 'sawtooth', frequency: 300, duration: 0.25, gain: 0.14 },
    { type: 'square', frequency: 150, duration: 0.3, gain: 0.08 }
  ],
  danger: [{ type: 'square', frequency: 120, duration: 0.2, gain: 0.2 }],
  hit: [
    { type: 'sawtooth', frequency: 160, duration: 0.12, gain: 0.25 },
    { type: 'triangle', frequency: 120, duration: 0.2, gain: 0.12 }
  ],
  pause: [{ type: 'triangle', frequency: 240, duration: 0.1, gain: 0.1 }]
};

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = false;

  constructor(private volume = 0.6) {}

  toggle(enable: boolean): void {
    this.enabled = enable;
    if (!enable) {
      return;
    }
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 48000 });
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(name: SoundName): void {
    if (!this.enabled) {
      return;
    }
    if (!this.context || !this.masterGain) {
      this.toggle(true);
      if (!this.context || !this.masterGain) {
        return;
      }
    }
    void this.context.resume().catch(() => undefined);
    const now = this.context.currentTime;
    const tones = SOUND_LIBRARY[name];
    tones.forEach((config, index) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      osc.type = config.type;
      osc.frequency.setValueAtTime(config.frequency, now);
      gain.gain.setValueAtTime(config.gain, now + index * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + index * 0.01);
      osc.stop(now + config.duration + 0.02);
    });
  }
}
