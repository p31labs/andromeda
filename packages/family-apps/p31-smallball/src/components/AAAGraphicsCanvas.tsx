// P31 Smallball: AAA Graphics React Integration
// Drop-in replacement for the existing 3D canvas with cinema-quality rendering

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  AAAGraphicsEngine,
  BroadcastAngle,
  TimeOfDay,
  QUALITY_PRESETS,
} from '../engine';
import type { GameMoment, AAAGraphicsConfig } from '../engine';

// ============================================
// COMPONENT PROPS
// ============================================

interface AAAGraphicsCanvasProps {
  // Quality setting
  quality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

  // Camera
  initialAngle?: BroadcastAngle;
  autoCamera?: boolean;

  // Atmosphere
  timeOfDay?: TimeOfDay;

  // Dimensions
  width?: number | string;
  height?: number | string;

  // Event handlers
  onEngineReady?: (engine: AAAGraphicsEngine) => void;
  onGameMoment?: (moment: GameMoment, engine: AAAGraphicsEngine) => void;

  // Debug
  showDebugUI?: boolean;
}

// ============================================
// REACT COMPONENT
// ============================================

export function AAAGraphicsCanvas({
  quality = 'HIGH',
  initialAngle = BroadcastAngle.CENTER_FIELD,
  autoCamera = true,
  timeOfDay = TimeOfDay.AFTERNOON,
  width = '100%',
  height = '100%',
  onEngineReady,
  onGameMoment,
  showDebugUI = false,
}: AAAGraphicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AAAGraphicsEngine | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const config = QUALITY_PRESETS[quality];
    const engine = new AAAGraphicsEngine(canvasRef.current, config);

    // Set initial camera angle
    engine.setCameraAngle(initialAngle, 'CUT');

    // Set time of day
    engine.setTimeOfDay(timeOfDay);

    // Store reference
    engineRef.current = engine;

    // Start rendering
    engine.start();

    // Notify parent
    onEngineReady?.(engine);

    // Cleanup
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handle quality change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setQuality(quality);
    }
  }, [quality]);

  // Handle time of day change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTimeOfDay(timeOfDay);
    }
  }, [timeOfDay]);

  // Demo mode - auto-trigger game moments
  useEffect(() => {
    if (!autoCamera || !engineRef.current) return;

    const moments: GameMoment[] = [
      'PRE_PITCH',
      'PITCH',
      'SWING',
      'CONTACT',
      'BALL_IN_AIR',
      'RUN',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (engineRef.current) {
        const moment = moments[index % moments.length];
        engineRef.current.triggerGameMoment(moment);
        onGameMoment?.(moment, engineRef.current);
        index++;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [autoCamera]);

  // Manual camera controls
  const setCameraAngle = useCallback((angle: BroadcastAngle) => {
    engineRef.current?.setCameraAngle(angle);
  }, []);

  const triggerMoment = useCallback((moment: GameMoment) => {
    engineRef.current?.triggerGameMoment(moment);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Debug UI */}
      {showDebugUI && engineRef.current && (
        <DebugUI
          engine={engineRef.current}
          onCameraChange={setCameraAngle}
          onTriggerMoment={triggerMoment}
        />
      )}
    </div>
  );
}

// ============================================
// DEBUG UI OVERLAY
// ============================================

function DebugUI({
  engine,
  onCameraChange,
  onTriggerMoment,
}: {
  engine: AAAGraphicsEngine;
  onCameraChange: (angle: BroadcastAngle) => void;
  onTriggerMoment: (moment: GameMoment) => void;
}) {
  const angles = Object.values(BroadcastAngle).filter(v => typeof v === 'string');
  const moments: GameMoment[] = ['PRE_PITCH', 'PITCH', 'SWING', 'CONTACT', 'BALL_IN_AIR', 'CATCH', 'HIT_GROUND', 'RUN', 'CELEBRATION', 'REPLAY'];

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '1rem',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '80%',
        overflow: 'auto',
        zIndex: 1000,
      }}
    >
      <h4 style={{ margin: '0 0 10px' }}>AAA Graphics Debug</h4>

      <div style={{ marginBottom: '15px' }}>
        <strong>Camera Angles:</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '5px' }}>
          {angles.map(angle => (
            <button
              key={angle}
              onClick={() => onCameraChange(angle)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {angle}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Game Moments:</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '5px' }}>
          {moments.map(moment => (
            <button
              key={moment}
              onClick={() => onTriggerMoment(moment)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {moment}
            </button>
          ))}
        </div>
      </div>

      <div>
        <strong>Time of Day:</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '5px' }}>
          {Object.values(TimeOfDay).map(time => (
            <button
              key={time}
              onClick={() => engine.setTimeOfDay(time)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HOOK FOR ADVANCED USE
// ============================================

export function useAAAGraphics(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const engineRef = useRef<AAAGraphicsEngine | null>(null);

  const init = useCallback((config?: Partial<AAAGraphicsConfig>) => {
    if (!canvasRef.current) return null;

    const engine = new AAAGraphicsEngine(canvasRef.current, config);
    engineRef.current = engine;
    return engine;
  }, [canvasRef]);

  const dispose = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

  return {
    engine: engineRef.current,
    init,
    dispose,
  };
}

// ============================================
// EXAMPLE USAGE
// ============================================

/*
// Simple usage:
<AAAGraphicsCanvas
  quality="HIGH"
  initialAngle={BroadcastAngle.CENTER_FIELD}
  timeOfDay={TimeOfDay.AFTERNOON}
  onEngineReady={(engine) => {
    // Engine is ready for use
    engine.setCameraAngle(BroadcastAngle.CATCHER_CAM);
  }}
/>

// Advanced usage with ref:
function MyComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { engine, init, dispose } = useAAAGraphics(canvasRef);

  useEffect(() => {
    const e = init({ quality: 'ULTRA' });
    e?.start();
    return dispose;
  }, []);

  return <canvas ref={canvasRef} />;
}
*/
