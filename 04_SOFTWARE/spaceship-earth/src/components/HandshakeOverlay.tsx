/**
 * HandshakeOverlay — WCD-M21: The K4 Handshake
 *
 * Rhythm-based biometric consensus. Players tap at 86 BPM (697ms intervals)
 * to achieve "impedance matching." When both devices lock within 2s,
 * Ed25519 signatures are exchanged to form a covalent bond.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import * as genesis from '../services/genesisIdentity';
import {
  createHandshakeRoom,
  joinHandshakeRoom,
  sendLockSignal,
  pollForPartnerLock,
  sendConfirmation,
} from '../services/handshakeRelay';

// ── Constants ──

const TARGET_BPM = 86;
const TARGET_INTERVAL_MS = 60_000 / TARGET_BPM; // ~697ms
const TOLERANCE_MS = 80;                          // +/- 80ms
const MIN_INTERVAL = TARGET_INTERVAL_MS - TOLERANCE_MS; // 617ms
const MAX_INTERVAL = TARGET_INTERVAL_MS + TOLERANCE_MS; // 777ms
const REQUIRED_TAPS = 4;                          // 4 taps = 3 valid intervals
const LOCK_WINDOW_MS = 2000;                      // simultaneity window
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;

type Phase = 'tapping' | 'locked' | 'waiting' | 'bonded' | 'failed';

export function HandshakeOverlay() {
  const handshakeCandidate = useSovereignStore((s) => s.handshakeCandidate);
  const fawnGuardActive = useSovereignStore((s) => s.fawnGuardActive);
  const openOverlay = useSovereignStore((s) => s.openOverlay);

  const [phase, setPhase] = useState<Phase>('tapping');
  const [validTaps, setValidTaps] = useState(0);
  const [lastInterval, setLastInterval] = useState<number | null>(null);
  const [message, setMessage] = useState('TAP TO THE RHYTHM');

  const tapTimesRef = useRef<number[]>([]);
  const roomCodeRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockTimeRef = useRef(0);

  // Don't render if no candidate, fawn guard active, or overlay open
  if (!handshakeCandidate || fawnGuardActive || openOverlay) return null;

  const handleTap = useCallback(() => {
    if (phase !== 'tapping') return;

    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);

    if (taps.length < 2) {
      setValidTaps(1);
      setMessage('KEEP TAPPING... 1/4');
      return;
    }

    const interval = now - taps[taps.length - 2];
    setLastInterval(Math.round(interval));

    if (interval >= MIN_INTERVAL && interval <= MAX_INTERVAL) {
      // Count consecutive valid intervals
      let consecutiveValid = 0;
      for (let i = taps.length - 1; i >= 1; i--) {
        const delta = taps[i] - taps[i - 1];
        if (delta >= MIN_INTERVAL && delta <= MAX_INTERVAL) {
          consecutiveValid++;
        } else {
          break;
        }
      }

      const tapCount = consecutiveValid + 1;
      setValidTaps(tapCount);
      setMessage(`ALIGNING... ${tapCount}/${REQUIRED_TAPS}`);

      if (tapCount >= REQUIRED_TAPS) {
        onLocked();
      }
    } else {
      // Reset — keep current tap as new first tap
      tapTimesRef.current = [now];
      setValidTaps(1);
      setMessage(`OFF RHYTHM (${Math.round(interval)}ms) — RESET 1/4`);
    }
  }, [phase]);

  const onLocked = useCallback(async () => {
    setPhase('locked');
    setMessage('FREQUENCY LOCKED');

    const myDID = genesis.getDID();
    lockTimeRef.current = Date.now();

    try {
      // Create or join handshake room
      if (!roomCodeRef.current) {
        roomCodeRef.current = await createHandshakeRoom(myDID);
      }
      const code = roomCodeRef.current;

      // Sign lock payload
      const lockPayload = JSON.stringify({
        target: handshakeCandidate,
        timestamp: lockTimeRef.current,
      });
      const sigBytes = await genesis.sign(new TextEncoder().encode(lockPayload));
      const sigHex = Array.from(sigBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

      // Send lock signal
      await sendLockSignal(code, 0, myDID, lockTimeRef.current, sigHex);

      // Poll for partner's lock
      setPhase('waiting');
      setMessage('WAITING FOR PARTNER LOCK...');

      const started = Date.now();
      pollTimerRef.current = setInterval(async () => {
        if (Date.now() - started > POLL_TIMEOUT_MS) {
          clearInterval(pollTimerRef.current!);
          setPhase('failed');
          setMessage('TIMEOUT — PARTNER DID NOT LOCK');
          return;
        }

        const partnerLock = await pollForPartnerLock(code, myDID);
        if (!partnerLock) return;

        // Check simultaneity
        const delta = Math.abs(lockTimeRef.current - partnerLock.lockTime);
        if (delta > LOCK_WINDOW_MS) {
          clearInterval(pollTimerRef.current!);
          setPhase('failed');
          setMessage(`DESYNC (${delta}ms) — TRY AGAIN`);
          return;
        }

        clearInterval(pollTimerRef.current!);

        // Double empathy exchange: sign canonical bond
        const canonicalTimestamp = Math.min(lockTimeRef.current, partnerLock.lockTime);
        const bondPayload = JSON.stringify({
          target: partnerLock.did,
          timestamp: canonicalTimestamp,
        });
        const bondSigBytes = await genesis.sign(new TextEncoder().encode(bondPayload));
        const bondSigHex = Array.from(bondSigBytes)
          .map((b) => b.toString(16).padStart(2, '0')).join('');

        await sendConfirmation(code, 0, myDID, bondSigHex);

        // Record bond in K4 graph
        useSovereignStore.getState().addK4Edge({
          from: myDID,
          to: partnerLock.did,
          timestamp: canonicalTimestamp,
          signature: bondSigHex,
        });

        setPhase('bonded');
        setMessage('COVALENT BOND FORMED');
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setPhase('failed');
      setMessage('HANDSHAKE ERROR');
    }
  }, [handshakeCandidate]);

  const dismiss = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    useSovereignStore.getState().setHandshakeCandidate(null);
    setPhase('tapping');
    setValidTaps(0);
    setLastInterval(null);
    tapTimesRef.current = [];
    roomCodeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Pulse animation scale based on BPM
  const pulseScale = phase === 'bonded' ? 1.3 : 1 + validTaps * 0.08;

  const phaseColor = {
    tapping: '#00E5FF',
    locked: '#00FF88',
    waiting: '#FFB800',
    bonded: '#FF69B4',
    failed: '#FF4444',
  }[phase];

  return (
    <div
      onTouchStart={handleTap}
      onMouseDown={handleTap}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(5, 5, 16, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Oxanium', sans-serif",
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        onTouchStart={(e) => { e.stopPropagation(); dismiss(); }}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: '1px solid rgba(255,255,255,0.2)',
          color: '#888', borderRadius: 8, padding: '6px 14px',
          fontSize: 12, cursor: 'pointer',
        }}
      >
        DISMISS
      </button>

      {/* Target frequency label */}
      <div style={{
        color: 'rgba(255,255,255,0.4)', fontSize: 14, letterSpacing: '0.1em',
        marginBottom: 32,
      }}>
        ALIGN FREQUENCY: 172.35 Hz
      </div>

      {/* Pulsing circle */}
      <div style={{
        width: 200, height: 200, borderRadius: '50%',
        border: `3px solid ${phaseColor}`,
        boxShadow: `0 0 40px ${phaseColor}40, inset 0 0 40px ${phaseColor}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${pulseScale})`,
        transition: 'transform 0.15s ease-out, border-color 0.3s, box-shadow 0.3s',
      }}>
        <div style={{
          color: phaseColor, fontSize: 48, fontWeight: 700,
          textShadow: `0 0 20px ${phaseColor}`,
        }}>
          {phase === 'bonded' ? '\u2B22' : `${validTaps}/${REQUIRED_TAPS}`}
        </div>
      </div>

      {/* Status message */}
      <div style={{
        marginTop: 32, color: phaseColor, fontSize: 16,
        fontWeight: 600, letterSpacing: '0.08em',
        textShadow: `0 0 10px ${phaseColor}60`,
      }}>
        {message}
      </div>

      {/* Interval feedback */}
      {lastInterval !== null && phase === 'tapping' && (
        <div style={{
          marginTop: 12, color: 'rgba(255,255,255,0.3)', fontSize: 12,
        }}>
          {lastInterval}ms (target: {Math.round(TARGET_INTERVAL_MS)}ms)
        </div>
      )}

      {/* BPM indicator */}
      <div style={{
        marginTop: 8, color: 'rgba(255,255,255,0.2)', fontSize: 11,
      }}>
        86 BPM | {TOLERANCE_MS}ms tolerance
      </div>

      {/* Bonded: auto-dismiss after 3s */}
      {phase === 'bonded' && <AutoDismiss onDismiss={dismiss} delayMs={3000} />}
      {phase === 'failed' && <AutoDismiss onDismiss={dismiss} delayMs={4000} />}
    </div>
  );
}

function AutoDismiss({ onDismiss, delayMs }: { onDismiss: () => void; delayMs: number }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, delayMs);
    return () => clearTimeout(timer);
  }, [onDismiss, delayMs]);
  return null;
}
