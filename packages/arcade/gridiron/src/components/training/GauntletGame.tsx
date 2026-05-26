// P31 Gridiron: The Gauntlet Minigame (Track 1)
// Ball security and tackling drill
// Swipe to avoid pads / protect the ball

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult, TrainingStationId, SpoonState } from '../../types';

interface GauntletGameProps {
  spoonCount: SpoonState;
  onComplete: (result: MinigameResult) => void;
}

type GameState = 'READY' | 'RUNNING' | 'HIT' | 'DONE';

interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: 'PAD' | 'ARM' | 'STRIP';
  passed: boolean;
}

export function GauntletGame({ spoonCount, onComplete }: GauntletGameProps) {
  // Spoon adaptations
  const runDuration = spoonCount === 1 ? 10 : spoonCount === 3 ? 15 : 20;
  const obstacleFrequency = spoonCount === 1 ? 1500 : spoonCount === 3 ? 1200 : 1000;
  const playerSpeed = spoonCount === 1 ? 3 : spoonCount === 3 ? 4 : 5;

  const [gameState, setGameState] = useState<GameState>('READY');
  const [timeLeft, setTimeLeft] = useState(runDuration);
  const [score, setScore] = useState(0);
  const [yards, setYards] = useState(0);
  const [hits, setHits] = useState(0);
  const [fumbles, setFumbles] = useState(0);
  const [feedback, setFeedback] = useState('');

  const [playerY, setPlayerY] = useState(50);  // 0-100 vertical position
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [ballSecurity, setBallSecurity] = useState(100);  // 0-100 grip tightness
  const [isHoldingBall, setIsHoldingBall] = useState(true);

  const gameStartTimeRef = useRef<number>(0);
  const gameLoopRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const obstacleIdRef = useRef(0);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
  }, []);

  const spawnObstacle = useCallback(() => {
    const types: Obstacle['type'][] = ['PAD', 'ARM', 'STRIP'];
    const type = types[Math.floor(Math.random() * types.length)];

    const newObstacle: Obstacle = {
      id: obstacleIdRef.current++,
      x: 100,  // Start at right edge
      y: 20 + Math.random() * 60,  // Random vertical position
      type,
      passed: false,
    };

    setObstacles(prev => [...prev, newObstacle]);
  }, []);

  const startGame = useCallback(() => {
    setGameState('RUNNING');
    setTimeLeft(runDuration);
    setScore(0);
    setYards(0);
    setHits(0);
    setFumbles(0);
    setPlayerY(50);
    setObstacles([]);
    setBallSecurity(100);
    setIsHoldingBall(true);
    setFeedback('Protect the ball! Hold SPACE');
    gameStartTimeRef.current = Date.now();
    obstacleIdRef.current = 0;

    // Game timer
    const timer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timersRef.current.push(timer);

    // Spawn obstacles
    const spawner = window.setInterval(spawnObstacle, obstacleFrequency);
    timersRef.current.push(spawner);

    // Game loop for movement
    const gameLoop = () => {
      if (gameState !== 'RUNNING') return;

      // Move obstacles
      setObstacles(prev => {
        const updated = prev.map(obs => ({
          ...obs,
          x: obs.x - playerSpeed * 0.5,
        })).filter(obs => obs.x > -10);  // Remove off-screen

        // Check collisions
        updated.forEach(obs => {
          if (!obs.passed && Math.abs(obs.x - 20) < 8 && Math.abs(obs.y - playerY) < 10) {
            // Collision!
            obs.passed = true;
            handleCollision(obs.type);
          }
        });

        return updated;
      });

      // Gain yards
      setYards(prev => prev + playerSpeed * 0.1);

      // Regenerate ball security if holding
      if (isHoldingBall && ballSecurity < 100) {
        setBallSecurity(prev => Math.min(100, prev + 1));
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [runDuration, obstacleFrequency, playerSpeed, spawnObstacle, gameState]);

  const handleCollision = useCallback((type: Obstacle['type']) => {
    if (type === 'PAD' || type === 'ARM') {
      setHits(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 10));
      setFeedback('HIT!');

      // Knock ball loose if security low
      if (ballSecurity < 50) {
        setFumbles(prev => prev + 1);
        setIsHoldingBall(false);
        setFeedback('FUMBLE! Recover!');
        setTimeout(() => {
          setIsHoldingBall(true);
          setBallSecurity(50);
        }, 1000);
      }
    } else if (type === 'STRIP') {
      // Direct strip attempt
      if (ballSecurity < 70) {
        setFumbles(prev => prev + 1);
        setIsHoldingBall(false);
        setFeedback('STRIPPED!');
        setTimeout(() => {
          setIsHoldingBall(true);
          setBallSecurity(50);
        }, 1500);
      } else {
        setFeedback('Secured!');
        setScore(prev => prev + 15);
      }
    }
  }, [ballSecurity]);

  const movePlayer = useCallback((direction: 'UP' | 'DOWN') => {
    if (gameState !== 'RUNNING') return;

    setPlayerY(prev => {
      if (direction === 'UP') return Math.max(15, prev - 8);
      return Math.min(85, prev + 8);
    });
  }, [gameState]);

  const gripBall = useCallback((gripping: boolean) => {
    setIsHoldingBall(gripping);
    if (!gripping) {
      setBallSecurity(prev => Math.max(0, prev - 5));
    }
  }, []);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;

    // Score: yards gained - hits penalty - fumbles penalty
    const yardsScore = Math.min(100, yards * 2);
    const hitPenalty = hits * 15;
    const fumblePenalty = fumbles * 25;
    const finalScore = Math.max(0, Math.round(yardsScore - hitPenalty - fumblePenalty));

    const result: MinigameResult = {
      station: 'gauntlet' as TrainingStationId,
      score: finalScore,
      attributesImproved: ['tackling', 'ballSecurity'],
      xpGained: finalScore * 0.65,
      energyBurned: 28,
      fatigueDelta: 6,
      duration,
      timestamp: new Date().toISOString(),
    };

    setGameState('DONE');
    onComplete(result);
  }, [yards, hits, fumbles, onComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'READY') {
        e.preventDefault();
        startGame();
        return;
      }

      if (gameState === 'RUNNING') {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
            e.preventDefault();
            movePlayer('UP');
            break;
          case 'ArrowDown':
          case 's':
            e.preventDefault();
            movePlayer('DOWN');
            break;
          case ' ':
            e.preventDefault();
            gripBall(true);
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'RUNNING') {
        e.preventDefault();
        gripBall(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startGame, movePlayer, gripBall]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>THE GAUNTLET</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{Math.round(yards)}</div>
          <div style={styles.statLabel}>Yards</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: hits > 0 ? '#f44336' : '#4fc3f7'}}>{hits}</div>
          <div style={styles.statLabel}>Hits</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: fumbles > 0 ? '#f44336' : '#4fc3f7'}}>{fumbles}</div>
          <div style={styles.statLabel}>Fumbles</div>
        </div>
      </div>

      <div style={styles.feedback}>{feedback}</div>

      {/* Ball Security Meter */}
      <div style={styles.securityMeter}>
        <div style={styles.securityLabel}>BALL SECURITY</div>
        <div style={styles.securityTrack}>
          <div style={{...styles.securityBar, width: `${ballSecurity}%`, background: ballSecurity > 70 ? '#4caf50' : ballSecurity > 40 ? '#ff9800' : '#f44336'}} />
        </div>
        <div style={styles.securityValue}>{Math.round(ballSecurity)}%</div>
      </div>

      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Run the Gauntlet!</div>
            <div style={styles.readySubtext}>
              ↑/↓ to dodge • Hold SPACE to secure ball
              <br />
              Avoid pads, don't get stripped!
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START RUN
            </button>
          </div>
        )}

        {(gameState === 'RUNNING' || gameState === 'HIT') && (
          <div style={styles.gauntletField}>
            {/* Player */}
            <div style={{...styles.player, top: `${playerY}%`}}>
              <div style={styles.playerIcon}>🏃</div>
              {isHoldingBall && <div style={styles.ball}>🏈</div>}
            </div>

            {/* Obstacles */}
            {obstacles.map(obs => (
              <div
                key={obs.id}
                style={{
                  ...styles.obstacle,
                  left: `${obs.x}%`,
                  top: `${obs.y}%`,
                  ...(obs.type === 'PAD' && styles.pad),
                  ...(obs.type === 'ARM' && styles.arm),
                  ...(obs.type === 'STRIP' && styles.strip),
                }}
              >
                {obs.type === 'PAD' && '🥊'}
                {obs.type === 'ARM' && '💪'}
                {obs.type === 'STRIP' && '👋'}
              </div>
            ))}

            {/* Yard markers */}
            {[0, 25, 50, 75, 100].map(yard => (
              <div key={yard} style={{...styles.yardMarker, left: `${yard}%`}}>
                <span style={styles.yardText}>{yard}</span>
              </div>
            ))}

            {/* Progress indicator */}
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${(yards / 100) * 100}%`}} />
            </div>
          </div>
        )}

        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Run Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.max(0, Math.round(Math.min(100, yards * 2) - hits * 15 - fumbles * 25))}/100</div>
              <div>{Math.round(yards)} yards • {hits} hits • {fumbles} fumbles</div>
              <div>Tackling & Ball Security improved!</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <div style={styles.controlHint}>↑/↓ Dodge • Hold SPACE Secure Ball</div>
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
    minHeight: '500px',
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
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#9c27b0',
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
    marginBottom: '0.5rem',
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
    fontSize: '0.85rem',
    opacity: 0.7,
  },
  feedback: {
    height: '1.5rem',
    fontSize: '1.1rem',
    color: '#ffd54f',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  securityMeter: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  securityLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#ff9800',
  },
  securityTrack: {
    flex: 1,
    height: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  securityBar: {
    height: '100%',
    borderRadius: '6px',
    transition: 'all 0.1s ease',
  },
  securityValue: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'right',
  },
  gameArea: {
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
    background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(156, 39, 176, 0.4)',
  },
  gauntletField: {
    width: '100%',
    height: '280px',
    background: 'linear-gradient(180deg, #3d7c3d 0%, #2d5c2d 100%)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    border: '3px solid rgba(255, 255, 255, 0.2)',
  },
  player: {
    position: 'absolute',
    left: '15%',
    transform: 'translateY(-50%)',
    fontSize: '2.5rem',
    zIndex: 10,
    transition: 'top 0.1s ease-out',
  },
  playerIcon: {
    position: 'relative',
  },
  ball: {
    position: 'absolute',
    right: '-10px',
    top: '50%',
    fontSize: '1.2rem',
    transform: 'translateY(-50%)',
  },
  obstacle: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    fontSize: '1.8rem',
    zIndex: 5,
  },
  pad: {
    color: '#f44336',
  },
  arm: {
    color: '#ff9800',
  },
  strip: {
    color: '#9c27b0',
    animation: 'pulse 0.5s infinite',
  },
  yardMarker: {
    position: 'absolute',
    bottom: '0',
    width: '2px',
    height: '20px',
    background: 'rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '25px',
  },
  yardText: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  progressBar: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    right: '10px',
    height: '8px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
    borderRadius: '4px',
    transition: 'width 0.1s ease',
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
    marginTop: '1rem',
  },
  controlHint: {
    fontSize: '0.9rem',
    opacity: 0.7,
  },
};
