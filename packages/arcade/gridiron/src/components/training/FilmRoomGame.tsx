// P31 Gridiron: Film Room Minigame (Track 1)
// Play recognition for Football IQ & Stamina
// Flashcard-style formation identification

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameResult, TrainingStationId, SpoonState } from '../../types';

interface FilmRoomGameProps {
  spoonCount: SpoonState;
  onComplete: (result: MinigameResult) => void;
}

type GameState = 'READY' | 'SHOWING' | 'ANSWERING' | 'RESULT' | 'DONE';

interface PlayRecognition {
  formation: string;
  coverage: 'COVER_2' | 'COVER_3' | 'COVER_4' | 'MAN' | 'BLITZ' | 'COVER_0';
  strengths: string[];
  weaknesses: string[];
}

const PLAY_LIBRARY: PlayRecognition[] = [
  {
    formation: 'Cover 2',
    coverage: 'COVER_2',
    strengths: ['Short zones', 'Run support'],
    weaknesses: ['Deep middle', 'Seams'],
  },
  {
    formation: 'Cover 3',
    coverage: 'COVER_3',
    strengths: ['Deep thirds', 'Sideline'],
    weaknesses: ['Flat zones', 'Short middle'],
  },
  {
    formation: 'Cover 4',
    coverage: 'COVER_4',
    strengths: ['Prevent deep', 'Quarters'],
    weaknesses: ['Short underneath', 'Run'],
  },
  {
    formation: 'Man Free',
    coverage: 'MAN',
    strengths: ['Tight coverage', 'Blitz potential'],
    weaknesses: ['Pick routes', 'Speed mismatches'],
  },
  {
    formation: 'Blitz Zero',
    coverage: 'COVER_0',
    strengths: ['Maximum pressure', 'Quick sacks'],
    weaknesses: ['No safety help', 'Deep shots'],
  },
  {
    formation: 'Blitz',
    coverage: 'BLITZ',
    strengths: ['QB pressure', 'Disruption'],
    weaknesses: ['Man coverage behind', 'Screens'],
  },
];

