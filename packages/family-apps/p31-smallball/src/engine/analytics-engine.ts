// P31 Analytics Engine v3.0 - Time-series, Heatmaps, Predictions
// Optimized for Cloudflare KV free tier

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

export interface PlayerHeatmap {
  playerId: string;
  metric: 'contact' | 'power' | 'patience' | 'clutch';
  zones: Array<{
    x: number;
    y: number;
    value: number; // 0-1 intensity
    sampleSize: number;
  }>;
  updatedAt: number;
}

export interface TrendPrediction {
  metric: string;
  current: number;
  predicted: number;
  confidence: number; // 0-1
  trend: 'improving' | 'declining' | 'stable';
  nextGames: Array<{
    game: number;
    predictedValue: number;
    confidenceInterval: [number, number];
  }>;
}

export interface FranchiseAnalytics {
  franchiseId: string;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
    battingAverage: number;
    era: number;
  };
  playerPerformances: Record<string, {
    games: number;
    atBats: number;
    hits: number;
    homeRuns: number;
    rbis: number;
    trend: 'up' | 'down' | 'flat';
  }>;
  heatmaps: PlayerHeatmap[];
  predictions: TrendPrediction[];
}

// Simple exponential moving average for predictions
export function calculateEMA(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

// Linear regression for simple trend prediction
export function predictNextValues(
  historical: TimeSeriesPoint[],
  horizon: number = 5
): TrendPrediction {
  if (historical.length < 3) {
    return {
      metric: 'unknown',
      current: 0,
      predicted: 0,
      confidence: 0,
      trend: 'stable',
      nextGames: []
    };
  }

  const values = historical.map(p => p.value);
  const n = values.length;

  // Calculate trend using simple linear regression
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared for confidence
  const predictions = values.map((_, i) => intercept + slope * i);
  const ssRes = values.reduce((sum, actual, i) => sum + (actual - predictions[i]) ** 2, 0);
  const ssTot = values.reduce((sum, actual) => sum + (actual - yMean) ** 2, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Generate predictions
  const nextGames = [];
  for (let i = 1; i <= horizon; i++) {
    const predictedValue = intercept + slope * (n - 1 + i);
    const stdError = Math.sqrt(ssRes / (n - 2 || 1));
    const confidenceInterval: [number, number] = [
      Math.max(0, predictedValue - 1.96 * stdError),
      Math.min(1, predictedValue + 1.96 * stdError)
    ];

    nextGames.push({
      game: i,
      predictedValue: Math.max(0, Math.min(1, predictedValue)),
      confidenceInterval
    });
  }

  const current = values[values.length - 1];
  const predicted = nextGames[0]?.predictedValue || current;

  return {
    metric: historical[0]?.tags?.metric || 'unknown',
    current,
    predicted,
    confidence: rSquared,
    trend: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'stable',
    nextGames
  };
}

// Generate heatmap from at-bat results
export function generateHeatmap(
  playerId: string,
  atBats: Array<{
    zone: { x: number; y: number };
    result: 'hit' | 'out' | 'strikeout' | 'walk';
    quality: number;
  }>,
  metric: 'contact' | 'power' | 'patience' | 'clutch'
): PlayerHeatmap {
  // Divide strike zone into 3x3 grid
  const zones: PlayerHeatmap['zones'] = [];

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      const zoneAtBats = atBats.filter(ab =>
        Math.floor(ab.zone.x * 3) === x &&
        Math.floor(ab.zone.y * 3) === y
      );

      let value = 0.5;
      if (zoneAtBats.length > 0) {
        switch (metric) {
          case 'contact':
            value = zoneAtBats.filter(ab => ab.result !== 'strikeout').length / zoneAtBats.length;
            break;
          case 'power':
            value = zoneAtBats.reduce((sum, ab) => sum + ab.quality, 0) / zoneAtBats.length;
            break;
          case 'patience':
            value = zoneAtBats.filter(ab => ab.result === 'walk').length / zoneAtBats.length;
            break;
          case 'clutch':
            // Simplified - would need game context
            value = zoneAtBats.filter(ab => ab.result === 'hit').length / zoneAtBats.length;
            break;
        }
      }

      zones.push({
        x: x / 3 + 1 / 6,
        y: y / 3 + 1 / 6,
        value,
        sampleSize: zoneAtBats.length
      });
    }
  }

  return {
    playerId,
    metric,
    zones,
    updatedAt: Date.now()
  };
}

