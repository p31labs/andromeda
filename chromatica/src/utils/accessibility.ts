/**
 * Accessibility Utilities
 * Arthritis-optimized helpers
 */

import { AccessibilitySettings } from '../types';

/**
 * Check if touch target meets arthritis standard (96px)
 */
export function meetsArthritisStandard(size: number): boolean {
  return size >= 96;
}

/**
 * Calculate recommended rest time based on session data
 */
export function calculateRestRecommendation(
  sessionMinutes: number,
  painLevel: number,
  voiceUsage: number
): { shouldRest: boolean; recommendedMinutes: number; reason: string } {
  // Base recommendation: 20 minutes work, 5 minutes rest
  if (sessionMinutes >= 20 && painLevel >= 3) {
    return {
      shouldRest: true,
      recommendedMinutes: 10,
      reason: 'Pain detected'
    };
  }
  
  if (sessionMinutes >= 30) {
    return {
      shouldRest: true,
      recommendedMinutes: 5,
      reason: 'Session duration'
    };
  }
  
  if (voiceUsage < 30) {
    return {
      shouldRest: false,
      recommendedMinutes: 0,
      reason: 'Try using voice commands to reduce strain'
    };
  }
  
  return {
    shouldRest: false,
    recommendedMinutes: 0,
    reason: 'Continue working'
  };
}

/**
 * Generate accessible font sizes
 */
export function getAccessibleFontSizes(baseSize: 24 | 32 | 40): {
  base: number;
  large: number;
  xlarge: number;
  small: number;
} {
  const sizes = {
    24: { base: 24, large: 32, xlarge: 40, small: 20 },
    32: { base: 32, large: 40, xlarge: 48, small: 24 },
    40: { base: 40, large: 48, xlarge: 56, small: 32 }
  };
  
  return sizes[baseSize];
}

/**
 * Validate contrast ratio
 */
export function validateContrast(
  foreground: string,
  background: string
): { passes: boolean; ratio: number } {
  const getLuminance = (hex: string): number => {
    const rgb = hex.match(/\w\w/g)?.map(h => parseInt(h, 16) / 255) || [0, 0, 0];
    const [r, g, b] = rgb.map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return {
    passes: ratio >= 18, // Arthritis-optimized standard
    ratio: Math.round(ratio * 10) / 10
  };
}

/**
 * Detect fatigue from interaction patterns
 */
export function detectFatigue(
  interactions: { timestamp: number; type: 'voice' | 'touch' }[]
): { fatigueScore: number; trend: 'improving' | 'stable' | 'declining' } {
  if (interactions.length < 10) {
    return { fatigueScore: 0, trend: 'stable' };
  }
  
  // Calculate time between interactions
  const gaps: number[] = [];
  for (let i = 1; i < interactions.length; i++) {
    gaps.push(interactions[i].timestamp - interactions[i - 1].timestamp);
  }
  
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const recentAvg = gaps.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  // Longer gaps = higher fatigue
  const fatigueScore = Math.min(100, Math.round((recentAvg / avgGap - 1) * 50));
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentAvg > avgGap * 1.5) trend = 'declining';
  if (recentAvg < avgGap * 0.8) trend = 'improving';
  
  return { fatigueScore, trend };
}

/**
 * Generate voice command suggestions based on context
 */
export function suggestVoiceCommands(
  currentAction: string,
  painLevel: number
): string[] {
  const suggestions: string[] = [];
  
  if (painLevel > 3) {
    suggestions.push('rest now');
    suggestions.push('voice help');
  }
  
  switch (currentAction) {
    case 'creating':
      suggestions.push('add color');
      suggestions.push('save project');
      break;
    case 'viewing':
      suggestions.push('zoom in');
      suggestions.push('fullscreen');
      break;
    case 'editing':
      suggestions.push('undo');
      suggestions.push('redo');
      break;
  }
  
  return suggestions;
}

/**
 * Default accessibility settings for arthritis
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  touchTargetSize: 96,
  fontSize: 24,
  contrastMode: 'high',
  voiceEnabled: true,
  restIntervalMinutes: 20,
  autoRestEnabled: true
};
