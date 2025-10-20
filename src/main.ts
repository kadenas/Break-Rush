import './styles.css';
import { createRng } from './core/rng';
import { GameLoop } from './core/loop';
import { StateMachine } from './core/state';
import { AudioSystem } from './engine/audio';
import { CanvasSurface, setPageInteractive } from './engine/canvas';
import { Haptics } from './engine/haptics';
import { InputSystem } from './engine/input';
import { GameWorld } from './game/world';
import { registerServiceWorker } from './pwa/registerSW';
import { loadHighScore, saveHighScore } from './storage/highscore';
import { loadSettings, saveSettings, Settings } from './storage/settings';
import { applyTheme, THEMES } from './ui/theme';
import { OptionsPanel } from './ui/options';
import { MenuOverlay } from './ui/menu';
import { Hud } from './ui/hud';

const app = document.getElementById('app');
if (!app) {
  throw new Error('App root missing');
}

const wrapper = document.createElement('div');
wrapper.className = 'canvas-wrapper';
app.appendChild(wrapper);

const surface = new CanvasSurface();
wrapper.appendChild(surface.canvas);

const audio = new AudioSystem();
const haptics = new Haptics();
const rng = createRng(Date.now());
const input = new InputSystem(surface.canvas);
const world = new GameWorld({ rng, audio, haptics, input });
const state = new StateMachine();

let settings: Settings = loadSettings();
applyTheme(THEMES.find((theme) => theme.name === settings.theme) ?? THEMES[0]);
audio.setMuted(!settings.sound);
haptics.setEnabled(settings.haptics);
input.setControlMode(settings.controlMode);

const optionsPanel = new OptionsPanel(settings, {
  onTheme: (theme) => {
    settings.theme = theme;
    applyTheme(THEMES.find((t) => t.name === theme) ?? THEMES[0]);
    saveSettings(settings);
  },
  onSound: (enabled) => {
    settings.sound = enabled;
    audio.setMuted(!enabled);
    saveSettings(settings);
  },
  onHaptics: (enabled) => {
    settings.haptics = enabled;
    haptics.setEnabled(enabled);
    saveSettings(settings);
  },
  onControl: (mode) => {
    settings.controlMode = mode;
    input.setControlMode(mode);
    saveSettings(settings);
  },
});

const hud = new Hud(
  () => {
    if (state.value === 'playing') {
      state.transition('pause');
    } else {
      state.transition('playing');
    }
  },
  () => {
    startGame();
  }
);
hud.mount(wrapper);
hud.setVisible(false);

const menu = new MenuOverlay(wrapper, optionsPanel, {
  onStart: () => startGame(),
  onResume: () => state.transition('playing'),
  onRestart: () => startGame(),
});

let hiScore = loadHighScore();
let snapshot = world.snapshot();

state.onChange((next) => {
  switch (next) {
    case 'menu':
      menu.show('menu');
      hud.setVisible(false);
      input.setEnabled(false);
      setPageInteractive(false);
      break;
    case 'playing':
      menu.setVisible(false);
      hud.setVisible(true);
      hud.setPaused(false);
      input.setEnabled(true);
      setPageInteractive(true);
      break;
    case 'pause':
      menu.show('pause');
      hud.setPaused(true);
      input.setEnabled(false);
      setPageInteractive(false);
      break;
    case 'gameover':
      menu.show('gameover', snapshot.score.score, hiScore);
      hud.setPaused(true);
      input.setEnabled(false);
      setPageInteractive(false);
      break;
  }
});

const loop = new GameLoop(
  (dt) => {
    if (state.value !== 'playing') return;
    if (input.consumePauseRequest()) {
      state.transition('pause');
      return;
    }
    const gameOver = world.update(dt);
    snapshot = world.snapshot();
    hud.update(snapshot, hiScore);
    if (gameOver) {
      hiScore = Math.max(hiScore, snapshot.score.score);
      saveHighScore(hiScore);
      state.transition('gameover');
    }
  },
  (alpha) => {
    world.render(surface.ctx, alpha);
    if (state.value !== 'playing') {
      snapshot = world.snapshot();
      hud.update(snapshot, hiScore);
    }
  }
);

loop.start();
state.transition('menu');

let autoPaused = false;

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.value === 'playing') {
    autoPaused = true;
    state.transition('pause');
  } else if (!document.hidden && autoPaused && state.value === 'pause') {
    autoPaused = false;
  }
});

input.addEventListener('pause', () => {
  if (state.value === 'playing') {
    state.transition('pause');
  }
});

function startGame() {
  world.reset();
  snapshot = world.snapshot();
  hud.update(snapshot, hiScore);
  state.transition('playing');
}

registerServiceWorker();
