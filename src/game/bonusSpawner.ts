import { Bonus, createBonus, renderBonus, updateBonus } from '../entities/bonus';
import { getGameBounds } from './bounds';
import { applySpeedModifier, gameDifficulty, getGlobalSpeedMul, getSpeedModifier } from './spawner';
import { playMessage } from '../fx/messages';
import { activateShield, Player } from './player';
import { triggerBonusFeedback } from '../fx/feedback';

const ACTIVE_BONUSES: Bonus[] = [];
let spawnTimer = 0;

const SCORE_BONUS_VALUE = 50;
const SLOW_FACTOR = 0.65;
const SLOW_DURATION = 3.5;
const SHIELD_DURATION = 6;

export function resetBonuses(): void {
  ACTIVE_BONUSES.length = 0;
  spawnTimer = 0;
}

export function updateBonuses(
  dt: number,
  player: Player,
  addScore: (amount: number) => void,
): void {
  spawnTimer += dt;

  const level = Math.max(1, gameDifficulty.level);
  const chance = 0.002 + Math.min(0.015, level * 0.001);
  if (spawnTimer > 2 && Math.random() < chance) {
    spawnTimer = 0;
    const bounds = getGameBounds();
    const margin = 20;
    const x = Math.random() * (bounds.width - margin * 2) + margin;
    const y = -20;
    const bonus = createBonus(x, y, getGlobalSpeedMul());
    ACTIVE_BONUSES.push(bonus);
  }

  const movementDt = dt * getSpeedModifier();

  for (const bonus of ACTIVE_BONUSES) {
    updateBonus(bonus, movementDt);
  }

  for (const bonus of ACTIVE_BONUSES) {
    if (!bonus.active) continue;
    const dx = player.x - bonus.x;
    const dy = player.y - bonus.y;
    const rr = (player.r + bonus.r) ** 2;
    if (dx * dx + dy * dy <= rr) {
      bonus.active = false;
      triggerBonusEffect(bonus, player, addScore);
    }
  }

  const bounds = getGameBounds();
  for (let i = ACTIVE_BONUSES.length - 1; i >= 0; i--) {
    const bonus = ACTIVE_BONUSES[i];
    if (!bonus.active || bonus.y > bounds.height + 40) {
      ACTIVE_BONUSES.splice(i, 1);
    }
  }
}

function triggerBonusEffect(bonus: Bonus, player: Player, addScore: (amount: number) => void) {
  switch (bonus.type) {
    case 'score':
      addScore(SCORE_BONUS_VALUE);
      playMessage('¡Bonus de oro!');
      break;
    case 'shield':
      activateShield(player, SHIELD_DURATION);
      playMessage('¡Escudo activado!');
      break;
    case 'slowmo':
      applySpeedModifier(SLOW_FACTOR, SLOW_DURATION);
      playMessage('¡Tiempo lento!');
      break;
  }
  triggerBonusFeedback(player);
}

export function renderBonuses(ctx: CanvasRenderingContext2D): void {
  for (const bonus of ACTIVE_BONUSES) {
    renderBonus(ctx, bonus);
  }
}
