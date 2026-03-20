// spaceship-earth/src/components/rooms/RoomShell.tsx
// Room orchestrator — dynamic loading, crossfade transitions, room persistence.
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import type { RoomId } from '../../types/rooms.types';
import { ROOMS } from '../../types/rooms.types';

import { RoomNav } from '../navigation/RoomNav';
import { CockpitHUD } from '../hud/CockpitHUD';
import { MolecularField } from '../MolecularField';
import { BugReportButton } from '../BugReportButton';
import { SomaticOverloadOverlay } from '../hud/SomaticOverloadOverlay';
import { useLoveSync } from '../../hooks/useLoveSync';
import { useBondingHandshake } from '../../hooks/useBondingHandshake';
import { useProtocolLoveSync } from '../../hooks/useProtocolLoveSync';
import { useNode } from '../../contexts/NodeContext';

// ── Dynamic Imports (Code Splitting) ──

const BondingRoom = lazy(() => import('./BondingRoom').then(m => ({ default: m.BondingRoom })));
const ObservatoryRoom = lazy(() => import('./ObservatoryRoom'));
const BridgeRoom = lazy(() => import('./BridgeRoom').then(m => ({ default: m.BridgeRoom })));
const GeodesicRoom = lazy(() => import('./GeodesicRoom').then(m => ({ default: m.GeodesicRoom })));
const VaultRoom = lazy(() => import('./VaultRoom').then(m => ({ default: m.VaultRoom })));
const BufferRoom = lazy(() => import('./BufferRoom').then(m => ({ default: m.BufferRoom })));
const SovereignRoom = lazy(() => import('./sovereign/SovereignRoom').then(m => ({ default: m.SovereignRoom })));

// ── Room persistence ──

const STORAGE_KEY = 'p31-spaceship-room-v2';

function getPersistedRoom(): RoomId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ROOMS.some(r => r.id === stored)) return stored as RoomId;
  } catch {}
  return 'sovereign';
}

function persistRoom(id: RoomId) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
}

// ── Transition wrapper ──

function RoomTransition({ active, children, label }: { active: boolean; children: React.ReactNode; label: string }) {
  const [mounted, setMounted] = useState(active);
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!mounted) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease-in-out',
      pointerEvents: active ? 'auto' : 'none',
    }}>
      <Suspense fallback={<RoomLoader label={label} />}>
        {children}
      </Suspense>
    </div>
  );
}

// ── Room loading fallback ──

function RoomLoader({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, height: '100%', color: 'var(--cyan)', fontFamily: "var(--font-data)",
      background: 'var(--s1)',
    }}>
      <div className="helix-spinner" style={{ width: 32, height: 32, borderWidth: '3px' }} />
      <span style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>
        Loading {label}...
      </span>
    </div>
  );
}

// ── Main Shell ──

export function RoomShell() {
  const [activeRoom, setActiveRoom] = useState<RoomId>(getPersistedRoom);
  const { spoons, maxSpoons, tier } = useNode();
  const { sessionId, totalLove: handshakeLove } = useBondingHandshake();
  const syncedLove = useLoveSync(sessionId);
  useProtocolLoveSync();
  const love = handshakeLove > 0 ? handshakeLove : syncedLove;

  const bondingUrl = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

  const handleRoomChange = useCallback((id: RoomId) => {
    setActiveRoom(id);
    persistRoom(id);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100%',
      height: '100%',
      background: 'var(--void)',
      overflow: 'hidden',
    }}>
      {/* Persistent molecular starfield background */}
      <MolecularField />

      {/* Room content */}
      <div style={{
        position: 'absolute',
        inset: 0,
        bottom: 60,
        zIndex: 1,
      }}>
        {/* Bonding (iframe) */}
        {activeRoom === 'bonding' && (
          <Suspense fallback={<RoomLoader label="Bonding" />}>
            <BondingRoom url={bondingUrl} />
          </Suspense>
        )}

        <RoomTransition active={activeRoom === 'observatory'} label="Observatory">
          <ObservatoryRoom />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'geodesic'} label="Geodesic Nexus">
          <GeodesicRoom />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'bridge'} label="Bridge">
          <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'vault'} label="Secure Vault">
          <VaultRoom tier={tier} />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'buffer'} label="Voltage Buffer">
          <BufferRoom />
        </RoomTransition>

        {activeRoom === 'sovereign' && (
          <Suspense fallback={<RoomLoader label="Sovereign OS" />}>
            <SovereignRoom />
          </Suspense>
        )}
      </div>

      {/* HUD */}
      {activeRoom !== 'bonding' && activeRoom !== 'sovereign' && (
        <CockpitHUD spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
      )}

      {/* Bug report */}
      <BugReportButton room={activeRoom} sessionId={sessionId ?? undefined} />

      {/* Navigation */}
      <RoomNav rooms={ROOMS} activeRoom={activeRoom} onRoomChange={handleRoomChange} />

      {/* Global Somatic Overload Overlay */}
      <SomaticOverloadOverlay />
    </div>
  );
}

