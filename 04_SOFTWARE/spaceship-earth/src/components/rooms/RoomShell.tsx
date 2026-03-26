// spaceship-earth/src/components/rooms/RoomShell.tsx
// Room orchestrator — dynamic loading, crossfade transitions, room persistence.
// Now uses hash-based routing per WCD-PASS-05
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import type { RoomId } from '../../types/rooms.types';
import { ROOMS } from '../../types/rooms.types';
import { useRoomRouter } from '../../hooks/useRoomRouter';

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
const ColliderRoom = lazy(() => import('./ColliderRoom').then(m => ({ default: m.ColliderRoom })));

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
  // Use hash-based router (WCD-PASS-05)
  const { activeRoom, rooms, navigateToRoom } = useRoomRouter();
  const activeRoomId = activeRoom.id as RoomId;
  
  const { spoons, maxSpoons, tier } = useNode();
  const { sessionId, totalLove: handshakeLove } = useBondingHandshake();
  const syncedLove = useLoveSync(sessionId);
  useProtocolLoveSync();
  const love = handshakeLove > 0 ? handshakeLove : syncedLove;

  const bondingUrl = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

  // Wrap navigateToRoom to also persist
  const handleRoomChange = useCallback((id: RoomId) => {
    persistRoom(id);
    navigateToRoom(id);
  }, [navigateToRoom]);

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
        {activeRoomId === 'bonding' && (
          <Suspense fallback={<RoomLoader label="Bonding" />}>
            <BondingRoom url={bondingUrl} />
          </Suspense>
        )}

        <RoomTransition active={activeRoomId === 'observatory'} label="Observatory">
          <ObservatoryRoom />
        </RoomTransition>

        <RoomTransition active={activeRoomId === 'collider'} label="Collider">
          <ColliderRoom />
        </RoomTransition>

        <RoomTransition active={activeRoomId === 'geodesic'} label="Geodesic Nexus">
          <GeodesicRoom />
        </RoomTransition>

        <RoomTransition active={activeRoomId === 'bridge'} label="Bridge">
          <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />
        </RoomTransition>

        <RoomTransition active={activeRoomId === 'vault'} label="Secure Vault">
          <VaultRoom tier={tier} />
        </RoomTransition>

        <RoomTransition active={activeRoomId === 'buffer'} label="Voltage Buffer">
          <BufferRoom />
        </RoomTransition>

        {activeRoomId === 'sovereign' && (
          <Suspense fallback={<RoomLoader label="Sovereign OS" />}>
            <SovereignRoom />
          </Suspense>
        )}
      </div>

      {/* HUD */}
      {activeRoomId !== 'bonding' && activeRoomId !== 'sovereign' && (
        <CockpitHUD spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
      )}

      {/* Bug report */}
      <BugReportButton room={activeRoomId} sessionId={sessionId ?? undefined} />

      {/* Navigation */}
      <RoomNav rooms={ROOMS} activeRoom={activeRoomId} onRoomChange={handleRoomChange} />

      {/* Global Somatic Overload Overlay */}
      <SomaticOverloadOverlay />
    </div>
  );
}

