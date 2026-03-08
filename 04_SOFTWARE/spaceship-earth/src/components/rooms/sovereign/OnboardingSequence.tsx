// D4.7: Five-phase onboarding sequence
// Phase 1: The Void (OLED black, tap dim light)
// Phase 2: The Anchor (molecule pulses, tap in rhythm)
// Phase 3: The Rooms (glass spheres appear)
// Phase 4: The Dial (Cognitive Load Dial intro)
// Phase 5: The Pact (local-first, no leaderboards)

import { useState, useCallback, useEffect, useRef } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

type Phase = 'void' | 'anchor' | 'rooms' | 'dial' | 'pact';

const PHASES: Phase[] = ['void', 'anchor', 'rooms', 'dial', 'pact'];

export function OnboardingSequence({ onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<Phase>('void');
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const pulseRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);

  const phaseIdx = PHASES.indexOf(phase);

  const advancePhase = useCallback(() => {
    const nextIdx = PHASES.indexOf(phase) + 1;
    if (nextIdx >= PHASES.length) {
      setFadeOut(true);
      setTimeout(onComplete, 1200);
    } else {
      setPhaseProgress(0);
      setTapCount(0);
      setPhase(PHASES[nextIdx]);
    }
  }, [phase, onComplete]);

  // Phase 2: Pulse animation (0.1Hz = 10s cycle)
  useEffect(() => {
    if (phase !== 'anchor') return;
    const start = performance.now();
    const animate = () => {
      const t = (performance.now() - start) / 1000;
      const pulse = 0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI * 0.1) * 0.5 + 0.5, 2);
      if (pulseRef.current) {
        pulseRef.current.style.transform = `scale(${0.8 + pulse * 0.4})`;
        pulseRef.current.style.opacity = String(0.3 + pulse * 0.7);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  // Handle tap/click per phase
  const handleTap = useCallback(() => {
    switch (phase) {
      case 'void':
        // Tap the dim light to advance
        setTapCount(c => c + 1);
        if (tapCount >= 0) advancePhase();
        break;
      case 'anchor':
        // Tap in rhythm (3 taps)
        setTapCount(c => {
          const next = c + 1;
          if (next >= 3) setTimeout(advancePhase, 600);
          return next;
        });
        break;
      case 'rooms':
        setPhaseProgress(p => {
          const next = p + 1;
          if (next >= 3) setTimeout(advancePhase, 800);
          return next;
        });
        break;
      case 'dial':
        advancePhase();
        break;
      case 'pact':
        advancePhase();
        break;
    }
  }, [phase, tapCount, advancePhase]);

  // Skip on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFadeOut(true);
        setTimeout(onComplete, 400);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onComplete]);

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'absolute', inset: 0, zIndex: 35,
        background: '#000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        cursor: 'pointer',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1s ease-out',
        fontFamily: "'Space Mono', 'Oxanium', monospace",
        userSelect: 'none',
      }}
    >
      {/* Phase indicator dots */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8,
      }}>
        {PHASES.map((p, i) => (
          <div key={p} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i <= phaseIdx ? '#00FFFF' : 'rgba(255,255,255,0.15)',
            boxShadow: i === phaseIdx ? '0 0 8px #00FFFF' : 'none',
            transition: 'all 0.5s',
          }} />
        ))}
      </div>

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: 12, right: 16,
        color: 'rgba(255,255,255,0.15)', fontSize: 10,
        fontFamily: 'monospace',
      }}>
        ESC to skip
      </div>

      {/* ═══ PHASE 1: THE VOID ═══ */}
      {phase === 'void' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
          animation: 'fadeIn 3s ease-out',
        }}>
          {/* Dim light */}
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: '#00FFFF',
            boxShadow: '0 0 20px rgba(0,255,255,0.3), 0 0 60px rgba(0,255,255,0.1)',
            animation: 'pulse-slow 4s ease-in-out infinite',
          }} />
          <div style={{
            color: 'rgba(255,255,255,0.12)', fontSize: 13,
            letterSpacing: 6, textAlign: 'center',
            animation: 'fadeIn 5s ease-out',
          }}>
            TAP THE LIGHT
          </div>
        </div>
      )}

      {/* ═══ PHASE 2: THE ANCHOR ═══ */}
      {phase === 'anchor' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        }}>
          <div
            ref={pulseRef}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              border: '2px solid rgba(0,255,255,0.4)',
              boxShadow: '0 0 30px rgba(0,255,255,0.2), inset 0 0 20px rgba(0,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00FFFF',
              boxShadow: '0 0 12px #00FFFF',
            }} />
          </div>
          <div style={{
            color: 'rgba(0,255,255,0.5)', fontSize: 14,
            letterSpacing: 4,
          }}>
            BREATHE. TAP IN RHYTHM.
          </div>
          <div style={{
            display: 'flex', gap: 8,
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i < tapCount ? '#00FFFF' : 'rgba(255,255,255,0.1)',
                boxShadow: i < tapCount ? '0 0 8px #00FFFF' : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ PHASE 3: THE ROOMS ═══ */}
      {phase === 'rooms' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        }}>
          <div style={{
            color: 'rgba(0,255,255,0.6)', fontSize: 16,
            letterSpacing: 3, marginBottom: 16,
          }}>
            THE ROOMS
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 }}>
            {['Observatory', 'Collider', 'Bonding', 'Bridge', 'Buffer', 'Brain', 'IDE', 'Resonance', 'Forge'].map((name, i) => (
              <div key={name} style={{
                width: 48, height: 48, borderRadius: '50%',
                border: `1px solid ${i < phaseProgress ? 'rgba(0,255,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                background: i < phaseProgress ? 'rgba(0,255,255,0.1)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: i < phaseProgress ? '#00FFFF' : 'rgba(255,255,255,0.2)',
                fontFamily: 'monospace', textAlign: 'center',
                transition: 'all 0.5s',
                boxShadow: i < phaseProgress ? '0 0 12px rgba(0,255,255,0.2)' : 'none',
              }}>
                {name.slice(0, 4)}
              </div>
            ))}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: 3,
          }}>
            TAP TO REVEAL ({phaseProgress}/3)
          </div>
        </div>
      )}

      {/* ═══ PHASE 4: THE DIAL ═══ */}
      {phase === 'dial' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          maxWidth: 320, textAlign: 'center',
        }}>
          <div style={{
            color: 'rgba(0,255,255,0.6)', fontSize: 16,
            letterSpacing: 3,
          }}>
            THE DIAL
          </div>
          {/* SVG spoon gauge preview */}
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0,255,255,0.15)" strokeWidth="3" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#00FFFF" strokeWidth="3"
              strokeDasharray="314" strokeDashoffset="94"
              strokeLinecap="round" opacity="0.7"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,255,0.5))' }}
            />
            <text x="60" y="58" textAnchor="middle" fill="#00FFFF" fontSize="20"
              fontFamily="monospace" fontWeight="bold">70%</text>
            <text x="60" y="78" textAnchor="middle" fill="rgba(0,255,255,0.4)" fontSize="10"
              fontFamily="monospace">SPOONS</text>
          </svg>
          <div style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: 1.6,
          }}>
            Your cognitive load gauge. It protects you from overwhelm. When spoons run low, the interface simplifies.
          </div>
          <div style={{
            color: 'rgba(0,255,255,0.3)', fontSize: 10, letterSpacing: 2,
          }}>
            TAP TO CONTINUE
          </div>
        </div>
      )}

      {/* ═══ PHASE 5: THE PACT ═══ */}
      {phase === 'pact' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          maxWidth: 340, textAlign: 'center',
        }}>
          <div style={{
            color: 'rgba(0,255,255,0.6)', fontSize: 16,
            letterSpacing: 3, marginBottom: 8,
          }}>
            THE PACT
          </div>
          {[
            'No leaderboards.',
            'No engagement metrics.',
            'No dark patterns.',
            'Your data stays on your device.',
            'Local-first. Always.',
          ].map((line, i) => (
            <div key={i} style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 13,
              letterSpacing: 2, lineHeight: 1.8,
              animation: `fadeIn ${0.8 + i * 0.4}s ease-out`,
            }}>
              {line}
            </div>
          ))}
          <div style={{
            marginTop: 16,
            color: '#00FFFF', fontSize: 14,
            letterSpacing: 4, fontWeight: 600,
            textShadow: '0 0 12px rgba(0,255,255,0.5)',
            animation: 'fadeIn 3s ease-out',
          }}>
            TAP TO ENTER
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
