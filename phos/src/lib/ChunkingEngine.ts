/**
 * ChunkingEngine.ts — Semantic text chunking for knowledge graph ingestion.
 *
 * Replaces naive paragraph splitting with structure-aware chunking that:
 * - Detects semantic boundaries (headers, sections, numbered lists)
 * - Enforces target chunk size with overlap for context preservation
 * - Tags each chunk with structural metadata (heading level, list position)
 * - Escapes/protects code blocks from being split mid-block
 *
 * Designed for nomic-embed-text (max 8192 tokens ≈ 6000 chars).
 * Target chunk: 500-800 chars. Overlap: 60 chars (~10%).
 */

export interface TextChunk {
  text: string;
  heading: string | null;
  chunkIndex: number;
  totalChunks: number;
  charCount: number;
  isCodeBlock: boolean;
  sourceLineRange: [number, number];
}

export interface ChunkingOptions {
  targetSize?: number;
  overlap?: number;
  minChunkSize?: number;
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  targetSize: 700,
  overlap: 60,
  minChunkSize: 40,
};

const HEADER_RE = /^#{1,6}\s+(.+)$/gm;
const NUMBERED_ITEM_RE = /^\d+[.)]\s+(.+)$/gm;
const BULLET_ITEM_RE = /^[-*]\s+(.+)$/gm;
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const WORD_BOUNDARY_RE = /\s+/;

/**
 * Find the nearest word boundary before `maxLen` in a string.
 * Prevents splitting mid-word when truncating.
 */
function findBoundary(text: string, maxLen: number): number {
  if (text.length <= maxLen) return text.length;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const lastNewline = slice.lastIndexOf('\n');
  const breakPoint = Math.max(lastSpace, lastNewline);
  return breakPoint > maxLen * 0.5 ? breakPoint : maxLen;
}

/**
 * Protect code blocks by replacing them with placeholders during chunking,
 * then restoring them after. Prevents splitting ```` ``` ```` blocks mid-stream.
 */
function protectCodeBlocks(text: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];
  const protectedText = text.replace(CODE_BLOCK_RE, (match) => {
    blocks.push(match);
    return `__CODE_BLOCK_${blocks.length - 1}__`;
  });
  return { text: protectedText, blocks };
}

function restoreCodeBlocks(text: string, blocks: string[]): string {
  let result = text;
  for (let i = 0; i < blocks.length; i++) {
    result = result.replace(`__CODE_BLOCK_${i}__`, blocks[i]);
  }
  return result;
}

/**
 * Detect heading lines and extract the deepest heading
 * that applies to the given character offset.
 */
function findHeadingForOffset(
  text: string,
  lineRanges: Array<{ start: number; end: number; text: string }>,
  offset: number,
): string | null {
  let currentHeading: string | null = null;
  for (const range of lineRanges) {
    if (range.start > offset) break;
    const headerMatch = range.text.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) currentHeading = headerMatch[1].trim();
  }
  return currentHeading;
}

/**
 * Split text into lines with their character offsets.
 */
function getLineRanges(text: string): Array<{ start: number; end: number; text: string }> {
  const lines = text.split('\n');
  const ranges: Array<{ start: number; end: number; text: string }> = [];
  let offset = 0;
  for (const line of lines) {
    ranges.push({ start: offset, end: offset + line.length, text: line });
    offset += line.length + 1; // +1 for newline
  }
  return ranges;
}

/**
 * Primary chunking function. Splits text into semantic chunks.
 *
 * Algorithm:
 * 1. Protect code blocks
 * 2. Split on semantic boundaries: double-newlines, headers, list items
 * 3. Merge small segments up to targetSize
 * 4. Split large segments at word boundaries
 * 5. Add overlap from previous chunk to next chunk
 * 6. Restore code blocks
 * 7. Tag each chunk with heading, index, line range
 */
