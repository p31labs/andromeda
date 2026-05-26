// P31 Gridiron: Cone Drills Minigame (Track 1)
// Rhythm-based footwork for Speed & Agility
// Tap arrow keys in sequence

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult, TrainingStationId, SpoonState } from '../../types';

interface ConeDrillGameProps {
  spoonCount: SpoonState;
  onComplete: (result: MinigameResult) => void;
}

type GameState = 'READY' | 'PLAYING' | 'DONE';
type Direction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

const DIRECTION_ARROWS: Record<Direction, string> = {
  LEFT: '←',
  RIGHT: '→',
  UP: '↑',
  DOWN: '↓',
};

export function ConeDrillGame({ spoonCount, onComplete }: ConeDrillGameProps) {
  // Spoon adaptations
  const timeLimit = spoonCount === 1 ? 15 : spoonCount === 3 ? 25 : 35;
  const sequenceLength = spoonCount === 1 ? 4 : spoonCount === 3 ? 6 : 8;
  const inputWindow = spoonCount === 1 ? 1200 : spoonCount === 3 ? 1000 : 800;

  const [gameState, setGameState] = useState<GameState>('READY');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [sequence, setSequence] = useState<Direction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [lastInput, setLastInput] = useState<Direction | null>(null);

  const gameStartTimeRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);
  const inputTimeoutRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
  }, []);

  const generateSequence = useCallback((): Direction[] => {
    const directions: Direction[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
    const newSequence: Direction[] = [];

    for (let i = 0; i < sequenceLength; i++) {
      // Avoid same direction twice in a row for variety
      let dir: Direction;
      do {
        dir = directions[Math.floor(Math.random() * directions.length)];
      } while (i > 0 && dir === newSequence[i - 1]);
      newSequence.push(dir);
    }

    return newSequence;
  }, [sequenceLength]);

  const startGame = useCallback(() => {
    const newSeq = generateSequence();
    setSequence(newSeq);
    setGameState('PLAYING');
    setTimeLeft(timeLimit);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setFeedback('Follow the pattern!');
    setLastInput(null);
    gameStartTimeRef.current = Date.now();

    // Game timer
    const timer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearAllTimers();
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timersRef.current.push(timer);

    // Input timeout
    resetInputTimeout();
  }, [timeLimit, generateSequence]);

  const resetInputTimeout = useCallback(() => {
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    inputTimeoutRef.current = window.setTimeout(() => {
      setFeedback('Too slow!');
      setStreak(0);
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= sequence.length) {
          // Generate new sequence
          setTimeout(() => {
            setSequence(generateSequence());
            setCurrentIndex(0);
            setFeedback('New pattern!');
          }, 500);
          return 0;
        }
        return next;
      });
      resetInputTimeout();
    }, inputWindow);
  }, [inputWindow, sequence.length, generateSequence]);

  const handleInput = useCallback((direction: Direction) => {
    if (gameState !== 'PLAYING') return;

    const expected = sequence[currentIndex];
    setLastInput(direction);

    if (direction === expected) {
      // Correct!
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(prev => Math.max(prev, newStreak));
      setScore(prev => prev + 10 + Math.min(50, newStreak * 2));
      setFeedback('Perfect! 🔥');

      const nextIndex = currentIndex + 1;
      if (nextIndex >= sequence.length) {
        // Completed sequence!
        setScore(prev => prev + 50);  // Bonus
        setFeedback('Pattern complete!');
        setTimeout(() => {
          setSequence(generateSequence());
          setCurrentIndex(0);
          setStreak(0);
        }, 500);
      } else {
        setCurrentIndex(nextIndex);
        resetInputTimeout();
      }
    } else {
      // Wrong!
      setStreak(0);
      setFeedback('Miss!');
      const nextIndex = currentIndex + 1;
      if (nextIndex >= sequence.length) {
        setTimeout(() => {
          setSequence(generateSequence());
          setCurrentIndex(0);
        }, 500);
      } else {
        setCurrentIndex(nextIndex);
        resetInputTimeout();
      }
    }
  }, [gameState, sequence, currentIndex, streak, generateSequence, resetInputTimeout]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;

    // Score calculation:
    // 60% based on total score
    // 40% based on max streak
    const maxStreakScore = Math.min(100, maxStreak * 10);
    const finalScore = Math.min(100, Math.round(score * 0.6 + maxStreakScore * 0.4));

    const result: MinigameResult = {
      station: 'coneDrills' as TrainingStationId,
      score: finalScore,
      attributesImproved: ['speed', 'agility'],
      xpGained: finalScore * 0.6,
      energyBurned: 20,
      fatigueDelta: 4,
      duration,
      timestamp: new Date().toISOString(),
    };

    setGameState('DONE');
    onComplete(result);
  }, [score, maxStreak, onComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'READY') {
        e.preventDefault();
        startGame();
        return;
      }

      if (gameState !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          handleInput('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          handleInput('RIGHT');
          break;
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          handleInput('UP');
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          handleInput('DOWN');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, handleInput]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>CONE DRILLS</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{score}</div>
          <div style={styles.statLabel}>Score</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: streak > 5 ? '#4caf50' : '#4fc3f7'}}>
            {streak}
          </div>
          <div style={styles.statLabel}>Streak</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{maxStreak}</div>
          <div style={styles.statLabel}>Best</div>
        </div>
      </div>

      <div style={styles.feedback}>{feedback}</div>

      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Footwork Speed Training</div>
            <div style={styles.readySubtext}>
              Tap arrow keys (or WASD) in the shown pattern
              <br />
              Build streaks for bonus points!
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START DRILL
            </button>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <>
            {/* Cone pattern visualization */}
            <div style={styles.conePattern}>
              {sequence.map((dir, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.cone,
                    ...(idx < currentIndex && styles.coneHit),
                    ...(idx === currentIndex && styles.coneActive),
                    ...(idx > currentIndex && styles.conePending),
                  }}
                >
                  <span style={styles.coneArrow}>{DIRECTION_ARROWS[dir]}</span>
                  {idx === currentIndex && (
                    <div style={styles.timerBar}>
                      <div style={styles.timerProgress} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Player position indicator */}
            <div style={styles.playerZone}>
              <div style={styles.playerIcon}>🏃</div>
              <div style={styles.footprints}>
                {lastInput && (
                  <span style={styles.footprint}>{DIRECTION_ARROWS[lastInput]}</span>
                )}
              </div>
            </div>

            {/* Progress */}
            <div style={styles.progress}>
              Pattern {Math.floor(score / 100) + 1} • Step {currentIndex + 1}/{sequence.length}
            </div>
          </>
        )}

        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Drill Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.min(100, Math.round(score * 0.6 + Math.min(100, maxStreak * 10) * 0.4))}/100</div>
              <div>{score} points • Max streak: {maxStreak}</div>
              <div>Speed & Agility improved!</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <div style={styles.controlKey}>←</div>
        <div style={styles.controlKey}>↑</div>
        <div style={styles.controlKey}>↓</div>
        <div style={styles.controlKey}>→</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1rem',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '12px',
    minHeight: '450px',
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '450px',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#4caf50',
  },
  timer: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: '450px',
    marginBottom: '1rem',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  feedback: {
    height: '2rem',
    fontSize: '1.2rem',
    color: '#ffd54f',
    marginBottom: '1rem',
    fontWeight: 'bold',
  },
  gameArea: {
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  readyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'center',
    padding: '2rem',
  },
  readyText: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
  },
  readySubtext: {
    fontSize: '0.95rem',
    opacity: 0.8,
  },
  startButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4)',
  },
  conePattern: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: '1rem',
  },
  cone: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'rgba(255, 152, 0, 0.3)',
    border: '3px solid rgba(255, 152, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  coneHit: {
    background: 'rgba(76, 175, 80, 0.5)',
    borderColor: '#4caf50',
    transform: 'scale(0.9)',
  },
  coneActive: {
    background: 'rgba(255, 152, 0, 0.6)',
    borderColor: '#ff9800',
    transform: 'scale(1.1)',
    boxShadow: '0 0 20px rgba(255, 152, 0, 0.5)',
  },
  conePending: {
    opacity: 0.4,
  },
  coneArrow: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  timerBar: {
    position: 'absolute',
    bottom: '-8px',
    left: '10%',
    width: '80%',
    height: '4px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  timerProgress: {
    width: '100%',
    height: '100%',
    background: '#ff5722',
    animation: 'shrink 1s linear',
  },
  playerZone: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
  },
  playerIcon: {
    fontSize: '3rem',
  },
  footprints: {
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
  footprint: {
    fontSize: '2rem',
    color: '#4fc3f7',
  },
  progress: {
    fontSize: '1rem',
    opacity: 0.7,
  },
  doneState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '2rem',
  },
  doneTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4caf50',
  },
  results: {
    textAlign: 'center',
    fontSize: '1.1rem',
  },
  controls: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  controlKey: {
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
};
