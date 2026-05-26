// P31 Smallball: Pop-Fly Machine Minigame
// Spatial positioning for Glove & Range
// Move to catch fly balls and grounders

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult } from '../../types';
import { getSpoonAdaptation } from '../../engine/training';

interface PopFlyGameProps {
  spoonCount: number;
  onComplete: (result: MinigameResult) => void;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  type: 'FLY' | 'GROUNDER' | 'LINER';
  state: 'IN_AIR' | 'CAUGHT' | 'MISSED' | 'LANDED';
  hangTime: number; // seconds to reach target
}

interface Fielder {
  x: number;
  y: number;
}

export function PopFlyGame({ spoonCount, onComplete }: PopFlyGameProps) {
  const adaptation = getSpoonAdaptation(spoonCount);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'DONE'>('READY');
  const [timeLeft, setTimeLeft] = useState(adaptation.timeLimit);
  const [fielder, setFielder] = useState<Fielder>({ x: 50, y: 80 });
  const [balls, setBalls] = useState<Ball[]>([]);
  const [catches, setCatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  const gameStartTimeRef = useRef<number>(0);
  const ballIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const generateBall = useCallback((): Ball => {
    const typeRandom = Math.random();
    let type: Ball['type'];
    
    if (typeRandom < 0.4) {
      type = 'FLY';
    } else if (typeRandom < 0.7) {
      type = 'GROUNDER';
    } else {
      type = 'LINER';
    }
    
    // Target position (where ball will land)
    const targetX = 15 + Math.random() * 70;
    const targetY = type === 'FLY' ? 20 + Math.random() * 40 : 
                   type === 'LINER' ? 40 + Math.random() * 30 :
                   75 + Math.random() * 15; // Grounders near fielder
    
    // Ball starts from machine (center top)
    const startX = 50;
    const startY = 10;
    
    return {
      id: ballIdRef.current++,
      x: startX,
      y: startY,
      targetX,
      targetY,
      type,
      state: 'IN_AIR',
      hangTime: type === 'FLY' ? 2.5 : type === 'LINER' ? 1.5 : 2.0,
    };
  }, []);

  const startGame = useCallback(() => {
    setGameState('PLAYING');
    setTimeLeft(adaptation.timeLimit);
    setFielder({ x: 50, y: 80 });
    setBalls([]);
    setCatches(0);
    setMisses(0);
    setFeedback('');
    
    gameStartTimeRef.current = Date.now();
    ballIdRef.current = 0;
    
    // Launch first ball
    launchBall(500);
    
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

  const launchBall = useCallback((delay: number) => {
    const timer = window.setTimeout(() => {
      const ball = generateBall();
      setBalls(prev => [...prev, ball]);
      
      // Animate ball flight
      const startTime = Date.now();
      const hangTimeMs = ball.hangTime * 1000;
      
      const animateTimer = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / hangTimeMs);
        
        setBalls(prev => {
          const idx = prev.findIndex(b => b.id === ball.id);
          if (idx === -1) return prev;
          
          const updated = [...prev];
          const currentBall = updated[idx];
          
          if (currentBall.state !== 'IN_AIR') {
            clearInterval(animateTimer);
            return prev;
          }
          
          // Linear interpolation
          const newX = currentBall.x + (currentBall.targetX - currentBall.x) * 0.05;
          const newY = currentBall.y + (currentBall.targetY - currentBall.y) * 0.05;
          
          // Check if reached target
          const distToTarget = Math.sqrt(
            Math.pow(newX - currentBall.targetX, 2) + 
            Math.pow(newY - currentBall.targetY, 2)
          );
          
          if (distToTarget < 5 || progress >= 1) {
            // Ball landed - check if fielder was close enough
            updated[idx] = { ...currentBall, state: 'LANDED', x: newX, y: newY };
            
            const distToFielder = Math.sqrt(
              Math.pow(newX - fielder.x, 2) + 
              Math.pow(newY - fielder.y, 2)
            );
            
            if (distToFielder < 15) {
              // Close enough - automatic catch on landing
              updated[idx] = { ...updated[idx], state: 'CAUGHT' };
              setCatches(c => c + 1);
              setFeedback('Got it!');
            } else {
              updated[idx] = { ...updated[idx], state: 'MISSED' };
              setMisses(m => m + 1);
              setFeedback('Missed!');
            }
            
            // Clear feedback
            const feedbackTimer = window.setTimeout(() => setFeedback(''), 500);
            timersRef.current.push(feedbackTimer);
            
            // Schedule next ball
            if (timeLeft > 2) {
              launchBall(1000 + Math.random() * 1000);
            }
            
            clearInterval(animateTimer);
          } else {
            updated[idx] = { ...currentBall, x: newX, y: newY };
          }
          
          return updated;
        });
      }, 50);
      
      timersRef.current.push(animateTimer);
    }, delay);
    
    timersRef.current.push(timer);
  }, [generateBall, fielder.x, fielder.y, timeLeft]);

  const handleFielderMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'PLAYING' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
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
    
    // Clamp to field bounds
    setFielder({
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    });
  }, [gameState]);

  // Check for catches when fielder moves near balls
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    
    balls.forEach(ball => {
      if (ball.state !== 'IN_AIR') return;
      
      const dist = Math.sqrt(
        Math.pow(ball.x - fielder.x, 2) + 
        Math.pow(ball.y - fielder.y, 2)
      );
      
      if (dist < 10) {
        setBalls(prev => {
          const idx = prev.findIndex(b => b.id === ball.id);
          if (idx === -1 || prev[idx].state !== 'IN_AIR') return prev;
          
          const updated = [...prev];
          updated[idx] = { ...updated[idx], state: 'CAUGHT' };
          return updated;
        });
        
        setCatches(c => c + 1);
        setFeedback('Catch!');
        
        const feedbackTimer = window.setTimeout(() => setFeedback(''), 500);
        timersRef.current.push(feedbackTimer);
      }
    });
  }, [fielder, balls, gameState]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    const totalAttempts = catches + misses;
    
    // Score based on catches vs misses
    const catchRate = totalAttempts > 0 ? Math.round((catches / totalAttempts) * 100) : 0;
    const finalScore = catchRate;
    
    const result: MinigameResult = {
      station: 'POP_FLY',
      score: finalScore,
      catches,
      duration,
      earlyExit: false,
    };
    
    setGameState('DONE');
    onComplete(result);
  }, [catches, misses, onComplete]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Keyboard controls (arrow keys for fielder)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'READY') {
        e.preventDefault();
        startGame();
        return;
      }
      
      if (gameState !== 'PLAYING') return;
      
      const moveSpeed = 5;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          setFielder(prev => ({ ...prev, x: Math.max(5, prev.x - moveSpeed) }));
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          setFielder(prev => ({ ...prev, x: Math.min(95, prev.x + moveSpeed) }));
          break;
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          setFielder(prev => ({ ...prev, y: Math.max(5, prev.y - moveSpeed) }));
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          setFielder(prev => ({ ...prev, y: Math.min(95, prev.y + moveSpeed) }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Pop-Fly Machine</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>
      
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: '#4caf50'}}>{catches}</div>
          <div style={styles.statLabel}>Caught</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: '#f44336'}}>{misses}</div>
          <div style={styles.statLabel}>Missed</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{feedback}</div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        style={styles.gameArea}
        onMouseMove={handleFielderMove}
        onTouchMove={(e) => { e.preventDefault(); handleFielderMove(e); }}
      >
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Move to catch the ball!</div>
            <div style={styles.readySubtext}>
              Click/tap or use arrow keys to move fielder
              <br />
              Catch as many as you can!
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START DRILL
            </button>
          </div>
        )}
        
        {gameState === 'PLAYING' && (
          <>
            {/* Field background */}
            <div style={styles.fieldGrass} />
            
            {/* Balls */}
            {balls.map(ball => (
              <div
                key={ball.id}
                style={{
                  ...styles.ball,
                  left: `${ball.x}%`,
                  top: `${ball.y}%`,
                  ...(ball.state === 'CAUGHT' && styles.ballCaught),
                  ...(ball.state === 'MISSED' && styles.ballMissed),
                  ...(ball.type === 'FLY' && styles.ballFly),
                  ...(ball.type === 'GROUNDER' && styles.ballGrounder),
                  ...(ball.type === 'LINER' && styles.ballLiner),
                }}
              >
                ⚾
              </div>
            ))}
            
            {/* Fielder */}
            <div
              style={{
                ...styles.fielder,
                left: `${fielder.x}%`,
                top: `${fielder.y}%`,
              }}
            >
              🧤
            </div>
            
            {/* Target shadow for balls */}
            {balls.filter(b => b.state === 'IN_AIR').map(ball => (
              <div
                key={`shadow-${ball.id}`}
                style={{
                  ...styles.ballShadow,
                  left: `${ball.targetX}%`,
                  top: `${ball.targetY}%`,
                }}
              />
            ))}
          </>
        )}
        
        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Drill Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.round((catches / Math.max(1, catches + misses)) * 100)}/100</div>
              <div>{catches} caught • {misses} missed</div>
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.instructions}>
        {gameState === 'PLAYING' ? 'Move fielder to catch the balls!' : 'Click/tap or arrow keys to move'}
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
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  gameArea: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    height: '300px',
    background: 'linear-gradient(180deg, #87CEEB 0%, #5D8AA8 50%, #228B22 50%, #006400 100%)',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'crosshair',
  },
  readyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    textAlign: 'center',
    background: 'rgba(0, 0, 0, 0.5)',
  },
  readyText: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  readySubtext: {
    fontSize: '0.9rem',
    opacity: 0.9,
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
  fieldGrass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, #228B22 0%, #006400 100%)',
  },
  ball: {
    position: 'absolute',
    fontSize: '1.5rem',
    transform: 'translate(-50%, -50%)',
    transition: 'none',
    zIndex: 10,
  },
  ballFly: {
    transform: 'translate(-50%, -50%) scale(1.2)',
  },
  ballGrounder: {
    transform: 'translate(-50%, -50%) scale(0.8)',
    opacity: 0.8,
  },
  ballLiner: {
    transform: 'translate(-50%, -50%) scale(1)',
  },
  ballCaught: {
    opacity: 0,
    transform: 'translate(-50%, -50%) scale(0)',
    transition: 'all 0.2s ease',
  },
  ballMissed: {
    opacity: 0.3,
    filter: 'grayscale(100%)',
  },
  ballShadow: {
    position: 'absolute',
    width: '20px',
    height: '10px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
  },
  fielder: {
    position: 'absolute',
    fontSize: '2rem',
    transform: 'translate(-50%, -50%)',
    zIndex: 20,
    transition: 'none',
  },
  doneState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.7)',
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
