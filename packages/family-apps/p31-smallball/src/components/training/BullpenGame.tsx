// P31 Smallball: Bullpen Minigame
// Target throwing for Arm Strength & Arm Accuracy
// Precision-based throwing at moving targets

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult } from '../../types';
import { getSpoonAdaptation } from '../../engine/training';

interface BullpenGameProps {
  spoonCount: number;
  onComplete: (result: MinigameResult) => void;
}

interface Target {
  id: number;
  x: number;
  y: number;
  active: boolean;
  hit: boolean;
  value: number; // 10 (center), 5 (middle), 2 (outer)
}

export function BullpenGame({ spoonCount, onComplete }: BullpenGameProps) {
  const adaptation = getSpoonAdaptation(spoonCount);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'DONE'>('READY');
  const [timeLeft, setTimeLeft] = useState(adaptation.timeLimit);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [throws, setThrows] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [feedback, setFeedback] = useState('');
  
  const gameStartTimeRef = useRef<number>(0);
  const targetIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const hitsRef = useRef(0);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const generateTarget = useCallback((): Target => {
    // Random position within the target zone (20% - 80% of container)
    const x = 20 + Math.random() * 60;
    const y = 20 + Math.random() * 60;
    
    return {
      id: targetIdRef.current++,
      x,
      y,
      active: true,
      hit: false,
      value: 10,
    };
  }, []);

  const startGame = useCallback(() => {
    setGameState('PLAYING');
    setTimeLeft(adaptation.timeLimit);
    setScore(0);
    setThrows(0);
    setAccuracy(100);
    setFeedback('');
    hitsRef.current = 0;
    
    gameStartTimeRef.current = Date.now();
    targetIdRef.current = 0;
    
    // Initial targets
    const initialTargets: Target[] = [];
    const targetCount = Math.min(3, adaptation.tapTargetCount);
    for (let i = 0; i < targetCount; i++) {
      const target = generateTarget();
      target.x = 20 + (i * 30); // Spread out horizontally
      initialTargets.push(target);
    }
    setTargets(initialTargets);
    
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
    
    // Spawn new targets periodically
    const spawnTimer = window.setInterval(() => {
      setTargets(prev => {
        if (prev.length < 5) {
          return [...prev, generateTarget()];
        }
        return prev;
      });
    }, 2000);
    
    timersRef.current.push(spawnTimer);
  }, [adaptation.timeLimit, adaptation.tapTargetCount, generateTarget]);

  const handleThrow = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    
    // Get click/touch position relative to target zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    setThrows(prev => prev + 1);
    
    // Check if hit any target
    setTargets(prev => {
      const updated = [...prev];
      let hitSomething = false;
      
      for (let i = 0; i < updated.length; i++) {
        const target = updated[i];
        if (!target.active || target.hit) continue;
        
        const distance = Math.sqrt(
          Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)
        );
        
        // Hit detection (within 8% of target center)
        if (distance < 8) {
          updated[i] = { ...target, hit: true, active: false };
          
          // Calculate points based on distance from center
          let points: number;
          let feedbackMsg: string;
          
          if (distance < 3) {
            points = 10;
            feedbackMsg = 'Bullseye! 🎯';
          } else if (distance < 5) {
            points = 5;
            feedbackMsg = 'Good throw!';
          } else {
            points = 2;
            feedbackMsg = 'On target';
          }
          
          setScore(s => s + points);
          hitsRef.current++;
          setFeedback(feedbackMsg);
          hitSomething = true;
          
          // Remove hit target and spawn new one after delay
          const removeTimer = window.setTimeout(() => {
            setTargets(current => {
              const filtered = current.filter(t => t.id !== target.id);
              if (filtered.length < 3) {
                return [...filtered, generateTarget()];
              }
              return filtered;
            });
          }, 500);
          
          timersRef.current.push(removeTimer);
          break;
        }
      }
      
      if (!hitSomething) {
        setFeedback('Miss!');
      }
      
      // Clear feedback
      const feedbackTimer = window.setTimeout(() => setFeedback(''), 600);
      timersRef.current.push(feedbackTimer);
      
      return updated;
    });
  }, [gameState, generateTarget]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    
    // Calculate accuracy
    const hitAccuracy = throws > 0 ? Math.round((hitsRef.current / throws) * 100) : 0;
    setAccuracy(hitAccuracy);
    
    // Score calculation:
    // - 50% based on points scored
    // - 50% based on accuracy
    const maxPossibleScore = throws * 10; // If every throw was a bullseye
    const pointsScore = throws > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
    const finalScore = Math.round(pointsScore * 0.5 + hitAccuracy * 0.5);
    
    const result: MinigameResult = {
      station: 'BULLPEN',
      score: finalScore,
      accuracy: hitAccuracy,
      duration,
      earlyExit: false,
    };
    
    setGameState('DONE');
    onComplete(result);
  }, [throws, score, onComplete]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'READY') {
          startGame();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>The Bullpen</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>
      
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{score}</div>
          <div style={styles.statLabel}>Points</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{throws}</div>
          <div style={styles.statLabel}>Throws</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{throws > 0 ? Math.round((hitsRef.current / throws) * 100) : 100}%</div>
          <div style={styles.statLabel}>Accuracy</div>
        </div>
      </div>
      
      <div style={styles.feedback}>{feedback}</div>
      
      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Click targets to throw!</div>
            <div style={styles.readySubtext}>
              Hit the center for max points.
              <br />
              Bullseye = 10 pts, Outer = 2 pts
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START THROWING
            </button>
          </div>
        )}
        
        {gameState === 'PLAYING' && (
          <div 
            style={styles.targetZone}
            onClick={handleThrow}
            onTouchStart={(e) => { e.preventDefault(); handleThrow(e); }}
          >
            {targets.map(target => (
              <div
                key={target.id}
                style={{
                  ...styles.target,
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  ...(target.hit && styles.targetHit),
                }}
              >
                <div style={styles.targetCenter} />
                <div style={styles.targetMiddle} />
                <div style={styles.targetOuter} />
              </div>
            ))}
          </div>
        )}
        
        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Session Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.round(
                (score / Math.max(1, throws * 10)) * 50 + 
                (hitsRef.current / Math.max(1, throws)) * 50
              )}/100</div>
              <div>{score} points • {throws} throws • {Math.round((hitsRef.current / Math.max(1, throws)) * 100)}% accuracy</div>
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.instructions}>
        {gameState === 'PLAYING' ? 'Click or tap targets quickly!' : 'Aim for the center ring'}
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
    minHeight: '400px',
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold',
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
    maxWidth: '400px',
    marginBottom: '1rem',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  feedback: {
    height: '1.5rem',
    fontSize: '1.1rem',
    color: '#ffd54f',
    marginBottom: '1rem',
    fontWeight: 'bold',
  },
  gameArea: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    height: '300px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'center',
  },
  readyText: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  readySubtext: {
    fontSize: '0.9rem',
    opacity: 0.8,
  },
  startButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  targetZone: {
    width: '100%',
    height: '100%',
    position: 'relative',
    cursor: 'crosshair',
    background: 'radial-gradient(circle at center, rgba(76, 175, 80, 0.1) 0%, transparent 70%)',
  },
  target: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 1s infinite',
  },
  targetHit: {
    opacity: 0,
    transform: 'translate(-50%, -50%) scale(0.5)',
    transition: 'all 0.3s ease',
  },
  targetCenter: {
    position: 'absolute',
    width: '16px',
    height: '16px',
    background: '#f44336',
    borderRadius: '50%',
  },
  targetMiddle: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    border: '3px solid #ff9800',
    borderRadius: '50%',
  },
  targetOuter: {
    position: 'absolute',
    width: '56px',
    height: '56px',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '50%',
  },
  doneState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  doneTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4caf50',
  },
  results: {
    textAlign: 'center',
  },
  instructions: {
    marginTop: '1rem',
    fontSize: '0.9rem',
    opacity: 0.7,
  },
};
