/**
 * @file DevOverlay — Floating live-state debug panel.
 *
 * Rendered only when `?stats=1` is in the URL. Shows coherence, entropy,
 * active cartridge slot count, current overlay, relay health, GPU frame time,
 * audio state, and the telemetry opt-in toggle.
 *
 * GPU ms is polled from perfMonitor every 500ms (not stored in Zustand) to
 * keep GPU timing outside React's reconciler.
 */

import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import { getGpuMs } from '../services/perfMonitor';
import { isTelemetryEnabled, setTelemetryEnabled } from '../services/telemetry';

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span style={{ color: color ?? '#00ccff', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function DevOverlay() {
  const {
    coherence, dynamicSlots, relayStatus, relayPing,
    offlineQueueSize, openOverlay, sfxEnabled, masterVolume,
  } = useSovereignStore(useShallow(s => ({
    coherence:        s.coherence,
    dynamicSlots:     s.dynamicSlots,
    relayStatus:      s.relayStatus,
    relayPing:        s.relayPing,
    offlineQueueSize: s.offlineQueueSize,
    openOverlay:      s.openOverlay,
    sfxEnabled:       s.sfxEnabled,
    masterVolume:     s.masterVolume,
  })));

  const [gpuMs,      setGpuMs_]     = useState(0);
  const [telemetryOn, setTelemetryOn] = useState(isTelemetryEnabled);

  // Poll GPU ms from perfMonitor rather than subscribing to the store
  useEffect(() => {
    const id = setInterval(() => setGpuMs_(getGpuMs()), 500);
    return () => clearInterval(id);
  }, []);

  const entropy    = (1.0 - coherence).toFixed(3);
  const activeSlots = Object.values(dynamicSlots).filter(Boolean).length;
  const relayColor  = relayStatus === 'connected'  ? '#00ff88'
                    : relayStatus === 'connecting' ? '#ffa500' : '#ff4444';
  const gpuColor    = gpuMs > 16 ? '#ff4444' : gpuMs > 10 ? '#ffa500' : '#00ccff';

  return (
    <div
      role="complementary"
      aria-label="Developer overlay"
      style={{
        position: 'fixed', bottom: 8, right: 8, zIndex: 9998,
        background: 'rgba(0,0,0,0.88)', border: '1px solid #00ff88',
        borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace',
        fontSize: 11, color: '#ccc', lineHeight: 1.85, minWidth: 224,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ color: '#00ff88', fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
        ⬡ P31 DEV
      </div>

      <Row label="coherence" value={coherence.toFixed(3)} color="#00ff88" />
      <Row label="entropy"   value={entropy}              color="#ff00ff" />
      <Row label="slots"     value={String(activeSlots)} />
      <Row label="overlay"   value={openOverlay ?? '—'}  color="#ffff00" />
      <Row label="relay"     value={relayStatus}         color={relayColor} />
      <Row label="ping"      value={relayPing ? `${relayPing}ms` : '—'} />
      <Row label="queue"     value={String(offlineQueueSize)} />
      <Row
        label="gpu"
        value={gpuMs > 0 ? `${gpuMs.toFixed(1)}ms` : '—'}
        color={gpuColor}
      />
      <Row label="sfx"   value={sfxEnabled ? 'on' : 'off'} />
      <Row label="vol"   value={`${Math.round(masterVolume * 100)}%`} />

      <div style={{ marginTop: 8, borderTop: '1px solid #333', paddingTop: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#aaa' }}>
          <input
            type="checkbox"
            checked={telemetryOn}
            onChange={e => {
              setTelemetryEnabled(e.target.checked);
              setTelemetryOn(e.target.checked);
            }}
            style={{ accentColor: '#00ff88' }}
          />
          telemetry opt-in
        </label>
      </div>
    </div>
  );
}
