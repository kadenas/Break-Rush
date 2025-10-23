import '../styles/gameover.css';
import { shareScore } from '../share';
import { armAfterScreenChange } from '../input/inputGate';

type GameOverHandlers = {
  onRetry: () => void;
  onMenu: () => void;
};

let root: HTMLDivElement | null = null;
let elScore: HTMLElement | null = null;
let btnShare: HTMLButtonElement | null = null;

export function ensureGameOverDOM(h: GameOverHandlers) {
  if (root) return;

  root = document.createElement('div');
  root.id = 'gameover-screen';
  root.innerHTML = `
    <div class="go-wrap">
      <div class="go-head">
        <h2 class="go-title">GAME OVER</h2>
        <div class="go-stats" id="go-stats"></div>
      </div>
      <div class="go-spacer"></div>
      <div class="go-actions">
        <button id="go-retry" class="go-btn" type="button">Retry</button>
        <button id="go-share" class="go-btn" type="button">Share</button>
        <button id="go-menu"  class="go-btn" type="button">Menu</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  elScore = document.getElementById('go-stats');

  const retry = document.getElementById('go-retry') as HTMLButtonElement;
  btnShare = document.getElementById('go-share') as HTMLButtonElement;
  const menu  = document.getElementById('go-menu')  as HTMLButtonElement;

  retry.addEventListener('click', h.onRetry);
  menu.addEventListener('click', h.onMenu);

  // Handler de Share con “debounce” y deshabilitado temporal
  btnShare.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!btnShare || btnShare.disabled) return;

    btnShare.disabled = true;
    const pts = parseInt(elScore?.dataset.points ?? '0', 10) || 0;
    try {
      await shareScore(pts);
    } finally {
      // reactivamos tras un breve colchón para evitar dobles aperturas
      setTimeout(() => { if (btnShare) btnShare.disabled = false; }, 800);
    }
  });
}

export function showGameOver(points: number, rankText: string) {
  if (!root) return;

  // Armamos el gate ANTES de abrir la pantalla para obligar a levantar el dedo
  armAfterScreenChange();

  if (elScore) {
    elScore.innerHTML = `
      <div><strong>Puntuación:</strong> ${points} pts</div>
      <div>${rankText}</div>
    `;
    elScore.setAttribute('data-points', String(points));
  }
  root.classList.add('is-open');
}

export function hideGameOver() {
  root?.classList.remove('is-open');
}
