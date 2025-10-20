export interface Theme {
  name: string;
  background: string;
  foreground: string;
  accent: string;
  danger: string;
  success: string;
  hud: string;
}

export const HIGH_CONTRAST: Theme = {
  name: 'high-contrast',
  background: '#04060c',
  foreground: '#f5f5f5',
  accent: '#0bd7ff',
  danger: '#ff5a7a',
  success: '#8affce',
  hud: 'rgba(0, 0, 0, 0.55)',
};

export const COLORBLIND: Theme = {
  name: 'colorblind',
  background: '#050505',
  foreground: '#f8f7f5',
  accent: '#ffd966',
  danger: '#00a2ff',
  success: '#70e0a0',
  hud: 'rgba(10, 10, 10, 0.65)',
};

export const THEMES = [HIGH_CONTRAST, COLORBLIND];

export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--fg', theme.foreground);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--danger', theme.danger);
  root.style.setProperty('--success', theme.success);
  root.style.setProperty('--hud', theme.hud);
  document.body.style.background = theme.background;
  document.body.style.color = theme.foreground;
};
