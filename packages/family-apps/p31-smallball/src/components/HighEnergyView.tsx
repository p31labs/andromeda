import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { ArrowLeft, Pause, Play, SkipForward } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Billboard, Text } from '@react-three/drei';
import { createPRNG, simulatePlateAppearance } from '../engine';
import type { Player, Stats, DefensiveAI, AtBatResult } from '../types';

interface HighEnergyViewProps {
  onBack: () => void;
}

const P31_CYAN = '#00f5ff';
const P31_PHOS = '#39ff14';
const P31_ORCHID = '#da70d6';

const defaultStats: Stats = {
  contact: 50, power: 50, eye: 50, bunt: 50,
  glove: 50, range: 50, armStrength: 50, armAccuracy: 50,
  speed: 50, stamina: 50, clutch: 50, baseballIq: 50,
};

const homeTeam: Player[] = [
  { id: 'h1', franchiseId: 'p31', firstName: 'Rico', lastName: 'Rodriguez', skinToneHex: '#ffdbac', jerseyNumber: 7, baseStats: { ...defaultStats, contact: 75, power: 65, eye: 60, speed: 80, range: 70 }, crdtClock: 0n },
  { id: 'h2', franchiseId: 'p31', firstName: 'Maya', lastName: 'Chen', skinToneHex: '#ffdbac', jerseyNumber: 24, baseStats: { ...defaultStats, contact: 85, power: 55, eye: 75, glove: 75, armAccuracy: 75, baseballIq: 80 }, crdtClock: 0n },
  { id: 'h3', franchiseId: 'p31', firstName: 'Jamal', lastName: 'Thompson', skinToneHex: '#ffdbac', jerseyNumber: 11, baseStats: { ...defaultStats, contact: 60, power: 90, eye: 45, glove: 70, armStrength: 70, clutch: 80 }, crdtClock: 0n },
  { id: 'h4', franchiseId: 'p31', firstName: 'Sofia', lastName: 'Patel', skinToneHex: '#ffdbac', jerseyNumber: 3, baseStats: { ...defaultStats, contact: 70, power: 60, eye: 65, glove: 80, range: 75, speed: 85, baseballIq: 75 }, crdtClock: 0n },
  { id: 'h5', franchiseId: 'p31', firstName: 'Tyler', lastName: 'Kim', skinToneHex: '#ffdbac', jerseyNumber: 42, baseStats: { ...defaultStats, contact: 55, power: 70, eye: 50, armStrength: 85, armAccuracy: 80, stamina: 85 }, crdtClock: 0n },
];

const awayTeam: Player[] = [
  { id: 'a1', franchiseId: 'opp', firstName: 'Alex', lastName: 'Rivera', skinToneHex: '#ffdbac', jerseyNumber: 12, baseStats: { ...defaultStats, contact: 70, power: 60, eye: 55, speed: 75, range: 65, clutch: 60 }, crdtClock: 0n },
  { id: 'a2', franchiseId: 'opp', firstName: 'Jordan', lastName: 'Lee', skinToneHex: '#ffdbac', jerseyNumber: 8, baseStats: { ...defaultStats, contact: 65, power: 75, eye: 50, glove: 65, armStrength: 60, armAccuracy: 55, baseballIq: 70 }, crdtClock: 0n },
  { id: 'a3', franchiseId: 'opp', firstName: 'Casey', lastName: 'Jones', skinToneHex: '#ffdbac', jerseyNumber: 5, baseStats: { ...defaultStats, contact: 55, power: 85, eye: 40, glove: 60, armStrength: 50, clutch: 75 }, crdtClock: 0n },
  { id: 'a4', franchiseId: 'opp', firstName: 'Morgan', lastName: 'Wright', skinToneHex: '#ffdbac', jerseyNumber: 27, baseStats: { ...defaultStats, contact: 75, power: 55, eye: 70, glove: 70, range: 80, speed: 70, baseballIq: 65 }, crdtClock: 0n },
  { id: 'a5', franchiseId: 'opp', firstName: 'Taylor', lastName: 'Reed', skinToneHex: '#ffdbac', jerseyNumber: 19, baseStats: { ...defaultStats, contact: 60, power: 65, eye: 60, armStrength: 75, armAccuracy: 70, stamina: 70 }, crdtClock: 0n },
];

