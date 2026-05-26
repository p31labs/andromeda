// P31 Smallball: Iron Mike Minigame
// Timing-based batting cage for Contact & Power training
// 10-second micro-interaction with Spoon-aware early-exit

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult } from '../../types';
import { getSpoonAdaptation, type SpoonAdaptation } from '../../engine/training';

interface IronMikeGameProps {
  spoonCount: number;
  onComplete: (result: MinigameResult) => void;
  onEarlyExit: () => void;
}

type PitchState = 'WINDUP' | 'THROWING' | 'HITTABLE' | 'PASSED' | 'HIT' | 'MISSED';

type SwingResult = 'PERFECT' | 'EARLY' | 'LATE' | 'MISS';

interface Pitch {
  id: number;
  state: PitchState;
  result: SwingResult | null;
  timing: number; // ms from perfect timing window
}

export function IronMikeGame({ spoonCount, onComplete, onEarlyExit }: IronMikeGameProps) {
  const adaptation = getSpoonAdaptation(spoonCount);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [currentPitchIndex, setCurrentPitchIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'DONE'>('READY');
  const [timeLeft, setTimeLeft] = useState(adaptation.timeLimit);
  const [feedback, setFeedback] = useState<string>('');
  
  const pitchIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const gameStartTimeRef = useRef<number>(0);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  // Start the game
  const startGame = useCallback(() => {
    setGameState('PLAYING');
    setPitches([]);
    setCurrentPitchIndex(0);
    setScore(0);
    setTimeLeft(adaptation.timeLimit);
    setFeedback('');
    pitchIdRef.current = 0;
    gameStartTimeRef.current = Date.now();
    
    // Start pitch sequence
    scheduleNextPitch(0);
    
    // Game timer
    const gameTimer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(gameTimer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    timersRef.current.push(gameTimer);
  }, [adaptation.timeLimit]);

  // Schedule next pitch
  const scheduleNextPitch = useCallback((delay: number) => {
    if (currentPitchIndex >= adaptation.pitchCount) return;
    
    const timer = window.setTimeout(() => {
      throwPitch();
    }, delay);
    
    timersRef.current.push(timer);
  }, [currentPitchIndex, adaptation.pitchCount]);

  // Throw a new pitch
  const throwPitch = useCallback(() => {
    const pitchId = pitchIdRef.current++;
    
    setPitches(prev => [...prev, {
      id: pitchId,
      state: 'WINDUP',
      result: null,
      timing: 0,
    }]);
    
    // Windup phase (400-800ms)
    const windupTime = 400 + Math.random() * 400;
    
    const windupTimer = window.setTimeout(() => {
      setPitches(prev => {
        const idx = prev.findIndex(p => p.id === pitchId);
        if (idx === -1) return prev;
        
        const updated = [...prev];
        updated[idx] = { ...updated[idx], state: 'THROWING' };
        return updated;
      });
      
      // Hittable phase (300ms window)
      const hittableTimer = window.setTimeout(() => {
        setPitches(prev => {
          const idx = prev.findIndex(p => p.id === pitchId);
          if (idx === -1) return prev;
          
          const updated = [...prev];
          const pitch = updated[idx];
          
          if (pitch.state !== 'HIT') {
            updated[idx] = { ...pitch, state: 'PASSED', result: 'MISS' };
          }
          return updated;
        });
        
        // Move to next pitch
        setCurrentPitchIndex(prev => {
          const next = prev + 1;
          if (next < adaptation.pitchCount) {
            scheduleNextPitch(500); // 500ms between pitches
          }
          return next;
        });
      }, 300);
      
      timersRef.current.push(hittableTimer);
    }, windupTime);
    
    timersRef.current.push(windupTimer);
  }, [adaptation.pitchCount, scheduleNextPitch]);

  // Handle swing
  const handleSwing = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    
    setPitches(prev => {
      const currentPitch = prev.find(p => p.state === 'THROWING' || p.state === 'HITTABLE');
      if (!currentPitch) return prev;
      
      const idx = prev.indexOf(currentPitch);
      const updated = [...prev];
      
      // Calculate timing quality
      // In a real implementation, we'd track exact timing
      // Here we simulate: if pitch is in THROWING state, it's early
      // If in HITTABLE state, it's perfect
      
      let result: SwingResult;
      let points = 0;
      let timingQuality = 0;
      
      if (currentPitch.state === 'THROWING') {
        result = 'EARLY';
        points = 30;
        timingQuality = -50;
        setFeedback('Early!');
      } else {
        result = 'PERFECT';
        points = 100;
        timingQuality = 0;
        setFeedback('Perfect!');
      }
      
      updated[idx] = {
        ...currentPitch,
        state: 'HIT',
        result,
        timing: timingQuality,
      };
      
      setScore(s => s + points);
      
      // Clear feedback after delay
      const feedbackTimer = window.setTimeout(() => setFeedback(''), 500);
      timersRef.current.push(feedbackTimer);
      
      return updated;
    });
  }, [gameState]);

  // End game
  const endGame = useCallback(() => {
    clearAllTimers();
    setGameState('DONE');
    
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    const hitPitches = pitches.filter(p => p.result === 'PERFECT' || p.result === 'EARLY');
    const perfectHits = pitches.filter(p => p.result === 'PERFECT').length;
    
    // Calculate final score (0-100)
    const maxScore = adaptation.pitchCount * 100;
    const finalScore = Math.round((score / maxScore) * 100);
    
    const result: MinigameResult = {
      station: 'IRON_MIKE',
      score: finalScore,
      timingQuality: perfectHits > 0 ? 0 : -50,
      duration,
      earlyExit: false,
    };
    
    onComplete(result);
  }, [clearAllTimers, pitches, score, adaptation.pitchCount, onComplete]);

  // Handle early exit
  const handleEarlyExit = useCallback(() => {
    clearAllTimers();
    
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    const maxScore = adaptation.pitchCount * 100;
    const partialScore = Math.round((score / maxScore) * 100 * 0.7); // 30% penalty for early exit
    
    const result: MinigameResult = {
      station: 'IRON_MIKE',
      score: partialScore,
      duration,
      earlyExit: true,
    };
    
    onComplete(result);
  }, [clearAllTimers, score, adaptation.pitchCount, onComplete]);

  // Cleanup on unmount
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
        } else if (gameState === 'PLAYING') {
          handleSwing();
        }
      }
      if (e.code === 'Escape' && gameState === 'PLAYING' && adaptation.earlyExitEnabled) {
        handleEarlyExit();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, adaptation.earlyExitEnabled, startGame, handleSwing, handleEarlyExit]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>The Iron Mike</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>
      
      {/* Score */}
      <div style={styles.scoreContainer}>
        <div style={styles.score}>Score: {score}</div>
        <div style={styles.feedback}>{feedback}</div>
      </div>
      
      {/* Game Area */}
      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Tap SPACE or click to swing</div>
            <div style={styles.readySubtext}>
              Time the pitch in the green zone!
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START
            </button>
          </div>
        )}
        
        {gameState === 'PLAYING' && (
          <>
            {/* Pitch display */}
            <div style={styles.pitchZone}>
              {pitches.map((pitch, idx) => (
                <div
                  key={pitch.id}
                  style={{
                    ...styles.pitch,
                    ...(pitch.state === 'WINDUP' && styles.pitchWindup),
                    ...(pitch.state === 'THROWING' && styles.pitchThrowing),
                    ...(pitch.state === 'HITTABLE' && styles.pitchHittable),
                    ...(pitch.state === 'HIT' && pitch.result === 'PERFECT' && styles.pitchHitPerfect),
                    ...(pitch.state === 'HIT' && pitch.result === 'EARLY' && styles.pitchHitEarly),
                    ...(pitch.state === 'PASSED' && styles.pitchMissed),
                  }}
                >
                  ⚾
                </div>
              ))}
            </div>
            
            {/* Swing zone indicator */}
            <div style={styles.swingZone}>
              <div style={styles.swingZoneLabel}>SWING ZONE</div>
            </div>
            
            {/* Swing button */}
            <button 
              style={styles.swingButton}
              onMouseDown={handleSwing}
              onTouchStart={(e) => { e.preventDefault(); handleSwing(); }}
            >
              SWING!
            </button>
            
            {/* Early exit button */}
            {adaptation.earlyExitEnabled && (
              <button style={styles.exitButton} onClick={handleEarlyExit}>
                Exit (ESC)
              </button>
            )}
          </>
        )}
        
        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Training Complete!</div>
            <div style={styles.finalScore}>Final Score: {Math.round((score / (adaptation.pitchCount * 100)) * 100)}/100</div>
            <div style={styles.results}>
              Perfect hits: {pitches.filter(p => p.result === 'PERFECT').length}
              <br />
              Total swings: {pitches.filter(p => p.result !== null).length}
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div style={styles.instructions}>
        Hit the ball when it enters the swing zone. Perfect timing = more XP!
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  score: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  feedback: {
    fontSize: '1.2rem',
    height: '1.5rem',
    color: '#ffd54f',
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
  },
  readyText: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  readySubtext: {
    fontSize: '0.9rem',
    opacity: 0.8,
    textAlign: 'center',
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
  pitchZone: {
    position: 'absolute',
    top: '20%',
    width: '80%',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '20px',
  },
  pitch: {
    fontSize: '2rem',
    transition: 'all 0.1s ease',
    opacity: 0,
  },
  pitchWindup: {
    opacity: 0.5,
    transform: 'translateX(20px)',
  },
  pitchThrowing: {
    opacity: 1,
    transform: 'translateX(100px)',
  },
  pitchHittable: {
    opacity: 1,
    transform: 'translateX(150px) scale(1.2)',
  },
  pitchHitPerfect: {
    opacity: 0.7,
    transform: 'translateX(300px) translateY(-50px)',
    color: '#4caf50',
  },
  pitchHitEarly: {
    opacity: 0.7,
    transform: 'translateX(200px) translateY(20px)',
    color: '#ff9800',
  },
  pitchMissed: {
    opacity: 0.3,
    transform: 'translateX(250px)',
  },
  swingZone: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '60px',
    border: '3px solid #4caf50',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swingZoneLabel: {
    fontSize: '0.6rem',
    color: '#4caf50',
  },
  swingButton: {
    position: 'absolute',
    bottom: '20%',
    padding: '1rem 3rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
  },
  exitButton: {
    position: 'absolute',
    bottom: '5%',
    right: '5%',
    padding: '0.5rem 1rem',
    fontSize: '0.8rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
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
  finalScore: {
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  results: {
    textAlign: 'center',
    opacity: 0.8,
  },
  instructions: {
    marginTop: '1rem',
    fontSize: '0.9rem',
    opacity: 0.7,
    textAlign: 'center',
  },
};
