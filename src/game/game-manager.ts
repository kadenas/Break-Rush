import { GameLoop } from '../core/loop';
import { CanvasManager } from '../engine/canvas';
import { AudioManager, type SoundName } from '../engine/audio';
import { HapticsManager } from '../engine/haptics';
import { InputManager, type InputSnapshot } from '../engine/input';
import { Renderer, type UIButton } from '../gfx/renderer';
import { getThemeColors } from '../ui/theme';
import { SettingsStore, type SettingsData } from '../storage/settings';
import { HighScoreStore } from '../storage/highscore';
import type { GameStateName, PowerUpType } from './types';
import { GameWorld } from './world';

export class GameManager {
  private readonly canvasManager: CanvasManager;
  private readonly input: InputManager;
  private readonly audio = new AudioManager();
  private readonly haptics = new HapticsManager();
  private readonly renderer: Renderer;
  private readonly loop: GameLoop;
  private readonly settingsStore = new SettingsStore();
  private readonly highScoreStore = new HighScoreStore();
  private readonly world: GameWorld;

  private state: GameStateName = 'menu';
  private buttons: UIButton[] = [];
  private settings: SettingsData;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.canvasManager = new CanvasManager(canvas);
    this.input = new InputManager(canvas, () => this.canvasManager.dimensions);
    this.renderer = new Renderer(canvas, this.canvasManager.ctx);
    this.settings = this.settingsStore.get();
    this.audio.toggle(this.settings.soundEnabled);
    this.haptics.toggle(this.settings.hapticsEnabled);

    const design = this.canvasManager.dimensions;
    this.world = new GameWorld(design.width, design.height, {
      onScore: () => this.play('collect'),
      onHit: () => {
        this.play('hit');
        this.haptics.pulse(120);
      },
      onPower: (type) => this.handlePower(type),
      onOrb: () => this.haptics.pulse(20),
      onCombo: () => this.play('danger')
    });
    this.world.metrics.highScore = this.highScoreStore.get();

    this.loop = new GameLoop((dt) => this.onFrame(dt));
    this.loop.start();

    document.addEventListener('gesturestart', (event) => event.preventDefault());
  }

  private handlePower(type: PowerUpType): void {
    const sound: Record<PowerUpType, SoundName> = {
      slow: 'power',
      shield: 'power',
      bomb: 'power'
    };
    this.play(sound[type]);
    this.haptics.pulse(type === 'bomb' ? 120 : 60);
  }

  private play(name: SoundName): void {
    this.audio.play(name);
  }

  private onFrame(dt: number): void {
    const snapshot = this.input.capture();
    this.applySettingsFromInput(snapshot);

    const theme = getThemeColors(this.settings.theme);

    this.updateState(snapshot, dt);

    this.buttons = this.renderer.draw(this.state, this.world, theme, this.settings, this.canvasManager.dimensions);
  }

  private applySettingsFromInput(input: InputSnapshot): void {
    if (input.toggleSound) {
      this.settings = this.settingsStore.update({ soundEnabled: !this.settings.soundEnabled });
      this.audio.toggle(this.settings.soundEnabled);
    }
    if (input.toggleHaptics) {
      this.settings = this.settingsStore.update({ hapticsEnabled: !this.settings.hapticsEnabled });
      this.haptics.toggle(this.settings.hapticsEnabled);
    }
    if (input.toggleTheme) {
      const nextTheme = this.settings.theme === 'default' ? 'colorblind' : 'default';
      this.settings = this.settingsStore.update({ theme: nextTheme });
    }
    if (input.toggleLaneMode) {
      this.settings = this.settingsStore.update({ useLaneMode: !this.settings.useLaneMode });
    }
  }

  private updateState(input: InputSnapshot, dt: number): void {
    const pressedButton = this.resolveButtonPress(input);

    if (this.state === 'menu') {
      if (input.pointerReleased || input.retryPressed) {
        this.startRun();
      }
    }

    if (this.state === 'playing') {
      if (input.pausePressed || input.twoFingerPause || pressedButton === 'pause') {
        this.setState('pause');
        this.play('pause');
        return;
      }
      const result = this.world.update(dt, input, this.settings);
      if (result.gameOver) {
        const high = this.highScoreStore.submit(Math.floor(this.world.metrics.score));
        this.world.metrics.highScore = high;
        this.setState('gameover');
        this.play('hit');
      }
    } else if (this.state === 'pause') {
      if (input.pausePressed || input.twoFingerPause || pressedButton === 'pause') {
        this.setState('playing');
        this.play('pause');
        return;
      }
      if (input.retryPressed || pressedButton === 'retry') {
        this.startRun();
      }
    } else if (this.state === 'gameover') {
      if (input.retryPressed || pressedButton === 'retry') {
        this.startRun();
      }
    }
  }

  private startRun(): void {
    const highScore = this.highScoreStore.get();
    this.world.reset(highScore);
    this.setState('playing');
    this.play('start');
  }

  private setState(next: GameStateName): void {
    this.state = next;
  }

  private resolveButtonPress(input: InputSnapshot): 'pause' | 'retry' | null {
    if (!input.pointerReleased) {
      return null;
    }
    const pos = input.pointerReleasePosition;
    for (const button of this.buttons) {
      if (!button.visible) {
        continue;
      }
      if (
        pos.x >= button.x &&
        pos.x <= button.x + button.width &&
        pos.y >= button.y &&
        pos.y <= button.y + button.height
      ) {
        return button.id;
      }
    }
    return null;
  }
}
