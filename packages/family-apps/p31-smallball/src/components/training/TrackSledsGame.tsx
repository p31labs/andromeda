// P31 Smallball: Track & Sleds Minigame
// Rapid-tap rhythm training for Speed & Stamina
// 10-second sprint simulation with Spoon-aware difficulty

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult } from '../../types';
import { getSpoonAdaptation } from '../../engine/training';

interface TrackSledsGameProps {
  spoonCount: number;
  onComplete: (result: MinigameResult) => void;
}

export function TrackSledsGame({ spoonCount, onComplete }: TrackSledsGameProps) {
  const adaptation = getSpoonAdaptation(spoonCount);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'DONE'>('READY');
  const [timeLeft, setTimeLeft] = useState(adaptation.timeLimit);
  const [tapCount, setTapCount] = useState(0);
  const [consistency, setConsistency] = useState(100); // 0-100
  const [distance, setDistance] = useState(0); // Virtual yards
  const [feedback, setFeedback] = useState('');
  
  const gameStartTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const tapTimesRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearInterval(id));
    timersRef.current = [];
  }, []);

  const startGame = useCallback(() => {
    setGameState('PLAYING');
    setTimeLeft(adaptation.timeLimit);
    setTapCount(0);
    setConsistency(100);
    setDistance(0);
    setFeedback('');
    
    gameStartTimeRef.current = Date.now();
    lastTapTimeRef.current = Date.now();
    tapTimesRef.current = [];
    
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
  }, [adaptation.timeLimit]);

  const handleTap = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    
    const now = Date.now();
    const tapInterval = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    
    setTapCount(prev => prev + 1);
    
    // Calculate distance (virtual yards)
    // Base speed + consistency bonus
    const baseYards = 2;
    const yardsGained = Math.round(baseYards + (consistency / 100) * 3);
    setDistance(prev => prev + yardsGained);
    
    // Track tap times for consistency calculation
    tapTimesRef.current.push(tapInterval);
    
    // Calculate consistency (optimal tap rate is ~200-400ms)
    if (tapTimesRef.current.length > 3) {
      const recentTaps = tapTimesRef.current.slice(-5);
      const avgInterval = recentTaps.reduce((a, b) => a + b, 0) / recentTaps.length;
      
      // Optimal range: 200-400ms between taps
      let newConsistency: number;
      if (avgInterval >= 200 && avgInterval <= 400) {
        newConsistency = 100;
        setFeedback('Perfect rhythm!');
      } else if (avgInterval < 200) {
        // Too fast - penalize
        newConsistency = Math.max(50, 100 - (200 - avgInterval) * 0.5);
        setFeedback('Too fast! Slow down');
      } else {
        // Too slow - penalize
        newConsistency = Math.max(50, 100 - (avgInterval - 400) * 0.2);
        setFeedback('Keep pushing!');
      }
      setConsistency(Math.round(newConsistency));
    }
    
    // Clear feedback
    const feedbackTimer = window.setTimeout(() => setFeedback(''), 800);
    timersRef.current.push(feedbackTimer);
  }, [gameState, consistency]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    
    // Score calculation:
    // - 40% based on tap count (raw speed)
    // - 40% based on consistency (stamina)
    // - 20% based on distance (combined)
    const targetTaps = adaptation.tapTargetCount * 2; // Target taps for max score
    const tapScore = Math.min(100, (tapCount / targetTaps) * 100);
    const consistencyScore = consistency;
    const distanceScore = Math.min(100, (distance / (adaptation.tapTargetCount * 4)) * 100);
    
    const finalScore = Math.round(tapScore * 0.4 + consistencyScore * 0.4 + distanceScore * 0.2);
    
    const result: MinigameResult = {
      station: 'TRACK_SLEDS',
      score: finalScore,
      tapCount,
      duration,
      earlyExit: false,
    };
    
    setGameState('DONE');
    onComplete(result);
  }, [tapCount, consistency, distance, adaptation.tapTargetCount, onComplete]);

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
          handleTap();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, handleTap]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Track & Sleds</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>
      
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{tapCount}</div>
          <div style={styles.statLabel}>Taps</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{distance}</div>
          <div style={styles.statLabel}>Yards</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: consistency > 80 ? '#4caf50' : '#ff9800'}}>
            {consistency}%
          </div>
          <div style={styles.statLabel}>Rhythm</div>
        </div>
      </div>
      
      <div style={styles.feedback}>{feedback}</div>
      
      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Rapid-tap to push the sled!</div>
            <div style={styles.readySubtext}>
              Maintain rhythm for best results.
              <br />
              Goal: {adaptation.tapTargetCount * 2}+ taps
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START SPRINT
            </button>
          </div>
        )}
        
        {gameState === 'PLAYING' && (
          <>
            {/* Visual representation of the track */}
            <div style={styles.track}>
              <div style={styles.sled}>
                🛷
              </div>
              <div style={{...styles.progressBar, width: `${Math.min(100, (distance / 100) * 100)}%`}} />
            </div>
            
            {/* Tap button */}
            <button 
              style={styles.tapButton}
              onMouseDown={handleTap}
              onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
            >
              TAP!
            </button>
            
            <div style={styles.hint}>Press SPACE rapidly</div>
          </>
        )}
        
        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Sprint Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.round(
                Math.min(100, (tapCount / (adaptation.tapTargetCount * 2)) * 100) * 0.4 +
                consistency * 0.4 +
                Math.min(100, (distance / (adaptation.tapTargetCount * 4)) * 100) * 0.2
              )}/100</div>
              <div>{tapCount} taps • {distance} yards • {consistency}% rhythm</div>
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
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  feedback: {
    height: '1.5rem',
    fontSize: '1rem',
    color: '#ffd54f',
    marginBottom: '1rem',
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
    gap: '1rem',
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
  track: {
    width: '80%',
    height: '60px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
  },
  sled: {
    fontSize: '2rem',
    zIndex: 2,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
    borderRadius: '8px',
    opacity: 0.3,
    transition: 'width 0.1s ease',
  },
  tapButton: {
    padding: '2rem 4rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
    userSelect: 'none',
    touchAction: 'manipulation',
  },
  hint: {
    fontSize: '0.9rem',
    opacity: 0.6,
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
};
