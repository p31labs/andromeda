/**
 * @file fawn.ts — P31 Labs FawnGuard Outbound Defense
 * 
 * Communication intercept and Gray Rock protocol enforcement.
 * Section 7.3 of Master Doctrine.
 * 
 * CWP: Decoupled from App.tsx per WCD-04.5
 */

export interface FawnPattern {
  id: string;
  regex: RegExp;
  category: 'apology' | 'pleading' | 'diminishing' | 'self-effacing';
}

export const FAWN_PATTERNS: FawnPattern[] = [
  { id: 'over_apology', category: 'apology', regex: /\b(I'm so sorry|sorry if this is|so sorry to bother|sorry to bother you)\b/gi },
  { id: 'permission_pleading', category: 'pleading', regex: /\b(if it's okay|is it okay if|would you mind if|can i ask)\b/gi },
  { id: 'self_diminishing', category: 'diminishing', regex: /\b(I just thought|I'm probably wrong but|stupid question but|just wanted to say)\b/gi },
  { id: 'humble_brag', category: 'self-effacing', regex: /\b(I know this might be silly|I don't mean to bother)\b/gi },
];

export interface FawnAnalysis {
  triggered: boolean;
  matches: string[];
  severity: 'none' | 'mild' | 'moderate' | 'severe';
}

/**
 * P31 Labs: FawnGuard Outbound Defense
 * 
 * Analyzes text for fawning patterns and provides Gray Rock neutralization.
 */
export class FawnGuard {
  /**
   * Analyze text for fawning patterns
   * 
   * @param text - Input text to analyze
   * @returns FawnAnalysis with trigger status and matched patterns
   */
  static analyze(text: string): FawnAnalysis {
    const matches: string[] = [];
    let severityScore = 0;

    for (const pattern of FAWN_PATTERNS) {
      const found = text.match(pattern.regex);
      if (found) {
        matches.push(pattern.id);
        severityScore += found.length;
      }
    }

    const triggered = matches.length > 0;
    let severity: FawnAnalysis['severity'] = 'none';
    
    if (triggered) {
      if (severityScore >= 3) severity = 'severe';
      else if (severityScore >= 2) severity = 'moderate';
      else severity = 'mild';
    }

    return { triggered, matches, severity };
  }

  /**
   * Neutralize fawning language using Gray Rock protocol
   * 
   * @param text - Input text to neutralize
   * @returns Gray Rock neutralized text
   */
  static grayRock(text: string): string {
    let clean = text;
    
    // Apology patterns → "Note:"
    clean = clean.replace(/\b(I'm so sorry|sorry if this is|so sorry to bother|sorry to bother you)\b/gi, 'Note:');
    
    // Self-diminishing → "I noted"
    clean = clean.replace(/\b(I just thought|I'm probably wrong but|stupid question but)\b/gi, 'I noted');
    
    // Permission pleading → neutral factual statement
    clean = clean.replace(/\b(if it's okay|is it okay if|would you mind if)\b/gi, 'Request:');
    
    // Humble expressions → factual observation
    clean = clean.replace(/\b(I know this might be silly|I don't mean to bother)\b/gi, 'Observation:');
    
    return clean;
  }

  /**
   * Check if text is safe to transmit
   * 
   * @param text - Input text to check
   * @returns true if no fawning detected
   */
  static isSafe(text: string): boolean {
    return !this.analyze(text).triggered;
  }

  /**
   * Get human-readable warning for current input
   * 
   * @param text - Input text
   * @returns Warning message or null if safe
   */
  static getWarning(text: string): string | null {
    const analysis = this.analyze(text);
    
    if (!analysis.triggered) return null;
    
    const categoryLabels = {
      apology: 'Apology detected',
      pleading: 'Permission-seeking detected',
      diminishing: 'Self-diminishing language',
      selfEffacing: 'Humblebrag detected',
    };
    
    const categories = [...new Set(
      FAWN_PATTERNS
        .filter(p => analysis.matches.includes(p.id))
        .map(p => p.category)
    )];
    
    return `Fawn Guard: ${categories.map(c => categoryLabels[c]).join(', ')}`;
  }
}