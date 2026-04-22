// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: Voltage Scoring
// Pure functions for message voltage assessment from CENTAUR Buffer
// ═══════════════════════════════════════════════════════════

import type { QueuedMessage } from '../vertices/types';

/**
 * Calculate voltage score for a message
 * Pure function - no side effects
 * Returns 0-10 voltage score
 */
export function calculateMessageVoltage(
  content: string,
  fromContact?: { avgVoltage: number; relationship: string }
): number {
  let voltage = 5; // Neutral baseline
  
  // Keyword analysis
  const highVoltagePatterns = [
    /emergency|urgent|critical|immediately|now/i,
    /court|lawyer|judge|attorney|legal/i,
    /police|cops|arrest|restraining/i,
    /custody|visitation|child support/i,
    /threat|abuse|harass|stalk/i,
    /hospital|doctor|medical|emergency/i,
  ];
  
  const lowVoltagePatterns = [
    /hello|hi|hey|how are you/i,
    /thanks|thank you|appreciate/i,
    /update|checking in|just saying/i,
    /love|care|support|family/i,
  ];
  
  for (const pattern of highVoltagePatterns) {
    if (pattern.test(content)) voltage += 2;
  }
  
  for (const pattern of lowVoltagePatterns) {
    if (pattern.test(content)) voltage -= 1;
  }
  
  // Length factor (longer messages = higher voltage)
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 200) voltage += 1;
  if (wordCount > 500) voltage += 1;
  
  // Contact history factor
  if (fromContact) {
    voltage += fromContact.avgVoltage * 0.3;
    
    // Co-parent bias adjustment
    if (fromContact.relationship === 'spouse' || fromContact.relationship === 'ex') {
      voltage += 1;
    }
  }
  
  // Clamp to 0-10 range
  return Math.max(0, Math.min(10, Math.round(voltage * 10) / 10));
}

/**
 * Calculate Fawn Guard z-score for outgoing drafts
 * Pure function
 */
export function calculateFawnScore(
  content: string,
  baseline: { mean: number; stdDev: number }
): number {
  if (baseline.stdDev === 0) return 0;
  
  // Calculate raw score based on pattern matching
  let rawScore = 0;
  
  // Fawn patterns
  const fawnPatterns = [
    /sorry|apologize|my fault|my bad/i,
    /i know this is inconvenient|i hope this isn't too much/i,
    /i don't want to bother|sorry to disturb/i,
    /i understand if you can't|no pressure at all/i,
    /whatever you think is best|whatever works for you/i,
    /just thought i'd ask|no worries if not/i,
  ];
  
  for (const pattern of fawnPatterns) {
    if (pattern.test(content)) rawScore += 1;
  }
  
  // Length factor for over-explaining
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 100) rawScore += 0.5;
  if (wordCount > 200) rawScore += 0.5;
  
  // Calculate z-score
  return (rawScore - baseline.mean) / baseline.stdDev;
}

/**
 * Determine if a message should be buffered
 * Pure function
 */
export function shouldBufferMessage(
  voltage: number,
  bufferThreshold: number = 5,
  spoons?: number
): boolean {
  let threshold = bufferThreshold;
  
  // Lower threshold when low on spoons
  if (spoons !== undefined && spoons < 3) threshold -= 2;
  else if (spoons !== undefined && spoons < 5) threshold -= 1;
  
  return voltage >= threshold;
}

/**
 * Generate BLUF (Bottom Line Up Front) summary for high-voltage messages
 * Pure function
 */
export function generateBLUF(content: string): string {
  // Simple BLUF extraction - take first 2-3 sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) return content.substring(0, 100);
  
  const bluf = sentences.slice(0, Math.min(3, sentences.length)).join('. ').trim();
  return bluf.length > 200 ? bluf.substring(0, 200) + '...' : bluf;
}
