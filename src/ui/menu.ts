import { createButton } from './buttons';
import { OptionsPanel } from './options';

export type MenuView = 'menu' | 'pause' | 'gameover';

export interface MenuCallbacks {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
}

export class MenuOverlay {
  readonly element: HTMLDivElement;
  private content: HTMLDivElement;
  private optionsPanel: OptionsPanel;
  private resumeButton: HTMLButtonElement;
  private startButton: HTMLButtonElement;
  private restartButton: HTMLButtonElement;
  private title: HTMLHeadingElement;
  private subtitle: HTMLParagraphElement;

  constructor(parent: HTMLElement, optionsPanel: OptionsPanel, callbacks: MenuCallbacks) {
    this.optionsPanel = optionsPanel;
    this.element = document.createElement('div');
    this.element.className = 'ui-layer';
    this.element.style.backdropFilter = 'blur(12px)';
    this.element.style.background = 'rgba(2, 8, 16, 0.65)';
    this.element.style.alignItems = 'center';
    this.element.style.justifyContent = 'center';

    this.content = document.createElement('div');
    this.content.className = 'dialog';
    this.title = document.createElement('h1');
    this.title.textContent = 'Break Rush';
    this.title.style.marginTop = '0';
    this.subtitle = document.createElement('p');
    this.subtitle.textContent = 'Dodge and weave to survive the rush.';

    this.startButton = createButton('Play', callbacks.onStart);
    this.resumeButton = createButton('Resume', callbacks.onResume);
    this.restartButton = createButton('Retry', callbacks.onRestart);

    const buttonWrap = document.createElement('div');
    buttonWrap.style.display = 'flex';
    buttonWrap.style.flexDirection = 'column';
    buttonWrap.style.gap = '12px';
    buttonWrap.append(this.startButton, this.resumeButton, this.restartButton);

    const description = document.createElement('p');
    description.innerHTML = 'Drag to move. Tap two fingers to pause. Collect orbs and power-ups to survive.';
    description.style.fontSize = '16px';
    description.style.lineHeight = '1.4';

    this.content.append(this.title, this.subtitle, description, buttonWrap, this.optionsPanel.element);
    this.element.append(this.content);
    parent.append(this.element);
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? 'flex' : 'none';
  }

  show(view: MenuView, score?: number, best?: number): void {
    this.setVisible(true);
    this.startButton.style.display = view === 'menu' ? 'block' : 'none';
    this.resumeButton.style.display = view === 'pause' ? 'block' : 'none';
    this.restartButton.style.display = view === 'pause' || view === 'gameover' ? 'block' : 'none';
    this.optionsPanel.element.style.marginTop = view === 'gameover' ? '24px' : '16px';
    if (view === 'gameover') {
      this.title.textContent = 'Game Over';
      const scoreText = score !== undefined ? `Score ${Math.floor(score).toLocaleString()}` : '';
      const bestText = best !== undefined ? `Best ${Math.floor(best).toLocaleString()}` : '';
      this.subtitle.textContent = [scoreText, bestText].filter(Boolean).join(' · ');
    } else if (view === 'pause') {
      this.title.textContent = 'Paused';
      this.subtitle.textContent = 'Take a breather.';
    } else {
      this.title.textContent = 'Break Rush';
      this.subtitle.textContent = 'Dodge and weave to survive the rush.';
    }
  }
}
