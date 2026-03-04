// spaceship-earth/src/types/rooms.types.ts

export type RoomId = 'bonding' | 'observatory' | 'geodesic' | 'vault' | 'bridge' | 'buffer';

export interface RoomDefinition {
  id: RoomId;
  label: string;
  icon: string;
  url?: string;
}

export const ROOMS: RoomDefinition[] = [
  { id: 'bonding',     label: 'BONDING',     icon: '⚛️', url: 'https://bonding.p31ca.org' },
  { id: 'observatory', label: 'Observatory',  icon: '🔺' },
  { id: 'geodesic',    label: 'Geodesic',     icon: '🔷' },
  { id: 'vault',       label: 'Vault',        icon: '🔐' },
  { id: 'bridge',      label: 'Bridge',       icon: '🌐' },
  { id: 'buffer',      label: 'Buffer',       icon: '🛡️' },
];
