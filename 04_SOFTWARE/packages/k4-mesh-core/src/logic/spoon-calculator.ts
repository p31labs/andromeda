// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: Spoon Calculator
// Pure functions for energy/spoon calculations from CENTAUR
// ═══════════════════════════════════════════════════════════

import type { EnergyState, BioReading, CognitiveLoad } from '../vertices/types';

/**
 * Calculate current spoon value from base energy and modifiers
 * Pure function - no side effects
 */
export function calculateSpoons(
  baseSpoons: number,
  modifiers: {
    bioImpact?: number;
    cognitiveLoad?: number;
    fatigueFactor?: number;
  } = {}
): number {
  const { bioImpact = 0, cognitiveLoad = 0, fatigueFactor = 1 } = modifiers;
  
  let spoons = baseSpoons;
  spoons -= bioImpact;
  spoons -= cognitiveLoad * 0.5;
  spoons *= fatigueFactor;
  
  return Math.max(0, Math.round(spoons * 10) / 10);
}

/**
 * Calculate energy trend from last 4 readings
 * Pure function
 */
export function calculateEnergyTrend(readings: { spoons: number; ts: number }[]): 'rising' | 'falling' | 'stable' {
  if (readings.length < 2) return 'stable';
  
  const recent = readings.slice(-4);
  const first = recent[0].spoons;
  const last = recent[recent.length - 1].spoons;
  const diff = last - first;
  
  if (diff > 1) return 'rising';
  if (diff < -1) return 'falling';
  return 'stable';
}

/**
 * Calculate cognitive load voltage from bio state and message volume
 * Pure function
 */
export function calculateCognitiveLoad(
  bioState: BioReading[],
  messageCount: number,
  fawnScore: number = 0
): CognitiveLoad {
  const calcium = bioState.find(b => b.type === 'calcium_serum')?.value || 8.5;
  const calciumModifier = calcium < 7.8 ? 2 : calcium < 8.0 ? 1 : 0;
  
  const voltage = Math.min(10, 
    (messageCount * 0.3) + 
    (fawnScore * 0.5) + 
    calciumModifier
  );
  
  return {
    voltage: Math.round(voltage * 10) / 10,
    fawnScore: Math.round(fawnScore * 10) / 10,
    messagesPending: messageCount,
    fortressActive: voltage > 7 || calcium < 7.6,
  };
}

/**
 * Calculate buffer hold time based on spoons and cognitive load
 * Pure function
 */
export function calculateBufferHoldTime(
  spoons: number,
  cognitiveLoad: number
): number {
  // Base hold time: 30 seconds
  let holdTime = 30;
  
  // Low spoons = longer hold time
  if (spoons < 3) holdTime += 60;
  else if (spoons < 5) holdTime += 30;
  
  // High load = longer hold time
  if (cognitiveLoad > 7) holdTime += 60;
  else if (cognitiveLoad > 5) holdTime += 30;
  
  return Math.min(300, holdTime); // Max 5 minutes
}

/**
 * Determine if Fortress Mode should auto-activate
 * Pure function
 */
export function shouldActivateFortress(
  bioState: BioReading[],
  spoons: number,
  messageCount: number
): boolean {
  const calcium = bioState.find(b => b.type === 'calcium_serum')?.value;
  
  // Auto-fortress on critical calcium
  if (calcium && calcium < 7.6) return true;
  
  // Auto-fortress on extreme overload
  if (spoons < 1 && messageCount > 10) return true;
  
  return false;
}