const homePitcher: Player = {
  id: 'hp1', franchiseId: 'p31', firstName: 'Tyler', lastName: 'Kim', skinToneHex: '#ffdbac', jerseyNumber: 42,
  baseStats: { ...defaultStats, contact: 55, power: 70, eye: 50, armStrength: 85, armAccuracy: 80, stamina: 85, clutch: 65 },
  crdtClock: 0n,
};

const awayPitcher: Player = {
  id: 'ap1', franchiseId: 'opp', firstName: 'Taylor', lastName: 'Reed', skinToneHex: '#ffdbac', jerseyNumber: 19,
  baseStats: { ...defaultStats, contact: 60, power: 65, eye: 60, armStrength: 75, armAccuracy: 70, stamina: 70, clutch: 60 },
  crdtClock: 0n,
};

const defaultDefense: DefensiveAI = {
  aggressionLevel: 0.5,
  pitchPreference: ['FASTBALL', 'CURVEBALL', 'SLIDER', 'CHANGEUP', 'FASTBALL'],
  shiftAlignment: 'STANDARD',
  bullpenThreshold: 80,
};

interface GameState {
  inning: number;
  isTop: boolean;
  outs: number;
  homeScore: number;
  awayScore: number;
  homeBatterIndex: number;
  awayBatterIndex: number;
  result: string;
  resultDetail: string;
  log: string[];
  phase: 'ready' | 'result' | 'gameOver';
  ballEndPos: [number, number, number] | null;
  ballActive: boolean;
}

function formatResult(pa: AtBatResult): string {
  const final = pa.finalState;
  if (final.type === 'STRIKEOUT') return 'STRIKEOUT';
  if (final.type === 'WALK') return 'WALK';
  if (final.type === 'IN_PLAY' && final.result) {
    if (final.result === 'OUT') return 'OUT';
    return final.result;
  }
  return 'IN PLAY';
}

function formatResultDetail(pa: AtBatResult): string {
  const final = pa.finalState;
  if (final.type === 'STRIKEOUT') return 'Swinging strikeout';
  if (final.type === 'WALK') return 'Ball four, takes first';
  if (final.type === 'IN_PLAY' && final.result) {
    const lastEvent = pa.events[pa.events.length - 1];
    if (final.result === 'OUT') return `In play, out`;
    if (final.result === 'HOMERUN') return `Home run! ${lastEvent.exitVelocity ?? ''}mph off the bat`;
    if (final.result === 'SINGLE') return `Single`;
    if (final.result === 'DOUBLE') return `Double to the gap`;
    if (final.result === 'TRIPLE') return `Triple to deep right`;
    return `Ball in play`;
  }
  return '';
}

function getBallTarget(result: string): [number, number, number] {
  switch (result) {
    case 'HOMERUN': return [8, 6, -10];
    case 'TRIPLE': return [7, 3, -8];
    case 'DOUBLE': return [6, 2, -6];
    case 'SINGLE': return [3, 1, -3];
    default: return [2, 1, -2];
  }
}

const FieldGeometry: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
      <planeGeometry args={[18, 18]} />
      <meshStandardMaterial color="#c19a6b" roughness={0.8} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
      <circleGeometry args={[8, 32]} />
      <meshStandardMaterial color="#2d4c1e" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.03, 6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial color="#e8dcc0" />
    </mesh>
    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.5, 32]} />
      <meshStandardMaterial color="#c19a6b" />
    </mesh>
    <mesh position={[6, 0.1, 0]}><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
    <mesh position={[-6, 0.1, 0]}><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
    <mesh position={[0, 0.1, -6]}><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
  </group>
);

const PlayerBillboard: React.FC<{ position: [number, number, number]; color: string; label?: string; isBatter?: boolean }> = ({ position, color, label, isBatter }) => {
  const ref = useRef<any>(null);
  useFrame((state) => {
    if (ref.current && isBatter) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });
  return (
    <Billboard position={position} follow>
      <group>
        <mesh ref={ref}><planeGeometry args={[0.8, 1.2]} /><meshBasicMaterial color={color} depthWrite={false} /></mesh>
        {label && <Text position={[0, 0, 0.01]} fontSize={0.25} color="white" anchorX="center" anchorY="middle">{label}</Text>}
      </group>
    </Billboard>
  );
};

