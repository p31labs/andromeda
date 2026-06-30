export interface CareMetrics {
  biometricScore: number;
  bondScore: number;
  ledgerScore: number;
  confidence: number;
  lastTimestamp: number;
}

export interface CareUpdate {
  biometricDelta?: number;
  bondDelta?: number;
  ledgerBump?: number;
  weight?: number;
}

export interface ReputationConfig {
  halfLifeSeconds: number;
  floor: number;
  weights: {
    biometric: number;
    bond: number;
    ledger: number;
  };
}
