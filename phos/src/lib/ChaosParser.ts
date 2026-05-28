/**
 * ChaosParser.ts — Unstructured brain-dump text parser.
 *
 * Parses chaotic, multi-format text into structured chunks with
 * auto-categorized content types. Designed for the Buffer surface
 * where the operator dumps unfiltered thoughts.
 *
 * Detects and categorizes:
 * - URLs/links (GitHub, Discord, legal docs, medical refs)
 * - Code blocks (fenced and indented)
 * - Bullet/numbered lists
 * - Frantic notes (ALL CAPS, excessive punctuation)
 * - Legal references (statute citations, case names)
 * - Medical references (drug names, diagnosis codes)
 * - Freeform prose
 */

export type ContentCategory =
  | 'link'
  | 'code'
  | 'list'
  | 'frantic'
  | 'legal'
  | 'medical'
  | 'note'
  | 'prose';

export interface ParsedChunk {
  text: string;
  category: ContentCategory;
  sourceLineRange: [number, number];
  metadata: {
    urls?: string[];
    codeLanguage?: string;
    isAllCaps?: boolean;
    urgencyIndicators?: number;
    statuteCitations?: string[];
    drugNames?: string[];
  };
}

export interface ParsedBrainDump {
  chunks: ParsedChunk[];
  summary: {
    totalChunks: number;
    categories: Record<ContentCategory, number>;
    urlCount: number;
    codeBlockCount: number;
    franticEntryCount: number;
    legalRefCount: number;
    medicalRefCount: number;
  };
}

// --- Detection Regexes ---

