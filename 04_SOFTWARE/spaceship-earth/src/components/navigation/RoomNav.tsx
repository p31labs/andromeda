// spaceship-earth/src/components/navigation/RoomNav.tsx
import { memo } from 'react';
import type { RoomId, RoomDefinition } from '../../types/rooms.types';

interface Props {
  rooms: RoomDefinition[];
  activeRoom: RoomId;
  onRoomChange: (id: RoomId) => void;
}

export const RoomNav = memo(function RoomNav({ rooms, activeRoom, onRoomChange }: Props) {
  return (
    <nav className="glass-nav nav-bar">
      {rooms.map((room, idx) => {
        const active = activeRoom === room.id;
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onRoomChange(room.id)}
            className={`nav-tab ${active ? 'nav-tab-active' : ''}`}
            style={{ '--delay': `${0.05 * idx}s` } as React.CSSProperties}
          >
            <span className={`nav-tab-icon ${active ? 'nav-tab-icon-active' : ''}`}>{room.icon}</span>
            <span className={`nav-tab-label ${active ? 'nav-tab-label-active' : ''}`}>{room.label}</span>
          </button>
        );
      })}
    </nav>
  );
});
