// SovereignShell — Unified Cockpit Architecture
// z-0: Three.js Canvas (dome + content screen — always running)
// z-30: Room panel grid (home) / Observatory filter UI
// z-40: Full-screen room overlays
// z-50: OS TopBar (always visible above everything)
import { useEffect, useState, useCallback } from 'react';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import type { SovereignRoom } from '../../../sovereign/types';
import { setupSovereignPWA } from '@p31/shared/sovereign';
import { ImmersiveCockpitUI } from './ImmersiveCockpit';
import { ClassicDiagnosticUI } from './ClassicDiagnostic';

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
import { BrainOverlay } from './overlays/BrainOverlay';
import GlassBoxRoom from '../GlassBoxRoom';
import { HandshakeOverlay } from '../../HandshakeOverlay';
import { OnboardingSequence } from './OnboardingSequence';
import { CartridgeDrawer } from './CartridgeDrawer';
import { SierpinskiOverlay } from './SierpinskiOverlay';
import { ROOMS } from '../../../types/rooms.types';
import { ObservatoryOverlay } from './overlays/ObservatoryOverlay';

const BONDING_URL = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

// ── Room panel definitions for the home grid ──
const ROOM_PANELS: { id: SovereignRoom; label: string; desc: string; color: string; icon: string }[] = [
  { id: 'OBSERVATORY', label: 'Observatory', desc: 'Geodesic dome — explore the system', color: 'var(--cyan)', icon: '\u2B21' },
  { id: 'COLLIDER', label: 'Collider', desc: 'Particle physics playground', color: 'var(--magenta)', icon: '\u269B' },
  { id: 'BONDING', label: 'Bonding', desc: 'Multiplayer chemistry game', color: 'var(--amber)', icon: '\u2B22' },
  { id: 'BRIDGE', label: 'Bridge', desc: 'LOVE economy dashboard', color: 'var(--violet)', icon: '\u2B23' },
  { id: 'BUFFER', label: 'Buffer', desc: 'Communication voltage scoring', color: 'var(--cyan)', icon: '\u26A1' },
  { id: 'COPILOT', label: 'Brain', desc: 'Geodesic Quantum Brain', color: 'var(--cyan)', icon: '\u2B21' },
  { id: 'LANDING', label: 'Quantum IDE', desc: 'QG-IDE + Copilot', color: 'var(--cyan)', icon: '\u269B' },
  { id: 'RESONANCE', label: 'Resonance', desc: 'Conversation becomes music', color: 'var(--violet)', icon: '\u266B' },
  { id: 'FORGE', label: 'Forge', desc: 'Content pipeline — Substack', color: 'var(--amber)', icon: '\u2B06' },
];

