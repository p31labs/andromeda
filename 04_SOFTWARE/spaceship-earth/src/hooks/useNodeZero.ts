/**
 * @file useNodeZero.ts
 * @brief Zustand hook for Node Zero state synchronization
 * 
 * P31 Labs - Spaceship Earth - Node Zero Bridge
 * WCD-FW16: Spaceship Earth Client Bridge
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNodeZeroStore } from '../stores/nodeZeroStore';
import { nodeZeroBridge } from '../services/nodeZeroBridge';

/**
 * Hook to sync Spaceship Earth state TO Node Zero.
 * Subscribes to store changes and writes via BLE.
 * Throttled to 10Hz max to match Node Zero update rate.
 */
export function useNodeZero() {
  const {
    coherence,
    spoons,
    room,
    theme,
    connected,
    setConnected,
    setCoherence,
    setSpoons,
    setRoom,
    setTheme,
    setBattery,
    setIMUData,
  } = useNodeZeroStore();
  
  // Throttled write tracking
  const lastWriteRef = useRef<Map<string, number>>(new Map());
  
  const throttledWrite = useCallback(async (
    key: string,
    writeFn: () => Promise<void>,
    minIntervalMs: number = 100
  ) => {
    const now = Date.now();
    const lastWrite = lastWriteRef.current.get(key) || 0;
    
    if (now - lastWrite >= minIntervalMs) {
      try {
        await writeFn();
        lastWriteRef.current.set(key, now);
      } catch (error) {
        console.warn(`[useNodeZero] Failed to write ${key}:`, error);
      }
    }
  }, []);
  
  // Set up state change listener from BLE
  useEffect(() => {
    nodeZeroBridge.onStateChanged((state) => {
      if (state.coherence !== undefined) setCoherence(state.coherence);
      if (state.spoons !== undefined) setSpoons(state.spoons);
      if (state.room !== undefined) setRoom(state.room);
      if (state.theme !== undefined) setTheme(state.theme);
      if (state.battery !== undefined) setBattery(state.battery);
      if (state.connected !== undefined) setConnected(state.connected);
    });
    
    nodeZeroBridge.onIMU((data) => {
      setIMUData(data);
    });
  }, [setCoherence, setSpoons, setRoom, setTheme, setBattery, setConnected, setIMUData]);
  
  // Sync local state to Node Zero (throttled)
  useEffect(() => {
    if (!connected) return;
    
    throttledWrite('coherence', () => 
      nodeZeroBridge.writeCoherence(coherence)
    );
  }, [coherence, connected, throttledWrite]);
  
  useEffect(() => {
    if (!connected) return;
    
    throttledWrite('spoons', () => 
      nodeZeroBridge.writeSpoons(spoons)
    );
  }, [spoons, connected, throttledWrite]);
  
  useEffect(() => {
    if (!connected) return;
    
    throttledWrite('room', () => 
      nodeZeroBridge.writeRoom(room)
    );
  }, [room, connected, throttledWrite]);
  
  useEffect(() => {
    if (!connected) return;
    
    throttledWrite('theme', () => 
      nodeZeroBridge.writeTheme(theme)
    );
  }, [theme, connected, throttledWrite]);
  
  // Expose haptic trigger
  const triggerHaptic = useCallback(async (effectId: number) => {
    if (!connected) return;
    await nodeZeroBridge.triggerHaptic(effectId);
  }, [connected]);
  
  // Expose connect/disconnect
  const connect = useCallback(async () => {
    try {
      await nodeZeroBridge.connect();
    } catch (error) {
      console.error('[useNodeZero] Connection failed:', error);
    }
  }, []);
  
  const disconnect = useCallback(async () => {
    await nodeZeroBridge.disconnect();
  }, []);
  
  return {
    coherence,
    spoons,
    room,
    theme,
    connected,
    triggerHaptic,
    connect,
    disconnect,
  };
}

// Convenience hook for checking connection
export function useNodeZeroConnection() {
  return useNodeZeroStore((state) => state.connected);
}
