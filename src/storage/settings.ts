import { ControlMode } from '../engine/input';

export interface Settings {
  theme: 'high-contrast' | 'colorblind';
  sound: boolean;
  haptics: boolean;
  controlMode: ControlMode;
}

const KEY = 'break-rush:settings';

const DEFAULT_SETTINGS: Settings = {
  theme: 'high-contrast',
  sound: true,
  haptics: true,
  controlMode: 'drag',
};

export const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.warn('Failed to load settings', err);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to persist settings', err);
  }
};
