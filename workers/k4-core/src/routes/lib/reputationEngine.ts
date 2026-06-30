import { CareMetrics, CareUpdate, ReputationConfig } from './types';

const DEFAULT_CONFIG: ReputationConfig = {
  halfLifeSeconds: 30 * 24 * 60 * 60,
  floor: 0.1,
  weights: { biometric: 0.4, bond: 0.4, ledger: 0.2 },
};

const MAX_CLOCK_DRIFT = 60;
const MAX_TIMESTAMP_AGE = 30 * 24 * 60 * 60;

export class ReputationEngine {
  private config: ReputationConfig;
  private lambda: number;

  constructor(config: Partial<ReputationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lambda = Math.LN2 / this.config.halfLifeSeconds;
  }

  public computeConfidence(interactionCount: number): number {
    if (interactionCount <= 0) return 0;
    return Math.min(1.0, 1 - 1 / (1 + interactionCount / 20));
  }

  public calculateDecay(currentScore: number, elapsedSeconds: number, confidence: number = 1.0): number {
    if (elapsedSeconds <= 0) return currentScore;
    const confidenceMultiplier = 1 + 0.5 * (1 - confidence);
    const adjustedLambda = this.lambda / confidenceMultiplier;
    const decayed = currentScore * Math.exp(-adjustedLambda * elapsedSeconds);
    return Math.max(decayed, this.config.floor);
  }

  public validateTimestamp(timestamp: number, nowSeconds: number): void {
    if (timestamp > nowSeconds + MAX_CLOCK_DRIFT) {
      throw new Error(`Timestamp ${timestamp} is in the future (${nowSeconds}).`);
    }
    if (timestamp < nowSeconds - MAX_TIMESTAMP_AGE) {
      throw new Error(`Timestamp ${timestamp} is more than ${MAX_TIMESTAMP_AGE / 86400} days in the past.`);
    }
  }

  public computeCompositeScore(currentMetrics: CareMetrics, update: CareUpdate, nowSeconds: number): { composite: number; updatedMetrics: CareMetrics } {
    this.validateTimestamp(currentMetrics.lastTimestamp, nowSeconds);
    const elapsed = nowSeconds - currentMetrics.lastTimestamp;

    const dBio = this.calculateDecay(currentMetrics.biometricScore, elapsed, currentMetrics.confidence);
    const dBond = this.calculateDecay(currentMetrics.bondScore, elapsed, currentMetrics.confidence);
    const dLedger = this.calculateDecay(currentMetrics.ledgerScore, elapsed, currentMetrics.confidence);

    const weight = update.weight ?? 0.5;
    const updatedMetrics: CareMetrics = {
      biometricScore: this.clamp(update.biometricDelta !== undefined ? dBio * (1 - weight) + update.biometricDelta * weight : dBio),
      bondScore: this.clamp(update.bondDelta !== undefined ? dBond * (1 - weight) + update.bondDelta * weight : dBond),
      ledgerScore: this.clamp(update.ledgerBump !== undefined ? dLedger + update.ledgerBump : dLedger),
      confidence: currentMetrics.confidence,
      lastTimestamp: nowSeconds,
    };

    const composite = this.config.weights.biometric * updatedMetrics.biometricScore + this.config.weights.bond * updatedMetrics.bondScore + this.config.weights.ledger * updatedMetrics.ledgerScore;
    return { composite: this.clamp(composite), updatedMetrics };
  }

  public getDecayedScores(currentMetrics: CareMetrics, nowSeconds: number): CareMetrics {
    this.validateTimestamp(currentMetrics.lastTimestamp, nowSeconds);
    const elapsed = nowSeconds - currentMetrics.lastTimestamp;
    return {
      biometricScore: this.calculateDecay(currentMetrics.biometricScore, elapsed, currentMetrics.confidence),
      bondScore: this.calculateDecay(currentMetrics.bondScore, elapsed, currentMetrics.confidence),
      ledgerScore: this.calculateDecay(currentMetrics.ledgerScore, elapsed, currentMetrics.confidence),
      confidence: currentMetrics.confidence,
      lastTimestamp: nowSeconds,
    };
  }

  private clamp(value: number): number {
    return Math.min(1.0, Math.max(this.config.floor, value));
  }
}

export function createInitialMetrics(initialScore: number = 0.1, confidence: number = 0): CareMetrics {
  return {
    biometricScore: initialScore,
    bondScore: initialScore,
    ledgerScore: initialScore,
    confidence,
    lastTimestamp: Math.floor(Date.now() / 1000),
  };
}
