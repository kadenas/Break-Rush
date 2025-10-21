export type UIButton = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string | (() => string);
  visible: () => boolean;
  onClick: () => void;
};

const buttons: UIButton[] = [];

export function registerButton(btn: UIButton) {
  buttons.push(btn);
}

export function clearButtons() {
  buttons.length = 0;
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
    const text = typeof b.label === 'function' ? b.label() : b.label;
    ctx.fillStyle = '#e9f3ff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }
}

export function hitUI(x: number, y: number): boolean {
  for (const b of buttons) {
    if (!b.visible()) continue;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.onClick();
      return true;
    }
  }
  return false;
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
