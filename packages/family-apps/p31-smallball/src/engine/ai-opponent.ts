// P31 Edge AI Opponent - Deterministic Strategy Engine
// No external API calls - runs entirely in browser

export interface AIContext {
  inning: number;
  scoreDiff: number;
  outs: number;
  runners: number;
  pitcherFatigue: number;
  batterStats: {
    contact: number;
    power: number;
    plateDiscipline: number;
  };
}

export interface AIDecision {
  pitchType: 'FASTBALL' | 'CURVEBALL' | 'SLIDER' | 'CHANGEUP';
  location: 'inside' | 'outside' | 'high' | 'low' | 'center';
  aggression: number; // 0-1
}

// Deterministic AI that uses game state to make decisions
export function generateAIPitchDecision(context: AIContext, prng: () => number): AIDecision {
  const { scoreDiff, outs, runners, pitcherFatigue, batterStats } = context;
  
  // Base probabilities
  let fastballProb = 0.5;
  let curveballProb = 0.2;
  let sliderProb = 0.2;
  let changeupProb = 0.1;
  
  // Adjust based on game state
  if (scoreDiff > 0) {
    // Winning - more aggressive
    fastballProb += 0.1;
    changeupProb -= 0.05;
  } else if (scoreDiff < 0) {
    // Losing - mix it up
    curveballProb += 0.1;
    sliderProb += 0.05;
    fastballProb -= 0.15;
  }
  
  if (runners > 0) {
    // Runners on - pitch to contact
    fastballProb += 0.1;
    changeupProb += 0.05;
    curveballProb -= 0.1;
  }
  
  if (pitcherFatigue > 0.7) {
    // Fatigued - fewer fastballs
    fastballProb -= 0.15;
    changeupProb += 0.15;
  }
  
  // Batter tendencies
  if (batterStats.power > 70) {
    // Power hitter - pitch away
    fastballProb -= 0.1;
    curveballProb += 0.1;
  }
  
  if (batterStats.plateDiscipline > 70) {
    // Disciplined - more variety needed
    sliderProb += 0.05;
    changeupProb += 0.05;
  }
  
  // Normalize probabilities
  const total = fastballProb + curveballProb + sliderProb + changeupProb;
  fastballProb /= total;
  curveballProb /= total;
  sliderProb /= total;
  changeupProb /= total;
  
  // Select pitch type
  const roll = prng();
  let pitchType: AIDecision['pitchType'];
  if (roll < fastballProb) pitchType = 'FASTBALL';
  else if (roll < fastballProb + curveballProb) pitchType = 'CURVEBALL';
  else if (roll < fastballProb + curveballProb + sliderProb) pitchType = 'SLIDER';
  else pitchType = 'CHANGEUP';
  
  // Determine location
  const locations: AIDecision['location'][] = ['inside', 'outside', 'high', 'low', 'center'];
  const locationIndex = Math.floor(prng() * locations.length);
  
  return {
    pitchType,
    location: locations[locationIndex],
    aggression: Math.min(1, Math.max(0, 0.5 + (scoreDiff * 0.1) - (pitcherFatigue * 0.2)))
  };
}

// AI batter decision
export function generateAIBatterDecision(
  pitchType: string,
  pitchLocation: { x: number; y: number },
  count: { balls: number; strikes: number },
  batterStats: any,
  prng: () => number
): { swing: boolean; contactQuality: number } {
  
  const { balls, strikes } = count;
  let swingProb = 0.5;
  
  // Adjust based on count
  if (strikes === 2) {
    // Protect the plate
    swingProb += 0.2;
  }
  if (balls === 3) {
    // Take a pitch
    swingProb -= 0.1;
  }
  
  // Pitch type adjustments
  if (pitchType === 'FASTBALL') {
    swingProb += 0.1; // Easier to hit
  } else if (pitchType === 'CURVEBALL') {
    swingProb -= 0.05; // Harder to track
  }
  
  // Batter discipline
  swingProb += (batterStats.plateDiscipline - 50) * 0.002;
  
  const swing = prng() < swingProb;
  
  if (!swing) {
    return { swing: false, contactQuality: 0 };
  }
  
  // Contact quality based on contact stat and pitch type
  let baseQuality = batterStats.contact / 100;
  if (pitchType === 'CURVEBALL' || pitchType === 'SLIDER') {
    baseQuality *= 0.9; // Breaking balls harder to square up
  }
  
  const contactQuality = prng() * baseQuality;
  
  return { swing: true, contactQuality };
}
