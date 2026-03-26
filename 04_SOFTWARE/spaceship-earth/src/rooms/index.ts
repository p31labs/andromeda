// spaceship-earth/src/rooms/index.ts
// Hash-based room router configuration for Spaceship Earth

import type { RoomId, RoomDefinition } from '../types/rooms.types';

const BONDING_URL = import.meta.env.DEV
  ? 'http://localhost:5188'
  : 'https://bonding.p31ca.org';

/**
 * ROOMS array - single source of truth for hash-based routing
 * Each room entry maps a hash to a component
 */
export const ROOMS: RoomDefinition[] = [
  { 
    id: 'observatory', 
    label: 'Observatory', 
    icon: '🔺',
    hash: '#observatory'
  },
  { 
    id: 'collider', 
    label: 'Collider', 
    icon: '⚛️',
    hash: '#collider'
  },
  { 
    id: 'bonding', 
    label: 'BONDING', 
    icon: '🧪',
    url: BONDING_URL,
    hash: '#bonding'
  },
  { 
    id: 'bridge', 
    label: 'Bridge', 
    icon: '🌐',
    hash: '#bridge'
  },
];

/**
 * Get room by hash - finds a room that matches the current hash
 */
export function getRoomByHash(hash: string): RoomDefinition | undefined {
  // Normalize hash (handle both with and without #)
  const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`;
  return ROOMS.find(room => room.hash === normalizedHash);
}

/**
 * Get room by ID
 */
export function getRoomById(id: RoomId): RoomDefinition | undefined {
  return ROOMS.find(room => room.id === id);
}

/**
 * Get default room (first in array)
 */
export function getDefaultRoom(): RoomDefinition {
  return ROOMS[0];
}

/**
 * All available hashes for validation
 */
export const ROOM_HASHES = ROOMS.map(r => r.hash);

/**
 * Navigation helper - returns true if hash is a valid room
 */
export function isValidRoomHash(hash: string): boolean {
  const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`;
  return ROOM_HASHES.includes(normalizedHash);
}
