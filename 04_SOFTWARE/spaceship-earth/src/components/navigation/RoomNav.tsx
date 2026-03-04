// spaceship-earth/src/components/navigation/RoomNav.tsx
import React from 'react';
import type { RoomId, RoomDefinition } from '../../types/rooms.types';

interface Props {
  rooms: RoomDefinition[];
  activeRoom: RoomId;
  onRoomChange: (id: RoomId) => void;
}

export function RoomNav({ rooms, activeRoom, onRoomChange }: Props) {
  return (
    <nav style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 11,
      display: 'flex',
      justifyContent: 'center',
      gap: 2,
      padding: '6px 8px',
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      background: 'rgba(2, 4, 6, 0.9)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(40, 60, 80, 0.2)',
      pointerEvents: 'auto',
    }}>
      {rooms.map(room => (
        <button
          key={room.id}
          onClick={() => onRoomChange(room.id)}
          style={{
            background: activeRoom === room.id
              ? 'rgba(78, 205, 196, 0.12)'
              : 'transparent',
            border: activeRoom === room.id
              ? '1px solid rgba(78, 205, 196, 0.35)'
              : '1px solid transparent',
            borderRadius: 6,
            padding: '5px 6px',
            minHeight: 40,
            flex: '1 1 0',
            maxWidth: 72,
            color: activeRoom === room.id ? '#4ecdc4' : '#3a4a5a',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            letterSpacing: 0.5,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 14 }}>{room.icon}</span>
          <span>{room.label}</span>
        </button>
      ))}
    </nav>
  );
}
