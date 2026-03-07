// AttractorOverlay.tsx — Mark 1 Attractor Simulator
// Overlay for controlling entropy, magnetic field, and coherence parameters
// that influence the dome visualization

import { useEffect, useRef, useState } from 'react';

interface AttractorOverlayProps {
  show: boolean;
  entropy: number;
  magneticField: number;
  coherence: number;
  onEntropyChange: (value: number) => void;
  onMagneticFieldChange: (value: number) => void;
  onCoherenceChange: (value: number) => void;
  onClose: () => void;
}

export default function AttractorOverlay({
  show,
  entropy,
  magneticField,
  coherence,
  onEntropyChange,
  onMagneticFieldChange,
  onCoherenceChange,
  onClose,
}: AttractorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(6,10,18,0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,255,255,0.2)',
        borderRadius: 8,
        padding: 16,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: "'JetBrains Mono', monospace",
        color: 'rgba(0,255,255,0.45)',
        overflow: 'auto',
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0,255,255,0.1)',
        paddingBottom: 12,
        marginBottom: 8,
      }}>
        <div>
          <div style={{ color: '#ff6633', fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            MARK 1 ATTRACTOR SIMULATOR
          </div>
          <div style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)', marginTop: 2 }}>
            Quantum coherence field generator
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid rgba(0,255,255,0.2)',
            color: 'rgba(0,255,255,0.45)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 10,
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          CLOSE
        </button>
      </div>

      {/* Controls Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>
        
        {/* Entropy Control */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 12,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ color: '#ff6633', fontSize: 11, fontWeight: 700 }}>
              ENTROPY
            </span>
            <span style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)' }}>
              {Math.round(entropy * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={entropy}
            onChange={(e) => onEntropyChange(parseFloat(e.target.value))}
            aria-label="Entropy control"
            style={{
              width: '100%',
              accentColor: '#ff6633',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: 9, color: 'rgba(0,255,255,0.25)', marginTop: 4 }}>
            Disorder level in quantum field
          </div>
        </div>

        {/* Magnetic Field Control */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 12,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ color: '#00FFFF', fontSize: 11, fontWeight: 700 }}>
              MAGNETIC FIELD
            </span>
            <span style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)' }}>
              {magneticField}μT
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={magneticField}
            onChange={(e) => onMagneticFieldChange(parseInt(e.target.value))}
            aria-label="Magnetic field control"
            style={{
              width: '100%',
              accentColor: '#00FFFF',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: 9, color: 'rgba(0,255,255,0.25)', marginTop: 4 }}>
            Field strength in microtesla
          </div>
        </div>

        {/* Coherence Control */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 12,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ color: '#00ffff', fontSize: 11, fontWeight: 700 }}>
              COHERENCE
            </span>
            <span style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)' }}>
              {coherence.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={coherence}
            onChange={(e) => onCoherenceChange(parseFloat(e.target.value))}
            aria-label="Coherence control"
            style={{
              width: '100%',
              accentColor: '#00ffff',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: 9, color: 'rgba(0,255,255,0.25)', marginTop: 4 }}>
            Quantum state synchronization
          </div>
        </div>

        {/* Presets */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: 'rgba(0,255,255,0.45)' }}>
            PRESETS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => {
                onEntropyChange(0.1);
                onMagneticFieldChange(25);
                onCoherenceChange(8.0);
              }}
              style={{
                background: 'rgba(0,255,255,0.1)',
                border: '1px solid rgba(0,255,255,0.3)',
                color: '#00FFFF',
                borderRadius: 4,
                padding: '6px 8px',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'left',
              }}
            >
              STABLE FIELD (Low entropy, high coherence)
            </button>
            <button
              onClick={() => {
                onEntropyChange(0.8);
                onMagneticFieldChange(75);
                onCoherenceChange(2.0);
              }}
              style={{
                background: 'rgba(255,102,51,0.1)',
                border: '1px solid rgba(255,102,51,0.3)',
                color: '#ff6633',
                borderRadius: 4,
                padding: '6px 8px',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'left',
              }}
            >
              CHAOTIC FIELD (High entropy, low coherence)
            </button>
            <button
              onClick={() => {
                onEntropyChange(0.5);
                onMagneticFieldChange(50);
                onCoherenceChange(5.0);
              }}
              style={{
                background: 'rgba(0,255,255,0.1)',
                border: '1px solid rgba(0,255,255,0.3)',
                color: '#00ffff',
                borderRadius: 4,
                padding: '6px 8px',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'left',
              }}
            >
              BALANCED FIELD (Default parameters)
            </button>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginTop: 8,
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 10,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)', marginBottom: 4 }}>
            FIELD STATUS
          </div>
          <div style={{
            color: entropy < 0.3 ? '#00FFFF' : entropy > 0.7 ? '#ff6633' : '#00ffff',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {entropy < 0.3 ? 'STABLE' : entropy > 0.7 ? 'UNSTABLE' : 'NEUTRAL'}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 10,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)', marginBottom: 4 }}>
            COHERENCE LEVEL
          </div>
          <div style={{
            color: coherence > 7 ? '#00FFFF' : coherence < 3 ? '#ff6633' : '#00ffff',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {coherence > 7 ? 'HIGH' : coherence < 3 ? 'LOW' : 'MEDIUM'}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 6,
          padding: 10,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(0,255,255,0.3)', marginBottom: 4 }}>
            MAGNETIC STRENGTH
          </div>
          <div style={{
            color: magneticField > 75 ? '#00FFFF' : magneticField < 25 ? '#ff6633' : '#00ffff',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {magneticField > 75 ? 'STRONG' : magneticField < 25 ? 'WEAK' : 'NORMAL'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(0,255,255,0.1)',
        borderRadius: 6,
        padding: 12,
        fontSize: 9,
        color: 'rgba(0,255,255,0.3)',
        lineHeight: 1.4,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'rgba(0,255,255,0.45)' }}>
          OPERATIONS MANUAL:
        </div>
        <div>• Adjust ENTROPY to control quantum field disorder</div>
        <div>• Modify MAGNETIC FIELD strength in microtesla</div>
        <div>• Set COHERENCE level for state synchronization</div>
        <div>• Use presets for common field configurations</div>
        <div>• Monitor status indicators for field health</div>
        <div style={{ marginTop: 6, color: '#ff6633' }}>
          WARNING: Extreme settings may cause field instability
        </div>
      </div>
    </div>
  );
}