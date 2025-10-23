export class DifficultyManager {
  level = 1;
  elapsed = 0;
  baseSpeedMul = 1;
  currentSpeedMul = 1;
  currentSpawnIntervalMs = 1000; // milisegundos entre spawns
  levelUpScore = 500; // puntos necesarios para subir nivel

  update(dt: number, score: number) {
    this.elapsed += dt;

    // Subida de nivel más lenta: 1 nivel cada 500 puntos o cada 40 s aprox
    const targetLevel = 1 + Math.floor(Math.max(score / this.levelUpScore, this.elapsed / 40));
    if (targetLevel > this.level) {
      this.level = targetLevel;
    }

    // Velocidad sube más suave: curva logarítmica controlada
    this.baseSpeedMul = 1 + Math.log10(this.level + 1) * 0.25;

    // Interpolación lenta
    this.currentSpeedMul += (this.baseSpeedMul - this.currentSpeedMul) * 0.03;

    // Spawn interval también más amable
    const minInterval = 400; // ms
    const targetInterval = 1000 - this.level * 20;
    this.currentSpawnIntervalMs = Math.max(minInterval, targetInterval);
  }

  reset(): void {
    this.level = 1;
    this.elapsed = 0;
    this.baseSpeedMul = 1;
    this.currentSpeedMul = 1;
    this.currentSpawnIntervalMs = 1000;
  }

  get waveIntensity(): number {
    return 0;
  }
}
