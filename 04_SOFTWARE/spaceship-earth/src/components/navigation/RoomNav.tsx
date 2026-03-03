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
      gap: 4,
      padding: '8px 16px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(100, 116, 139, 0.2)',
      pointerEvents: 'auto',
    }}>
      {rooms.map(room => (
        <button
          key={room.id}
          onClick={() => onRoomChange(room.id)}
          style={{
            background: activeRoom === room.id
              ? 'rgba(78, 205, 196, 0.15)'
              : 'transparent',
            border: activeRoom === room.id
              ? '1px solid rgba(78, 205, 196, 0.4)'
              : '1px solid transparent',
            borderRadius: 8,
            padding: '8px 16px',
            color: activeRoom === room.id ? '#4ecdc4' : '#64748b',
            fontFamily: 'monospace',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 20 }}>{room.icon}</span>
          <span>{room.label}</span>
        </button>
      ))}
    </nav>
  );
}
