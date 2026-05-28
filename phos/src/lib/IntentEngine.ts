/**
 * IntentEngine — Deterministic pattern-matching router.
 *
 * Takes raw text from the PHOSGuide input and maps it to a SurfaceKey.
 * No LLMs. Pure keyword → surface mapping.
 *
 * Gray Rock check is always evaluated first — crisis/urgent keywords
 * take absolute precedence over everything else.
 */
import type { SurfaceKey } from './atmosphere';

// ---- Keyword → Surface mappings ----
// Matched in priority order. If multiple rules match, the first one wins.

interface IntentRule {
  /** Keywords that trigger this surface (lowercase, no punctuation) */
  keywords: string[];
  /** Target surface */
  surface: SurfaceKey;
  /** Optional: only activate at or below this spoon level */
  maxSpoons?: number;
}

const INTENT_RULES: IntentRule[] = [
  // ---- CRISIS / GRAY ROCK (always first — highest priority) ----
  {
    keywords: ['panic', 'overwhelm', 'overwhelmed', 'stop', 'emergency', 'crisis'],
    surface: 'GREETING',
    maxSpoons: 1,
  },

  // ---- ONBOARDING / IGNITION ----
  {
    keywords: ['start', 'onboard', 'ignite', 'setup', 'begin', 'hello', 'hi'],
    surface: 'IGNITION',
    maxSpoons: 2,
  },
  {
    keywords: ['ready', 'begin', 'start', 'ignite'],
    surface: 'IGNITION',
  },

  // ---- PLAY / RECREATION ----
  {
    keywords: ['play', 'game', 'games', 'fun', 'arcade', 'entertain'],
    surface: 'ARCADE',
  },
  {
    keywords: ['bond', 'bonding', 'family', 'together', 'love', 'connect'],
    surface: 'BONDING',
  },

  // ---- WORK / SYSTEM ----
  {
    keywords: ['work', 'code', 'develop', 'system', 'deploy', 'build', 'project'],
    surface: 'NODE_ZERO',
  },

  // ---- PHYSICAL HARDWARE / NODE ZERO ----
  {
    keywords: ['hardware', 'house', 'telemetry', 'sensors', 'physical', 'base', 'node zero'],
    surface: 'NODE_ZERO',
  },
  {
    keywords: ['grid', 'mesh', 'network', 'connect', 'service', 'status', 'all'],
    surface: 'GRID',
  },

  // ---- COGNITIVE TRIAGE / COMPASS ----
  {
    keywords: ['lost', 'confused', 'dont', 'guide', 'compass', 'help', 'stuck'],
    surface: 'COMPASS',
  },

  // ---- CALM / REFLECTION ----
  {
    keywords: ['buffer', 'rest', 'pause', 'breathe', 'calm', 'quiet', 'reset'],
    surface: 'THE_BUFFER',
  },

  // ---- ASSETS / SECURITY ----
  {
    keywords: ['vault', 'safe', 'secure', 'asset', 'store', 'save', 'protect'],
    surface: 'VAULT',
  },

  // ---- LOVE / KARMA ECONOMY ----
  {
    keywords: ['love', 'karma', 'value', 'economy', 'credits', 'ledger', 'balance'],
    surface: 'LOVE',
  },

  // ---- MEMORY / LEDGER ----
  {
    keywords: ['log', 'ledger', 'history', 'memory', 'events', 'timeline', 'review'],
    surface: 'LEDGER',
  },

  // ---- SOVEREIGN BRAIN / ARCHIVE ----
  {
    keywords: ['search', 'archive', 'knowledge', 'query', 'ask', 'oracle', 'document', 'embed', 'rag'],
    surface: 'ARCHIVE',
  },

  // ---- SETTINGS / PREFERENCES ----
  {
    keywords: ['setting', 'config', 'preference', 'tune', 'customize', 'adjust'],
    surface: 'SETTINGS',
  },

  // ---- CONSTELLATION / APP LAUNCHER ----
  {
    keywords: ['app', 'apps', 'launch', 'open', 'tool', 'tools', 'constellation', 'launcher', 'dashboard', 'suite', 'family'],
    surface: 'CONSTELLATION',
  },
];

// ---- Fallback keyword clusters for "I don't know" ----
const FALLBACK_GREETING = ['hello', 'hi', 'hey', 'greet', 'phos', 'surface', 'status'];
const FALLBACK_BUFFER = ['what', 'where', 'how', 'why', 'when'];

/**
 * Route a raw text input to the correct SurfaceKey.
 *
 * @param input  Raw text from the user (PHOSGuide input)
 * @param spoons Current spoon level (0-5). Low spoons bias toward GRAY_ROCK.
 * @returns      Determined SurfaceKey
 */
export function routeIntent(input: string, spoons: number): SurfaceKey {
  const cleaned = input
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .trim();

  if (!cleaned) {
    // Empty input → stay on current surface (GREETING is default)
    return 'GREETING';
  }

  // Extract individual words for matching
  const words = cleaned.split(/\s+/);
  const fullText = cleaned;

  // 1. Crisis override — if spoons ≤ 1, any text containing crisis words
  //    forces GREETING (Gray Rock safe state)
  if (spoons <= 1) {
    for (const crisisWord of ['panic', 'stop', 'crisis', 'urgent', 'overwhelm']) {
      if (fullText.includes(crisisWord)) {
        return 'GREETING';
      }
    }
  }

  // 2. Exact match against specific keywords (priority-ordered)
  for (const rule of INTENT_RULES) {
    if (rule.maxSpoons !== undefined && spoons > rule.maxSpoons) {
      continue; // skip rules that require lower spoons
    }
    for (const keyword of rule.keywords) {
      // Match if the full text contains the keyword, or any individual word matches
      if (fullText.includes(keyword) || words.includes(keyword)) {
        return rule.surface;
      }
    }
  }

  // 3. Fallback patterns
  for (const word of words) {
    if (FALLBACK_GREETING.includes(word)) {
      return 'GREETING';
    }
  }
  for (const word of words) {
    if (FALLBACK_BUFFER.includes(word)) {
      return 'THE_BUFFER';
    }
  }

  // 4. Default fallback — return to GREETING
  return 'GREETING';
}

/**
 * Quick check: does this input contain a crisis keyword regardless of spoons?
 */
export function containsCrisis(input: string): boolean {
  const cleaned = input.toLowerCase();
  return ['help', 'panic', 'stop', 'crisis', 'urgent'].some((w) => cleaned.includes(w));
}

/**
 * Detect if the input is a RAG query (? or /ask prefix).
 * Returns the cleaned query string, or null if not a RAG query.
 */
export function parseRagQuery(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('?')) return trimmed.slice(1).trim();
  if (trimmed.startsWith('/ask ')) return trimmed.slice(5).trim();
  if (trimmed.startsWith('/ask')) return trimmed.slice(4).trim();
  return null;
}