// KV-optimized batch analytics writer
export interface AnalyticsBatch {
  franchiseId: string;
  timestamp: number;
  events: AnalyticsEvent[];
}

export interface AnalyticsEvent {
  type: 'at_bat' | 'pitch' | 'game_end' | 'player_performance';
  playerId?: string;
  data: Record<string, unknown>;
}

// Compress analytics for KV storage (free tier: 1GB)
export function compressAnalytics(batch: AnalyticsBatch): string {
  // Minimal compression - just JSON for now
  // In production: use msgpack or custom binary format
  return JSON.stringify(batch);
}

// Generate daily rollup for a franchise
export function generateDailyRollup(
  events: AnalyticsEvent[],
  franchiseId: string
): FranchiseAnalytics {
  const games = new Set();
  const playerStats: Record<string, { atBats: number; hits: number; homeRuns: number; rbis: number; walks: number; strikeouts: number }> = {};

  let runsScored = 0;
  let runsAllowed = 0;
  let wins = 0;
  let losses = 0;

  for (const event of events) {
    if (event.type === 'game_end' && event.data.gameId) {
      games.add(event.data.gameId);
      runsScored += (event.data.runsScored as number) || 0;
      runsAllowed += (event.data.runsAllowed as number) || 0;
      if (event.data.won) wins++;
      else losses++;
    }

    if (event.type === 'at_bat' && event.playerId) {
      const pid = event.playerId;
      if (!playerStats[pid]) {
        playerStats[pid] = { atBats: 0, hits: 0, homeRuns: 0, rbis: 0, walks: 0, strikeouts: 0 };
      }

      playerStats[pid].atBats++;
      if (event.data.hit) playerStats[pid].hits++;
      if (event.data.homeRun) playerStats[pid].homeRuns++;
      if (event.data.rbi) playerStats[pid].rbis += (event.data.rbi as number) || 0;
      if (event.data.walk) playerStats[pid].walks++;
      if (event.data.strikeout) playerStats[pid].strikeouts++;
    }
  }

  const totalAtBats = Object.values(playerStats).reduce((sum, p) => sum + p.atBats, 0);
  const totalHits = Object.values(playerStats).reduce((sum, p) => sum + p.hits, 0);
  const battingAverage = totalAtBats > 0 ? totalHits / totalAtBats : 0;

  // ERA calculation would need innings pitched
  const era = 0; // Placeholder

  return {
    franchiseId,
    period: 'daily',
    metrics: {
      gamesPlayed: games.size,
      wins,
      losses,
      runsScored,
      runsAllowed,
      battingAverage,
      era
    },
    playerPerformances: Object.fromEntries(
      Object.entries(playerStats).map(([pid, stats]) => [
        pid,
        {
          games: 0, // Would track per-game
          atBats: stats.atBats,
          hits: stats.hits,
          homeRuns: stats.homeRuns,
          rbis: stats.rbis,
          trend: stats.hits / stats.atBats > 0.3 ? 'up' : stats.hits / stats.atBats > 0.25 ? 'flat' : 'down'
        }
      ])
    ),
    heatmaps: [], // Generated separately
    predictions: [] // Generated from historical rollups
  };
}

// Export for Worker usage
export const AnalyticsEngine = {
  calculateEMA,
  predictNextValues,
  generateHeatmap,
  compressAnalytics,
  generateDailyRollup
};
