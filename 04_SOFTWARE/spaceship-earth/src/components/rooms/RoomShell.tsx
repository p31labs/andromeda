// spaceship-earth/src/components/rooms/RoomShell.tsx
import React, { useState } from 'react';
import type { RoomId } from '../../types/rooms.types';
import { ROOMS } from '../../types/rooms.types';
import { BondingRoom } from './BondingRoom';
import { ObservatoryRoom } from './ObservatoryRoom';
import { BridgeRoom } from './BridgeRoom';
import { RoomNav } from '../navigation/RoomNav';
import { CockpitHUD } from '../hud/CockpitHUD';

export function RoomShell() {
  const [activeRoom, setActiveRoom] = useState<RoomId>('observatory');
  const [spoons] = useState(12);
  const [maxSpoons] = useState(20);
  const [love] = useState(577);

  const bondingUrl = ROOMS.find(r => r.id === 'bonding')?.url ?? '';

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#050505',
      overflow: 'hidden',
    }}>
      {/* Room content */}
      <div style={{
        position: 'absolute',
        inset: 0,
        bottom: 60, // room for nav bar
        zIndex: 1,
      }}>
        {activeRoom === 'bonding' && <BondingRoom url={bondingUrl} />}
        {activeRoom === 'observatory' && <ObservatoryRoom />}
        {activeRoom === 'bridge' && (
          <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} />
        )}
        {activeRoom === 'buffer' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748b',
            fontFamily: 'monospace',
          }}>
            Buffer — coming soon
          </div>
        )}
      </div>

      {/* HUD — visible in all rooms except BONDING (which has its own) */}
      {activeRoom !== 'bonding' && (
        <CockpitHUD spoons={spoons} maxSpoons={maxSpoons} love={love} />
      )}

      {/* Navigation */}
      <RoomNav rooms={ROOMS} activeRoom={activeRoom} onRoomChange={setActiveRoom} />
    </div>
  );
}
