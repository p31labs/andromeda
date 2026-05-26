// P31 Gridiron: Sled Push Minigame (Track 1)
// Power timing drill for Strength & Blocking
// Manual mode: Hold and release at peak power

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult, TrainingStationId, SpoonState } from '../../types';

interface SledPushGameProps {
  spoonCount: SpoonState;
  onComplete: (result: MinigameResult) => void;
}

type GameState = 'READY' | 'CHARGING' | 'PUSHING' | 'DONE';

export function SledPushGame({ spoonCount, onComplete }: SledPushGameProps) {
  // Spoon adaptations
  const timeLimit = spoonCount === 1 ? 15 : spoonCount === 3 ? 30 : 45;
  const oscillationSpeed = spoonCount === 1 ? 3000 : spoonCount === 3 ? 2000 : 1500;
  const attemptsAllowed = spoonCount === 1 ? 2 : spoonCount === 3 ? 3 : 5;

  const [gameState, setGameState] = useState<GameState>('READY');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [attempts, setAttempts] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [powerLevel, setPowerLevel] = useState(0);  // 0-100
  const [isHolding, setIsHolding] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sledPosition, setSledPosition] = useState(0);  // 0-100 yards

  const gameStartTimeRef = useRef<number>(0);
  const powerIntervalRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);

  // Power meter oscillation
  useEffect(() => {
    if (gameState === 'CHARGING') {
      powerIntervalRef.current = window.setInterval(() => {
        setPowerLevel(prev => {
          let next = prev + directionRef.current * 2;
          if (next >= 100) {
            next = 100;
            directionRef.current = -1;
          } else if (next <= 0) {
            next = 0;
            directionRef.current = 1;
          }
          return next;
        });
      }, oscillationSpeed / 100);
    } else if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
    }

    return () => {
      if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    };
  }, [gameState, oscillationSpeed]);

  // Game timer
  useEffect(() => {
    if (gameState === 'CHARGING' || gameState === 'PUSHING') {
      gameTimerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('CHARGING');
    setTimeLeft(timeLimit);
    setAttempts(0);
    setScores([]);
    setPowerLevel(0);
    setSledPosition(0);
    setFeedback('Hold SPACE to charge... Release at peak!');
    gameStartTimeRef.current = Date.now();
    directionRef.current = 1;
  }, [timeLimit]);

  const handleChargeStart = useCallback(() => {
    if (gameState !== 'CHARGING') return;
    setIsHolding(true);
    setFeedback('Charging power...');
  }, [gameState]);

  const handleChargeRelease = useCallback(() => {
    if (gameState !== 'CHARGING' || !isHolding) return;
    setIsHolding(false);

    // Calculate score based on power level (optimal: 75-95)
    let points = 0;
    let feedbackMsg = '';

    if (powerLevel >= 90 && powerLevel <= 95) {
      points = 100;
      feedbackMsg = 'MAX POWER! 🔥';
    } else if (powerLevel >= 75 && powerLevel < 90) {
      points = 85;
      feedbackMsg = 'STRONG PUSH!';
    } else if (powerLevel >= 50 && powerLevel < 75) {
      points = 60;
      feedbackMsg = 'SOLID';
    } else {
      points = 30;
      feedbackMsg = 'WEAK';
    }

    setScores(prev => [...prev, points]);
    setAttempts(prev => {
      const newAttempts = prev + 1;
      if (newAttempts >= attemptsAllowed) {
        setTimeout(endGame, 1000);
      } else {
        // Reset for next attempt
        setTimeout(() => {
          setPowerLevel(0);
          directionRef.current = 1;
          setFeedback('Next attempt... Hold at peak!');
        }, 1000);
      }
      return newAttempts;
    });

    setFeedback(feedbackMsg);

    // Animate sled push
    setGameState('PUSHING');
    const pushDistance = (points / 100) * 20;  // Max 20 yards per push
    setSledPosition(prev => Math.min(100, prev + pushDistance));

    setTimeout(() => {
      if (attempts < attemptsAllowed - 1) {
        setGameState('CHARGING');
      }
    }, 1500);
  }, [gameState, isHolding, powerLevel, attempts, attemptsAllowed]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const totalYards = sledPosition;

    // Final score: 70% average power score + 30% total yards
    const finalScore = Math.round(avgScore * 0.7 + (totalYards / 100) * 30 * 0.3);

    const result: MinigameResult = {
      station: 'sledPush' as TrainingStationId,
      score: finalScore,
      attributesImproved: ['strength', 'blocking'],
      xpGained: finalScore * 0.5,
      energyBurned: attempts * 25,
      fatigueDelta: attempts * 5,
      duration,
      timestamp: new Date().toISOString(),
    };

    setGameState('DONE');
    onComplete(result);
  }, [scores, sledPosition, attempts, onComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'READY') {
          startGame();
        } else if (gameState === 'CHARGING' && !isHolding) {
          handleChargeStart();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'CHARGING') {
        e.preventDefault();
        handleChargeRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isHolding, startGame, handleChargeStart, handleChargeRelease]);

  // Mouse/touch controls
  const handleMouseDown = () => {
    if (gameState === 'CHARGING' && !isHolding) {
      handleChargeStart();
    }
  };

  const handleMouseUp = () => {
    if (gameState === 'CHARGING' && isHolding) {
      handleChargeRelease();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>SLED PUSH POWER</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s | Attempt {attempts + 1}/{attemptsAllowed}</div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{Math.round(sledPosition)}</div>
          <div style={styles.statLabel}>Yards</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{scores.length > 0 ? Math.round(scores[scores.length - 1]) : 0}</div>
          <div style={styles.statLabel}>Last Push</div>
        </div>
      </div>

      <div style={styles.feedback}>{feedback}</div>

      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Build Lower Body Power!</div>
            <div style={styles.readySubtext}>
              Hold SPACE when power meter peaks (75-95%)
              <br />
              Push the sled as far as possible!
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START DRILL
            </button>
          </div>
        )}

        {(gameState === 'CHARGING' || gameState === 'PUSHING') && (
          <>
            {/* Field with yard lines */}
            <div style={styles.field}>
              {[0, 20, 40, 60, 80, 100].map(yard => (
                <div key={yard} style={{...styles.yardLine, left: `${yard}%`}}>
                  <span style={styles.yardNumber}>{yard}</span>
                </div>
              ))}

              {/* Sled */}
              <div style={{...styles.sled, left: `${sledPosition}%`}}>
                🛷
                <div style={styles.sledTrail} />
              </div>

              {/* Lineman */}
              <div style={{...styles.lineman, left: `${sledPosition - 5}%`}}>
                🏈
              </div>
            </div>

            {/* Power Meter */}
            <div
              style={styles.powerMeterContainer}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={(e) => { e.preventDefault(); handleMouseDown(); }}
              onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
            >
              <div style={styles.powerMeterLabel}>POWER</div>
              <div style={styles.powerMeterTrack}>
                {/* Sweet spot indicator */}
                <div style={styles.sweetSpot} />

                {/* Power bar */}
                <div style={{...styles.powerBar, width: `${powerLevel}%`}} />

                {/* Peak marker */}
                <div style={{...styles.peakMarker, left: `${powerLevel}%`}} />
              </div>
              <div style={styles.powerValue}>{Math.round(powerLevel)}%</div>
            </div>

            <div style={styles.hint}>
              {isHolding ? 'Release at peak!' : 'Hold SPACE or click to charge'}
            </div>
          </>
        )}

        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Drill Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 0.7 + (sledPosition / 100) * 30 * 0.3)}/100</div>
              <div>{Math.round(sledPosition)} yards pushed • {attempts} attempts</div>
              <div>Average Power: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%</div>
            </div>
          </div>
        )}
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
    color: '#ff9800',
  },
  timer: {
    fontSize: '1rem',
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
    gap: '1rem',
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
    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
  },
  field: {
    width: '100%',
    height: '120px',
    background: 'linear-gradient(180deg, #2d5c2d 0%, #1a4d1a 100%)',
    borderRadius: '8px',
    position: 'relative',
    overflow: 'hidden',
  },
  yardLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    background: 'rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '5px',
  },
  yardNumber: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sled: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '2.5rem',
    transition: 'left 0.5s ease-out',
    zIndex: 10,
  },
  sledTrail: {
    position: 'absolute',
    bottom: '0',
    left: '-20px',
    right: '100%',
    height: '4px',
    background: 'rgba(139, 69, 19, 0.5)',
    borderRadius: '2px',
  },
  lineman: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '2rem',
    transition: 'left 0.3s ease-out',
    zIndex: 5,
  },
  powerMeterContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation',
  },
  powerMeterLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#ff9800',
  },
  powerMeterTrack: {
    width: '100%',
    height: '40px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  sweetSpot: {
    position: 'absolute',
    left: '75%',
    width: '20%',
    height: '100%',
    background: 'linear-gradient(90deg, rgba(76, 175, 80, 0.3) 0%, rgba(76, 175, 80, 0.5) 50%, rgba(76, 175, 80, 0.3) 100%)',
  },
  powerBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff5722 0%, #ff9800 50%, #4caf50 75%, #ff9800 100%)',
    borderRadius: '20px',
    transition: 'width 0.05s linear',
  },
  peakMarker: {
    position: 'absolute',
    top: '-5px',
    width: '4px',
    height: '50px',
    background: '#fff',
    borderRadius: '2px',
    transform: 'translateX(-50%)',
    boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
  },
  powerValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#ff9800',
  },
  hint: {
    fontSize: '0.9rem',
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
};
