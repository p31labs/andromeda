// P31 Smallball Interactive Demo
// Complete working demonstration of all systems

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createPRNG, simulatePlateAppearance } from '../engine';
import type { SpoonState, Player, Stats } from '../types';
import { useSpoons } from './SpoonShell';

// ============================================
// DEMO STADIUM - Simplified for performance
// ============================================

function SimpleField() {
  return (
    <group>
      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[15, 32]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Infield dirt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
      
      {/* Bases */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[3, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, 0.1, -3]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-3, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Pitcher's mound */}
      <mesh position={[0, 0.2, -1.5]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 16]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
    </group>
  );
}

function PlayerDot({ position, color, isPitcher }: { position: [number, number, number], color: string, isPitcher?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.lookAt(camera.position);
    }
  });
  
  return (
    <mesh ref={ref} position={position}>
      <circleGeometry args={[isPitcher ? 0.25 : 0.2, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function AnimatedBall({ startPos, endPos, speed = 1, onComplete }: { 
  startPos: [number, number, number], 
  endPos: [number, number, number],
  speed?: number,
  onComplete?: () => void
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  
  useFrame((_, delta) => {
    if (!ref.current) return;
    
    progress.current += delta * speed;
    
    if (progress.current >= 1) {
      progress.current = 1;
      onComplete?.();
    }
    
    const t = progress.current;
    // Arc trajectory
    const x = THREE.MathUtils.lerp(startPos[0], endPos[0], t);
    const z = THREE.MathUtils.lerp(startPos[2], endPos[2], t);
    const y = THREE.MathUtils.lerp(startPos[1], endPos[1], t) + Math.sin(t * Math.PI) * 1;
    
    ref.current.position.set(x, y, z);
  });
  
  return (
    <mesh ref={ref} position={startPos}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

// ============================================
// DEMO SCENE
// ============================================

function DemoScene({ spoonState, atBatResult }: { spoonState: SpoonState, atBatResult: any }) {
  const [showBall, setShowBall] = useState(false);
  const [ballResult, setBallResult] = useState<'hit' | 'strike' | null>(null);
  
  useEffect(() => {
    if (atBatResult) {
      setShowBall(true);
      const timer = setTimeout(() => {
        setShowBall(false);
        if (atBatResult.result === 'IN_PLAY') setBallResult('hit');
        else if (atBatResult.result === 'STRIKEOUT') setBallResult('strike');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [atBatResult]);
  
  const fps = spoonState === 1 ? 0 : spoonState === 3 ? 12 : 30;
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      <SimpleField />
      
      {/* Players - fielding team */}
      <PlayerDot position={[0, 0.3, -1.5]} color="#3b82f6" isPitcher />
      <PlayerDot position={[0, 0.3, 1]} color="#3b82f6" />
      <PlayerDot position={[3, 0.3, 0]} color="#3b82f6" />
      <PlayerDot position={[-3, 0.3, 0]} color="#3b82f6" />
      <PlayerDot position={[1.5, 0.3, -1.5]} color="#3b82f6" />
      <PlayerDot position={[-1.5, 0.3, -1.5]} color="#3b82f6" />
      <PlayerDot position={[5, 0.3, -3]} color="#3b82f6" />
      <PlayerDot position={[0, 0.3, -6]} color="#3b82f6" />
      <PlayerDot position={[-5, 0.3, -3]} color="#3b82f6" />
      
      {/* Batter */}
      <PlayerDot position={[0, 0.3, 1.5]} color="#ef4444" />
      
      {/* Ball animation */}
      {showBall && atBatResult && (
        <AnimatedBall 
          startPos={[0, 0.5, -1.5]} 
          endPos={atBatResult.result === 'IN_PLAY' ? [5, 0, -10] : [0, 0.5, 1.5]}
          speed={atBatResult.result === 'IN_PLAY' ? 2 : 3}
        />
      )}
      
      {/* Result indicator */}
      {ballResult && (
        <mesh position={[0, 3, 0]}>
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial 
            color={ballResult === 'hit' ? '#22c55e' : '#ef4444'} 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
    </>
  );
}

// ============================================
// DEMO PAGE UI
// ============================================

export function DemoPage() {
  const spoonContext = useSpoons();
  const spoonState = spoonContext.spoonState;
  const spoonsRemaining = spoonContext.spoonsRemaining;
  const consumeSpoons = spoonContext.useSpoons;
  const [atBatResult, setAtBatResult] = useState<any>(null);
  const [history, setHistory] = useState<Array<{ result: string; pitches: number; exitVelo?: number }>>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Demo players - using full 12-attribute Stats system
  const batter: Player = {
    id: 'demo-batter',
    franchiseId: 'demo',
    firstName: 'Demo',
    lastName: 'Player',
    skinToneHex: '#E8A87C',
    jerseyNumber: 42,
    baseStats: {
      // Hitting (4)
      contact: spoonState === 1 ? 40 : spoonState === 3 ? 60 : 80,
      power: 50,
      eye: 50,
      bunt: 40,
      // Defense/Pitching (4)
      glove: 50,
      range: 50,
      armStrength: 50,
      armAccuracy: 50,
      // Physical/Mental (4)
      speed: 50,
      stamina: 60,
      clutch: 45,
      baseballIq: 55,
    },
    crdtClock: 0n,
  };
  
  const pitcher: Player = {
    id: 'demo-pitcher',
    franchiseId: 'demo',
    firstName: 'Ace',
    lastName: 'Pitcher',
    skinToneHex: '#8D5524',
    jerseyNumber: 21,
    baseStats: {
      // Hitting (4)
      contact: 30,
      power: 40,
      eye: 60,
      bunt: 35,
      // Defense/Pitching (4)
      glove: 50,
      range: 60,
      armStrength: 75,  // velocity for pitchers
      armAccuracy: 65,  // control for pitchers
      // Physical/Mental (4)
      speed: 70,
      stamina: 80,
      clutch: 55,
      baseballIq: 60,
    },
    crdtClock: 0n,
  };
  
  const runSimulation = () => {
    if (isSimulating) return;
    
    const cost = spoonState === 1 ? 1 : spoonState === 3 ? 3 : 6;
    if (!consumeSpoons(cost)) {
      alert('Not enough spoons!');
      return;
    }
    
    setIsSimulating(true);
    setAtBatResult(null);
    
    // Run simulation with deterministic seed
    const seed = Date.now();
    const prng = createPRNG(seed);
    
    const result = simulatePlateAppearance(
      batter,
      batter.baseStats,
      pitcher,
      pitcher.baseStats,
      {
        aggressionLevel: 0.5,
        pitchPreference: ['FASTBALL', 'SLIDER', 'CURVEBALL', 'CHANGEUP'],
        shiftAlignment: 'STANDARD',
        bullpenThreshold: 0.3,
      },
      prng
    );
    
    setAtBatResult(result);
    
    // Add to history
    setHistory(prev => [{
      result: result.finalState.type,
      pitches: result.events.length,
      exitVelo: result.events[result.events.length - 1]?.pitch?.velocity,
    }, ...prev].slice(0, 10));
    
    setTimeout(() => setIsSimulating(false), 2500);
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0a0a14',
    }}>
      {/* Header */}
      <header style={{
        padding: '1rem 2rem',
        background: 'rgba(59, 130, 246, 0.1)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: spoonState === 1 ? '2rem' : '1.5rem' }}>
            ⚾ P31 Smallball Demo
          </h1>
          <p style={{ margin: '0.5rem 0 0', opacity: 0.6 }}>
            Deterministic simulation • Spoon Theory UX • 2.5D rendering
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem' }}>
            {Array.from({ length: spoonsRemaining }).map((_, i) => '🥄').join('')}
          </div>
          <div style={{ opacity: 0.6, fontSize: '0.875rem' }}>
            {spoonsRemaining} spoons remaining
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main style={{ 
        flex: 1,
        display: 'grid',
        gridTemplateColumns: spoonState === 1 ? '1fr' : '2fr 1fr',
        gap: '2rem',
        padding: '2rem',
      }}>
        {/* 3D View */}
        <div style={{
          height: spoonState === 1 ? '50vh' : '70vh',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Canvas
            frameloop={spoonState === 1 ? 'never' : 'demand'}
            camera={{ position: [8, 8, 8], zoom: 25 }}
            orthographic
          >
            <DemoScene spoonState={spoonState} atBatResult={atBatResult} />
          </Canvas>
        </div>
        
        {/* Controls & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Simulation Button */}
          <div style={{
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h3 style={{ margin: '0 0 1rem' }}>Plate Appearance</h3>
            <p style={{ opacity: 0.6, fontSize: '0.875rem', marginBottom: '1rem' }}>
              Cost: {spoonState === 1 ? 1 : spoonState === 3 ? 3 : 6} spoons
            </p>
            <button
              onClick={runSimulation}
              disabled={isSimulating || spoonsRemaining < (spoonState === 1 ? 1 : spoonState === 3 ? 3 : 6)}
              style={{
                width: '100%',
                padding: spoonState === 1 ? '1.5rem' : '1rem',
                fontSize: spoonState === 1 ? '1.25rem' : '1rem',
                background: isSimulating ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
          
          {/* Last Result */}
          {atBatResult && (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <h3 style={{ margin: '0 0 1rem' }}>Result</h3>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold',
                color: atBatResult.finalState === 'WALK' ? '#22c55e' : 
                       atBatResult.finalState === 'STRIKEOUT' ? '#ef4444' : 
                       atBatResult.finalState === 'IN_PLAY' ? '#3b82f6' : '#fff'
              }}>
                {atBatResult.finalState}
              </div>
              <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>
                {atBatResult.events.length} pitches
              </p>
              {spoonState === 6 && (
                <pre style={{ 
                  fontSize: '0.75rem', 
                  opacity: 0.5,
                  marginTop: '1rem',
                  overflow: 'auto',
                  maxHeight: '150px',
                }}>
                  {JSON.stringify(atBatResult.events.slice(0, 3), null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {/* History */}
          {history.length > 0 && spoonState > 1 && (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h3 style={{ margin: '0 0 1rem' }}>History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.map((h, i) => (
                  <div 
                    key={i}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{
                      color: h.result === 'WALK' ? '#22c55e' : 
                             h.result === 'STRIKEOUT' ? '#ef4444' : '#3b82f6'
                    }}>
                      {h.result}
                    </span>
                    <span style={{ opacity: 0.5 }}>{h.pitches} pitches</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* PRNG Info (6 spoon only) */}
          {spoonState === 6 && (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
            }}>
              <h3 style={{ margin: '0 0 1rem', fontFamily: 'system-ui' }}>System Status</h3>
              <div style={{ opacity: 0.6 }}>
                <div>PRNG: Alea (seedrandom)</div>
                <div>Renderer: React Three Fiber</div>
                <div>Physics: Simplified trajectory</div>
                <div>Sync: WebRTC scaffold ready</div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{
        padding: '1rem 2rem',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        fontSize: '0.75rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <span style={{ opacity: 0.5 }}>P31 Smallball • Deterministic simulation • Local-first</span>
        <a
          href="https://p31-arcade-hub.pages.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#3b82f6',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 600,
          }}
        >
          🎮 Arcade Hub →
        </a>
      </footer>
    </div>
  );
}

export default DemoPage;
