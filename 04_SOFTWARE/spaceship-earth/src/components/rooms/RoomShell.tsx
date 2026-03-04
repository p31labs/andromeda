// spaceship-earth/src/components/rooms/RoomShell.tsx
import React, { useState } from 'react';
import type { RoomId } from '../../types/rooms.types';
import { ROOMS } from '../../types/rooms.types';
import { BondingRoom } from './BondingRoom';
import ObservatoryRoom from './ObservatoryRoom';
import { BridgeRoom } from './BridgeRoom';
import { GeodesicRoom } from './GeodesicRoom';
import { VaultRoom } from './VaultRoom';
import { BufferRoom } from './BufferRoom';
import { RoomNav } from '../navigation/RoomNav';
import { CockpitHUD } from '../hud/CockpitHUD';
import { MolecularField } from '../MolecularField';
import { BugReportButton } from '../BugReportButton';
import { useLoveSync } from '../../hooks/useLoveSync';
import { useBondingHandshake } from '../../hooks/useBondingHandshake';
import { useProtocolLoveSync } from '../../hooks/useProtocolLoveSync';
import { useNode } from '../../contexts/NodeContext';

export function RoomShell() {
  const [activeRoom, setActiveRoom] = useState<RoomId>('observatory');
  const { spoons, maxSpoons, tier } = useNode();
  const { sessionId, totalLove: handshakeLove } = useBondingHandshake();
  const syncedLove = useLoveSync(sessionId);
  useProtocolLoveSync();
  const love = handshakeLove > 0 ? handshakeLove : syncedLove;

  const bondingUrl = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100%',
      height: '100%',
      background: '#020406',
      overflow: 'hidden',
    }}>
      {/* Persistent molecular starfield background */}
      {activeRoom !== 'bonding' && <MolecularField />}

      {/* Room content — ALL rooms reserve 60px for nav */}
      <div style={{
        position: 'absolute',
        inset: 0,
        bottom: 60,
        zIndex: 1,
      }}>
        {activeRoom === 'bonding' && <BondingRoom url={bondingUrl} />}
        {activeRoom === 'observatory' && <ObservatoryRoom />}
        {activeRoom === 'geodesic' && <GeodesicRoom />}
        {activeRoom === 'bridge' && (
          <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />
        )}
        {activeRoom === 'vault' && <VaultRoom tier={tier} />}
        {activeRoom === 'buffer' && <BufferRoom />}
      </div>

      {/* HUD — visible in all rooms except BONDING (which has its own) */}
      {activeRoom !== 'bonding' && (
        <CockpitHUD spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
      )}

      {/* Bug report */}
      <BugReportButton room={activeRoom} sessionId={sessionId ?? undefined} />

      {/* Navigation */}
      <RoomNav rooms={ROOMS} activeRoom={activeRoom} onRoomChange={setActiveRoom} />
    </div>
  );
}
