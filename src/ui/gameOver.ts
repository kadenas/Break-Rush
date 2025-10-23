import '../styles/gameover.css';
import { shareScore } from '../share';

type GameOverHandlers = {
  onRetry: () => void;
  onMenu: () => void;
};

let root: HTMLDivElement | null = null;
let elScore: HTMLElement | null = null;

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
  const share = document.getElementById('go-share') as HTMLButtonElement;
  const menu  = document.getElementById('go-menu')  as HTMLButtonElement;

  retry.addEventListener('click', h.onRetry);
  menu.addEventListener('click', h.onMenu);
  share.addEventListener('click', () => {
    const pts = parseInt(elScore?.dataset.points ?? '0', 10) || 0;
    shareScore(pts);
  });
}

export function showGameOver(points: number, rankText: string) {
  if (!root) return;
  // Rellenar texto y guardar puntos para Share
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
