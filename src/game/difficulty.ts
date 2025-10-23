export type DifficultyConfig = {
  // Nivel: sube por score o tiempo (el mayor de ambos manda)
  levelUpEveryScore: number;   // puntos por nivel bajo (tramo 1)
  levelUpEverySec: number;     // segundos por nivel bajo (tramo 1)

  // Topes/curvas
  minSpawnMs: number;          // mínimo intervalo de spawn
  baseSpawnMs: number;         // intervalo en nivel 1
  baseSpeedMul: number;        // multiplicador en nivel 1
  maxSpeedMul: number;         // techo absoluto

  // Suavizado temporal
  lerpSpeed: number;           // 0..1 – cuánto se acerca por frame a objetivos
};

export class DifficultyManager {
  private cfg: DifficultyConfig;

  // Estado
  public level = 1;
  private elapsed = 0;
  private lastLevelTarget = 1;
  private pressure = 0;

  // Expuestos al juego
  public currentSpeedMul = 1;
  public currentSpawnIntervalMs = 1000;

  constructor(cfg?: Partial<DifficultyConfig>) {
    this.cfg = {
      levelUpEveryScore: 450,     // antes 500; ajusta al gusto
      levelUpEverySec: 38,        // antes ~40; ritmo humano
      minSpawnMs: 420,
      baseSpawnMs: 1100,
      baseSpeedMul: 1.0,
      maxSpeedMul: 2.0,
      lerpSpeed: 0.04,            // suavizado global
      ...cfg,
    };
    this.currentSpawnIntervalMs = this.cfg.baseSpawnMs;
    this.currentSpeedMul = this.cfg.baseSpeedMul;
  }

  update(dt: number, score: number) {
    this.elapsed += dt;

    // 1) Nivel objetivo por score o tiempo (tomamos el mayor)
    const byScore = Math.floor(score / this.cfg.levelUpEveryScore) + 1;
    const byTime = Math.floor(this.elapsed / this.cfg.levelUpEverySec) + 1;
    const targetLevel = Math.max(byScore, byTime);

    // 2) Curva arcade por tramos (factor de presión)
    // Tramo A: L1–4 muy suave; Tramo B: L5–9 medio;
    // Tramo C: L10+ más duro pero con cap.
    const L = targetLevel;
    let pressure; // 0..1 aprox
    if (L <= 4) {
      // suave, casi lineal
      pressure = (L - 1) / 12;               // 0..0.25
    } else if (L <= 9) {
      // medio
      pressure = 0.25 + ((L - 4) / 10);      // 0.25..0.75
    } else {
      // alto: saturación progresiva con log
      pressure = 0.75 + Math.min(0.25, Math.log2(L - 8) / 6); // máx ~1.0
    }

    this.pressure = clamp(pressure, 0, 1);

    // 3) Objetivos derivados de la presión
    const targetSpeedMul = clamp(
      this.cfg.baseSpeedMul + this.pressure * (this.cfg.maxSpeedMul - this.cfg.baseSpeedMul),
      this.cfg.baseSpeedMul,
      this.cfg.maxSpeedMul,
    );

    // spawn cae desde baseSpawnMs hacia minSpawnMs con la presión
    const targetSpawnMs = Math.max(
      this.cfg.minSpawnMs,
      Math.floor(this.cfg.baseSpawnMs - this.pressure * (this.cfg.baseSpawnMs - this.cfg.minSpawnMs)),
    );

    // 4) Suavizado
    const k = this.cfg.lerpSpeed;
    this.currentSpeedMul += (targetSpeedMul - this.currentSpeedMul) * k;
    this.currentSpawnIntervalMs += (targetSpawnMs - this.currentSpawnIntervalMs) * k;

    // 5) Nivel visible también suavizado (evita saltos de HUD)
    if (targetLevel > this.lastLevelTarget) {
      this.level += 1; // subimos de 1 en 1 como buen arcade
      this.lastLevelTarget = targetLevel;
    }
  }

  reset(): void {
    this.level = 1;
    this.elapsed = 0;
    this.lastLevelTarget = 1;
    this.pressure = 0;
    this.currentSpeedMul = this.cfg.baseSpeedMul;
    this.currentSpawnIntervalMs = this.cfg.baseSpawnMs;
  }

  get waveIntensity(): number {
    return this.pressure;
  }
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