const AnimatedBall: React.FC<{ startPos: [number, number, number]; endPos: [number, number, number]; active: boolean; onComplete: () => void }> = ({ startPos, endPos, active, onComplete }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) { setProgress(0); return; }
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.025;
      if (t >= 1) { setProgress(1); onComplete(); return; }
      setProgress(t);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, onComplete]);

  if (!active || progress === 0) return null;
  const x = startPos[0] + (endPos[0] - startPos[0]) * progress;
  const y = startPos[1] + (endPos[1] - startPos[1]) * progress + Math.sin(progress * Math.PI) * 3;
  const z = startPos[2] + (endPos[2] - startPos[2]) * progress;
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
    </mesh>
  );
};

const GameLog: React.FC<{ log: string[]; isTop: boolean; inning: number }> = ({ log, isTop, inning }) => (
  <div className="absolute bottom-4 left-4 glass-panel rounded-xl p-3 max-h-48 w-64 overflow-y-auto">
    <p className="text-xs text-white/40 font-mono mb-2">GAME LOG — {isTop ? 'TOP' : 'BOT'} {inning}</p>
    {log.length === 0 && <p className="text-xs text-white/20 italic">Waiting for first pitch...</p>}
    {log.map((entry, i) => (
      <p key={i} className="text-xs text-white/60 font-mono leading-relaxed">{entry}</p>
    ))}
  </div>
);

const ResultOverlay: React.FC<{ result: string; detail: string; visible: boolean }> = ({ result, detail, visible }) => {
  if (!visible) return null;
  const color = result === 'HOMERUN' ? '#ff6b35' : result === 'STRIKEOUT' ? '#ff3333' : result === 'WALK' ? '#39ff14' : result === 'SINGLE' || result === 'DOUBLE' || result === 'TRIPLE' ? '#00f5ff' : '#ffffff';
  return (
    <group position={[0, 4, 2]}>
      <Billboard>
        <Text fontSize={0.8} color={color} anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000">
          {result}
        </Text>
        {detail && (
          <Text position={[0, -0.6, 0]} fontSize={0.3} color="#cccccc" anchorX="center" anchorY="middle">
            {detail}
          </Text>
        )}
      </Billboard>
    </group>
  );
};

const StadiumScene: React.FC<{ gameState: GameState; isPaused: boolean }> = ({ gameState, isPaused }) => {
  const showResult = gameState.phase === 'result' || gameState.phase === 'gameOver';
  const target = gameState.ballEndPos || [2, 1, -2];

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[-10, 20, 10]} castShadow intensity={1} />
      <pointLight position={[0, 15, 10]} intensity={0.5} color="#feca57" />
      <FieldGeometry />
      <PlayerBillboard position={[0, 0.5, 0]} color={P31_CYAN} label="P" />
      <PlayerBillboard position={[0, 0.5, 7]} color={P31_PHOS} label="C" />
      <PlayerBillboard position={[0.5, 0.5, 6.5]} color={P31_ORCHID} isBatter label={String(homeTeam[gameState.homeBatterIndex % homeTeam.length].jerseyNumber)} />
      <PlayerBillboard position={[6, 0.5, -2]} color={P31_CYAN} />
      <PlayerBillboard position={[-6, 0.5, -2]} color={P31_CYAN} />
      <PlayerBillboard position={[0, 0.5, -8]} color={P31_CYAN} />
      <AnimatedBall startPos={[0, 2, 0]} endPos={target} active={gameState.ballActive && !isPaused} onComplete={() => {}} />
      <ResultOverlay result={gameState.result} detail={gameState.resultDetail} visible={showResult} />
    </>
  );
};

