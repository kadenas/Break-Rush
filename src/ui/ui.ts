export type UILabel = string | (() => string);

export type UIButton = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: UILabel;
  visible: () => boolean;
  onClick: () => void;
};

const buttons: UIButton[] = [];

export interface UIDebugSettings {
  lowPower: boolean;
}

let debugSettings: UIDebugSettings = { lowPower: false };

export function registerButton(btn: UIButton) {
  buttons.push(btn);
}

export function clearButtons() {
  buttons.length = 0;
}

export function updateSettingsSnapshot(partial: Partial<UIDebugSettings>) {
  debugSettings = { ...debugSettings, ...partial };
}

export function getSettings(): UIDebugSettings {
  return debugSettings;
}

export function drawUI(ctx: CanvasRenderingContext2D) {
  for (const b of buttons) {
    if (!b.visible()) continue;
    const r = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, b.x, b.y, b.w, b.h, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#e9f3ff';
    const text = resolveLabel(b.label);
    ctx.font = (b.h > 40 ? 'bold 20px ' : 'bold 16px ') + 'system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }
}

export function hitUI(x: number, y: number): boolean {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (!b.visible()) continue;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.onClick();
      return true;
    }
  }
  return false;
}

function resolveLabel(label: UILabel): string {
  return typeof label === 'function' ? label() : label;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