export function SovereignShell() {
  const {
    viewMode, toggleView, setPwaStatus, openOverlay, setOverlay,
    dynamicSlots, shipLocked, unlockShip,
    skinTheme, setSkinTheme,
  } = useSovereignStore();

  const [unlocking, setUnlocking] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('p31-onboarded'); } catch { return true; }
  });
  const [cartridgeDrawerOpen, setCartridgeDrawerOpen] = useState(false);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem('p31-onboarded', '1'); } catch {}
  }, []);

  const handleUnlock = useCallback(() => {
    setUnlocking(true);
    setTimeout(() => unlockShip(), 1000);
  }, [unlockShip]);

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

  // Register Glass Box into dynamic slot 2
  useEffect(() => {
    moduleRegistry.set('SLOT_2', GlassBoxRoom);
    useSovereignStore.getState().mountToSlot(2, 'Glass Box');
  }, []);

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

  // ESC key closes overlay (only when unlocked)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useSovereignStore.getState().shipLocked && useSovereignStore.getState().openOverlay) {
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
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', padding: 16 }}>
              <Component />
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--dim)', fontSize: 12 }}>
            Module not found in registry
          </div>
        );
      }

      switch (openOverlay) {
        case 'BRIDGE': return <BridgeOverlay />;
        case 'BUFFER': return <BufferOverlay />;
        case 'COLLIDER': return <ColliderOverlay />;
        case 'BONDING': return <BondingOverlay url={BONDING_URL} />;
        case 'COPILOT': return <BrainOverlay />;
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
      background: 'var(--void)', overflow: 'hidden', fontFamily: "var(--font-display)", userSelect: 'none',
    }}>
      {/* Skip navigation link */}
      <a href="#main-content" className="skip-nav">Skip to content</a>

      {/* ══════════ ONBOARDING (first visit only) ══════════ */}
      {showOnboarding && !shipLocked && (
        <OnboardingSequence onComplete={handleOnboardingComplete} />
      )}

      {/* ══════════ LOCK SCREEN ══════════ */}
      {shipLocked && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 35,
          opacity: unlocking ? 0 : 1,
          transition: 'opacity var(--trans-slow)',
          pointerEvents: unlocking ? 'none' : 'auto',
        }}>
          <GlassBoxRoom initialH={0.85} initialQ={0.5} onCoherenceAchieved={handleUnlock} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', textAlign: 'center', zIndex: 10,
            animation: 'fadeOut 4s ease-out forwards',
          }}>
            <div style={{
              fontSize: 18, letterSpacing: 4, color: 'var(--cyan)', fontWeight: 300,
              fontFamily: "var(--font-data)",
              textShadow: 'var(--glow-cyan)',
            }}>
              STABILIZE THE ATTRACTOR
            </div>
            <div style={{
              fontSize: 12, color: 'var(--dim)', marginTop: 12,
              fontFamily: "var(--font-data)", letterSpacing: 2,
            }}>
              H {'\u2192'} 0.35 &middot; Q {'\u2192'} 4.0
            </div>
          </div>
        </div>
      )}

      {/* z-0: Three.js Canvas */}
      {viewMode === 'cockpit' ? <ImmersiveCockpitUI /> : <ClassicDiagnosticUI />}

      {/* z-30: Observatory filter UI */}
      {!shipLocked && viewMode === 'cockpit' && !openOverlay && (
        <div style={{
          position: 'absolute', top: 48, left: 0, right: 0, bottom: 0,
          zIndex: 30, pointerEvents: 'none',
        }}>
          <ObservatoryOverlay />
        </div>
      )}

      {/* z-40: Full-screen room overlays */}
      <main id="main-content" role="main" aria-label={activeLabel ? `${activeLabel} room` : 'Observatory home'}>
        {!shipLocked && renderOverlay()}
      </main>

      {/* z-25: Sierpinski fractal overlay */}
      <SierpinskiOverlay visible={!shipLocked && viewMode === 'cockpit' && !openOverlay && !showOnboarding} />

      {/* z-42: Cartridge drawer */}
      <CartridgeDrawer
        visible={cartridgeDrawerOpen && !shipLocked}
        onClose={() => setCartridgeDrawerOpen(false)}
      />

      {/* z-60: Handshake overlay */}
      {!shipLocked && <HandshakeOverlay />}

      {/* aria-live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {activeLabel ? `Navigated to ${activeLabel}` : 'Home — Observatory view'}
      </div>

      {/* Persistent Donate button */}
      <a
        href="https://phosphorus31.org/donate"
        target="_blank"
        rel="noopener noreferrer"
        className="neon-flicker glass-btn"
        style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 45,
          display: shipLocked ? 'inline-flex' : 'none',
          color: 'var(--amber)', borderColor: 'var(--amber)44', padding: '10px 20px', minHeight: 'auto'
        }}
      >
        PAY THE TROLL TOLL
      </a>

      {/* z-50: Top Bar */}
      {!shipLocked && <header className="sov-topbar" role="banner" style={{ borderBottom: '1px solid var(--neon-ghost)', background: 'var(--s1)' }}>
        {/* Left: Brand */}
        <button
          type="button"
          onClick={() => setOverlay(null)}
          aria-label="Return to home — Observatory"
          className="glass-btn"
          style={{
            fontWeight: 700, letterSpacing: '0.08em', fontSize: '16px',
            color: 'var(--cyan)', border: '1px solid var(--neon-ghost)',
            padding: '12px 16px', minHeight: '48px', minWidth: '48px',
          }}
        >
          P31 <span style={{ marginLeft: 8, opacity: 0.4, fontWeight: 300 }}>//</span>
          <span style={{ marginLeft: 8, color: 'var(--text)', fontWeight: 400 }}>{activeLabel || 'observatory'}</span>
        </button>

        <div style={{ flex: 1 }} />

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Theme switcher */}
          <select
            value={skinTheme}
            onChange={(e) => setSkinTheme(e.target.value as any)}
            className="glass-input"
            style={{ padding: '8px 12px', fontSize: 11, background: 'var(--s1)', color: 'var(--cyan)', borderColor: 'var(--neon-ghost)' }}
          >
            <option value="operator">OPERATOR</option>
            <option value="kids">KIDS</option>
            <option value="gray-rock">GRAY ROCK</option>
          </select>

          <button
            onClick={() => setCartridgeDrawerOpen(true)}
            className="glass-btn"
            style={{ padding: '8px 16px', fontSize: 12, color: 'var(--amber)', borderColor: 'var(--amber)44', minHeight: 'auto' }}
          >
            CARTRIDGES
          </button>

          <button
            onClick={toggleView}
            className="glass-btn"
            style={{ padding: '8px 16px', fontSize: 12, color: 'var(--violet)', borderColor: 'var(--violet)44', minHeight: 'auto' }}
          >
            {viewMode === 'cockpit' ? 'DIAGNOSTIC' : 'COCKPIT'}
          </button>
        </div>
      </header>}
    </div>
  );
}
