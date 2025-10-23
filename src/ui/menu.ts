// src/ui/menu.ts
import '../styles/menu.css';

type Handlers = {
  onStart: () => void;
  onSettings: () => void;
};

function ensureMenuDOM(handlers: Handlers) {
  if (document.getElementById('menu-screen')) return;

  const wrap = document.createElement('div');
  wrap.id = 'menu-screen';
  wrap.innerHTML = `
    <div class="menu-inner">
      <h1 class="title">Break Rush — by Kapitán Jero</h1>
      <div class="actions">
        <button id="btn-start" class="menu-btn" type="button">Start</button>
        <button id="btn-settings" class="menu-btn" type="button">Settings</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const btnStart = document.getElementById('btn-start') as HTMLButtonElement | null;
  const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement | null;

  btnStart?.addEventListener('click', handlers.onStart);
  btnSettings?.addEventListener('click', handlers.onSettings);
}

export function preloadMenuBackground(): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = '/images/start.png';
  });
}

export function showMainMenu(handlers: Handlers) {
  ensureMenuDOM(handlers);
  const menu = document.getElementById('menu-screen');
  menu?.classList.add('is-open');
}

export function hideMainMenu() {
  const menu = document.getElementById('menu-screen');
  menu?.classList.remove('is-open');
}