export function FilmRoomGame({ spoonCount, onComplete }: FilmRoomGameProps) {
  // Spoon adaptations
  const flashDuration = spoonCount === 1 ? 3000 : spoonCount === 3 ? 2000 : 1500;
  const questions = spoonCount === 1 ? 5 : spoonCount === 3 ? 8 : 12;
  const optionsCount = spoonCount === 1 ? 3 : 4;

  const [gameState, setGameState] = useState<GameState>('READY');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [mentalFatigue, setMentalFatigue] = useState(0);  // Wrong answers increase this

  const [currentPlay, setCurrentPlay] = useState<PlayRecognition | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(flashDuration / 1000);

  const gameStartTimeRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const generateQuestion = useCallback(() => {
    // Pick random play
    const play = PLAY_LIBRARY[Math.floor(Math.random() * PLAY_LIBRARY.length)];
    setCurrentPlay(play);

    // Generate wrong options
    const wrongOptions = PLAY_LIBRARY
      .filter(p => p.coverage !== play.coverage)
      .map(p => p.formation)
      .sort(() => Math.random() - 0.5)
      .slice(0, optionsCount - 1);

    // Combine and shuffle
    const allOptions = [play.formation, ...wrongOptions]
      .sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, [optionsCount]);

  const startRound = useCallback(() => {
    generateQuestion();
    setGameState('SHOWING');
    setTimeLeft(flashDuration / 1000);
    setFeedback('Study the formation...');

    // Countdown timer
    const timer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameState('ANSWERING');
          setFeedback('Identify the coverage!');
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    timersRef.current.push(timer);

    // Auto-advance
    const autoAdvance = window.setTimeout(() => {
      setGameState('ANSWERING');
      setFeedback('Identify the coverage!');
    }, flashDuration);
    timersRef.current.push(autoAdvance);
  }, [flashDuration, generateQuestion]);

  const startGame = useCallback(() => {
    setCurrentRound(0);
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setMentalFatigue(0);
    gameStartTimeRef.current = Date.now();
    startRound();
  }, [startRound]);

  const handleAnswer = useCallback((answer: string) => {
    if (gameState !== 'ANSWERING' || !currentPlay) return;

    const isCorrect = answer === currentPlay.formation;

    if (isCorrect) {
      setCorrect(prev => prev + 1);
      // Bonus for speed
      const speedBonus = Math.round(timeLeft * 5);
      setScore(prev => prev + 20 + speedBonus);
      setFeedback(`Correct! +${20 + speedBonus} pts`);
    } else {
      setWrong(prev => prev + 1);
      setMentalFatigue(prev => Math.min(100, prev + 8));
      setFeedback(`Wrong! It was ${currentPlay.formation}`);
    }

    setGameState('RESULT');

    // Next round or end
    setTimeout(() => {
      setCurrentRound(prev => {
        const next = prev + 1;
        if (next >= questions) {
          endGame();
        } else {
          startRound();
        }
        return next;
      });
    }, 1500);
  }, [gameState, currentPlay, timeLeft, questions, startRound]);

  const endGame = useCallback(() => {
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;

    // Score: correct * accuracy - mental fatigue penalty
    const accuracy = currentRound > 0 ? correct / currentRound : 0;
    const baseScore = correct * 20;
    const accuracyBonus = Math.round(accuracy * 30);
    const fatiguePenalty = Math.round(mentalFatigue * 0.3);
    const finalScore = Math.max(0, Math.min(100, baseScore + accuracyBonus - fatiguePenalty));

    const result: MinigameResult = {
      station: 'filmRoom' as TrainingStationId,
      score: finalScore,
      attributesImproved: ['footballIQ', 'stamina'],
      xpGained: finalScore * 0.5,
      energyBurned: 15 + mentalFatigue * 0.1,
      fatigueDelta: 2 + mentalFatigue * 0.05,
      duration,
      timestamp: new Date().toISOString(),
    };

    setGameState('DONE');
    onComplete(result);
  }, [correct, currentRound, mentalFatigue, questions, onComplete]);

  // Keyboard controls (1-4 for options)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'READY') {
        e.preventDefault();
        startGame();
        return;
      }

      if (gameState === 'ANSWERING') {
        const num = parseInt(e.key);
        if (num >= 1 && num <= options.length) {
          handleAnswer(options[num - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, handleAnswer, options]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Visual formation representation
  const renderFormation = (play: PlayRecognition) => {
    const isCover2 = play.coverage === 'COVER_2';
    const isCover3 = play.coverage === 'COVER_3';
    const isMan = play.coverage === 'MAN';
    const isBlitz = play.coverage === 'BLITZ' || play.coverage === 'COVER_0';

    return (
      <div style={styles.formationDisplay}>
        {/* Offense (simplified) */}
        <div style={styles.offense}>
          <div style={styles.qb}>QB</div>
          <div style={styles.rb}>RB</div>
          <div style={styles.wrLeft}>WR</div>
          <div style={styles.wrRight}>WR</div>
        </div>

        {/* Defense formation */}
        <div style={styles.defense}>
          {/* Defensive line */}
          <div style={styles.dLine}>
            <span style={styles.dl}>DL</span>
            <span style={styles.dl}>DL</span>
            <span style={styles.dl}>DL</span>
            {isBlitz && <span style={{...styles.dl, ...styles.blitzing}}>BLITZ</span>}
          </div>

          {/* Linebackers */}
          <div style={styles.linebackers}>
            <span style={styles.lb}>LB</span>
            {!isBlitz && <span style={styles.lb}>LB</span>}
            <span style={styles.lb}>LB</span>
          </div>

          {/* Secondary */}
          <div style={styles.secondary}>
            {isCover2 && (
              <>
                <span style={{...styles.db, ...styles.safety}}>S</span>
                <span style={styles.db}>CB</span>
                <span style={styles.db}>CB</span>
                <span style={{...styles.db, ...styles.safety}}>S</span>
              </>
            )}
            {isCover3 && (
              <>
                <span style={{...styles.db, ...styles.safetyDeep}}>S</span>
                <span style={styles.db}>CB</span>
                <span style={styles.db}>CB</span>
                <span style={styles.db}>CB</span>
              </>
            )}
            {isMan && (
              <>
                <span style={{...styles.db, ...styles.safety}}>S</span>
                <span style={{...styles.db, ...styles.manCoverage}}>CB→</span>
                <span style={{...styles.db, ...styles.manCoverage}}>←CB</span>
                <span style={styles.db}>S</span>
              </>
            )}
            {isBlitz && (
              <>
                <span style={styles.db}>CB</span>
                <span style={styles.db}>CB</span>
                <span style={styles.db}>S</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>FILM ROOM</h2>
        <div style={styles.round}>Q {currentRound + 1}/{questions}</div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{score}</div>
          <div style={styles.statLabel}>Score</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: '#4caf50'}}>{correct}</div>
          <div style={styles.statLabel}>Right</div>
        </div>
        <div style={styles.stat}>
          <div style={{...styles.statValue, color: wrong > 0 ? '#f44336' : '#4fc3f7'}}>{wrong}</div>
          <div style={styles.statLabel}>Wrong</div>
        </div>
      </div>

      {/* Mental Fatigue Meter */}
      <div style={styles.fatigueMeter}>
        <span style={styles.fatigueLabel}>MENTAL FATIGUE</span>
        <div style={styles.fatigueTrack}>
          <div style={{...styles.fatigueBar, width: `${mentalFatigue}%`}} />
        </div>
      </div>

      <div style={styles.feedback}>{feedback}</div>

      <div style={styles.gameArea}>
        {gameState === 'READY' && (
          <div style={styles.readyState}>
            <div style={styles.readyText}>Study the Tape!</div>
            <div style={styles.readySubtext}>
              Formation shown for {flashDuration / 1000}s
              <br />
              Then identify the coverage
              <br />
              <span style={styles.warning}>Wrong answers increase mental fatigue</span>
            </div>
            <button style={styles.startButton} onClick={startGame}>
              START SESSION
            </button>
          </div>
        )}

        {(gameState === 'SHOWING' || gameState === 'ANSWERING' || gameState === 'RESULT') && currentPlay && (
          <>
            {/* Formation visualization */}
            {gameState === 'SHOWING' && renderFormation(currentPlay)}

            {/* Timer bar for showing phase */}
            {gameState === 'SHOWING' && (
              <div style={styles.timerBar}>
                <div style={{...styles.timerFill, width: `${(timeLeft / (flashDuration / 1000)) * 100}%`}} />
              </div>
            )}

            {/* Answer options */}
            {(gameState === 'ANSWERING' || gameState === 'RESULT') && (
              <div style={styles.optionsGrid}>
                {options.map((option, idx) => (
                  <button
                    key={option}
                    style={{
                      ...styles.option,
                      ...(gameState === 'RESULT' && option === currentPlay.formation && styles.correct),
                      ...(gameState === 'RESULT' && option !== currentPlay.formation && styles.incorrect),
                    }}
                    onClick={() => handleAnswer(option)}
                    disabled={gameState === 'RESULT'}
                  >
                    <span style={styles.optionNum}>{idx + 1}</span>
                    <span style={styles.optionText}>{option}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Result info */}
            {gameState === 'RESULT' && (
              <div style={styles.resultInfo}>
                <div style={styles.strengths}>
                  <strong>Strengths:</strong> {currentPlay.strengths.join(', ')}
                </div>
                <div style={styles.weaknesses}>
                  <strong>Attack:</strong> {currentPlay.weaknesses.join(', ')}
                </div>
              </div>
            )}
          </>
        )}

        {gameState === 'DONE' && (
          <div style={styles.doneState}>
            <div style={styles.doneTitle}>Session Complete!</div>
            <div style={styles.results}>
              <div>Final Score: {Math.max(0, Math.min(100, correct * 20 + Math.round((currentRound > 0 ? correct / currentRound : 0) * 30) - Math.round(mentalFatigue * 0.3)))}/100</div>
              <div>{correct}/{currentRound} correct • Mental fatigue: {Math.round(mentalFatigue)}%</div>
              <div>Football IQ & Stamina improved!</div>
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
    color: '#795548',
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
  fatigueMeter: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  fatigueLabel: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#ff9800',
  },
  fatigueTrack: {
    flex: 1,
    height: '8px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  fatigueBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff9800 0%, #f44336 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
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
  warning: {
    color: '#ff9800',
    fontSize: '0.85rem',
  },
  startButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #795548 0%, #5d4037 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(121, 85, 72, 0.4)',
  },
  formationDisplay: {
    width: '100%',
    height: '200px',
    background: 'linear-gradient(180deg, #2d5c2d 0%, #1a4d1a 100%)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  offense: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
  },
  qb: {
    width: '30px',
    height: '30px',
    background: '#2196f3',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 'bold',
  },
  rb: {
    width: '28px',
    height: '28px',
    background: '#4caf50',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
  },
  wrLeft: {
    width: '26px',
    height: '26px',
    background: '#ff9800',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
  },
  wrRight: {
    width: '26px',
    height: '26px',
    background: '#ff9800',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
  },
  defense: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'center',
  },
  dLine: {
    display: 'flex',
    gap: '0.5rem',
  },
  dl: {
    width: '28px',
    height: '28px',
    background: '#f44336',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
    fontWeight: 'bold',
  },
  blitzing: {
    background: '#9c27b0',
    animation: 'pulse 0.5s infinite',
  },
  linebackers: {
    display: 'flex',
    gap: '0.5rem',
  },
  lb: {
    width: '26px',
    height: '26px',
    background: '#e91e63',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
  },
  secondary: {
    display: 'flex',
    gap: '0.5rem',
  },
  db: {
    width: '24px',
    height: '24px',
    background: '#9c27b0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.55rem',
  },
  safety: {
    background: '#673ab7',
  },
  safetyDeep: {
    background: '#673ab7',
    transform: 'translateY(-10px)',
  },
  manCoverage: {
    background: '#ff5722',
  },
  timerBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4caf50 0%, #ff9800 50%, #f44336 100%)',
    borderRadius: '3px',
    transition: 'width 0.1s linear',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    width: '100%',
  },
  option: {
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
  },
  correct: {
    background: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4caf50',
  },
  incorrect: {
    background: 'rgba(244, 67, 54, 0.3)',
    borderColor: '#f44336',
    opacity: 0.7,
  },
  optionNum: {
    width: '24px',
    height: '24px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
  },
  resultInfo: {
    width: '100%',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
  },
  strengths: {
    fontSize: '0.9rem',
    color: '#4caf50',
    marginBottom: '0.5rem',
  },
  weaknesses: {
    fontSize: '0.9rem',
    color: '#f44336',
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
