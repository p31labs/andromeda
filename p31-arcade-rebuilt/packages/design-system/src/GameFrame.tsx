import React, { useEffect, useRef, useState } from 'react';
import { ReturnRibbon } from './ReturnRibbon';
import { P31Colors } from './tokens';

// WCD-QM-01: Larmor frequency (863 Hz - phosphorus resonance)
const LARMOR_FREQUENCY = 863;

function getLarmorPhase(): number {
  return (Date.now() * LARMOR_FREQUENCY / 1000) % (2 * Math.PI);
}

export interface GameFrameProps {
  gameName: string;
  children?: React.ReactNode;
  onClose: () => void;
  playerId?: string;
  sessionId?: string;
  maxMinutes?: number;
  /** If true, wrap children in an iframe with this URL */
  externalUrl?: string;
  /** WCD-QM-01: Quantum state for this session */
  quantumEnabled?: boolean;
  larmorPhase?: number;
}

const frameStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  background: P31Colors.bgPrimary,
  zIndex: 100,
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  height: '48px',
  background: 'rgba(15, 15, 26, 0.9)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 1rem',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const viewportStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
};

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.2)',
  color: P31Colors.textSecondary,
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

/**
 * GameFrame — unified framing container for all games
 * Handles: viewport containment, fullscreen, escape-to-close, focus trap, session timer, ReturnRibbon
 */
export const GameFrame: React.FC<GameFrameProps> = ({
  gameName,
  children,
  onClose,
  playerId,
  sessionId,
  maxMinutes = 0,
  externalUrl,
  quantumEnabled = false,
  larmorPhase,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [remaining, setRemaining] = useState<number>(maxMinutes * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localLarmorPhase, setLocalLarmorPhase] = useState(0);

  // Escape closes game
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Session countdown
  useEffect(() => {
    if (maxMinutes <= 0) return;
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r <= 0) { onClose(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [maxMinutes, onClose]);

  // Focus trap
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const focusable = frame.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const trap = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      };
      frame.addEventListener('keydown', trap);
      first?.focus();
      return () => frame.removeEventListener('keydown', trap);
    }
  }, []);

  // WCD-QM-01: Larmor phase heartbeat for quantum games
  useEffect(() => {
    if (!quantumEnabled) return;
    const iv = setInterval(() => {
      setLocalLarmorPhase(larmorPhase ?? getLarmorPhase());
    }, 1000 / 60);
    return () => clearInterval(iv);
  }, [quantumEnabled, larmorPhase]);

  // Pass quantum state to iframe
  const quantumIframeUrl = externalUrl && quantumEnabled
    ? `${externalUrl}?player=${playerId || ''}&session=${sessionId || ''}&quantum=1&phase=${localLarmorPhase.toFixed(2)}`
    : undefined;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      frameRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-frame" ref={frameRef} style={frameStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onClose} style={btnStyle}>
            ← Back
          </button>
          <span style={{ color: P31Colors.textPrimary, fontWeight: 600 }}>{gameName}</span>
          {maxMinutes > 0 && (
            <span
              style={{
                color: remaining < 60 ? P31Colors.sportsRed : P31Colors.textMuted,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            >
              {formatTime(remaining)}
            </span>
          )}
        </div>
        <button onClick={toggleFullscreen} style={btnStyle} aria-label="Toggle fullscreen">
          {isFullscreen ? '⛶ Exit' : '⛶ Full'}
        </button>
      </div>

      {/* Game viewport */}
      <div className="game-viewport" style={viewportStyle}>
        {quantumIframeUrl ? (
          <iframe
            src={quantumIframeUrl}
            title={`${gameName} game`}
            allow="camera; microphone; autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : externalUrl ? (
          <iframe
            src={`${externalUrl}?player=${playerId || ''}&session=${sessionId || ''}`}
            title={`${gameName} game`}
            allow="camera; microphone; autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          children
        )}
      </div>

      {/* Persistent navigation ribbon */}
      <ReturnRibbon gameTitle={gameName} />
    </div>
  );
};

export default GameFrame;
