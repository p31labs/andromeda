// P31 Smallball: Film Room Minigame
// Pitch recognition flashcards for Eye, Baseball IQ & Clutch
// Quick decision making - Ball or Strike?

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult } from '../../types';
import { getSpoonAdaptation } from '../../engine/training';

interface FilmRoomGameProps {
  spoonCount: number;
  onComplete: (result: MinigameResult) => void;
}

type PitchCall = 'BALL' | 'STRIKE';

interface PitchScenario {
  id: number;
  location: [number, number]; // x, y in strike zone (-1 to 1)
  pitchType: 'FASTBALL' | 'CURVEBALL' | 'SLIDER' | 'CHANGEUP';
  velocity: number;
  correctCall: PitchCall;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
}

export function FilmRoomGame({ spoonCount, onComplete }: FilmRoomGameProps) {
  const adaptation = getSpoonAdaptation(spoonCount);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'SHOWING' | 'DONE'>('READY');
  const [timeLeft, setTimeLeft] = useState(adaptation.timeLimit);
  const [currentPitch, setCurrentPitch] = useState<PitchScenario | null>(null);
  const [correctCalls, setCorrectCalls] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  
  const gameStartTimeRef = useRef<number>(0);
  const pitchIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const generatePitch = useCallback((): PitchScenario => {
    const difficultyRoll = Math.random();
    let difficulty: PitchScenario['difficulty'];
    
    if (difficultyRoll < 0.3) {
      difficulty = 'EASY';
    } else if (difficultyRoll < 0.7) {
      difficulty = 'MEDIUM';
    } else {
      difficulty = 'HARD';
    }
    
    // Generate location based on difficulty
    let location: [number, number];
    let correctCall: PitchCall;
    let description: string;
    
    const strikeZoneRadius = 0.5;
    
    if (difficulty === 'EASY') {
      // Clear balls or clear strikes
      if (Math.random() < 0.5) {
        // Clear ball - way outside
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.8 + Math.random() * 0.4;
        location = [Math.cos(angle) * distance, Math.sin(angle) * distance];
        correctCall = 'BALL';
        description = 'Way outside';
      } else {
        // Clear strike - center cut
        location = [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3];
        correctCall = 'STRIKE';
        description = 'Down the middle';
      }
    } else if (difficulty === 'MEDIUM') {
      // Borderline but catchable
      const angle = Math.random() * Math.PI * 2;
      const distance = strikeZoneRadius + (Math.random() - 0.5) * 0.2;
      location = [Math.cos(angle) * distance, Math.sin(angle) * distance];
      
      const distFromCenter = Math.sqrt(location[0] ** 2 + location[1] ** 2);
      correctCall = distFromCenter <= strikeZoneRadius ? 'STRIKE' : 'BALL';
      description = distFromCenter <= strikeZoneRadius ? 'Catches the corner' : 'Just off the plate';
    } else {
      // HARD - very borderline
      const angle = Math.random() * Math.PI * 2;
      const distance = strikeZoneRadius + (Math.random() - 0.5) * 0.1;
      location = [Math.cos(angle) * distance, Math.sin(angle) * distance];
      
      const distFromCenter = Math.sqrt(location[0] ** 2 + location[1] ** 2);
      correctCall = distFromCenter <= strikeZoneRadius ? 'STRIKE' : 'BALL';
      description = 'Borderline call';
    }
    
    const pitchTypes: PitchScenario['pitchType'][] = ['FASTBALL', 'CURVEBALL', 'SLIDER', 'CHANGEUP'];
    const pitchType = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
    
    // Velocity based on pitch type
    let velocity: number;
    switch (pitchType) {
      case 'FASTBALL':
        velocity = 92 + Math.random() * 8;
        break;
      case 'CURVEBALL':
        velocity = 75 + Math.random() * 5;
        break;
      case 'SLIDER':
        velocity = 82 + Math.random() * 5;
        break;
      case 'CHANGEUP':
        velocity = 82 + Math.random() * 4;
        break;
    }
    
    return {
      id: pitchIdRef.current++,
      location,
      pitchType,
      velocity: Math.round(velocity),
      correctCall,
      difficulty,
      description,
    };
  }, []);

  const startGame = useCallback(() => {
    setGameState('PLAYING');
    setTimeLeft(adaptation.timeLimit);
    setCorrectCalls(0);
    setTotalCalls(0);
    setStreak(0);
    setScore(0);
    setFeedback('');
    
    gameStartTimeRef.current = Date.now();
    pitchIdRef.current = 0;
    
    // Show first pitch
    showNextPitch();
    
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

  const showNextPitch = useCallback(() => {
    const pitch = generatePitch();
    setCurrentPitch(pitch);
    setGameState('SHOWING');
    
    // Auto-advance if no response after 3 seconds
    const autoTimer = window.setTimeout(() => {
      if (gameState !== 'DONE') {
        handleCall('BALL'); // Default call if timeout
      }
    }, 3000);
    
    timersRef.current.push(autoTimer);
  }, [generatePitch, gameState]);

  const handleCall = useCallback((call: PitchCall) => {
    if (!currentPitch || gameState !== 'SHOWING') return;
    
    const isCorrect = call === currentPitch.correctCall;
    setTotalCalls(t => t + 1);
    
    if (isCorrect) {
      setCorrectCalls(c => c + 1);
      setStreak(s => s + 1);
      
      // Points based on difficulty and streak
      let points = currentPitch.difficulty === 'EASY' ? 10 : 
                   currentPitch.difficulty === 'MEDIUM' ? 15 : 20;
      points += Math.min(10, streak * 2); // Streak bonus
      
      setScore(s => s + points);
      setFeedback(`Correct! +${points}`);
    } else {
      setStreak(0);
      setFeedback(`Wrong! It was a ${currentPitch.correctCall.toLowerCase()}`);
    }
    
    // Show feedback briefly then next pitch
    setGameState('PLAYING');
    
    const nextTimer = window.setTimeout(() => {
      setFeedback('');
      if (timeLeft > 1) {
        showNextPitch();
      }
    }, 800);
    
    timersRef.current.push(nextTimer);
  }, [currentPitch, gameState, streak, timeLeft, showNextPitch]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    
    // Score calculation
    // - Primary: accuracy percentage
    // - Secondary: total correct calls bonus
    const accuracy = totalCalls > 0 ? Math.round((correctCalls / totalCalls) * 100) : 0;
    const volumeBonus = Math.min(20, correctCalls); // Up to 20 bonus points for volume
    const finalScore = Math.min(100, accuracy + volumeBonus);
    
    const result: MinigameResult = {
      station: 'FILM_ROOM',
      score: finalScore,
      correctCalls,
      duration,
      earlyExit: false,
    };
    
    setGameState('DONE');
    onComplete(result);
  }, [correctCalls, totalCalls, onComplete]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'READY') {
        e.preventDefault();
        startGame();
        return;
      }
      
      if (gameState !== 'SHOWING') return;
      
      if (e.key === 'b' || e.key === 'B' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleCall('BALL');
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleCall('STRIKE');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, handleCall]);

  // Get pitch display position
  const getPitchPosition = (location: [number, number]) => {
    // Convert -1 to 1 range to percentage (20% - 80% to keep in strike zone box)
    const x = 50 + location[0] * 40;
    const y = 50 - location[1] * 40; // Invert Y so positive is up
    return { x, y };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>The Film Room</h2>
        <div style={styles.timer}>⏱️ {timeLeft}s</div>
      </div>
      
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{correctCalls}/{totalCalls}</div>
          <div style={styles.statLabel}>Correct</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: streak > 2 ? '#4caf50' : 'white'}}>
            🔥{streak}
          </div>
          <div style={styles.statLabel}>Streak</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{score}</div>
          <div style={styles.statLabel}>Score</div>
        </div>
      </div>
      
      <div style={styles.feedback}>{feedback}</div>
      
      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Ball or Strike? Make the call!</div>
            <div style={styles.readySubtext}>
              Watch the pitch location carefully
              <br />
              B key = Ball, S key = Strike
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START SESSION
            </button>
          </div>
        )}
        
        {(gameState === 'PLAYING' || gameState === 'SHOWING') && currentPitch && (
          <>
            {/* Strike zone visualization */}
            <div style={styles.strikeZone}>
              {/* Strike zone box */}
              <div style={styles.strikeZoneBox}>
                {/* Home plate */}
                <div style={styles.homePlate}>⬣</div>
                
                {/* Pitch location */}
                {gameState === 'SHOWING' && (
                  <div
                    style={{
                      ...styles.pitch,
                      left: `${getPitchPosition(currentPitch.location).x}%`,
                      top: `${getPitchPosition(currentPitch.location).y}%`,
                    }}
                  >
                    ⚾
                  </div>
                )}
              </div>
              
              {/* Pitch info */}
              <div style={styles.pitchInfo}>
                <div>{currentPitch.pitchType}</div>
                <div>{currentPitch.velocity} mph</div>
              </div>
            </div>
            
            {/* Call buttons */}
            <div style={styles.callButtons}>
              <button 
                style={{...styles.callButton, background: '#ff9800'}}
                onClick={() => handleCall('BALL')}
              >
                BALL (B)
              </button>
              <button 
                style={{...styles.callButton, background: '#f44336'}}
                onClick={() => handleCall('STRIKE')}
              >
                STRIKE (S)
              </button>
            </div>
          </>
        )}
        
        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Session Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.min(100, (correctCalls / Math.max(1, totalCalls)) * 100 + Math.min(20, correctCalls))}/100</div>
              <div>{correctCalls} correct out of {totalCalls} pitches</div>
              <div>Best streak: {streak}</div>
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.instructions}>
        {gameState === 'SHOWING' ? 'Make the call quickly!' : 'Identify pitch location'}
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
  feedback: {
    height: '1.5rem',
    fontSize: '1.1rem',
    color: '#ffd54f',
    marginBottom: '1rem',
    fontWeight: 'bold',
  },
  gameArea: {
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
  strikeZone: {
    position: 'relative',
    width: '200px',
    height: '250px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  strikeZoneBox: {
    position: 'relative',
    width: '150px',
    height: '200px',
    border: '3px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '4px',
    background: 'rgba(76, 175, 80, 0.1)',
  },
  homePlate: {
    position: 'absolute',
    bottom: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '1.5rem',
    color: 'white',
  },
  pitch: {
    position: 'absolute',
    fontSize: '1.2rem',
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.3s ease',
    animation: 'popIn 0.3s ease',
  },
  pitchInfo: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.9rem',
    color: '#4fc3f7',
  },
  callButtons: {
    display: 'flex',
    gap: '1rem',
  },
  callButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
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
  results: {
    textAlign: 'center',
  },
  instructions: {
    marginTop: '1rem',
    fontSize: '0.9rem',
    opacity: 0.7,
  },
};
