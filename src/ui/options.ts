import { Settings } from '../storage/settings';
import { THEMES } from './theme';

export interface OptionsCallbacks {
  onTheme: (theme: Settings['theme']) => void;
  onSound: (enabled: boolean) => void;
  onHaptics: (enabled: boolean) => void;
  onControl: (mode: Settings['controlMode']) => void;
}

export class OptionsPanel {
  readonly element: HTMLDivElement;
  private themeButton: HTMLButtonElement;
  private soundButton: HTMLButtonElement;
  private hapticsButton: HTMLButtonElement;
  private controlButton: HTMLButtonElement;

  constructor(settings: Settings, callbacks: OptionsCallbacks) {
    this.element = document.createElement('div');
    this.element.className = 'dialog';
    this.element.innerHTML = '<h2>Options</h2>';

    const grid = document.createElement('div');
    grid.className = 'options-grid';

    this.themeButton = this.makeToggle('Theme', describeTheme(settings.theme));
    this.themeButton.addEventListener('click', () => {
      const index = THEMES.findIndex((theme) => theme.name === settings.theme);
      const next = THEMES[(index + 1) % THEMES.length];
      settings.theme = next.name as Settings['theme'];
      this.themeButton.textContent = describeTheme(settings.theme);
      callbacks.onTheme(settings.theme);
    });

    this.soundButton = this.makeToggle('Sound', settings.sound ? 'On' : 'Muted');
    this.soundButton.addEventListener('click', () => {
      settings.sound = !settings.sound;
      this.soundButton.textContent = settings.sound ? 'On' : 'Muted';
      callbacks.onSound(settings.sound);
    });

    this.hapticsButton = this.makeToggle('Haptics', settings.haptics ? 'On' : 'Off');
    this.hapticsButton.addEventListener('click', () => {
      settings.haptics = !settings.haptics;
      this.hapticsButton.textContent = settings.haptics ? 'On' : 'Off';
      callbacks.onHaptics(settings.haptics);
    });

    this.controlButton = this.makeToggle('Control', controlLabel(settings.controlMode));
    this.controlButton.addEventListener('click', () => {
      settings.controlMode = settings.controlMode === 'drag' ? 'lanes' : 'drag';
      this.controlButton.textContent = controlLabel(settings.controlMode);
      callbacks.onControl(settings.controlMode);
    });

    grid.append(
      this.label('Theme'),
      this.themeButton,
      this.label('Sound'),
      this.soundButton,
      this.label('Haptics'),
      this.hapticsButton,
      this.label('Control'),
      this.controlButton
    );

    this.element.append(grid);
  }

  private makeToggle(label: string, value: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'toggle';
    button.setAttribute('aria-label', `${label} toggle`);
    button.textContent = value;
    return button;
  }

  private label(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.fontSize = '18px';
    return span;
  }
}

const describeTheme = (name: Settings['theme']): string => (name === 'colorblind' ? 'Colorblind' : 'High Contrast');

const controlLabel = (mode: Settings['controlMode']): string => (mode === 'drag' ? 'Drag' : '3-Lane');
