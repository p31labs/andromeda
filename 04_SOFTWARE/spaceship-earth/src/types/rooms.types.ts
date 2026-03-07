// spaceship-earth/src/types/rooms.types.ts

export type RoomId = 'bonding' | 'observatory' | 'geodesic' | 'vault' | 'bridge' | 'buffer' | 'sovereign';

export interface RoomDefinition {
  id: RoomId;
  label: string;
  icon: string;
  url?: string;
}

const BONDING_URL = import.meta.env.DEV
  ? 'http://localhost:5188'
  : 'https://bonding.p31ca.org';

export const ROOMS: RoomDefinition[] = [
  { id: 'bonding',     label: 'BONDING',     icon: '⚛️', url: BONDING_URL },
  { id: 'observatory', label: 'Observatory',  icon: '🔺' },
  { id: 'geodesic',    label: 'Geodesic',     icon: '🔷' },
  { id: 'vault',       label: 'Vault',        icon: '🔐' },
  { id: 'bridge',      label: 'Bridge',       icon: '🌐' },
  { id: 'buffer',      label: 'Buffer',       icon: '🛡️' },
  { id: 'sovereign',   label: 'Sovereign',    icon: '🔑' },
];
