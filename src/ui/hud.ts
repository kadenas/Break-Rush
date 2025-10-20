import { createButton } from './buttons';
import { WorldSnapshot } from '../game/world';

export class Hud {
  readonly element: HTMLDivElement;
  private scoreLabel: HTMLDivElement;
  private hiScoreLabel: HTMLDivElement;
  private multiplierLabel: HTMLDivElement;
  private statusLabel: HTMLDivElement;
  private pauseButton: HTMLButtonElement;
  private retryButton: HTMLButtonElement;

  constructor(onPause: () => void, onRetry: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'ui-layer';

    const topRow = document.createElement('div');
    topRow.className = 'ui-row';
    this.scoreLabel = document.createElement('div');
    this.scoreLabel.setAttribute('role', 'status');
    this.scoreLabel.style.fontSize = '22px';
    this.scoreLabel.style.fontWeight = '700';
    this.scoreLabel.style.color = 'var(--accent, #0bd7ff)';
    this.hiScoreLabel = document.createElement('div');
    this.hiScoreLabel.style.fontSize = '18px';
    this.hiScoreLabel.style.opacity = '0.9';
    topRow.append(this.scoreLabel, this.hiScoreLabel);

    const pauseRow = document.createElement('div');
    pauseRow.className = 'ui-row';
    this.multiplierLabel = document.createElement('div');
    this.multiplierLabel.style.fontSize = '20px';
    this.multiplierLabel.style.fontWeight = '600';
    this.statusLabel = document.createElement('div');
    this.statusLabel.style.fontSize = '18px';
    pauseRow.append(this.multiplierLabel, this.statusLabel);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'ui-row';
    this.pauseButton = createButton('Pause', onPause);
    this.retryButton = createButton('Retry', onRetry);
    bottomRow.append(this.pauseButton, this.retryButton);

    this.element.append(topRow, pauseRow, bottomRow);
  }

  mount(parent: HTMLElement): void {
    parent.append(this.element);
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'flex' : 'none';
  }

  setPaused(paused: boolean): void {
    this.pauseButton.textContent = paused ? 'Resume' : 'Pause';
  }

  update(snapshot: WorldSnapshot, hiScore: number): void {
    this.scoreLabel.textContent = `Score ${snapshot.score.score.toLocaleString()}`;
    this.hiScoreLabel.textContent = `Best ${hiScore.toLocaleString()}`;
    this.multiplierLabel.textContent = `x${snapshot.score.multiplier.toFixed(1)}`;
    const shield = snapshot.player.shield;
    const shieldText = shield > 0 ? `${shield}× Shield` : '';
    const slowText = snapshot.slowFactor < 1 ? 'Slow-mo' : '';
    this.statusLabel.textContent = [shieldText, slowText].filter(Boolean).join(' · ');
  }

  enableRetry(enabled: boolean): void {
    this.retryButton.disabled = !enabled;
  }
}