const URL_RE = /https?:\/\/[^\s<>"'(){}[\]]+/gi;
const GITHUB_URL_RE = /https?:\/\/(?:github|gitlab|bitbucket)\.com\/\S+/gi;
const DISCORD_URL_RE = /https?:\/\/(?:discord\.gg|discord\.com)\/\S+/gi;

const FENCED_CODE_RE = /```(\w+)?\n([\s\S]*?)```/g;
const INDENTED_CODE_RE = /(?:^ {4,}\S.*$\n?)+/gm;

const ALL_CAPS_RE = /^[A-Z][A-Z0-9\s!?.:,;'"-]{10,}$/;
const FRANTIC_PUNCT_RE = /[!?]{2,}/g;

const STATUTE_RE = /(\d+\s+U\.?S\.?C\.?\s+§?\s*\d+(?:\([a-z0-9]+\))?)|(\d+\s+(?:O\.?C\.?G\.?A\.?|C\.?F\.?R\.?|I\.?C\.?D-\d?)\s+§?\s*\d+\.?\d*)|(\d+\s+(?:U\.?S\.?C\.?C\.?|Ga\.?\s+Code)\s+§?\s*\d+)/gi;
const CASE_NAME_RE = /([A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+)/g;

const DRUG_NAMES = [
  'calcitriol', 'calcium', 'vyvanse', 'lisdexamfetamine', 'effexor',
  'venlafaxine', 'levothyroxine', 'liothyronine', 'hydrocortisone',
  'sertraline', 'fluoxetine', 'bupropion', 'methylphenidate',
  'atomoxetine', 'guanfacine', 'clonidine', 'lorazepam',
  'yorvipath', 'palopegteriparatide',
];

const MEDICAL_CODE_RE = /\b(?:ICD-10|ICD-9|CPT|DSM-5?)\s*[-:]?\s*[A-Z]\d{2}(?:\.\d{1,2})?\b/gi;
const MEDICAL_TERM_RE = /\b(?:hypoparathyroidism|hyperparathyroidism|hypocalcemia|hypercalcemia|seizure|paresthesia|tetany|arrhythmia|autism|adhd|audhd|spectrum|diagnosis|prognosis|efficacy|dosage|mg|mcg|μg|ml|iv|im|po|tid|bid|qd|prn)\b/gi;

const MEDICATION_RE = new RegExp(`\\b(?:${DRUG_NAMES.join('|')})\\b`, 'gi');

/**
 * Count occurrences of a regex match in text.
 */
function countMatches(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

/**
 * Extract all URLs from text.
 */
function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Detect statute/legal citations.
 */
function extractStatutes(text: string): string[] {
  const matches = text.match(STATUTE_RE);
  return matches ? [...new Set(matches.map((m) => m.trim()))] : [];
}

/**
 * Detect drug/medication names.
 */
function extractDrugNames(text: string): string[] {
  const matches = text.match(MEDICATION_RE);
  return matches ? [...new Set(matches.map((m) => m.toLowerCase()))] : [];
}

/**
 * Score urgency/frantic level of a text segment.
 * 0 = calm, 3+ = highly frantic.
 */
function scoreUrgency(text: string): number {
  let score = 0;
  if (ALL_CAPS_RE.test(text)) score += 2;

  const punctCount = countMatches(text, FRANTIC_PUNCT_RE);
  score += Math.min(punctCount, 3);

  const words = text.split(/\s+/);
  const shortWords = words.filter((w) => w.length <= 3).length;
  if (words.length > 0 && shortWords / words.length > 0.6) score += 1;

  if (/\b(urgent|emergency|asap|now|omg|fuck|shit|help)\b/i.test(text)) score += 1;

  return Math.min(score, 5);
}

/**
 * Classify a single text segment into a ContentCategory.
 */
function classifySegment(text: string): ContentCategory {
  const trimmed = text.trim();
  if (!trimmed) return 'prose';

  // Code block takes priority
  if (trimmed.startsWith('```') || trimmed.startsWith('    ')) return 'code';

  // Link-only lines
  if (/^https?:\/\/\S+$/.test(trimmed)) return 'link';

  // Frantic: high urgency score
  if (scoreUrgency(trimmed) >= 3) return 'frantic';

  // Legal: statute citations or case names
  if (extractStatutes(trimmed).length > 0) return 'legal';
  if (countMatches(trimmed, CASE_NAME_RE) > 0) return 'legal';

  // Medical: drug names, ICD codes, medical terminology
  if (extractDrugNames(trimmed).length > 0) return 'medical';
  if (MEDICAL_CODE_RE.test(trimmed)) return 'medical';

  // List: bullet or numbered
  if (/^[-*•]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) return 'list';

  // Note: short, punchy (under 60 chars, no period)
  if (trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.includes('\n')) return 'note';

  return 'prose';
}

/**
 * Detect the language of a code block from its fence tag.
 */
function detectCodeLanguage(text: string): string | undefined {
  const match = text.match(/^```(\w+)/);
  return match ? match[1] : undefined;
}

/**
 * Main parser: parse a brain-dump string into categorized chunks.
 *
 * Algorithm:
 * 1. Split on double-newlines (paragraph boundaries)
 * 2. Re-associate fenced code blocks (which contain newlines)
 * 3. Classify each segment
 * 4. Build metadata (URLs, urgency, citations, etc.)
 * 5. Generate summary statistics
 */
export function parseBrainDump(rawText: string): ParsedBrainDump {
  const text = rawText.trim();
  if (!text) {
    return {
      chunks: [],
      summary: { totalChunks: 0, categories: {} as Record<ContentCategory, number>, urlCount: 0, codeBlockCount: 0, franticEntryCount: 0, legalRefCount: 0, medicalRefCount: 0 },
    };
  }

  // Phase 1: Re-associate fenced code blocks
  const segments: string[] = [];
  let lastIndex = 0;
  const codeRe = /```(\w+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  // Reset regex
  codeRe.lastIndex = 0;
  const codeBlocks: Array<{ language: string | undefined; code: string; full: string }> = [];

  while ((match = codeRe.exec(text)) !== null) {
    // Add text before this code block
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      // Split pre-code text on double newlines
      before.split(/\n\n+/).forEach((s) => { if (s.trim()) segments.push(s.trim()); });
    }
    const fullBlock = match[0];
    segments.push(fullBlock);
    codeBlocks.push({ language: match[1], code: match[2], full: fullBlock });
    lastIndex = match.index + fullBlock.length;
  }

  // Remaining text after last code block
  const after = text.slice(lastIndex).trim();
  if (after) {
    after.split(/\n\n+/).forEach((s) => { if (s.trim()) segments.push(s.trim()); });
  }

  // If no code blocks were found, fall back to simple paragraph split
  if (codeBlocks.length === 0) {
    const paragraphs = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
    segments.length = 0;
    segments.push(...paragraphs);
  }

  // Phase 2: Classify each segment and build ParsedChunk
  const chunks: ParsedChunk[] = [];
  let lineOffset = 0;

  for (const seg of segments) {
    const category = classifySegment(seg);
    const urls = extractUrls(seg);
    const statutes = extractStatutes(seg);
    const drugs = extractDrugNames(seg);
    const urgency = scoreUrgency(seg);

    const lineCount = seg.split('\n').length;

    const metadata: ParsedChunk['metadata'] = {};

    if (urls.length > 0) metadata.urls = urls;
    if (category === 'code') {
      metadata.codeLanguage = detectCodeLanguage(seg);
    }
    if (ALL_CAPS_RE.test(seg)) metadata.isAllCaps = true;
    if (urgency > 0) metadata.urgencyIndicators = urgency;
    if (statutes.length > 0) metadata.statuteCitations = statutes;
    if (drugs.length > 0) metadata.drugNames = drugs;

    chunks.push({
      text: seg,
      category,
      sourceLineRange: [lineOffset, lineOffset + lineCount - 1],
      metadata,
    });

    lineOffset += lineCount + 1; // +1 for the double-newline separator
  }

  // Phase 3: Build summary
  const categories: Record<ContentCategory, number> = {
    link: 0, code: 0, list: 0, frantic: 0,
    legal: 0, medical: 0, note: 0, prose: 0,
  };
  for (const c of chunks) categories[c.category]++;

  return {
    chunks,
    summary: {
      totalChunks: chunks.length,
      categories,
      urlCount: categories.link + chunks.reduce((a, c) => a + (c.metadata.urls?.length ?? 0), 0),
      codeBlockCount: categories.code,
      franticEntryCount: categories.frantic,
      legalRefCount: categories.legal,
      medicalRefCount: categories.medical,
    },
  };
}

/**
 * Convert parsed chunks into ingest-ready format for ChaosParser.
 * Each chunk gets its category as the source_door prefix.
 */
export function chunksToIngestFormat(chunks: ParsedChunk[]): Array<{
  text: string;
  sourceDoor: string;
  metadata: Record<string, unknown>;
}> {
  return chunks.map((c) => ({
    text: c.text,
    sourceDoor: `chaos-${c.category}`,
    metadata: {
      category: c.category,
      lineRange: c.sourceLineRange,
      ...c.metadata,
    },
  }));
}