export function semanticChunker(rawText: string, options: ChunkingOptions = {}): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const text = rawText.trim();
  if (!text || text.length < opts.minChunkSize) return [];

  const { text: protectedText, blocks } = protectCodeBlocks(text);
  const lineRanges = getLineRanges(protectedText);

  // Phase 1: Split on strong boundaries
  // Split on: double-newlines, headers (any level), horizontal rules
  const segments = protectedText
    .split(/(?:\n\s*\n|^#{1,6}\s+.+$|^\s*[-=]{3,}\s*$)/m)
    .map((s) => s.trim())
    .filter((s) => s.length >= opts.minChunkSize);

  if (segments.length === 0) {
    // No clear boundaries detected — treat as single segment
    segments.push(protectedText.trim());
  }

  // Phase 2: Merge undersized adjacent segments, split oversized ones
  const merged: string[] = [];
  let buffer = '';

  for (const seg of segments) {
    if (buffer.length === 0) {
      buffer = seg;
    } else if (buffer.length + seg.length + 1 <= opts.targetSize) {
      buffer += '\n\n' + seg;
    } else {
      merged.push(buffer);
      buffer = seg;
    }
    // If buffer exceeds target, flush it (respecting word boundaries)
    if (buffer.length > opts.targetSize * 1.5) {
      while (buffer.length > opts.targetSize) {
        const breakAt = findBoundary(buffer, opts.targetSize);
        merged.push(buffer.slice(0, breakAt).trim());
        buffer = buffer.slice(Math.max(0, breakAt - opts.overlap)).trim();
      }
    }
  }
  if (buffer.length >= opts.minChunkSize) {
    merged.push(buffer);
  }

  // Phase 3: Build TextChunk objects with metadata
  const chunks: TextChunk[] = [];
  let globalOffset = 0;

  for (let i = 0; i < merged.length; i++) {
    let chunkText = restoreCodeBlocks(merged[i], blocks);
    const isCodeBlock = chunkText.includes('```');

    // Find the character offset of this chunk in the original text
    const idx = protectedText.indexOf(merged[i], globalOffset);
    const chunkOffset = idx >= 0 ? idx : globalOffset;

    // Determine heading for this chunk's position
    const heading = findHeadingForOffset(protectedText, lineRanges, chunkOffset);

    // Calculate line range
    const startLine = lineRanges.findIndex((lr) => lr.start <= chunkOffset && lr.end >= chunkOffset);
    let endLine = startLine;
    for (let j = startLine; j < lineRanges.length; j++) {
      if (lineRanges[j].start >= chunkOffset + chunkText.length) {
        endLine = Math.max(startLine, j - 1);
        break;
      }
      endLine = j;
    }

    chunks.push({
      text: chunkText,
      heading,
      chunkIndex: i,
      totalChunks: merged.length,
      charCount: chunkText.length,
      isCodeBlock,
      sourceLineRange: [Math.max(0, startLine), endLine],
    });

    globalOffset = chunkOffset + merged[i].length;
  }

  // Phase 4: Update totalChunks count
  for (const c of chunks) c.totalChunks = chunks.length;

  return chunks;
}

/**
 * Quick-split mode for bulk ingest. Uses paragraph boundaries only.
 * Faster than semanticChunker for large document batches where
 * heading structure doesn't matter.
 */
export function paragraphChunker(rawText: string, options: ChunkingOptions = {}): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { text: protectedText, blocks } = protectCodeBlocks(rawText.trim());

  const segments = protectedText
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= opts.minChunkSize);

  if (segments.length === 0) return [];

  const chunks: TextChunk[] = [];
  let buffer = '';

  for (const seg of segments) {
    if (buffer.length === 0) {
      buffer = seg;
    } else if (buffer.length + seg.length + 2 <= opts.targetSize) {
      buffer += '\n\n' + seg;
    } else {
      chunks.push(buffer);
      buffer = seg;
    }
  }
  if (buffer.length >= opts.minChunkSize) chunks.push(buffer);

  return chunks.map((text, i) => ({
    text: restoreCodeBlocks(text, blocks),
    heading: null,
    chunkIndex: i,
    totalChunks: chunks.length,
    charCount: text.length,
    isCodeBlock: text.includes('```'),
    sourceLineRange: [0, 0] as [number, number],
  }));
}

/**
 * Estimate token count for a string.
 * Uses ~4 chars/token heuristic for English text.
 * Conservative overestimate to stay under model limits.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Check if a chunk fits within nomic-embed-text's context window.
 */
export function isWithinTokenLimit(text: string): boolean {
  return estimateTokens(text) <= 8192;
}
