export type DoubleTapOpts = {
  timeoutMs?: number;
  onArm?: (el: HTMLElement) => void;
  onDisarm?: (el: HTMLElement) => void;
};

export function makeDoubleTap(
  el: HTMLElement,
  handler: (ev: Event) => void,
  opts: DoubleTapOpts = {},
) {
  const timeout = opts.timeoutMs ?? 1200;
  let armed = false;
  let t: number | null = null;

  const disarm = () => {
    armed = false;
    if (t) {
      window.clearTimeout(t);
      t = null;
    }
    opts.onDisarm?.(el);
  };

  el.addEventListener('pointerup', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!armed) {
      armed = true;
      opts.onArm?.(el);
      if (t) window.clearTimeout(t);
      t = window.setTimeout(disarm, timeout);
      return;
    }

    disarm();
    handler(ev);
  });

  el.addEventListener('blur', disarm);
}
