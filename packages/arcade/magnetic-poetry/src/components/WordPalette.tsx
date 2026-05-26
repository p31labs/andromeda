/**
 * Word Palette Component
 * Available words drawer
 */

import React from 'react';
import type { Word, WordCategory, SpoonState } from '@p31/physics';
import { WORD_DATABASE, SPOON_CONFIGS } from '../types';

interface WordPaletteProps {
  spoonState: SpoonState;
  onAddWord: (word: Word) => void;
  currentCount: number;
}

const CATEGORY_COLORS: Record<WordCategory, string> = {
  nature: '#4a90d9',
  emotion: '#ff1493',
  abstract: '#9370db',
  action: '#ff6347',
  descriptor: '#ffd700',
};

const CATEGORY_ICONS: Record<WordCategory, string> = {
  nature: '🌿',
  emotion: '💝',
  abstract: '💭',
  action: '⚡',
  descriptor: '✨',
};

export const WordPalette: React.FC<WordPaletteProps> = ({
  spoonState,
  onAddWord,
  currentCount,
}) => {
  const config = SPOON_CONFIGS[spoonState];
  const remaining = config.maxWords - currentCount;

  const wordsByCategory = WORD_DATABASE.reduce((acc, word) => {
    if (!acc[word.category]) acc[word.category] = [];
    acc[word.category].push(word);
    return acc;
  }, {} as Record<WordCategory, Word[]>);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Word Palette</h3>
        <span style={styles.count}>{remaining} slots</span>
      </div>

      {(Object.keys(wordsByCategory) as WordCategory[]).map(category => (
        <div key={category} style={styles.category}>
          <div style={{ ...styles.categoryHeader, color: CATEGORY_COLORS[category] }}>
            <span>{CATEGORY_ICONS[category]}</span>
            <span>{category}</span>
          </div>
          <div style={styles.words}>
            {wordsByCategory[category].map(word => (
              <button
                key={word.id}
                style={{
                  ...styles.word,
                  background: CATEGORY_COLORS[category] + '40',
                  borderColor: CATEGORY_COLORS[category],
                  opacity: remaining > 0 ? 1 : 0.5,
                }}
                onClick={() => remaining > 0 && onAddWord(word)}
                disabled={remaining === 0}
              >
                {word.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(16, 10, 21, 0.9)',
    border: '1px solid rgba(147, 112, 219, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    minWidth: '200px',
    maxHeight: '100%',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: '16px',
  },
  count: {
    color: '#9370db',
    fontSize: '12px',
  },
  category: {
    marginBottom: '12px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  words: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  word: {
    padding: '6px 12px',
    border: '1px solid',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'all 0.2s ease',
  },
};

export default WordPalette;
