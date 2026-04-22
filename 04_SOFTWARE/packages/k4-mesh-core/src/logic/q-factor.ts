// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: Q-Factor Calculation
// Fisher-Escolà coherence score across tetrahedron vertices
// ═══════════════════════════════════════════════════════════

import type { EnergyState } from '../vertices/types';
import type { QFactor } from '../edges/types';

/**
 * Calculate Q-Factor (Fisher-Escolà coherence score)
 * Pure function - computes overall system health from all four vertices
 * Returns score 0-1 with detailed breakdown
 */
export function calculateQFactor(
  vertexStates: {
    A: { energy: EnergyState; bio?: any[] };
    B: { queueDepth: number; fawnScore?: number };
    C: { criticalDeadlines: number; totalDeadlines: number };
    D: { lastSynthesis: number; synthesisCount?: number };
  },
  now: number = Date.now()
): QFactor {
  // Calculate vertex health scores (0-1 each)
  
  // Vertex A (OperatorState) health
  let scoreA = 0.5;
  if (vertexStates.A.energy.trend === 'rising') scoreA = 1.0;
  else if (vertexStates.A.energy.trend === 'stable') scoreA = 0.7;
  else if (vertexStates.A.energy.trend === 'falling') scoreA = 0.3;
  
  // Adjust for spoons level
  if (vertexStates.A.energy.spoons < 2) scoreA *= 0.5;
  else if (vertexStates.A.energy.spoons < 4) scoreA *= 0.8;
  
  // Vertex B (SignalProcessor) health
  let scoreB = 1.0;
  if (vertexStates.B.queueDepth > 10) scoreB = 0.2;
  else if (vertexStates.B.queueDepth > 5) scoreB = 0.5;
  else if (vertexStates.B.queueDepth > 2) scoreB = 0.8;
  
  // Vertex C (ContextEngine) health
  let scoreC = 1.0;
  const criticalRatio = vertexStates.C.totalDeadlines > 0 
    ? vertexStates.C.criticalDeadlines / vertexStates.C.totalDeadlines 
    : 0;
  if (criticalRatio > 0.5) scoreC = 0.3;
  else if (criticalRatio > 0.25) scoreC = 0.6;
  
  // Vertex D (ShieldEngine) health
  let scoreD = 1.0;
  const daysSinceSynthesis = (now - vertexStates.D.lastSynthesis) / (1000 * 60 * 60 * 24);
  if (daysSinceSynthesis > 14) scoreD = 0.3;
  else if (daysSinceSynthesis > 7) scoreD = 0.5;
  else if (daysSinceSynthesis > 3) scoreD = 0.8;
  
  // Overall Q-Factor is average of four vertices
  const overallScore = (scoreA + scoreB + scoreC + scoreD) / 4;
  
  return {
    score: Math.round(overallScore * 1000) / 1000,
    timestamp: now,
    vertexHealth: {
      A: Math.round(scoreA * 1000) / 1000,
      B: Math.round(scoreB * 1000) / 1000,
      C: Math.round(scoreC * 1000) / 1000,
      D: Math.round(scoreD * 1000) / 1000,
    },
    factors: {
      energyTrend: vertexStates.A.energy.trend,
      queueDepth: vertexStates.B.queueDepth,
      deadlineUrgency: Math.round(criticalRatio * 100) / 100,
      synthesisRecency: Math.round((14 - Math.min(14, daysSinceSynthesis)) * 10) / 10,
    },
  };
}

/**
 * Get Q-Factor status category
 * Pure function
 */
export function getQFactorStatus(qScore: number): 'CRITICAL' | 'WARNING' | 'STABLE' | 'OPTIMAL' {
  if (qScore < 0.3) return 'CRITICAL';
  if (qScore < 0.5) return 'WARNING';
  if (qScore < 0.8) return 'STABLE';
  return 'OPTIMAL';
}

/**
 * Get Q-Factor color hex code for visualization
 * Pure function
 */
export function getQFactorColor(qScore: number): string {
  if (qScore < 0.3) return '#E53E3E'; // Red
  if (qScore < 0.5) return '#D69E2E'; // Yellow
  if (qScore < 0.8) return '#38A169'; // Green
  return '#00F0FF'; // Cyan (optimal)
}
