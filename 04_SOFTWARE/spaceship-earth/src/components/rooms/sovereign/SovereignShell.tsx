// SovereignShell — Unified Cockpit Architecture
// z-0: Three.js Canvas (dome + content screen — always running)
// z-30: Room panel grid (home) / Observatory filter UI
// z-40: Full-screen room overlays
// z-50: OS TopBar (always visible above everything)
import { useEffect, useState, useCallback } from 'react';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import type { SovereignRoom, SkinTheme } from '../../../sovereign/types';
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
import { BrainOverlay } from './overlays/BrainOverlay';
import GlassBoxRoom from '../GlassBoxRoom';
import { HandshakeOverlay } from '../../HandshakeOverlay';
import { OnboardingSequence } from './OnboardingSequence';
import { CartridgeDrawer } from './CartridgeDrawer';
import { SierpinskiOverlay } from './SierpinskiOverlay';

import { ROOMS } from '../../../types/rooms.types';

const BONDING_URL = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

// ── Room panel definitions for the home grid ──
const ROOM_PANELS: { id: SovereignRoom; label: string; desc: string; color: string; icon: string }[] = [
  { id: 'OBSERVATORY', label: 'Observatory', desc: 'Geodesic dome — explore the system', color: '#00FFFF', icon: '\u2B21' },
  { id: 'COLLIDER', label: 'Collider', desc: 'Particle physics playground', color: '#FF00FF', icon: '\u269B' },
  { id: 'BONDING', label: 'Bonding', desc: 'Multiplayer chemistry game', color: '#FFD700', icon: '\u2B22' },
  { id: 'BRIDGE', label: 'Bridge', desc: 'LOVE economy dashboard', color: '#BF5FFF', icon: '\u2B23' },
  { id: 'BUFFER', label: 'Buffer', desc: 'Communication voltage scoring', color: '#00FFFF', icon: '\u26A1' },
  { id: 'COPILOT', label: 'Brain', desc: 'Geodesic Quantum Brain', color: '#00FFFF', icon: '\u2B21' },
  { id: 'LANDING', label: 'Quantum IDE', desc: 'QG-IDE + Copilot', color: '#00FFFF', icon: '\u269B' },
  { id: 'RESONANCE', label: 'Resonance', desc: 'Conversation becomes music', color: '#BF5FFF', icon: '\u266B' },
  { id: 'FORGE', label: 'Forge', desc: 'Content pipeline — Substack', color: '#FFD700', icon: '\u2B06' },
];

