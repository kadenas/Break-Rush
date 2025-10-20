import type { CanvasDimensions } from '../engine/canvas';
import type { SettingsData } from '../storage/settings';
import type { ThemeColors } from '../ui/theme';
import type { GameStateName } from '../game/types';
import { drawEnemy, drawOrb, drawParticles, drawPlayer, drawPowerUp } from './entities';
import type { GameWorld } from '../game/world';

export interface UIButton {
  id: 'pause' | 'retry';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  visible: boolean;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(_canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  draw(
    state: GameStateName,
    world: GameWorld,
    theme: ThemeColors,
    settings: SettingsData,
    dimensions: CanvasDimensions
  ): UIButton[] {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(dimensions.scale, 0, 0, dimensions.scale, 0, 0);
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    this.drawBackgroundGrid(theme, dimensions);

    drawParticles(ctx, world.particles);
    for (const orb of world.orbs) {
      drawOrb(ctx, orb, theme);
    }
    for (const power of world.powerUps) {
      drawPowerUp(ctx, power, theme);
    }
    for (const enemy of world.enemies) {
      drawEnemy(ctx, enemy, theme);
    }
    drawPlayer(ctx, world.player, theme, world.haloIntensity);

    const buttons = this.drawHud(state, world, theme, settings, dimensions);
    ctx.restore();
    return buttons;
  }

  private drawBackgroundGrid(theme: ThemeColors, dimensions: CanvasDimensions): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.4;
    const size = 32;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < dimensions.width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }
    for (let y = 0; y < dimensions.height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHud(
    state: GameStateName,
    world: GameWorld,
    theme: ThemeColors,
    settings: SettingsData,
    dimensions: CanvasDimensions
  ): UIButton[] {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = theme.foreground;
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (world.metrics.dangerTime > 0) {
      const intensity = Math.min(1, world.metrics.dangerTime * 1.5);
      ctx.save();
      ctx.globalAlpha = 0.2 + intensity * 0.4;
      ctx.fillStyle = theme.caution;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      ctx.restore();
    }

    ctx.fillText(`Puntaje: ${Math.floor(world.metrics.score).toString()}`, 12, 12);
    ctx.fillText(`Combo x${world.metrics.multiplier.toFixed(1)}`, 12, 32);
    ctx.fillText(`Vidas: ${world.metrics.lives}`, 12, 52);
    ctx.fillText(`Récord: ${world.metrics.highScore}`, 12, 72);

    if (world.player.slowTime > 0) {
      ctx.fillStyle = theme.accentSecondary;
      ctx.fillText(`Tiempo lento: ${world.player.slowTime.toFixed(1)}s`, 12, 92);
    }

    const buttons: UIButton[] = [];
    const pauseButton: UIButton = {
      id: 'pause',
      x: dimensions.width - 110,
      y: 18,
      width: 96,
      height: 36,
      label: state === 'pause' ? 'Reanudar' : 'Pausa',
      visible: state === 'playing' || state === 'pause'
    };
    this.drawButton(pauseButton, theme, state === 'pause');
    buttons.push(pauseButton);

    if (state === 'menu') {
      this.drawMenu(theme, settings, dimensions);
    } else if (state === 'pause') {
      this.drawPauseOverlay(theme, 'Juego en pausa', dimensions);
    } else if (state === 'gameover') {
      this.drawPauseOverlay(theme, '¡Game Over!', dimensions);
    }

    const retryVisible = state === 'gameover' || state === 'pause';
    const retryButton: UIButton = {
      id: 'retry',
      x: dimensions.width / 2 - 80,
      y: dimensions.height - 90,
      width: 160,
      height: 54,
      label: 'Reintentar',
      visible: retryVisible
    };
    if (retryVisible) {
      this.drawButton(retryButton, theme, false);
    }
    buttons.push(retryButton);

    ctx.restore();
    return buttons;
  }

  private drawButton(button: UIButton, theme: ThemeColors, emphasized: boolean): void {
    if (!button.visible) {
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = emphasized ? theme.accentSecondary : theme.accent;
    ctx.globalAlpha = emphasized ? 0.9 : 0.75;
    ctx.beginPath();
    const radius = 12;
    ctx.moveTo(button.x + radius, button.y);
    ctx.lineTo(button.x + button.width - radius, button.y);
    ctx.quadraticCurveTo(button.x + button.width, button.y, button.x + button.width, button.y + radius);
    ctx.lineTo(button.x + button.width, button.y + button.height - radius);
    ctx.quadraticCurveTo(
      button.x + button.width,
      button.y + button.height,
      button.x + button.width - radius,
      button.y + button.height
    );
    ctx.lineTo(button.x + radius, button.y + button.height);
    ctx.quadraticCurveTo(button.x, button.y + button.height, button.x, button.y + button.height - radius);
    ctx.lineTo(button.x, button.y + radius);
    ctx.quadraticCurveTo(button.x, button.y, button.x + radius, button.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.foreground;
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2 + 1);
    ctx.restore();
  }

  private drawMenu(theme: ThemeColors, settings: SettingsData, dimensions: CanvasDimensions): void {
    const ctx = this.ctx;
    ctx.save();
    this.drawPauseOverlay(theme, 'Break Rush', dimensions);
    ctx.fillStyle = theme.foreground;
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lines = [
      'Arrastra para esquivar. Tap rápido para saltar entre carriles.',
      'Toque con dos dedos para pausar.',
      `Sonido: ${settings.soundEnabled ? 'activado' : 'silenciado'}. Haptics: ${settings.hapticsEnabled ? 'on' : 'off'}.`,
      `Tema actual: ${settings.theme === 'default' ? 'alto contraste' : 'daltonismo'}.`
    ];
    lines.forEach((text, index) => {
      ctx.fillText(text, dimensions.width / 2, dimensions.height / 2 + 50 + index * 24);
    });
    ctx.restore();
  }

  private drawPauseOverlay(theme: ThemeColors, title: string, dimensions: CanvasDimensions): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = theme.pauseOverlay;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = theme.foreground;
    ctx.font = '32px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, dimensions.width / 2, dimensions.height / 2 - 40);
    ctx.restore();
  }
}
