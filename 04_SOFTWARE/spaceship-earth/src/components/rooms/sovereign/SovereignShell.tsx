// SovereignShell — Unified Cockpit Architecture
// z-0: Three.js Canvas (dome + content screen — always running)
// z-30: Room panel grid (home) / Observatory filter UI
// z-40: Full-screen room overlays
// z-50: OS TopBar (always visible above everything)
import { useEffect } from 'react';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import type { SovereignRoom } from '../../../sovereign/types';
import { setupSovereignPWA } from '@p31/shared/sovereign';
import { ImmersiveCockpitUI } from './ImmersiveCockpit';
import { ClassicDiagnosticUI } from './ClassicDiagnostic';

import { ObservatoryOverlay } from './overlays/ObservatoryOverlay';
import { BridgeOverlay } from './overlays/BridgeOverlay';
import { BufferOverlay } from './overlays/BufferOverlay';
import { ColliderOverlay } from './overlays/ColliderOverlay';
import { BondingOverlay } from './overlays/BondingOverlay';
import { LandingOverlay } from './overlays/LandingOverlay';
import { ResonanceOverlay } from './overlays/ResonanceOverlay';
import { ForgeOverlay } from './overlays/ForgeOverlay';
import { useNode } from '../../../contexts/NodeContext';
import { useBondingHandshake } from '../../../hooks/useBondingHandshake';
import { useLoveSync } from '../../../hooks/useLoveSync';
import { useProtocolLoveSync } from '../../../hooks/useProtocolLoveSync';
import { useGenesisSync } from '../../../hooks/useGenesisSync';
import { useSomaticTether } from '../../../hooks/useSomaticTether';
import { useSpatialRadar } from '../../../hooks/useSpatialRadar';
import { useSovereignBridge } from '../../../sovereign/useSovereignBridge';
import { moduleRegistry } from '../../../services/jitterbugCompiler';
import { HandshakeOverlay } from '../../HandshakeOverlay';

import { ROOMS } from '../../../types/rooms.types';

const BONDING_URL = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

// ── Room panel definitions for the home grid ──
const ROOM_PANELS: { id: SovereignRoom; label: string; desc: string; color: string; icon: string }[] = [
  { id: 'OBSERVATORY', label: 'Observatory', desc: 'Geodesic dome — explore the system', color: '#00FF88', icon: '\u2B21' },
  { id: 'COLLIDER', label: 'Collider', desc: 'Particle physics playground', color: '#FF00CC', icon: '\u269B' },
  { id: 'BONDING', label: 'Bonding', desc: 'Multiplayer chemistry game', color: '#FFB800', icon: '\u2B22' },
  { id: 'BRIDGE', label: 'Bridge', desc: 'LOVE economy dashboard', color: '#7A27FF', icon: '\u2B23' },
  { id: 'BUFFER', label: 'Buffer', desc: 'Communication voltage scoring', color: '#00D4FF', icon: '\u26A1' },
  { id: 'COPILOT', label: 'Open Slot', desc: 'Drop module here', color: '#444466', icon: '\u2795' },
  { id: 'LANDING', label: 'Quantum IDE', desc: 'QG-IDE + Copilot', color: '#00E5FF', icon: '\u269B' },
  { id: 'RESONANCE', label: 'Resonance', desc: 'Conversation becomes music', color: '#7A27FF', icon: '\u266B' },
  { id: 'FORGE', label: 'Forge', desc: 'Content pipeline — Substack', color: '#FFB800', icon: '\u2B06' },
];