export function SovereignShell() {
  const {
    viewMode, toggleView, setPwaStatus, openOverlay, setOverlay,
    dynamicSlots, shipLocked, unlockShip,
    skinTheme, setSkinTheme,
  } = useSovereignStore();

  const [unlocking, setUnlocking] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding only once — check localStorage
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
      background: '#000000', overflow: 'hidden', fontFamily: "'Oxanium', sans-serif", userSelect: 'none',
    }}>
      {/* Skip navigation link */}
      <a href="#main-content" className="skip-nav">Skip to content</a>

      {/* ══════════ D4.7: ONBOARDING (first visit only) ══════════ */}
      {showOnboarding && !shipLocked && (
        <OnboardingSequence onComplete={handleOnboardingComplete} />
      )}

      {/* ══════════ LOCK SCREEN ══════════ */}
      {shipLocked && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 35,
          opacity: unlocking ? 0 : 1,
          transition: 'opacity 1s ease-out',
          pointerEvents: unlocking ? 'none' : 'auto',
        }}>
          <GlassBoxRoom initialH={0.85} initialQ={0.5} onCoherenceAchieved={handleUnlock} />
          {/* Instruction overlay — fades after 4s via CSS animation */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', textAlign: 'center', zIndex: 10,
            animation: 'fadeOut 4s ease-out forwards',
          }}>
            <div style={{
              fontSize: 18, letterSpacing: 4, color: '#00FFFF', fontWeight: 300,
              fontFamily: "'Space Mono', monospace",
              textShadow: '0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(0,255,255,0.2)',
            }}>
              STABILIZE THE ATTRACTOR
            </div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 12,
              fontFamily: "'Space Mono', monospace", letterSpacing: 2,
            }}>
              H {'\u2192'} 0.35 &middot; Q {'\u2192'} 4.0
            </div>
          </div>
        </div>
      )}

      {/* z-0: Three.js Canvas — dome + content screen always running */}
      {viewMode === 'cockpit' ? <ImmersiveCockpitUI /> : <ClassicDiagnosticUI />}

      {/* z-30: Observatory filter UI — only when cockpit + home + unlocked */}
      {!shipLocked && viewMode === 'cockpit' && !openOverlay && (
        <div style={{
          position: 'absolute', top: 48, left: 0, right: 0, bottom: 0,
          zIndex: 30, pointerEvents: 'none',
        }}>
          <ObservatoryOverlay />
        </div>
      )}

      {/* z-40: Full-screen room overlays — only when unlocked */}
      <main id="main-content" role="main" aria-label={activeLabel ? `${activeLabel} room` : 'Observatory home'}>
        {!shipLocked && renderOverlay()}
      </main>

      {/* z-25: D4.2 Sierpinski fractal overlay — visible when cockpit + home + unlocked */}
      <SierpinskiOverlay visible={!shipLocked && viewMode === 'cockpit' && !openOverlay && !showOnboarding} />

      {/* z-42: D3.5 Cartridge drawer — swipeable horizontal drawer */}
      <CartridgeDrawer
        visible={cartridgeDrawerOpen && !shipLocked}
        onClose={() => setCartridgeDrawerOpen(false)}
      />

      {/* z-60: K4 Handshake overlay (M21) */}
      {!shipLocked && <HandshakeOverlay />}

      {/* aria-live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {activeLabel ? `Navigated to ${activeLabel}` : 'Home — Observatory view'}
      </div>

      {/* z-45: Persistent Stripe button — visible on lock screen too */}
      <a
        href="https://phosphorus31.org/donate"
        target="_blank"
        rel="noopener noreferrer"
        className="neon-flicker"
        style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 45,
          display: shipLocked ? 'inline-flex' : 'none',
        }}
      >
        PAY THE TROLL TOLL
      </a>

      {/* z-50: Top Bar — hidden during lock screen */}
      {!shipLocked && <header className="sov-topbar" role="banner">
        {/* Left: Brand (always navigates home) */}
        <button
          type="button"
          onClick={() => setOverlay(null)}
          aria-label="Return to home — Observatory"
          style={{
            fontWeight: 700, letterSpacing: '0.08em', fontSize: '16px',
            padding: '12px 16px', border: '1px solid rgba(0,255,255,0.4)',
            borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
            color: '#00FFFF', flexShrink: 0,
            textShadow: '0 0 8px rgba(0,255,255,0.5), 0 0 20px rgba(0,255,255,0.2)',
            boxShadow: '0 0 12px rgba(0,255,255,0.15), 0 0 30px rgba(0,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            minHeight: '48px',
            minWidth: '48px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          P31-OS
        </button>

        {/* Center: active room label or empty */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} aria-hidden="true">
          {activeLabel && (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FFFF', boxShadow: '0 0 8px #00FFFF, 0 0 20px rgba(0,255,255,0.3)' }} />
              <span style={{ color: '#00FFFF', letterSpacing: '0.06em', fontWeight: 600, fontSize: '15px', textShadow: '0 0 8px rgba(0,255,255,0.5)' }}>
                {activeLabel}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>|</span>
              <span style={{ color: 'rgba(0,255,255,0.5)', fontSize: '13px', textShadow: '0 0 6px rgba(0,255,255,0.3)' }}>active</span>
            </>
          )}
        </div>

        {/* Right: back button (when in overlay) + view toggle + troll toll */}
        <nav aria-label="Room controls" className="nav-dock" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {openOverlay && (
            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="nav-btn"
              aria-label={`Close ${activeLabel ?? 'overlay'} and return home`}
              style={{ padding: '12px 16px', fontSize: '14px' }}
            >
              BACK
            </button>
          )}
          <button type="button" onClick={() => setCartridgeDrawerOpen(o => !o)}
            className="nav-btn" aria-label="Toggle cartridge drawer"
            style={{
              padding: '12px 16px', fontSize: '11px',
              border: `1px solid ${cartridgeDrawerOpen ? 'rgba(0,255,255,0.5)' : 'rgba(0,255,255,0.15)'}`,
              color: cartridgeDrawerOpen ? '#00FFFF' : 'rgba(0,255,255,0.5)',
              flexShrink: 0, letterSpacing: '0.06em', fontWeight: 600,
            }}>
            CRT
          </button>
          <button type="button" onClick={() => {
            const cycle: SkinTheme[] = ['OPERATOR', 'KIDS', 'GRAY_ROCK'];
            const next = cycle[(cycle.indexOf(skinTheme) + 1) % 3];
            setSkinTheme(next);
          }} className="nav-btn" aria-label={`Switch skin theme (current: ${skinTheme})`} style={{
            padding: '12px 16px', fontSize: '11px',
            border: '1px solid rgba(0,255,255,0.25)',
            color: skinTheme === 'GRAY_ROCK' ? '#888' : skinTheme === 'KIDS' ? '#FFD700' : '#00FFFF',
            flexShrink: 0, letterSpacing: '0.06em', fontWeight: 600,
            textShadow: skinTheme === 'GRAY_ROCK' ? 'none' : `0 0 6px currentColor`,
          } as React.CSSProperties}>
            {skinTheme === 'OPERATOR' ? 'OP' : skinTheme === 'KIDS' ? 'KID' : 'GR'}
          </button>
          <button type="button" onClick={toggleView} className="nav-btn" aria-label={`Switch to ${viewMode === 'cockpit' ? '2D diagnostic' : '3D cockpit'} view`} style={{
            '--neon': '#00FFFF',
            padding: '12px 16px', fontSize: '14px',
            border: '1px solid rgba(0,255,255,0.35)',
            color: '#00FFFF', flexShrink: 0,
            textShadow: '0 0 6px rgba(0,255,255,0.4), 0 0 16px rgba(0,255,255,0.15)',
          } as React.CSSProperties}>
            {viewMode === 'cockpit' ? '2D' : '3D'}
          </button>
          <a
            href="https://phosphorus31.org/donate"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-btn"
            style={{
              padding: '12px 14px', fontSize: '11px',
              border: '1px solid rgba(0,255,255,0.15)',
              color: 'rgba(0,255,255,0.5)', fontWeight: 600,
              letterSpacing: '0.06em',
              textDecoration: 'none',
              textShadow: '0 0 6px rgba(0,255,255,0.3)',
              opacity: 0.7,
            }}
          >
            TROLL TOLL
          </a>
        </nav>
      </header>}
    </div>
  );
}
