// spaceship-earth/src/types/rooms.types.ts

export type RoomId = 'bonding' | 'observatory' | 'buffer' | 'bridge';

export interface RoomDefinition {
  id: RoomId;
  label: string;
  icon: string; // emoji for now, SVG later
  url?: string; // for iframe rooms
}

export const ROOMS: RoomDefinition[] = [
  { id: 'bonding',     label: 'BONDING',     icon: '⚛️', url: 'https://bonding.p31ca.org' },
  { id: 'observatory', label: 'Observatory',  icon: '🔺' },
  { id: 'buffer',      label: 'Buffer',       icon: '📡' },
  { id: 'bridge',      label: 'Bridge',       icon: '🌐' },
];