export function SovereignShell() {
  const {
    viewMode, toggleView, setPwaStatus, openOverlay, setOverlay,
    dynamicSlots,
  } = useSovereignStore();

  // NodeContext data
  const { spoons, maxSpoons, tier } = useNode();
  const { sessionId, totalLove: handshakeLove } = useBondingHandshake();
  const syncedLove = useLoveSync(sessionId);
  useProtocolLoveSync();
  useGenesisSync();

  // M18: Somatic Tether (biometric relay from Termux WS)
  useSomaticTether();

  // M20: Spatial Mesh (BLE proximity radar)
  useSpatialRadar();
  const love = handshakeLove > 0 ? handshakeLove : syncedLove;

  // Bridge: NodeContext → useSovereignStore (feeds HUD arc)
  useSovereignBridge(love);

  // PWA bootstrap
  useEffect(() => { setupSovereignPWA(setPwaStatus); }, [setPwaStatus]);

  // Coherence auto-recovery
  useEffect(() => {
    const interval = setInterval(() => {
      const { coherence, noiseFloor, openOverlay } = useSovereignStore.getState();
      if (openOverlay !== 'BUFFER' && coherence < 0.99) {
        useSovereignStore.setState({
          coherence: Math.min(0.99, coherence + 0.02),
          noiseFloor: Math.max(0.05, noiseFloor - 0.05),
        });
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ESC key closes overlay
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useSovereignStore.getState().openOverlay) {
        useSovereignStore.getState().setOverlay(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Render full-screen overlay for production apps
  const renderOverlay = () => {
    if (!openOverlay || openOverlay === 'OBSERVATORY') return null;

    const overlayContent = () => {
      // Dynamic slot overlays (SLOT_2, SLOT_3, etc.)
      if (typeof openOverlay === 'string' && openOverlay.startsWith('SLOT_')) {
        const Component = moduleRegistry.get(openOverlay);
        if (Component) {
          return (
            <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 16 }}>
              <Component />
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Module not found in registry
          </div>
        );
      }

      switch (openOverlay) {
        case 'BRIDGE': return <BridgeOverlay />;
        case 'BUFFER': return <BufferOverlay />;
        case 'COLLIDER': return <ColliderOverlay />;
        case 'BONDING': return <BondingOverlay url={BONDING_URL} />;
        case 'COPILOT': return <LandingOverlay />; // merged into Quantum IDE
        case 'LANDING': return <LandingOverlay />;
        case 'RESONANCE': return <ResonanceOverlay />;
        case 'FORGE': return <ForgeOverlay />;
        default: return null;
      }
    };

    return (
      <div className="sov-overlay-shell">
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {overlayContent()}
        </div>
      </div>
    );
  };

  // Active overlay label for the top bar
  const activeLabel = (() => {
    if (!openOverlay || openOverlay === 'OBSERVATORY') return null;
    if (typeof openOverlay === 'string' && openOverlay.startsWith('SLOT_')) {
      const num = openOverlay.slice(5);
      const name = dynamicSlots[Number(num)]?.name;
      return `slot ${num}${name ? ` \u2014 ${name}` : ''}`;
    }
    const panel = ROOM_PANELS.find(p => p.id === openOverlay);
    return panel?.label.toLowerCase() ?? openOverlay.toLowerCase();
  })();

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      background: '#050510', overflow: 'hidden', fontFamily: "'Oxanium', sans-serif", userSelect: 'none',
    }}>
      {/* z-0: Three.js Canvas — dome + content screen always running */}
      {viewMode === 'cockpit' ? <ImmersiveCockpitUI /> : <ClassicDiagnosticUI />}

      {/* z-30: Observatory filter UI — only when cockpit + home */}
      {viewMode === 'cockpit' && !openOverlay && (
        <div style={{
          position: 'absolute', top: 48, left: 0, right: 0, bottom: 0,
          zIndex: 30, pointerEvents: 'none',
        }}>
          <ObservatoryOverlay />
        </div>
      )}

      {/* z-40: Full-screen room overlays */}
      {renderOverlay()}

      {/* z-60: K4 Handshake overlay (M21) */}
      <HandshakeOverlay />

      {/* z-50: Top Bar — minimal */}
      <div className="sov-topbar">
        {/* Left: Brand */}
        <div
          onClick={() => openOverlay ? setOverlay(null) : undefined}
          style={{
            fontWeight: 700, letterSpacing: '0.08em', fontSize: '14px',
            padding: '5px 14px', border: '1px solid rgba(0,255,136,0.25)',
            borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
            color: '#00FF88', flexShrink: 0,
            textShadow: '0 0 6px rgba(0,255,136,0.3)',
            boxShadow: '0 0 6px rgba(0,255,136,0.08)',
            backdropFilter: 'blur(12px)',
            cursor: openOverlay ? 'pointer' : 'default',
          }}
        >
          P31-OS
        </div>

        {/* Center: active room label or empty */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {activeLabel && (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 6px #00FF88' }} />
              <span style={{ color: '#E0E0EE', letterSpacing: '0.06em', fontWeight: 600, fontSize: '12px' }}>
                {activeLabel}
              </span>
              <span style={{ color: 'rgba(201,177,255,0.3)', fontSize: '11px' }}>|</span>
              <span style={{ color: 'rgba(201,177,255,0.4)', fontSize: '11px' }}>active</span>
            </>
          )}
        </div>

        {/* Right: back button (when in overlay) + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {openOverlay && (
            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="sov-btn"
              style={{ padding: '5px 14px', fontSize: '12px' }}
            >
              BACK
            </button>
          )}
          <button type="button" onClick={toggleView} className="sov-btn" style={{
            '--neon': '#00FF88',
            padding: '5px 14px', fontSize: '12px',
            border: '1px solid rgba(0,255,136,0.25)',
            color: '#00FF88', flexShrink: 0,
            textShadow: '0 0 4px rgba(0,255,136,0.3)',
          } as React.CSSProperties}>
            {viewMode === 'cockpit' ? '2D' : '3D'}
          </button>
        </div>
      </div>
    </div>
  );
}
