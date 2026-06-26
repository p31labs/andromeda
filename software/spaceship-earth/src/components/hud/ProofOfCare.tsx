 *
 *
 * CWP-JITTERBUG-12: Proof of Care (PoC) UI Engine
 */
import { useState, useEffect, useMemo, useRef } from 'react';
  const pocStateRef = useRef<PoCState | null>(null);

  // Keep ref in sync with latest state
  pocStateRef.current = pocState;
      ...(pocStateRef.current ?? pocState),

    const calculated = calculateCareScore(updatedState);
    setPocState(calculated);

    // Trigger haptic on green coherence (0.1 Hz)
    const prior = pocStateRef.current!;
    const wasCoherent = Math.abs(prior.respirationRate - 6) <= 0.5;
    apprenticeship: 'var(--color-amber)',
    sovereignty: 'var(--color-cyan)',
        color: 'var(--color-cyan)',

              <span style={{ color: 'var(--color-cyan)', fontSize: '10px' }}>{pocState.proximityScore.toFixed(2)}</span>
                  background: 'linear-gradient(90deg, var(--color-cyan), var(--color-amber))',
              <span style={{ color: pocState.greenCoherenceMultiplier > 1.4 ? 'var(--color-amber)' : '#666', fontSize: '10px' }}>
                  background: pocState.greenCoherenceMultiplier > 1.4 ? 'var(--color-amber)' : 'var(--color-cyan)',
              <span style={{ color: 'var(--color-cyan)', fontSize: '10px' }}>{pocState.taskScore}</span>
                <span style={{ color: 'var(--color-cyan)' }}>{pocState.currentHRV}ms</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>HR: </span>
                <span style={{ color: 'var(--color-cyan)' }}>{pocState.currentHR}bpm</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Resp: </span>
                <span style={{ color: 'var(--color-cyan)' }}>{pocState.respirationRate.toFixed(1)}/min</span>
                color: Math.abs(pocState.respirationRate - 6) <= 0.5 ? 'var(--color-amber)' : '#555',
}
