// spaceship-earth/src/components/rooms/RoomShell.tsx
// Room orchestrator — crossfade transitions, room persistence, loading boundaries.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RoomId } from '../../types/rooms.types';
import { ROOMS } from '../../types/rooms.types';
import { BondingRoom } from './BondingRoom';
import ObservatoryRoom from './ObservatoryRoom';
import { BridgeRoom } from './BridgeRoom';
import { GeodesicRoom } from './GeodesicRoom';
import { VaultRoom } from './VaultRoom';
import { BufferRoom } from './BufferRoom';
import { SovereignRoom } from './sovereign/SovereignRoom';
import { RoomNav } from '../navigation/RoomNav';
import { CockpitHUD } from '../hud/CockpitHUD';
import { MolecularField } from '../MolecularField';
import { BugReportButton } from '../BugReportButton';
import { useLoveSync } from '../../hooks/useLoveSync';
import { useBondingHandshake } from '../../hooks/useBondingHandshake';
import { useProtocolLoveSync } from '../../hooks/useProtocolLoveSync';
import { useNode } from '../../contexts/NodeContext';

// ── Room persistence ──

const STORAGE_KEY = 'p31-spaceship-room';

function getPersistedRoom(): RoomId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ROOMS.some(r => r.id === stored)) return stored as RoomId;
  } catch {}
  return 'observatory';
}

function persistRoom(id: RoomId) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
}

// ── Transition wrapper ──

function RoomTransition({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(active);
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      // Delay visibility for fade-in
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
      {children}
    </div>
  );
}

// ── Room loading fallback ──

function RoomLoader({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, height: '100%', color: '#3a4a5a', fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        width: 20, height: 20,
        border: '2px solid #1a2a3a',
        borderRightColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }} />
      <span style={{ fontSize: 10, letterSpacing: 2 }}>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
      background: '#000000',
      overflow: 'hidden',
    }}>
      {/* Persistent molecular starfield background — always visible */}
      <MolecularField />

      {/* Room content — ALL rooms reserve 60px for nav */}
      <div style={{
        position: 'absolute',
        inset: 0,
        bottom: 60,
        zIndex: 1,
      }}>
        {/* Bonding gets no transition (iframe) */}
        {activeRoom === 'bonding' && <BondingRoom url={bondingUrl} />}

        {/* All other rooms get crossfade transitions */}
        <RoomTransition active={activeRoom === 'observatory'}>
          <ObservatoryRoom />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'geodesic'}>
          <GeodesicRoom />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'bridge'}>
          <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'vault'}>
          <VaultRoom tier={tier} />
        </RoomTransition>

        <RoomTransition active={activeRoom === 'buffer'}>
          <BufferRoom />
        </RoomTransition>

        {/* Sovereign OS — full immersive cockpit + diagnostic */}
        {activeRoom === 'sovereign' && <SovereignRoom />}
      </div>

      {/* HUD — visible in all rooms except BONDING (which has its own) */}
      {activeRoom !== 'bonding' && activeRoom !== 'sovereign' && (
        <CockpitHUD spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
      )}

      {/* Bug report */}
      <BugReportButton room={activeRoom} sessionId={sessionId ?? undefined} />

      {/* Navigation */}
      <RoomNav rooms={ROOMS} activeRoom={activeRoom} onRoomChange={handleRoomChange} />
    </div>
  );
}
