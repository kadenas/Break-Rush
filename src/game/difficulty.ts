export class DifficultyManager {
  level = 1;
  elapsed = 0;
  baseSpeedMul = 1;
  currentSpeedMul = 1;
  currentSpawnIntervalMs = 1000; // ms entre spawns
  levelUpScore = 500;            // puntos por nivel

  update(dt: number, score: number) {
    this.elapsed += dt;

    // Subida de nivel pausada: cada 500 pts o ~40 s (lo que antes ocurra)
    const byScore = Math.floor(score / this.levelUpScore) + 1;
    const byTime  = Math.floor(this.elapsed / 40) + 1;
    const targetLevel = Math.max(byScore, byTime);
    if (targetLevel > this.level) {
      this.level = targetLevel;
    }

    // Velocidad suave (log): crece poco al inicio, más tarde empuja
    this.baseSpeedMul = 1 + Math.log10(this.level + 1) * 0.25;

    // Aproximación lenta para evitar tirones
    this.currentSpeedMul += (this.baseSpeedMul - this.currentSpeedMul) * 0.03;

    // Frecuencia de spawn amable y nunca por debajo del mínimo
    const minInterval = 400; // ms
    const targetInterval = 1000 - (this.level * 20);
    this.currentSpawnIntervalMs = Math.max(minInterval, targetInterval);
  }

  reset(): void {
    this.level = 1;
    this.elapsed = 0;
    this.baseSpeedMul = 1;
    this.currentSpeedMul = 1;
    this.currentSpawnIntervalMs = 1000;
  }
}
