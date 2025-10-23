export type DifficultyConfig = {
  baseSpawnIntervalMs: number;
  minSpawnIntervalMs: number;
  baseSpeedMul: number;
  maxSpeedMul: number;

  secondsPerStep: number;
  spawnIntervalFactorPerStep: number;
  speedMulPerStep: number;

  scorePerStep: number;
  spawnIntervalFactorPerScoreStep: number;
  speedMulPerScoreStep: number;

  wavePeriodSec: number;
  waveEaseDownRatio: number;
  waveCalmSpawnBoost: number;
  waveCalmSpeedDrop: number;
};

export class DifficultyManager {
  private cfg: DifficultyConfig;
  private timeTotal = 0;
  private scoreTotal = 0;

  private stepsByTime = 0;
  private stepsByScore = 0;

  constructor(cfg?: Partial<DifficultyConfig>) {
    this.cfg = {
      baseSpawnIntervalMs: 900,
      minSpawnIntervalMs: 350,
      baseSpeedMul: 1,
      maxSpeedMul: 2.2,

      secondsPerStep: 6,
      spawnIntervalFactorPerStep: 0.975,
      speedMulPerStep: 0.025,

      scorePerStep: 120,
      spawnIntervalFactorPerScoreStep: 0.985,
      speedMulPerScoreStep: 0.015,

      wavePeriodSec: 32,
      waveEaseDownRatio: 0.28,
      waveCalmSpawnBoost: 1.12,
      waveCalmSpeedDrop: 0.06,
      ...cfg,
    };
  }

  update(dt: number, score: number) {
    this.timeTotal += dt;

    const newStepsByTime = Math.floor(this.timeTotal / this.cfg.secondsPerStep);
    if (newStepsByTime > this.stepsByTime) {
      this.stepsByTime = newStepsByTime;
    }

    if (score > this.scoreTotal) {
      this.scoreTotal = score;
    }
    const newStepsByScore = Math.floor(this.scoreTotal / this.cfg.scorePerStep);
    if (newStepsByScore > this.stepsByScore) {
      this.stepsByScore = newStepsByScore;
    }
  }

  reset(): void {
    this.timeTotal = 0;
    this.scoreTotal = 0;
    this.stepsByTime = 0;
    this.stepsByScore = 0;
  }

  get level(): number {
    return 1 + this.stepsByTime + this.stepsByScore;
  }

  get currentSpawnIntervalMs(): number {
    const { baseSpawnIntervalMs, minSpawnIntervalMs } = this.cfg;

    const factorTime = Math.pow(this.cfg.spawnIntervalFactorPerStep, this.stepsByTime);
    const factorScore = Math.pow(this.cfg.spawnIntervalFactorPerScoreStep, this.stepsByScore);

    let interval = baseSpawnIntervalMs * factorTime * factorScore;

    interval *= this.getWaveCalmFactorForSpawn();

    return Math.max(minSpawnIntervalMs, Math.floor(interval));
  }

  get currentSpeedMul(): number {
    let mul =
      this.cfg.baseSpeedMul +
      this.stepsByTime * this.cfg.speedMulPerStep +
      this.stepsByScore * this.cfg.speedMulPerScoreStep;

    mul -= this.getWaveCalmDropForSpeed();

    return Math.min(this.cfg.maxSpeedMul, mul);
  }

  get waveIntensity(): number {
    const { wavePeriodSec, waveEaseDownRatio } = this.cfg;
    if (wavePeriodSec <= 0) return 1;
    const calmSec = wavePeriodSec * Math.max(0, Math.min(1, waveEaseDownRatio));
    const activeDuration = wavePeriodSec - calmSec;
    if (activeDuration <= 0) return 1;
    const t = this.timeTotal % wavePeriodSec;
    if (t < calmSec) return 0;
    const normalized = (t - calmSec) / activeDuration;
    return Math.min(1, Math.max(0, normalized));
  }

  private getWaveCalmFactorForSpawn(): number {
    const { wavePeriodSec, waveEaseDownRatio, waveCalmSpawnBoost } = this.cfg;
    if (wavePeriodSec <= 0 || waveEaseDownRatio <= 0) return 1;
    const t = this.timeTotal % wavePeriodSec;
    const calmSec = wavePeriodSec * waveEaseDownRatio;
    return t < calmSec ? waveCalmSpawnBoost : 1;
  }

  private getWaveCalmDropForSpeed(): number {
    const { wavePeriodSec, waveEaseDownRatio, waveCalmSpeedDrop } = this.cfg;
    if (wavePeriodSec <= 0 || waveEaseDownRatio <= 0) return 0;
    const t = this.timeTotal % wavePeriodSec;
    const calmSec = wavePeriodSec * waveEaseDownRatio;
    return t < calmSec ? waveCalmSpeedDrop : 0;
  }
}
