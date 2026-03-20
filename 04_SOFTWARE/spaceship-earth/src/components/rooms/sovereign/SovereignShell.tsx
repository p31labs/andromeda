// SovereignShell — Unified Cockpit Architecture
// z-0: Three.js Canvas (dome + content screen — always running)
// z-30: Room panel grid (home) / Observatory filter UI
// z-40: Full-screen room overlays
// z-50: OS TopBar (always visible above everything)
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import { useShallow } from 'zustand/shallow';
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
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useSovereignRelay } from '../../../hooks/useSovereignRelay';
import {
  playOverlayClose,
  playCartridgeLoad, playCoherenceAchieved,
  initVisibilityGate,
  startDrone, stopDrone, updateDrone,
  playOverlayOpenSpatial,
} from '../../../services/audioManager';
import { sendCelebration } from '../../../services/sovereignRelay';
import { trackEvent } from '../../../services/telemetry';
import { haptic } from '../../../services/haptic';
import { OverlayErrorBoundary } from '../../OverlayErrorBoundary';
import { DIDAvatar } from '../../DIDAvatar';
import { ProfileOverlay } from '../../ProfileOverlay';
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
    dynamicSlots, shipLocked, unlockShip, activeRoom,
    skinTheme, setSkinTheme,
    relayStatus, relayPing, offlineQueueSize,
    sfxEnabled, masterVolume, setSfxEnabled, setMasterVolume,
    remotePeers, celebrationPending, didKey,
  } = useSovereignStore(useShallow(s => ({
    viewMode: s.viewMode, toggleView: s.toggleView, setPwaStatus: s.setPwaStatus,
    openOverlay: s.openOverlay, setOverlay: s.setOverlay,
    dynamicSlots: s.dynamicSlots, shipLocked: s.shipLocked, unlockShip: s.unlockShip,
    activeRoom: s.activeRoom,
    skinTheme: s.skinTheme, setSkinTheme: s.setSkinTheme,
    relayStatus: s.relayStatus, relayPing: s.relayPing, offlineQueueSize: s.offlineQueueSize,
    sfxEnabled: s.sfxEnabled, masterVolume: s.masterVolume,
    setSfxEnabled: s.setSfxEnabled, setMasterVolume: s.setMasterVolume,
    remotePeers: s.remotePeers, celebrationPending: s.celebrationPending,
    didKey: s.didKey,
  })));

  // ?demo=true bypasses onboarding and ship lock — kiosk/presentation mode
  const isDemoMode = new URLSearchParams(location.search).has('demo');

  const [unlocking, setUnlocking] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (isDemoMode) return false;
    try { return !localStorage.getItem('p31-onboarded'); } catch { return true; }
  });
  const [cartridgeDrawerOpen, setCartridgeDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // WCD-27: one-time gesture tutorial — shown on first cockpit entry on touch devices
  const [showGestureTutorial, setShowGestureTutorial] = useState(() => {
    try {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return isTouch && !localStorage.getItem('p31-gesture-tutorial');
    } catch { return false; }
  });
  const dismissGestureTutorial = useCallback(() => {
    setShowGestureTutorial(false);
    try { localStorage.setItem('p31-gesture-tutorial', '1'); } catch {}
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const prevOverlayRef = useRef<string | null>(null);
  const gestureTutorialRef = useRef<HTMLDivElement>(null);

  // Focus trap: contains Tab/Shift+Tab within the overlay when one is open
  const overlayActive = !!openOverlay && openOverlay !== 'OBSERVATORY';
  useFocusTrap(overlayRef, overlayActive, () => setOverlay(null));
  // Focus trap for gesture tutorial dialog
  useFocusTrap(gestureTutorialRef, showGestureTutorial && !shipLocked, dismissGestureTutorial);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem('p31-onboarded', '1'); } catch {}
  }, []);

  const handleUnlock = useCallback(() => {
    setUnlocking(true);
    const { sfxEnabled: se, masterVolume: mv } = useSovereignStore.getState();
    playCoherenceAchieved(mv, se);
    sendCelebration('coherence');
    haptic.double();
    setTimeout(() => unlockShip(), 1000);
  }, [unlockShip]);

  // NodeContext data
  const { spoons, maxSpoons, tier } = useNode();
  const { sessionId, totalLove: handshakeLove } = useBondingHandshake();
  const syncedLove = useLoveSync(sessionId);
  useProtocolLoveSync();
  useGenesisSync();

  // WCD 15: Sovereign Relay (no-op when VITE_RELAY_URL is absent)
  useSovereignRelay();

  // M18: Somatic Tether (biometric relay from Termux WS)
  useSomaticTether();

  // M20: Spatial Mesh (BLE proximity radar)
  useSpatialRadar();
  const love = handshakeLove > 0 ? handshakeLove : syncedLove;

  // Bridge: NodeContext → useSovereignStore (feeds HUD arc)
  useSovereignBridge(love);

  // PWA bootstrap
  useEffect(() => { setupSovereignPWA(setPwaStatus); }, [setPwaStatus]);

  // WCD 18: Suspend/resume AudioContext when tab goes hidden/visible
  useEffect(() => initVisibilityGate(), []);

  // WCD-21: Drone lifecycle — start after first audio init, stop on unmount.
  // Zustand v5: subscribe(listener) only — no selector overload without middleware.
  useEffect(() => {
    const { sfxEnabled: se, masterVolume: mv, audioEnabled } = useSovereignStore.getState();
    if (audioEnabled) startDrone(mv, se);
    const unsub = useSovereignStore.subscribe((state, prev) => {
      if (state.audioEnabled && !prev.audioEnabled) {
        startDrone(state.masterVolume, state.sfxEnabled);
      }
    });
    return () => { unsub(); stopDrone(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WCD-21: Drive drone filter + gain from coherence. Runs on every coherence/volume change.
  const _droneCoherence = useSovereignStore(s => s.coherence);
  useEffect(() => {
    const { sfxEnabled: se, masterVolume: mv } = useSovereignStore.getState();
    updateDrone(_droneCoherence, mv, se);
  }, [_droneCoherence, sfxEnabled, masterVolume]);

  // WCD 18: Overlay open/close SFX
  useEffect(() => {
    const prev = prevOverlayRef.current;
    const curr = openOverlay ?? null;
    const wasRoom = prev !== null && prev !== 'OBSERVATORY';
    const isRoom = curr !== null && curr !== 'OBSERVATORY';
    const { sfxEnabled: se, masterVolume: mv } = useSovereignStore.getState();
    if (isRoom && !wasRoom) {
      // WCD-21: spatial whoosh from the room's compass direction
      playOverlayOpenSpatial(curr ?? 'OBSERVATORY', mv, se);
      trackEvent('overlay_open', { room: curr });
      haptic.tap();
    } else if (!isRoom && wasRoom) {
      playOverlayClose(mv, se);
    } else if (isRoom && wasRoom && prev !== curr) {
      playOverlayOpenSpatial(curr ?? 'OBSERVATORY', mv, se);
      trackEvent('overlay_open', { room: curr });
    }
    prevOverlayRef.current = curr;
  }, [openOverlay]);

  // WCD 18: Cartridge drawer open SFX
  useEffect(() => {
    if (!cartridgeDrawerOpen) return;
    const { sfxEnabled: se, masterVolume: mv } = useSovereignStore.getState();
    playCartridgeLoad(mv, se);
  }, [cartridgeDrawerOpen]);

  // Demo mode: unlock ship immediately on mount
  useEffect(() => {
    if (isDemoMode) {
      unlockShip();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        case 'BRIDGE':    return <OverlayErrorBoundary name="BRIDGE"><BridgeOverlay /></OverlayErrorBoundary>;
        case 'BUFFER':    return <OverlayErrorBoundary name="BUFFER"><BufferOverlay /></OverlayErrorBoundary>;
        case 'COLLIDER':  return <OverlayErrorBoundary name="COLLIDER"><ColliderOverlay /></OverlayErrorBoundary>;
        case 'BONDING':   return <OverlayErrorBoundary name="BONDING"><BondingOverlay url={BONDING_URL} /></OverlayErrorBoundary>;
        case 'COPILOT':   return <OverlayErrorBoundary name="COPILOT"><BrainOverlay /></OverlayErrorBoundary>;
        case 'LANDING':   return <OverlayErrorBoundary name="LANDING"><LandingOverlay /></OverlayErrorBoundary>;
        case 'RESONANCE': return <OverlayErrorBoundary name="RESONANCE"><ResonanceOverlay /></OverlayErrorBoundary>;
        case 'FORGE':     return <OverlayErrorBoundary name="FORGE"><ForgeOverlay /></OverlayErrorBoundary>;
        default: return null;
      }
    };

    return (
      <div ref={overlayRef} className="sov-overlay-shell">
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
          {/* Persistent hint — stays until coherence is achieved (not just 4s) */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', textAlign: 'center', zIndex: 10,
            opacity: unlocking ? 0 : 1,
            transition: 'opacity var(--trans-slow)',
          }}>
            <div
              className="lock-breathe-text"
              style={{
                fontSize: 18, letterSpacing: 4, color: 'var(--cyan)', fontWeight: 300,
                fontFamily: "var(--font-data)",
                textShadow: 'var(--glow-cyan)',
                animation: 'breathe 4s ease-in-out infinite',
              }}
            >
              STABILIZE THE ATTRACTOR
            </div>
            <div style={{
              fontSize: 12, color: 'var(--dim)', marginTop: 12,
              fontFamily: "var(--font-data)", letterSpacing: 2,
            }}>
              H {'\u2192'} 0.35 &middot; Q {'\u2192'} 4.0
            </div>
            <div style={{
              fontSize: 10, color: 'var(--dim)', marginTop: 6,
              fontFamily: "var(--font-data)", letterSpacing: 1, opacity: 0.5,
            }}>
              Use the sliders below-left
            </div>
          </div>
        </div>
      )}

      {/* z-0: Three.js Canvas
          inert when a room overlay is active — gates keyboard events and hides
          canvas from assistive tech so drei KeyboardControls don't intercept
          keys meant for overlays. React 19 supports inert as boolean attr. */}
      <div
        {...(openOverlay && openOverlay !== 'OBSERVATORY' ? { inert: '' } : {})}
        aria-hidden={!!(openOverlay && openOverlay !== 'OBSERVATORY') ? 'true' : undefined}
        style={{ position: 'absolute', inset: 0 }}
      >
        {viewMode === 'cockpit' ? <ImmersiveCockpitUI /> : <ClassicDiagnosticUI />}
      </div>

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

      {/* WCD-20: Celebration flash — full-screen radial burst, GPU-composited fade */}
      {celebrationPending && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.18) 0%, transparent 70%)',
            animation: 'celebrationFlash 1.5s ease-out forwards',
          }}
        />
      )}

      {/* aria-live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {activeLabel ? `Navigated to ${activeLabel}` : 'Home — Observatory view'}
      </div>

      {/* Demo mode kiosk banner */}
      {isDemoMode && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9100, display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 16px',
          background: 'rgba(3,3,8,0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--amber)44', borderRadius: 8,
          fontFamily: 'var(--font-data)', fontSize: 11, letterSpacing: '0.1em',
          pointerEvents: 'auto',
        }}>
          <span style={{ color: 'var(--amber)', opacity: 0.8 }}>DEMO MODE</span>
          <button
            type="button"
            onClick={() => { window.location.href = window.location.pathname; }}
            style={{
              background: 'transparent', border: '1px solid var(--amber)44',
              color: 'var(--amber)', padding: '4px 12px', borderRadius: 4,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
              letterSpacing: '0.08em',
            }}
          >
            RESET
          </button>
        </div>
      )}

      {/* WCD-27: Gesture tutorial — one-time overlay on touch devices */}
      {showGestureTutorial && !shipLocked && viewMode === 'cockpit' && !openOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gesture-tutorial-title"
          onClick={dismissGestureTutorial}
          style={{
            position: 'absolute', inset: 0, zIndex: 38,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 80, pointerEvents: 'auto',
          }}
        >
          <div
            ref={gestureTutorialRef}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(3,3,8,0.88)', backdropFilter: 'blur(16px)',
              border: '1px solid var(--neon-ghost)', borderRadius: 12,
              padding: '20px 28px', maxWidth: 300, width: '90%',
              fontFamily: 'var(--font-data)', color: 'var(--dim)',
              fontSize: 11, letterSpacing: '0.08em', textAlign: 'center',
            }}
          >
            <div id="gesture-tutorial-title" style={{ fontSize: 9, opacity: 0.5, letterSpacing: '0.2em', marginBottom: 14 }}>COCKPIT GESTURES</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
              <div>1 FINGER<br /><span style={{ color: 'var(--cyan)' }}>LOOK AROUND</span></div>
              <div>PINCH<br /><span style={{ color: 'var(--cyan)' }}>ZOOM FOV</span></div>
              <div>2 FINGER DRAG<br /><span style={{ color: 'var(--cyan)' }}>ORBIT</span></div>
              <div>TAP PANEL<br /><span style={{ color: 'var(--cyan)' }}>OPEN ROOM</span></div>
            </div>
            <button
              type="button"
              onClick={dismissGestureTutorial}
              className="glass-btn"
              style={{
                marginTop: 4, padding: '8px 24px', fontSize: 10,
                letterSpacing: '0.15em', color: 'var(--cyan)',
                borderColor: 'var(--neon-ghost)', width: '100%',
              }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

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
      {/* WCD-24: Profile overlay */}
      {profileOpen && <ProfileOverlay onClose={() => setProfileOpen(false)} />}

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
            aria-label="Skin theme"
            className="glass-input"
            style={{ padding: '8px 12px', fontSize: 11, background: 'var(--s1)', color: 'var(--cyan)', borderColor: 'var(--neon-ghost)' }}
          >
            <option value="OPERATOR">OPERATOR</option>
            <option value="AURORA">AURORA</option>
            <option value="KIDS">KIDS</option>
            <option value="GRAY_ROCK">GRAY ROCK</option>
          </select>

          {/* Relay status — only rendered when relay is active */}
          {relayStatus !== 'disconnected' && (
            <span
              aria-label={
                relayStatus === 'connected'
                  ? `Relay connected${relayPing > 0 ? `, ${relayPing}ms` : ''}`
                  : relayStatus === 'connecting' ? 'Relay connecting'
                  : offlineQueueSize > 0 ? `Offline — ${offlineQueueSize} queued`
                  : 'Relay error'
              }
              title={relayStatus}
              style={{
                fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.05em',
                color: relayStatus === 'connected'
                  ? (relayPing > 200 ? 'var(--amber)' : '#7DDFB6')
                  : relayStatus === 'connecting' ? 'var(--dim)'
                  : 'var(--amber)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                background: relayStatus === 'connected' ? '#7DDFB6'
                  : relayStatus === 'connecting' ? 'var(--dim)'
                  : 'var(--amber)',
                animation: relayStatus === 'connecting' ? 'breathe 1s ease-in-out infinite' : 'none',
              }} />
              {relayStatus === 'connected' && relayPing > 0 && `${relayPing}ms`}
              {offlineQueueSize > 0 && `${offlineQueueSize}q`}
            </span>
          )}

          {/* WCD-20: Peers in current room */}
          {(() => {
            const now = Date.now();
            const count = Object.values(remotePeers).filter(
              p => p.room === activeRoom && now - p.lastSeen < 30_000
            ).length;
            return count > 0 ? (
              <span
                aria-label={`${count} peer${count === 1 ? '' : 's'} in this room`}
                title={`${count} online in ${activeRoom}`}
                style={{
                  fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.05em',
                  color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />
                {count}
              </span>
            ) : null;
          })()}

          {/* WCD 18: SFX mute toggle + volume */}
          <button
            type="button"
            onClick={() => setSfxEnabled(!sfxEnabled)}
            className="glass-btn"
            aria-label={sfxEnabled ? 'Mute SFX' : 'Unmute SFX'}
            style={{
              padding: '8px 10px', fontSize: 13, minHeight: 'auto',
              color: sfxEnabled ? 'var(--cyan)' : 'var(--dim)',
              borderColor: sfxEnabled ? 'var(--neon-ghost)' : 'transparent',
            }}
          >
            {sfxEnabled ? '\u266A' : '\u2715'}
          </button>
          {sfxEnabled && (
            <input
              type="range" min={0} max={1} step={0.05}
              value={masterVolume}
              onChange={e => setMasterVolume(parseFloat(e.target.value))}
              aria-label="Master volume"
              style={{ width: 52, accentColor: 'var(--cyan)', cursor: 'pointer', verticalAlign: 'middle' }}
            />
          )}

          {/* WCD-24: Profile avatar button */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Open sovereign profile"
            className="glass-btn"
            style={{ padding: '4px', minHeight: 'auto', borderColor: 'var(--neon-ghost)' }}
          >
            <DIDAvatar did={didKey} size={30} />
          </button>

          <button
            type="button"
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
