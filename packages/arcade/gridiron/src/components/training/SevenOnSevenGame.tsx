// P31 Gridiron: 7-on-7 Skeleton Minigame (Track 1)
// Quick-read passing drill for Passing/Catching/Coverage
// Read defense, find open receiver, time the throw

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult, TrainingStationId, SpoonState } from '../../types';

interface SevenOnSevenGameProps {
  spoonCount: SpoonState;
  onComplete: (result: MinigameResult) => void;
}

type GameState = 'READY' | 'READING' | 'THROWING' | 'RESULT' | 'DONE';
type Route = 'SLANT' | 'OUT' | 'GO' | 'CROSS';
type Coverage = 'COVER_2' | 'COVER_3' | 'MAN' | 'BLITZ';

interface Receiver {
  id: number;
  route: Route;
  isOpen: boolean;
  x: number;
  y: number;
  coveredBy?: number;  // DB ID covering them
}

interface DefensiveBack {
  id: number;
  coverage: Coverage;
  x: number;
  y: number;
  isBlitzing?: boolean;
}

const ROUTE_COLORS: Record<Route, string> = {
  SLANT: '#ff9800',
  OUT: '#4caf50',
  GO: '#f44336',
  CROSS: '#2196f3',
};

export function SevenOnSevenGame({ spoonCount, onComplete }: SevenOnSevenGameProps) {
  // Spoon adaptations
  const readTime = spoonCount === 1 ? 3000 : spoonCount === 3 ? 2000 : 1500;
  const throwWindow = spoonCount === 1 ? 2500 : spoonCount === 3 ? 2000 : 1500;
  const rounds = spoonCount === 1 ? 3 : spoonCount === 3 ? 5 : 7;

  const [gameState, setGameState] = useState<GameState>('READY');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [completions, setCompletions] = useState(0);
  const [interceptions, setInterceptions] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState(readTime / 1000);

  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [defensiveBacks, setDefensiveBacks] = useState<DefensiveBack[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<number | null>(null);

  const gameStartTimeRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const generatePlay = useCallback(() => {
    // Generate receivers with routes
    const newReceivers: Receiver[] = [
      { id: 1, route: 'SLANT', isOpen: false, x: 20, y: 30 },
      { id: 2, route: 'OUT', isOpen: false, x: 50, y: 25 },
      { id: 3, route: 'GO', isOpen: false, x: 80, y: 20 },
      { id: 4, route: 'CROSS', isOpen: false, x: 35, y: 40 },
    ];

    // Generate defensive backs with coverage
    const coverages: Coverage[] = ['COVER_2', 'COVER_3', 'MAN', 'BLITZ'];
    const coverage = coverages[Math.floor(Math.random() * coverages.length)];

    const newDBs: DefensiveBack[] = [
      { id: 1, coverage, x: 25, y: 35 },
      { id: 2, coverage, x: 55, y: 30 },
      { id: 3, coverage, x: 85, y: 25 },
      { id: 4, coverage, x: 40, y: 45 },
    ];

    // Determine who's open based on coverage
    if (coverage === 'COVER_2') {
      // Deep routes open, slants covered
      newReceivers[2].isOpen = true;  // GO route open
      newReceivers[3].isOpen = true;  // CROSS open underneath
    } else if (coverage === 'COVER_3') {
      // Out routes and slants open
      newReceivers[0].isOpen = true;  // SLANT open
      newReceivers[1].isOpen = true;  // OUT open
    } else if (coverage === 'MAN') {
      // Best matchup wins - random open receiver
      const openIdx = Math.floor(Math.random() * newReceivers.length);
      newReceivers[openIdx].isOpen = true;
    } else if (coverage === 'BLITZ') {
      // Quick routes (slant, out) open
      newReceivers[0].isOpen = true;
      newReceivers[1].isOpen = true;
      newDBs.forEach(db => db.isBlitzing = true);
    }

    setReceivers(newReceivers);
    setDefensiveBacks(newDBs);
    setSelectedReceiver(null);
  }, []);

  const startRound = useCallback(() => {
    generatePlay();
    setGameState('READING');
    setTimeLeft(readTime / 1000);

    // Read phase timer
    const readTimer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(readTimer);
          setGameState('THROWING');
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    timersRef.current.push(readTimer);

    // Auto-advance to throwing after read time
    const autoAdvance = window.setTimeout(() => {
      setGameState('THROWING');
    }, readTime);
    timersRef.current.push(autoAdvance);
  }, [readTime, generatePlay]);

  const startGame = useCallback(() => {
    setRound(0);
    setScore(0);
    setCompletions(0);
    setInterceptions(0);
    gameStartTimeRef.current = Date.now();
    startRound();
  }, [startRound]);

  const handleReceiverSelect = useCallback((receiverId: number) => {
    if (gameState !== 'THROWING') return;

    setSelectedReceiver(receiverId);
    const receiver = receivers.find(r => r.id === receiverId);

    if (!receiver) return;

    // Determine outcome
    if (receiver.isOpen) {
      // Completion!
      setScore(prev => prev + 25);
      setCompletions(prev => prev + 1);
      setFeedback('COMPLETION! 🎯');
    } else {
      // Check for interception (covered)
      const roll = Math.random();
      if (roll < 0.3) {
        setInterceptions(prev => prev + 1);
        setFeedback('INTERCEPTED! 😰');
      } else {
        setFeedback('Incomplete');
      }
    }

    setGameState('RESULT');

    // Next round or end
    setTimeout(() => {
      setRound(prev => {
        const next = prev + 1;
        if (next >= rounds) {
          endGame();
        } else {
          startRound();
        }
        return next;
      });
    }, 1500);
  }, [gameState, receivers, rounds, startRound]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;

    // Score: completions * accuracy bonus - interceptions penalty
    const accuracy = round > 0 ? completions / round : 0;
    const accuracyBonus = Math.round(accuracy * 50);
    const pickPenalty = interceptions * 15;
    const finalScore = Math.max(0, Math.min(100, completions * 15 + accuracyBonus - pickPenalty));

    const result: MinigameResult = {
      station: 'sevenOnSeven' as TrainingStationId,
      score: finalScore,
      attributesImproved: ['passingAccuracy', 'catching', 'coverage'],
      xpGained: finalScore * 0.55,
      energyBurned: rounds * 4,
      fatigueDelta: rounds * 2,
      duration,
      timestamp: new Date().toISOString(),
    };

    setGameState('DONE');
    onComplete(result);
  }, [round, completions, interceptions, rounds, onComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'READY') {
        e.preventDefault();
        startGame();
        return;
      }

      if (gameState === 'THROWING') {
        switch (e.key) {
          case '1':
            handleReceiverSelect(1);
            break;
          case '2':
            handleReceiverSelect(2);
            break;
          case '3':
            handleReceiverSelect(3);
            break;
          case '4':
            handleReceiverSelect(4);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, handleReceiverSelect]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>7-ON-7 SKELETON</h2>
        <div style={styles.round}>Round {round + 1}/{rounds}</div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{score}</div>
          <div style={styles.statLabel}>Score</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: '#4caf50'}}>{completions}</div>
          <div style={styles.statLabel}>Completions</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: '#f44336'}}>{interceptions}</div>
          <div style={styles.statLabel}>Picks</div>
        </div>
      </div>

      <div style={styles.feedback}>{feedback}</div>

      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Read the Defense!</div>
            <div style={styles.readySubtext}>
              Study the coverage for {readTime / 1000}s
              <br />
              Then pick the open receiver (1-4)
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START DRILL
            </button>
          </div>
        )}

        {(gameState === 'READING' || gameState === 'THROWING' || gameState === 'RESULT') && (
          <>
            {/* Field view */}
            <div style={styles.fieldView}>
              {/* Coverage indicator */}
              <div style={styles.coverageBanner}>
                {gameState === 'READING' && (
                  <span style={styles.readingText}>READING... {Math.ceil(timeLeft)}s</span>
                )}
                {gameState === 'THROWING' && (
                  <span style={styles.throwText}>THROW NOW! (1-4)</span>
                )}
              </div>

              {/* Receivers */}
              {receivers.map((receiver, idx) => (
                <button
                  key={receiver.id}
                  style={{
                    ...styles.receiver,
                    left: `${receiver.x}%`,
                    top: `${receiver.y}%`,
                    borderColor: ROUTE_COLORS[receiver.route],
                    ...(gameState === 'RESULT' && selectedReceiver === receiver.id && {
                      background: receiver.isOpen ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
                    }),
                    ...(gameState === 'THROWING' && styles.clickable),
                  }}
                  onClick={() => handleReceiverSelect(receiver.id)}
                  disabled={gameState !== 'THROWING'}
                >
                  <span style={styles.receiverNum}>{idx + 1}</span>
                  <span style={{...styles.routeLabel, color: ROUTE_COLORS[receiver.route]}}>
                    {receiver.route}
                  </span>
                </button>
              ))}

              {/* Defensive backs */}
              {defensiveBacks.map((db) => (
                <div
                  key={db.id}
                  style={{
                    ...styles.defensiveBack,
                    left: `${db.x}%`,
                    top: `${db.y}%`,
                    ...(db.isBlitzing && styles.blitzingDB),
                  }}
                >
                  <span style={styles.dbLabel}>DB</span>
                </div>
              ))}

              {/* QB */}
              <div style={styles.quarterback}>
                <span style={styles.qbLabel}>QB</span>
              </div>
            </div>

            {/* Route legend */}
            <div style={styles.legend}>
              {Object.entries(ROUTE_COLORS).map(([route, color]) => (
                <div key={route} style={styles.legendItem}>
                  <div style={{...styles.legendColor, background: color}} />
                  <span style={styles.legendText}>{route}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Drill Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.max(0, Math.min(100, completions * 15 + Math.round((round > 0 ? completions / round : 0) * 50) - interceptions * 15))}/100</div>
              <div>{completions}/{round} completed • {interceptions} interceptions</div>
              <div>Passing, Catching & Coverage improved!</div>
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
    color: '#2196f3',
  },
  round: {
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
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  statLabel: {
    fontSize: '0.85rem',
    opacity: 0.7,
  },
  feedback: {
    height: '2rem',
    fontSize: '1.3rem',
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
    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(33, 150, 243, 0.4)',
  },
  fieldView: {
    width: '100%',
    height: '300px',
    background: 'linear-gradient(180deg, #2d5c2d 0%, #1a4d1a 100%)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    border: '3px solid rgba(255, 255, 255, 0.2)',
  },
  coverageBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '0.5rem',
    background: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    zIndex: 20,
  },
  readingText: {
    color: '#ff9800',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  throwText: {
    color: '#4caf50',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    animation: 'pulse 0.5s infinite',
  },
  receiver: {
    position: 'absolute',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '3px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translate(-50%, -50%)',
    cursor: 'default',
  },
  clickable: {
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)',
  },
  receiverNum: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  routeLabel: {
    fontSize: '0.7rem',
    fontWeight: 'bold',
  },
  defensiveBack: {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(244, 67, 54, 0.6)',
    border: '2px solid #f44336',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translate(-50%, -50%)',
  },
  blitzingDB: {
    background: 'rgba(156, 39, 176, 0.7)',
    borderColor: '#9c27b0',
    animation: 'shake 0.5s infinite',
  },
  dbLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: 'white',
  },
  quarterback: {
    position: 'absolute',
    left: '50%',
    bottom: '10%',
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    background: 'rgba(33, 150, 243, 0.6)',
    border: '2px solid #2196f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translateX(-50%)',
  },
  qbLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
  },
  legend: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  legendText: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
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
