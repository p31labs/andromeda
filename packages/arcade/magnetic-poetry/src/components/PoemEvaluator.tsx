/**
 * Poem Evaluator Component
 * Scoring and analysis for poems
 */

import React from 'react';
import type { WordBall, Poem } from '@p31/physics';

interface PoemEvaluatorProps {
  wordBalls: WordBall[];
  onSavePoem: (poem: Poem) => void;
}

export const PoemEvaluator: React.FC<PoemEvaluatorProps> = ({
  wordBalls,
  onSavePoem,
}) => {
  const words = wordBalls.map(b => b.word.text);
  const text = words.join(' ');

  // Simple haiku detection (5-7-5 syllables)
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const isHaiku = detectHaikuStructure(words);

  // Semantic coherence
  const coherence = calculateCoherence(wordBalls);

  // Score
  const score = Math.round(
    (isHaiku ? 50 : 0) +
    (coherence * 50)
  );

  const handleSave = () => {
    const poem: Poem = {
      id: crypto.randomUUID(),
      words: wordBalls,
      structure: isHaiku ? 'haiku' : 'free',
      score,
      semanticCoherence: coherence,
      createdAt: new Date().toISOString(),
      isPublic: false,
    };
    onSavePoem(poem);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📜 Poem Evaluation</h3>

      <div style={styles.poemDisplay}>
        {words.length > 0 ? (
          words.map((w, i) => <span key={i} style={styles.word}>{w} </span>)
        ) : (
          <span style={styles.placeholder}>Add words to create a poem...</span>
        )}
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Words</span>
          <span style={styles.statValue}>{words.length}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Syllables</span>
          <span style={styles.statValue}>{syllableCount}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Structure</span>
          <span style={styles.statValue}>{isHaiku ? '🌸 Haiku' : 'Free'}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Coherence</span>
          <span style={styles.statValue}>{(coherence * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div style={styles.scoreSection}>
        <div style={styles.scoreLabel}>Score</div>
        <div style={styles.scoreValue}>{score}</div>
      </div>

      <button
        style={{
          ...styles.saveButton,
          opacity: words.length > 0 ? 1 : 0.5,
        }}
        onClick={handleSave}
        disabled={words.length === 0}
      >
        💾 Save Poem
      </button>

      {isHaiku && (
        <div style={styles.haikuBadge}>
          🎉 Haiku detected! +50 points
        </div>
      )}
    </div>
  );
};

// Helper functions
function countSyllables(word: string): number {
  // Very simplified syllable counting
  const vowels = word.match(/[aeiouy]/gi);
  return vowels ? Math.max(1, vowels.length) : 1;
}

function detectHaikuStructure(words: string[]): boolean {
  if (words.length < 3) return false;

  let syllables = 0;
  let line1 = 0, line2 = 0, line3 = 0;

  for (const word of words) {
    const count = countSyllables(word);
    if (line1 < 5) {
      line1 += count;
    } else if (line2 < 7) {
      line2 += count;
    } else {
      line3 += count;
    }
    syllables += count;
  }

  return line1 === 5 && line2 === 7 && line3 === 5;
}

function calculateCoherence(wordBalls: WordBall[]): number {
  if (wordBalls.length < 2) return 0;

  let totalSimilarity = 0;
  let connections = 0;

  for (let i = 0; i < wordBalls.length; i++) {
    for (let j = i + 1; j < wordBalls.length; j++) {
      const ballA = wordBalls[i];
      const ballB = wordBalls[j];

      // Check if words are close in space
      const dist = Math.sqrt(
        Math.pow(ballA.position.x - ballB.position.x, 2) +
        Math.pow(ballA.position.y - ballB.position.y, 2) +
        Math.pow(ballA.position.z - ballB.position.z, 2)
      );

      if (dist < 2.0) {
        // Calculate cosine similarity
        const sim = cosineSimilarity(ballA.word.embedding, ballB.word.embedding);
        totalSimilarity += sim;
        connections++;
      }
    }
  }

  return connections > 0 ? totalSimilarity / connections : 0;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(16, 10, 21, 0.9)',
    border: '1px solid rgba(147, 112, 219, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    minWidth: '280px',
  },
  title: {
    margin: '0 0 16px 0',
    color: '#fff',
    fontSize: '18px',
  },
  poemDisplay: {
    minHeight: '60px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    marginBottom: '16px',
    lineHeight: 1.6,
  },
  word: {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '2px',
    background: 'rgba(147, 112, 219, 0.3)',
    borderRadius: '4px',
  },
  placeholder: {
    color: '#666',
    fontStyle: 'italic',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  scoreSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.3), rgba(255, 20, 147, 0.3))',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  scoreLabel: {
    color: '#fff',
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffd700',
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #9370db, #ff1493)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  haikuBadge: {
    marginTop: '12px',
    padding: '10px',
    background: 'rgba(100, 255, 100, 0.2)',
    border: '1px solid #64ff64',
    borderRadius: '8px',
    color: '#64ff64',
    textAlign: 'center',
    fontSize: '13px',
  },
};

export default PoemEvaluator;
