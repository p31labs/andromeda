/**
 * Fawn Guard — Trauma-aware text analysis engine.
 *
 * Detects people-pleasing, fawning, and JADE-loop (Justify, Argue, Defend, Explain)
 * language patterns in user text. Designed for trauma-informed, neuro-affirming
 * intervention — not judgment.
 *
 * All detection is local, regex-based, zero-telemetry.
 * Returns structured analysis results rather than a simple boolean.
 */

export type JADECategory = "JUSTIFY" | "ARGUE" | "DEFEND" | "EXPLAIN";
export type FawnSeverity = "none" | "mild" | "moderate" | "strong";

export interface FawnMatch {
  category: JADECategory;
  pattern: string;
  matchedText: string;
}

export interface FawnAnalysis {
  detected: boolean;
  severity: FawnSeverity;
  categories: JADECategory[];
  matches: FawnMatch[];
  primaryCategory: JADECategory | null;
  recommendation: string;
}

interface FawnPattern {
  regex: RegExp;
  category: JADECategory;
  description: string;
  weight: number;
}

const FAWN_PATTERNS: FawnPattern[] = [
  // --- JUSTIFY: Explaining why, making excuses for normal things ---
  { regex: /\bi('?m|\s+am)\s+sorry\b/i, category: "JUSTIFY", description: "Apologizing unprompted", weight: 2 },
  { regex: /\bsorry\s+for\b/i, category: "JUSTIFY", description: "Apologizing for existing", weight: 2 },
  { regex: /\bi\s+(just|only|merely)\s+(wanted|thought|tried|meant)\b/i, category: "JUSTIFY", description: "Minimizing intent", weight: 3 },
  { regex: /\bi\s+(didn'?t|\s+did\s+not)\s+(mean|want|try)\s+to\b/i, category: "JUSTIFY", description: "Denying intent", weight: 2 },
  { regex: /\bthat\s+wasn'?t\s+my\s+(intention|plan|goal)\b/i, category: "JUSTIFY", description: "Defending intention", weight: 2 },
  { regex: /\bi\s+(was\s+)?(just\s+)?(trying|attempting)\s+to\b/i, category: "JUSTIFY", description: "Justifying effort", weight: 2 },
  { regex: /\bthe\s+reason\s+(i|is)\b/i, category: "JUSTIFY", description: "Explaining causation for self", weight: 1 },
  { regex: /\bi\s+don'?t\s+want\s+to\s+(bother|disturb|trouble|inconvenience)\b/i, category: "JUSTIFY", description: "Self-silencing preamble", weight: 3 },
  { regex: /\bi\s+know\s+i\s+(should|shouldn'?t|can'?t)\b/i, category: "JUSTIFY", description: "Pre-emptive self-correction", weight: 2 },
  { regex: /\bi\s+(should|shouldn'?t)\s+have\b/i, category: "JUSTIFY", description: "Retrospective self-blame", weight: 2 },

  // --- ARGUE: Pushing back against perceived hostility, defensive disagreement ---
  { regex: /\b(that'?s|that\s+is)\s+(not|never|hardly)\s+(true|fair|right|accurate)\b/i, category: "ARGUE", description: "Disputing perceived judgment", weight: 2 },
  { regex: /\byou('?re|\s+are)\s+(wrong|mistaken|incorrect|unfair|unreasonable)\b/i, category: "ARGUE", description: "Confronting the other", weight: 3 },
  { regex: /\b(but|however|actually|well)\s+the\s+thing\s+is\b/i, category: "ARGUE", description: "Contrarian pivot", weight: 1 },
  { regex: /\bno,\s*(that'?s|it'?s|this\s+is)\b/i, category: "ARGUE", description: "Immediate contradiction", weight: 2 },
  { regex: /\bi\s+disagree\b/i, category: "ARGUE", description: "Explicit disagreement", weight: 1 },
  { regex: /\bthat\s+doesn'?t\s+make\s+sense\b/i, category: "ARGUE", description: "Dismissing the other", weight: 2 },
  { regex: /\byou\s+(don'?t|do\s+not)\s+(understand|get\s+it)\b/i, category: "ARGUE", description: "Challenging understanding", weight: 2 },
  { regex: /\bwhy\s+(would|do|did|are)\s+you\b/i, category: "ARGUE", description: "Challenging motive", weight: 2 },

  // --- DEFEND: Protecting self or position, deflecting blame ---
  { regex: /\bi\s+was\s+(just|simply|only)\b/i, category: "DEFEND", description: "Minimizing own action", weight: 2 },
  { regex: /\bit\s+wasn'?t\s+(me|my\s+fault)\b/i, category: "DEFEND", description: "Denial of responsibility", weight: 2 },
  { regex: /\bi\s+(had|have)\s+(a\s+)?(good|valid|legitimate)\s+(reason|excuse)\b/i, category: "DEFEND", description: "Establishing justification", weight: 2 },
  { regex: /\banyone\s+would\s+have\b/i, category: "DEFEND", description: "Normalization defense", weight: 2 },
  { regex: /\byou\s+would\s+have\s+done\s+the\s+same\b/i, category: "DEFEND", description: "Projected defense", weight: 2 },
  { regex: /\bi\s+can\s+explain\b/i, category: "DEFEND", description: "Offering explanation preemptively", weight: 1 },
  { regex: /\bplease\s+(don'?t|do\s+not)\s+(think|assume|say)\b/i, category: "DEFEND", description: "Preempting judgment", weight: 3 },
  { regex: /\bi\s+swear\b/i, category: "DEFEND", description: "Invoking sincerity", weight: 1 },
  { regex: /\bi\s+wasn'?t\s+(trying|attempting)\s+to\b/i, category: "DEFEND", description: "Denying intent", weight: 2 },

  // --- EXPLAIN: Over-explaining, providing excessive context ---
  { regex: /\blet\s+me\s+explain\b/i, category: "EXPLAIN", description: "Explicit explanation offer", weight: 2 },
  { regex: /\bwhat\s+i\s+(meant|mean)\s+(is|was)\b/i, category: "EXPLAIN", description: "Clarification loop", weight: 2 },
  { regex: /\bthe\s+(thing|point|issue|problem)\s+is\b/i, category: "EXPLAIN", description: "Framing preamble", weight: 1 },
  { regex: /\bto\s+(be|put\s+it)\s+(fair|frank|honest|clear|simple)\b/i, category: "EXPLAIN", description: "Honesty preamble", weight: 1 },
  { regex: /\bi\s+(just|simply|merely)\s+(need|want)\s+to\s+say\b/i, category: "EXPLAIN", description: "Minimizing expression", weight: 2 },
  { regex: /\b(to\s+clarify|for\s+clarity|to\s+be\s+clear)\b/i, category: "EXPLAIN", description: "Explicit clarification", weight: 1 },
  { regex: /\bas\s+i\s+(said|mentioned|noted)\s+before\b/i, category: "EXPLAIN", description: "Referencing prior explanations", weight: 1 },
  { regex: /\bi\s+(will|'?ll)\s+(try\s+to\s+)?explain\b/i, category: "EXPLAIN", description: "Offer to explain", weight: 1 },

  // --- FAWN-SPECIFIC: Classic people-pleasing markers ---
  { regex: /\byou('?re|\s+are)\s+(absolutely\s+)?right\b/i, category: "ARGUE", description: "Immediate concession", weight: 3 },
  { regex: /\bof\s+course\s+you\s+are\b/i, category: "ARGUE", description: "Performative agreement", weight: 3 },
  { regex: /\bwhatever\s+you\s+(think|say|want|need|decide)\b/i, category: "DEFEND", description: "Full deference", weight: 3 },
  { regex: /\bup\s+to\s+you\b/i, category: "DEFEND", description: "Deferring decision", weight: 2 },
  { regex: /\byour\s+call\b/i, category: "DEFEND", description: "Deferring decision (casual)", weight: 2 },
  { regex: /\bi\s+don'?t\s+(really\s+)?(care|mind|have\s+(an?\s+)?opinion)\b/i, category: "DEFEND", description: "Suppressing own preference", weight: 3 },
  { regex: /\bnever\s+mind\b/i, category: "DEFEND", description: "Self-silencing", weight: 2 },
  { regex: /\bforget\s+i\s+said\b/i, category: "DEFEND", description: "Explicit self-retraction", weight: 3 },
  { regex: /\bit\s+doesn'?t\s+(really\s+)?matter\b/i, category: "DEFEND", description: "Dismissing own concern", weight: 3 },
  { regex: /\bi\s+ll\s+try\s+harder\b/i, category: "JUSTIFY", description: "Overpromising", weight: 3 },
  { regex: /\bi\s+ll\s+do\s+better\b/i, category: "JUSTIFY", description: "Self-commitment to change", weight: 3 },
  { regex: /\bi\s*promise\b/i, category: "JUSTIFY", description: "Invoking commitment", weight: 2 },
  { regex: /\bdo\s+you\s+mind\s+if\b/i, category: "JUSTIFY", description: "Permission-seeking preamble", weight: 2 },
  { regex: /\bwould\s+it\s+be\s+(okay|all\s+right|alright)\b/i, category: "JUSTIFY", description: "Permission-seeking", weight: 2 },
  { regex: /\bis\s+it\s+(okay|alright|fine)\s+if\b/i, category: "JUSTIFY", description: "Permission-seeking variant", weight: 2 },
  { regex: /\bi\s+don'?t\s+want\s+to\s+(start|cause|create)\b/i, category: "JUSTIFY", description: "Avoiding perceived conflict", weight: 2 },
  { regex: /\bi\s+(know|understand)\s+where\s+you('?re|\s+are)\s+coming\s+from\b/i, category: "ARGUE", description: "Empathy preamble (fawn variant)", weight: 1 },
  { regex: /\bi\s+appreciate\s+your\s+(patience|understanding|time)\b/i, category: "JUSTIFY", description: "Gratitude as deflection", weight: 2 },
  { regex: /\bthank\s+you\s+for\s+(listening|being|understanding)\b/i, category: "JUSTIFY", description: "Closing with deference", weight: 1 },
];

const SOMATIC_RECORDS_MILD = [
  "Notice: your people-pleasing pattern is showing. Pause.",
  "This is your space. No need to make yourself smaller here.",
  "Fawn signal detected. You are safe to be direct here.",
];

const SOMATIC_RECORDS_MODERATE = [
  "Pattern detected: you are shifting your words to manage someone else's reaction — even though no one is reading this but you.",
  "This is your private journal. The person you are defending yourself to is not here.",
  "Notice the permission-seeking. What would you write if nobody was watching?",
];

const SOMATIC_RECORDS_STRONG = [
  "Strong fawn pattern detected. You are performing a social script inside a private, encrypted space. The audience you are managing does not exist.",
  "This writing shows you are in a JADE loop — defending, justifying, or minimizing yourself to a person who cannot read this. Slow down. Breathe. What do YOU actually feel?",
  "Your people-pleasing reflex is firing in a space designed specifically to be free of that weight. You wrote this to a void. The void is not judging you. Can you write what's actually underneath?",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Analyze text for fawning, people-pleasing, and JADE-loop patterns.
 *
 * @param text  Raw user text to analyze (journal entry, buffer input, etc.)
 * @returns Structured FawnAnalysis with severity, categories, and recommendation
 */
export function analyzeFawn(text: string): FawnAnalysis {
  if (!text || text.trim().length < 10) {
    return {
      detected: false,
      severity: "none",
      categories: [],
      matches: [],
      primaryCategory: null,
      recommendation: "",
    };
  }

  const matches: FawnMatch[] = [];
  let totalWeight = 0;
  const categoryScores: Record<JADECategory, number> = {
    JUSTIFY: 0,
    ARGUE: 0,
    DEFEND: 0,
    EXPLAIN: 0,
  };

  for (const pattern of FAWN_PATTERNS) {
    const m = pattern.regex.exec(text);
    if (m) {
      matches.push({
        category: pattern.category,
        pattern: pattern.description,
        matchedText: m[0],
      });
      totalWeight += pattern.weight;
      categoryScores[pattern.category] += pattern.weight;
    }
  }

  if (matches.length === 0) {
    return {
      detected: false,
      severity: "none",
      categories: [],
      matches: [],
      primaryCategory: null,
      recommendation: "",
    };
  }

  const categories = (Object.entries(categoryScores) as [JADECategory, number][])
    .filter(([, score]) => score > 0)
    .map(([cat]) => cat);

  const primaryCategory = (Object.entries(categoryScores) as [JADECategory, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  let severity: FawnSeverity;
  let recommendation: string;

  if (totalWeight <= 3) {
    severity = "mild";
    recommendation = pickRandom(SOMATIC_RECORDS_MILD);
  } else if (totalWeight <= 7) {
    severity = "moderate";
    recommendation = pickRandom(SOMATIC_RECORDS_MODERATE);
  } else {
    severity = "strong";
    recommendation = pickRandom(SOMATIC_RECORDS_STRONG);
  }

  return {
    detected: true,
    severity,
    categories,
    matches,
    primaryCategory,
    recommendation,
  };
}

/**
 * Lightweight boolean check for quick gating (e.g., show/hide alert UI).
 * Uses a lower threshold than full analysis.
 */
export function detectFawn(text: string): boolean {
  if (!text || text.trim().length < 15) return false;
  let matchCount = 0;
  for (const pattern of FAWN_PATTERNS) {
    if (pattern.regex.test(text)) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }
  return false;
}

/**
 * Get the human-readable label for a JADE category.
 */
export function getCategoryLabel(category: JADECategory): string {
  const labels: Record<JADECategory, string> = {
    JUSTIFY: "Excusing yourself",
    ARGUE: "Pushing back defensively",
    DEFEND: "Protecting yourself from judgment",
    EXPLAIN: "Over-explaining unnecessarily",
  };
  return labels[category];
}

/**
 * Get severity color token for UI rendering.
 */
export function getSeverityColor(severity: FawnSeverity): string {
  const colors: Record<FawnSeverity, string> = {
    none: "#3b2e54",
    mild: "#f59e0b",
    moderate: "#f97316",
    strong: "#ef4444",
  };
  return colors[severity];
}
