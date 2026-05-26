/**
 * Magnetic Poetry App
 * Main application component for P31 Arcade Game 3
 */

import React, { useState, useCallback, useEffect } from 'react';
import { WordCanvas } from './components/WordCanvas';
import { WordPalette } from './components/WordPalette';
import { PoemEvaluator } from './components/PoemEvaluator';
import { SpoonIndicator } from './components/SpoonIndicator';
import type { SpoonState, WordBall, Word, Poem, Vector3 } from '@p31/physics';
import type { GameState } from './types';
import { WORD_DATABASE } from './types';
import { ReturnRibbon } from '@p31/arcade-theme';
import './styles.css';

const App: React.FC = () => {
  const [spoonState, setSpoonState] = useState<SpoonState>(3);
  const [gameState, setGameState] = useState<GameState>({
    spoonState: 3,
    mode: 'sandbox',
    wordBalls: [],
    availableWords: WORD_DATABASE,
    selectedWordId: null,
    poem: null,
    audioEnabled: true,
    hapticEnabled: false,
  });

  const [savedPoems, setSavedPoems] = useState<Poem[]>([]);

  // Handle adding a word
  const handleAddWord = useCallback((word: Word) => {
    // Find random empty position
    const position: Vector3 = {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 6,
      z: (Math.random() - 0.5) * 2,
    };

    const newBall: WordBall = {
      word,
      position,
      velocity: { x: 0, y: 0, z: 0 },
      isFrozen: true,
      isSelected: false,
      connections: [],
    };

    setGameState(prev => ({
      ...prev,
      wordBalls: [...prev.wordBalls, newBall],
    }));
  }, []);

  // Handle word collision (TTS)
  const handleCollision = useCallback((wordA: Word, wordB: Word) => {
    if (!gameState.audioEnabled) return;

    // Simple speech synthesis
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`${wordA.text}... ${wordB.text}`);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.3;
      window.speechSynthesis.speak(utterance);
    }
  }, [gameState.audioEnabled]);

  // Handle saving poem
  const handleSavePoem = useCallback((poem: Poem) => {
    setSavedPoems(prev => [poem, ...prev]);

    // Award XP
    window.dispatchEvent(new CustomEvent('p31-xp-update', {
      detail: { xp: poem.score, source: 'magnetic-poetry' }
    }));

    // Reset
    setGameState(prev => ({
      ...prev,
      wordBalls: [],
    }));
  }, []);

  // Clear all words
  const handleClear = () => {
    setGameState(prev => ({
      ...prev,
      wordBalls: [],
      selectedWordId: null,
    }));
  };

  // Remove selected word
  const handleRemoveSelected = () => {
    if (!gameState.selectedWordId) return;
    setGameState(prev => ({
      ...prev,
      wordBalls: prev.wordBalls.filter(b => b.word.id !== prev.selectedWordId),
      selectedWordId: null,
    }));
  };

  // Update word balls from canvas
  const handleWordBallsChange = useCallback((wordBalls: WordBall[]) => {
    setGameState(prev => ({ ...prev, wordBalls }));
  }, []);

  return (
    <div className="app" style={appStyles.container}>
      <header style={appStyles.header}>
        <h1 style={appStyles.logo}>🧲 Magnetic Poetry</h1>
        <div style={appStyles.controls}>
          <button
            style={appStyles.controlButton}
            onClick={() => setGameState(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }))}
          >
            {gameState.audioEnabled ? '🔊 TTS On' : '🔇 TTS Off'}
          </button>
          <button style={appStyles.controlButton} onClick={handleRemoveSelected}>
            🗑️ Remove
          </button>
          <button style={appStyles.controlButton} onClick={handleClear}>
            🔄 Clear
          </button>
        </div>
      </header>

      <main style={appStyles.main}>
        <div style={appStyles.canvasContainer}>
          <WordCanvas
            spoonState={spoonState}
            wordBalls={gameState.wordBalls}
            selectedWordId={gameState.selectedWordId}
            onWordBallsChange={handleWordBallsChange}
            onSelectWord={id => setGameState(prev => ({ ...prev, selectedWordId: id }))}
            onCollision={handleCollision}
          />

          <div style={appStyles.instructions}>
            <div>🖱️ Click word to select • Drag to move</div>
            <div>Words attract based on meaning!</div>
          </div>
        </div>

        <aside style={appStyles.sidebar}>
          <SpoonIndicator spoonState={spoonState} onChange={setSpoonState} />

          <WordPalette
            spoonState={spoonState}
            onAddWord={handleAddWord}
            currentCount={gameState.wordBalls.length}
          />

          <PoemEvaluator
            wordBalls={gameState.wordBalls}
            onSavePoem={handleSavePoem}
          />

          {savedPoems.length > 0 && (
            <div style={appStyles.savedPoems}>
              <h4>Saved Poems ({savedPoems.length})</h4>
              {savedPoems.slice(0, 3).map(poem => (
                <div key={poem.id} style={appStyles.savedPoem}>
                  <span>{poem.words.length} words</span>
                  <span>{poem.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>

      <ReturnRibbon currentApp="magnetic-poetry" />
    </div>
  );
};

const appStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#100a15',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(147, 112, 219, 0.2)',
    background: 'rgba(0, 0, 0, 0.5)',
  },
  logo: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #9370db, #ff1493)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  controlButton: {
    padding: '8px 16px',
    background: 'rgba(147, 112, 219, 0.2)',
    border: '1px solid rgba(147, 112, 219, 0.3)',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  instructions: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#888',
  },
  sidebar: {
    width: '320px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'auto',
    borderLeft: '1px solid rgba(147, 112, 219, 0.2)',
  },
  savedPoems: {
    background: 'rgba(16, 10, 21, 0.9)',
    border: '1px solid rgba(147, 112, 219, 0.3)',
    borderRadius: '12px',
    padding: '16px',
  },
  savedPoem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    fontSize: '12px',
    color: '#888',
  },
};

export default App;
