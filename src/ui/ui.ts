export type UIButton = {
  kind?: 'button';
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  visible: () => boolean;
  onClick: () => void;
};

export type UICheckbox = {
  kind: 'checkbox';
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  visible: () => boolean;
  checked: () => boolean;
  onToggle: (value: boolean) => void;
};

type UIElement = UIButton | UICheckbox;

export type SettingsKey = 'vibration' | 'fx' | 'lowPower';

export type UISettings = {
  vibration: boolean;
  fx: boolean;
  lowPower: boolean;
};

const STORAGE_KEYS: Record<SettingsKey, string> = {
  vibration: 'br_vibe',
  fx: 'br_fx',
  lowPower: 'br_lowpower',
};

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === '1';
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(key: string, value: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore storage errors (private mode, quota, etc)
  }
}

let settings: UISettings = {
  vibration: readStoredBoolean(STORAGE_KEYS.vibration, true),
  fx: readStoredBoolean(STORAGE_KEYS.fx, true),
  lowPower: readStoredBoolean(STORAGE_KEYS.lowPower, false),
};

type SettingsListener = (next: UISettings, key: SettingsKey) => void;

const listeners: SettingsListener[] = [];

export function getSettings(): UISettings {
  return settings;
}

function emitSettings(key: SettingsKey) {
  const snapshot: UISettings = { ...settings };
  for (const listener of listeners) listener(snapshot, key);
}

export function setSetting(key: SettingsKey, value: boolean) {
  if (settings[key] === value) return;
  settings = { ...settings, [key]: value };
  writeStoredBoolean(STORAGE_KEYS[key], value);
  emitSettings(key);
}

export function toggleSetting(key: SettingsKey) {
  setSetting(key, !settings[key]);
}

export function onSettingsChanged(listener: SettingsListener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

const elements: UIElement[] = [];
let registerHook: ((el: UIElement) => void) | null = null;

export function initUI(register: (el: UIElement) => void) {
  elements.length = 0;
  registerHook = register;
}

export function registerButton(btn: UIButton) {
  elements.push(btn);
  registerHook?.(btn);
}

export function registerCheckbox(checkbox: UICheckbox) {
  elements.push(checkbox);
  registerHook?.(checkbox);
}

export function drawUI(ctx: CanvasRenderingContext2D) {
  for (const el of elements) {
    if (!el.visible()) continue;
    ctx.save();
    ctx.beginPath();
    const r = Math.min(12, Math.min(el.w, el.h) * 0.3);
    roundedRect(ctx, el.x, el.y, el.w, el.h, r);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(230, 240, 255, 0.45)';
    ctx.stroke();

    if ((el as UICheckbox).kind === 'checkbox') {
      const checkbox = el as UICheckbox;
      const boxSize = Math.min(checkbox.h - 12, 24);
      const boxX = checkbox.x + 14;
      const boxY = checkbox.y + checkbox.h / 2 - boxSize / 2;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(200, 220, 240, 0.9)';
      ctx.strokeRect(boxX, boxY, boxSize, boxSize);
      if (checkbox.checked()) {
        ctx.fillStyle = 'rgba(98, 224, 255, 0.75)';
        ctx.fillRect(boxX + 2, boxY + 2, boxSize - 4, boxSize - 4);
        ctx.strokeStyle = '#012639';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(boxX + boxSize * 0.25, boxY + boxSize * 0.55);
        ctx.lineTo(boxX + boxSize * 0.45, boxY + boxSize * 0.75);
        ctx.lineTo(boxX + boxSize * 0.75, boxY + boxSize * 0.28);
        ctx.stroke();
      }

      ctx.fillStyle = '#e8f4ff';
      ctx.font = 'bold 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textX = boxX + boxSize + 12;
      ctx.fillText(checkbox.label, textX, checkbox.y + checkbox.h / 2);
    } else {
      const btn = el as UIButton;
      ctx.fillStyle = '#e8f4ff';
      const fontSize = btn.h >= 44 ? 18 : 16;
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
    ctx.restore();
  }
}

export function hitUI(x: number, y: number): boolean {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!el.visible()) continue;
    if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) {
      if ((el as UICheckbox).kind === 'checkbox') {
        const checkbox = el as UICheckbox;
        checkbox.onToggle(!checkbox.checked());
      } else {
        (el as UIButton).onClick();
      }
      return true;
    }
  }
  return false;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
