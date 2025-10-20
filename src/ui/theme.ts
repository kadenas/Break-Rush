import type { ThemeVariant } from '../storage/settings';

export interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
  accentSecondary: string;
  enemy: string;
  orb: string;
  shield: string;
  caution: string;
  pauseOverlay: string;
}

const THEMES: Record<ThemeVariant, ThemeColors> = {
  default: {
    background: '#05060a',
    foreground: '#f0f6ff',
    accent: '#1f8efa',
    accentSecondary: '#6cfafc',
    enemy: '#ff3366',
    orb: '#ffd166',
    shield: '#9dffb0',
    caution: '#ff9f1c',
    pauseOverlay: 'rgba(5, 6, 10, 0.72)'
  },
  colorblind: {
    background: '#04130f',
    foreground: '#f5fffa',
    accent: '#2a9d8f',
    accentSecondary: '#f4a261',
    enemy: '#e76f51',
    orb: '#e9c46a',
    shield: '#90be6d',
    caution: '#f4a261',
    pauseOverlay: 'rgba(4, 19, 15, 0.75)'
  }
};

export function getThemeColors(variant: ThemeVariant): ThemeColors {
  return THEMES[variant];
}
