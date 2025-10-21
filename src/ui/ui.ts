export type UIButton = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  visible: () => boolean;
  onClick: () => void;
};

const buttons: UIButton[] = [];
let registerHook: ((btn: UIButton) => void) | null = null;

export function initUI(register: (btn: UIButton) => void) {
  buttons.length = 0;
  registerHook = register;
}

export function registerButton(btn: UIButton) {
  buttons.push(btn);
  registerHook?.(btn);
}

export function drawUI(ctx: CanvasRenderingContext2D) {
  for (const btn of buttons) {
    if (!btn.visible()) continue;
    const r = Math.min(12, Math.min(btn.w, btn.h) * 0.3);
    ctx.save();
    ctx.beginPath();
    roundedRect(ctx, btn.x, btn.y, btn.w, btn.h, r);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(230, 240, 255, 0.45)';
    ctx.stroke();

    ctx.fillStyle = '#e8f4ff';
    const fontSize = btn.h >= 44 ? 18 : 16;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }
}

export function hitUI(x: number, y: number): boolean {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const btn = buttons[i];
    if (!btn.visible()) continue;
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.onClick();
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
