/**
 * Fawn Response Detector
 * Identifies language patterns associated with trauma-response fawning 
 * (excessive apologizing, over-explaining, self-deprecation) to trigger bot de-escalation.
 * Ethos: Provide cognitive safety and reduce social pressure.
 */
export class FawnDetector {
  // Patterns that indicate fawning response
  private fawnPatterns: RegExp[] = [
    /i'?m (so )?sorry/i,
    /am i bothering you/i,
    /if it'?s not too much trouble/i,
    /i know you'?re busy/i,
    /sorry to bother/i,
    /i might be wrong but/i,
    /does that make sense/i,
    /i apologize/i,
    /sorry if this is dumb/i,
    /this might be a stupid question/i,
    /i don'?t want to waste your time/i,
    /please don'?t be mad/i,
    /i hope that makes sense/i,
    /sorry for (asking|being| bothering)/i,
    /i hate to ask but/i,
    /forgive me/i,
    /pardon my (ignorance|stupidity)/i
  ];

  /**
   * Analyze text for fawning patterns
   * @param text The text to analyze
   * @returns Analysis result with isFawning flag, confidence level, and matched patterns
   */
  public analyze(text: string): {
    isFawning: boolean;
    confidence: number;
    patterns: string[];
  } {
    const matchedPatterns: string[] = [];
    
    for (const pattern of this.fawnPatterns) {
      if (pattern.test(text)) {
        matchedPatterns.push(pattern.source);
      }
    }

    // Calculate confidence based on number/frequency of patterns
    // More patterns = higher confidence of fawning
    const confidence = Math.min(matchedPatterns.length * 0.35, 1.0);

    return {
      isFawning: matchedPatterns.length > 0,
      confidence,
      patterns: matchedPatterns
    };
  }

  /**
   * Get a de-escalation message based on analysis
   * @param analysis The fawn analysis result
   * @returns A supportive message
   */
  public getDeescalationMessage(analysis: { isFawning: boolean; confidence: number }): string {
    if (!analysis.isFawning) {
      return '';
    }

    const messages = [
      'Take your time. No response or apology is required here.',
      'You don\'t need to apologize. Your input is valid.',
      'It\'s okay to step back. We\'re here to help, not rush.',
      'Your question matters. There\'s no burden here.',
      'Breathe. We\'re in no hurry.'
    ];

    if (analysis.confidence > 0.7) {
      return messages[0]; // Strongest message for high confidence
    } else if (analysis.confidence > 0.4) {
      return messages[2];
    }
    return messages[3];
  }

  /**
   * Check if a message should trigger de-escalation
   * Higher threshold than analyze() - only for obvious fawning
   * @param text The text to check
   * @returns True if should trigger de-escalation
   */
  public shouldDeescalate(text: string): boolean {
    const analysis = this.analyze(text);
    return analysis.isFawning && analysis.confidence > 0.5;
  }
}
