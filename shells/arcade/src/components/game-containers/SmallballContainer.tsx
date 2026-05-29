/**
 * Smallball Game Container
 * React wrapper for Three.js 2.5D isometric basketball
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SmallballGame } from '../../games/smallball';
import { GlassEarningsOverlay } from '../../visual-system';
import { PerformanceMonitor } from '../../performance';
import type { PlayerId } from '../../types/arcade';

interface SmallballContainerProps {
  playerId: PlayerId;
  isCoop: boolean;
  siblingPlayer?: PlayerId;
  onScore: (points: number) => void;
  onCareFlow: (amount: number) => void;
  onExit: () => void;
}

export function SmallballContainer({
  playerId,
  isCoop,
  siblingPlayer,
  onScore,
  onCareFlow,
  onExit,
}: SmallballContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<SmallballGame | null>(null);
  const perfMonitorRef = useRef<PerformanceMonitor | null>(null);
  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState(100);
  const [showPerf, setShowPerf] = useState(false);

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    // Detect device profile
    const deviceProfile = PerformanceMonitor.detectDevice();
    const monitor = new PerformanceMonitor(deviceProfile);
    perfMonitorRef.current = monitor;

    // Create game
    const game = new SmallballGame({
      container: containerRef.current,
      playerId,
      isCoop,
      siblingPlayer,
    });

    gameRef.current = game;
    monitor.attachRenderer(game['renderer']);

    // Start game loop
    game.start();

    // Performance tracking
    const perfInterval = setInterval(() => {
      const metrics = monitor.getMetrics();
      setFps(Math.round(metrics.fps));

      const { quality: newQuality, recommendations } = monitor.endFrame();
      setQuality(Math.round(newQuality * 100));

      // Apply adaptive quality
      if (recommendations.length > 0 && newQuality < 0.7) {
        console.log('[Smallball] Adaptive quality:', recommendations);
      }
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(perfInterval);
      game.dispose();
      monitor.dispose();
    };
  }, [playerId, isCoop, siblingPlayer]);

  // Keyboard controls
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          game.movePlayer(game['playerMesh'].position.x - 0.5, game['playerMesh'].position.z);
          break;
        case 'ArrowRight':
        case 'd':
          game.movePlayer(game['playerMesh'].position.x + 0.5, game['playerMesh'].position.z);
          break;
        case 'ArrowUp':
        case 'w':
          game.movePlayer(game['playerMesh'].position.x, game['playerMesh'].position.z - 0.5);
          break;
        case 'ArrowDown':
        case 's':
          game.movePlayer(game['playerMesh'].position.x, game['playerMesh'].position.z + 0.5);
          break;
        case ' ':
          game.shootBall(0, -5); // Shoot at hoop
          break;
        case 'Shift':
          game.dribble();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Score detection
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const checkScore = setInterval(() => {
      const currentScore = game.getScore();
      if (currentScore > 0) {
        onScore(currentScore * 2); // 2 points per basket
        onCareFlow(1);
        game['score'] = 0; // Reset after reporting
      }
    }, 500);

    return () => clearInterval(checkScore);
  }, [onScore, onCareFlow]);

  const runValidation = useCallback(async () => {
    const monitor = perfMonitorRef.current;
    if (!monitor) return;

    const { passed, report } = await monitor.runValidation(3000);
    console.log(report);
    alert(passed ? 'Performance validation PASSED ✅' : 'Performance issues detected. Check console.');
  }, []);

  return (
    <div className="game-container-wrapper">
      {/* Game Canvas */}
      <div
        ref={containerRef}
        className="game-canvas"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />

      {/* Earnings Overlay */}
      <GlassEarningsOverlay position="top-right" compact />

      {/* Performance HUD */}
      {showPerf && (
        <div className="perf-hud" style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(0,0,0,0.8)',
          padding: '1rem',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          color: fps >= 55 ? '#39ff14' : fps >= 30 ? '#feca57' : '#ff6b6b',
        }}>
          <div>FPS: {fps}</div>
          <div>Quality: {quality}%</div>
          <div>Mode: {isCoop ? 'CO-OP 💚' : 'SOLO'}</div>
          <div>Player: {playerId.toUpperCase()}</div>
        </div>
      )}

      {/* Controls */}
      <div className="game-controls" style={{
        position: 'absolute',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(22, 33, 62, 0.9)',
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
      }}>
        <button onClick={onExit} style={controlBtnStyle}>← Exit</button>
        <button
          onClick={() => gameRef.current?.dribble()}
          style={controlBtnStyle}
        >
          Dribble (Shift)
        </button>
        <button
          onClick={() => gameRef.current?.shootBall(0, -5)}
          style={{...controlBtnStyle, background: '#39ff14', color: '#1a1a2e'}}
        >
          Shoot (Space)
        </button>
        <button onClick={() => setShowPerf(!showPerf)} style={controlBtnStyle}>
          {showPerf ? 'Hide' : 'Perf'}
        </button>
        <button onClick={runValidation} style={controlBtnStyle}>
          Test
        </button>
      </div>

      {/* Four-Domain Analysis */}
      <div className="domain-analysis" style={{
        position: 'absolute',
        bottom: '5rem',
        right: '1rem',
        background: 'rgba(22, 33, 62, 0.9)',
        padding: '1rem',
        borderRadius: '12px',
        maxWidth: '250px',
        fontSize: '0.75rem',
        backdropFilter: 'blur(10px)',
      }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#feca57' }}>📊 Four-Domain Analysis</h4>
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <div>📊 Industry: Sports sim, $92B market</div>
          <div>🎮 Arcade: 60m cap, co-op enabled</div>
          <div>🔧 CHUMP: 0.10/hr, {isCoop ? '1.5x' : '1.0x'}</div>
          <div>💚 Love: {isCoop ? '+1 care flow' : 'solo mode'}</div>
        </div>
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#a0a0a0' }}>
          [Mode: HYBRID | Target: Family cohesion]
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions" style={{
        position: 'absolute',
        top: '50%',
        left: '1rem',
        transform: 'translateY(-50%)',
        background: 'rgba(22, 33, 62, 0.8)',
        padding: '1rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        maxWidth: '150px',
      }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Controls</div>
        <div>WASD / Arrows: Move</div>
        <div>Space: Shoot</div>
        <div>Shift: Dribble</div>
      </div>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '6px',
  background: 'rgba(255,255,255,0.1)',
  color: '#eee',
  cursor: 'pointer',
  fontSize: '0.8rem',
};

export default SmallballContainer;
