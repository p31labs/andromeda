export interface FawnAnalysisResult {
  isFawning: boolean;
  confidence: number;
  patterns: string[];
  suggestion?: string;
}

export interface FawnPattern {
  name: string;
  regex: RegExp;
  weight: number;
}

const FAWN_PATTERNS: FawnPattern[] = [
  // Apology patterns
  {
    name: 'excessive_apology',
    regex: /i'm sorry|i am sorry|sorry sorry|srry|srs/i,
    weight: 0.3
  },
  // Self-deprecation patterns
  {
    name: 'self_deprecation',
    regex: /i'm bad|i'm terrible|i'm awful|i'm useless|i'm stupid|i'm dumb/i,
    weight: 0.35
  },
  // Over-explaining patterns
  {
    name: 'over_explaining',
    regex: /^(?:[^\n]*(?:\n|$)){3,}/,
    weight: 0.2
  },
  // Qualification patterns
  {
    name: 'over_qualification',
    regex: /i know i might be wrong|i'm not sure but|i'm probably overthinking|i'm just saying/i,
    weight: 0.25
  },
  // Defensive patterns
  {
    name: 'defensive_justification',
    regex: /i didn't mean|i wasn't trying|that wasn't my intent|don't get me wrong/i,
    weight: 0.2
  },
  // Minimizing patterns
  {
    name: 'minimizing',
    regex: /it's probably nothing|i'm probably overreacting|it's not a big deal/i,
    weight: 0.25
  },
  // People-pleasing patterns
  {
    name: 'people_pleasing',
    regex: /let me know if that's okay|i hope that's fine|sorry to bother|sorry for asking/i,
    weight: 0.2
  },
  // Question marks for validation
  {
    name: 'seeking_validation',
    regex: /\?{2,}/,
    weight: 0.15
  }
];

class FawnDetector {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  public analyze(text: string): FawnAnalysisResult {
    if (!this.enabled || !text || text.trim().length === 0) {
      return {
        isFawning: false,
        confidence: 0,
        patterns: []
      };
    }

    const matchedPatterns: string[] = [];
    let totalWeight = 0;

    for (const pattern of FAWN_PATTERNS) {
      if (pattern.regex.test(text)) {
        matchedPatterns.push(pattern.name);
        totalWeight += pattern.weight;
      }
    }

    const confidence = Math.min(totalWeight, 1);

    const suggestion = this.generateSuggestion(matchedPatterns);

    return {
      isFawning: confidence > 0.3,
      confidence,
      patterns: matchedPatterns,
      suggestion
    };
  }

  private generateSuggestion(patterns: string[]): string | undefined {
    if (patterns.length === 0) return undefined;

    if (patterns.includes('excessive_apology')) {
      return "You don't need to apologize. Your perspective is valid.";
    }

    if (patterns.includes('self_deprecation')) {
      return "Your self-talk matters. Would you speak to a friend this way?";
    }

    if (patterns.includes('over_explaining')) {
      return "Sometimes less is more. The core point matters most.";
    }

    if (patterns.includes('minimizing')) {
      return "Your feelings are valid. They don't need to be minimized.";
    }

    if (patterns.includes('seeking_validation')) {
      return "One question mark is enough. Your point is valid as stated.";
    }

    return "Consider checking in with your authentic voice. 🧠";
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

export default FawnDetector;
export { FawnDetector, FAWN_PATTERNS };