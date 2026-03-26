// spaceship-earth/src/hooks/useRoomRouter.ts
// Hash-based room router hook for Spaceship Earth

import { useState, useEffect, useCallback } from 'react';
import { ROOMS, getRoomByHash, getDefaultRoom, isValidRoomHash } from '../rooms';
import type { RoomDefinition, RoomId } from '../types/rooms.types';

/**
 * Hash-based router hook
 * Listens to window hash changes and returns the active room
 */
export function useRoomRouter() {
  const [activeRoom, setActiveRoom] = useState<RoomDefinition>(() => {
    // Initialize from current hash or default to first room
    const currentHash = window.location.hash;
    if (currentHash && isValidRoomHash(currentHash)) {
      const room = getRoomByHash(currentHash);
      if (room) return room;
    }
    return getDefaultRoom();
  });

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash;
      console.log(`[Router] Hash changed to: ${currentHash}`);
      
      if (currentHash && isValidRoomHash(currentHash)) {
        const room = getRoomByHash(currentHash);
        if (room) {
          setActiveRoom(room);
          console.log(`[Router] Navigating to ${room.hash}`);
        }
      } else {
        // Invalid hash - default to first room
        const defaultRoom = getDefaultRoom();
        setActiveRoom(defaultRoom);
        console.log(`[Router] Invalid hash, defaulting to ${defaultRoom.hash}`);
      }
    };

    // Listen to hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Handle initial load
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  /**
   * Navigate to a room by hash
   * This updates the URL hash without reloading the page
   */
  const navigateTo = useCallback((roomHash: string) => {
    const normalizedHash = roomHash.startsWith('#') ? roomHash : `#${roomHash}`;
    
    if (isValidRoomHash(normalizedHash)) {
      console.log(`[Router] Navigating to ${normalizedHash}`);
      window.location.hash = normalizedHash;
    } else {
      console.warn(`[Router] Invalid room hash: ${normalizedHash}`);
    }
  }, []);

  /**
   * Navigate to a room by ID
   */
  const navigateToRoom = useCallback((roomId: RoomId) => {
    const room = ROOMS.find(r => r.id === roomId);
    if (room && room.hash) {
      navigateTo(room.hash);
    } else {
      console.warn(`[Router] Room not found or no hash: ${roomId}`);
    }
  }, [navigateTo]);

  return {
    activeRoom,
    rooms: ROOMS,
    navigateTo,
    navigateToRoom,
    isActive: (roomId: RoomId) => activeRoom.id === roomId,
  };
}

export type { RoomDefinition, RoomId };