export const HighEnergyView: React.FC<HighEnergyViewProps> = ({ onBack }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [prng] = useState(() => createPRNG(Date.now()));
  const [gameState, setGameState] = useState<GameState>({
    inning: 1, isTop: true, outs: 0,
    homeScore: 0, awayScore: 0,
    homeBatterIndex: 0, awayBatterIndex: 0,
    result: '', resultDetail: '', log: [],
    phase: 'ready', ballEndPos: null, ballActive: false,
  });

  const processPlateAppearance = useCallback(() => {
    const isTop = gameState.isTop;
    const batter = isTop
      ? awayTeam[gameState.awayBatterIndex % awayTeam.length]
      : homeTeam[gameState.homeBatterIndex % homeTeam.length];
    const pitcher = isTop ? homePitcher : awayPitcher;
    const defense = defaultDefense;

    const result = simulatePlateAppearance(batter, batter.baseStats, pitcher, pitcher.baseStats, defense, prng);
    const fmt = formatResult(result);
    const detail = formatResultDetail(result);
    const isOut = fmt === 'STRIKEOUT' || fmt === 'OUT';
    const isHit = fmt === 'SINGLE' || fmt === 'DOUBLE' || fmt === 'TRIPLE' || fmt === 'HOMERUN';
    const isWalk = fmt === 'WALK';

    let newOuts = gameState.outs;
    let newHomeScore = gameState.homeScore;
    let newAwayScore = gameState.awayScore;
    let newHomeIdx = gameState.homeBatterIndex;
    let newAwayIdx = gameState.awayBatterIndex;
    let runScored = false;

    if (isOut) {
      newOuts += 1;
    } else if (isHit) {
      if (fmt === 'HOMERUN') {
        runScored = true;
        if (isTop) newAwayScore += 1; else newHomeScore += 1;
      } else if (fmt === 'SINGLE' || fmt === 'DOUBLE' || fmt === 'TRIPLE') {
        runScored = true;
        if (isTop) newAwayScore += 1; else newHomeScore += 1;
      }
    } else if (isWalk) {
      runScored = true;
      if (isTop) newAwayScore += 1; else newHomeScore += 1;
    }

    const batterName = `${batter.firstName} ${batter.lastName[0]}.`;
    const logEntry = `[${isTop ? 'TOP' : 'BOT'} ${gameState.inning}] ${batterName}: ${fmt}${runScored ? ' (R)' : ''}`;
    const newLog = [...gameState.log, logEntry];

    if (newOuts >= 3) {
      if (isTop) {
        if (gameState.inning >= 9 && newHomeScore > newAwayScore) {
          setGameState(prev => ({ ...prev, ...{
            inning: gameState.inning, isTop: false, outs: 0,
            homeScore: newHomeScore, awayScore: newAwayScore,
            homeBatterIndex: newHomeIdx, awayBatterIndex: newAwayIdx + 1,
            result: fmt, resultDetail: detail,
            phase: 'gameOver' as const, log: newLog, ballActive: true,
            ballEndPos: isHit ? getBallTarget(fmt) : null,
          }}));
          return;
        }
        setGameState(prev => ({ ...prev, ...{
          inning: gameState.inning, isTop: false, outs: 0,
          homeScore: newHomeScore, awayScore: newAwayScore,
          homeBatterIndex: newHomeIdx, awayBatterIndex: newAwayIdx + 1,
          result: fmt, resultDetail: detail,
          phase: 'result' as const, log: newLog, ballActive: true,
          ballEndPos: isHit ? getBallTarget(fmt) : null,
        }}));
      } else {
        if (gameState.inning >= 9 && newHomeScore !== newAwayScore) {
          setGameState(prev => ({ ...prev, ...{
            inning: gameState.inning + 1, isTop: true, outs: 0,
            homeScore: newHomeScore, awayScore: newAwayScore,
            homeBatterIndex: newHomeIdx + 1, awayBatterIndex: newAwayIdx,
            result: fmt, resultDetail: detail,
            phase: 'gameOver' as const, log: newLog, ballActive: true,
            ballEndPos: isHit ? getBallTarget(fmt) : null,
          }}));
          return;
        }
        setGameState(prev => ({ ...prev, ...{
          inning: gameState.inning + 1, isTop: true, outs: 0,
          homeScore: newHomeScore, awayScore: newAwayScore,
          homeBatterIndex: newHomeIdx + 1, awayBatterIndex: newAwayIdx,
          result: fmt, resultDetail: detail,
          phase: 'result' as const, log: newLog, ballActive: true,
          ballEndPos: isHit ? getBallTarget(fmt) : null,
        }}));
      }
    } else {
      if (isTop) newAwayIdx += 1; else newHomeIdx += 1;
      setGameState(prev => ({ ...prev, ...{
        outs: newOuts,
        homeScore: newHomeScore, awayScore: newAwayScore,
        homeBatterIndex: newHomeIdx, awayBatterIndex: newAwayIdx,
        result: fmt, resultDetail: detail,
        phase: 'result' as const, log: newLog, ballActive: true,
        ballEndPos: isHit ? getBallTarget(fmt) : null,
      }}));
    }
  }, [gameState, prng]);

  const handleNext = useCallback(() => {
    setGameState(prev => ({ ...prev, result: '', resultDetail: '', phase: 'ready', ballActive: false }));
    setTimeout(processPlateAppearance, 100);
  }, [processPlateAppearance]);

  const startGame = useCallback(() => {
    setGameState(prev => ({ ...prev, phase: 'ready' }));
    setTimeout(processPlateAppearance, 100);
  }, [processPlateAppearance]);

  const inningLabel = gameState.isTop ? 'TOP' : 'BOT';
  const isFinal = gameState.phase === 'gameOver';
  const winner = gameState.homeScore > gameState.awayScore ? 'P31 PIONEERS' : 'OPPONENTS';

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-orchid" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">P31 Smallball — Full Simulation</h1>
          <p className="text-xs text-white/50">6 Spoons • Markov Chain Engine v4.1</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPaused(!isPaused)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            {isPaused ? <Play className="w-5 h-5 text-phos" /> : <Pause className="w-5 h-5 text-orchid" />}
          </button>
        </div>
      </header>

      <main className="flex-1 relative">
        <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-white/50">Loading Stadium...</p></div>}>
          <Canvas frameloop={isPaused ? 'never' : 'demand'} shadows className="w-full h-full">
            <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={35} near={-100} far={100} />
            <StadiumScene gameState={gameState} isPaused={isPaused} />
          </Canvas>
        </Suspense>

        <div className="absolute top-4 right-4 glass-panel rounded-xl p-4 min-w-40">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-cyan font-bold">P31</p>
              <p className="text-2xl font-bold text-white">{gameState.homeScore}</p>
            </div>
            <div className="text-center text-white/30">
              <p className="text-xs">{inningLabel}</p>
              <p className="text-xl font-bold">{gameState.inning}</p>
              <p className="text-[10px]">{gameState.outs} Out{gameState.outs !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-orchid font-bold">OPP</p>
              <p className="text-2xl font-bold text-white">{gameState.awayScore}</p>
            </div>
          </div>
        </div>

        <GameLog log={gameState.log} isTop={gameState.isTop} inning={gameState.inning} />

        {gameState.phase === 'ready' && gameState.log.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="glass-panel rounded-2xl p-6 text-center max-w-sm pointer-events-auto">
              <h2 className="text-xl font-bold text-white mb-2">P31 Pioneers vs. Opponents</h2>
              <p className="text-sm text-white/60 mb-4">Markov Chain simulation. Each click throws a pitch.</p>
              <button onClick={startGame} className="px-6 py-3 rounded-xl bg-orchid/20 border border-orchid/40 text-orchid font-bold hover:bg-orchid/30 transition-colors">
                First Pitch
              </button>
            </div>
          </div>
        )}

        {gameState.phase === 'result' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
            <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-colors flex items-center gap-2">
              <SkipForward className="w-4 h-4" /> Next Batter
            </button>
          </div>
        )}

        {isFinal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="glass-panel rounded-2xl p-8 text-center max-w-sm">
              <h2 className="text-2xl font-bold text-white mb-2">Game Over</h2>
              <p className="text-lg text-phos font-bold mb-1">{winner} Win!</p>
              <p className="text-4xl font-bold text-white mb-4">{gameState.homeScore} - {gameState.awayScore}</p>
              <p className="text-xs text-white/40 mb-4">{gameState.inning} innings</p>
              <button onClick={onBack} className="px-6 py-3 rounded-xl bg-orchid/20 border border-orchid/40 text-orchid font-bold hover:bg-orchid/30 transition-colors">
                Back to Menu
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 glass-panel rounded-xl p-3">
          <p className="text-xs text-white/50">Markov Engine v4.1</p>
          <p className={`text-sm font-bold ${isPaused ? 'text-yellow-400' : 'text-phos'}`}>
            {isPaused ? 'PAUSED' : gameState.phase === 'gameOver' ? 'FINAL' : gameState.phase === 'result' ? 'RESULT' : 'READY'}
          </p>
        </div>
      </main>

      <footer className="glass-panel px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">P31 Smallball • Markov Chain • React Three Fiber</p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>12-Attribute Engine</span><span>•</span>
          <span>Deterministic PRNG</span><span>•</span>
          <span>frameloop="demand"</span>
        </div>
      </footer>
    </div>
  );
};
