import { create } from 'zustand';
import { useEffect, useRef } from 'react';
import { CockpitState, CockpitActions, CockpitStore } from '../types/cockpit';
import { CatchersMittSignal, MetabolicState, VoltageLogPayload } from '../types/contracts';

/**
 * P31 Z-Index Cockpit Store
 * =========================
 * 
 * Zustand-based state management for the Z-Index Cockpit frontend.
 * Manages all cockpit state including voltage monitoring, Fawn Guard,
 * and communication with the backend via WebSocket bridge.
 * 
 * Author: P31 Labs
 * License: MIT
 */

// Initial state
const initialState: CockpitState = {
  // Core State
  isInitialized: false,
  isLocked: false,
  lockoutReason: null,
  lockoutUntil: null,
  
  // Voltage & Metabolic State
  voltageLevel: 50,
  metabolicState: {
    spoons: 100,
    depletionRate: 0,
    recoveryRate: 0,
    lastUpdate: Date.now()
  },
  voltageLogs: [],
  
  // Fawn Guard
  fawnGuard: {
    isActive: false,
    isModalOpen: false,
    currentSignal: null,
    interventionMode: 'passive',
    lastIntervention: null
  },
  
  // Catcher's Mitt
  catchersMitt: {
    isProcessing: false,
    lastSignal: null,
    signalHistory: [],
    rawSequestered: false
  },
  
  // System Status
  systemStatus: {
    backendConnected: false,
    websocketConnected: false,
    lastHeartbeat: null,
    errorCount: 0
  },
  
  // UI State
  ui: {
    activeRoom: 'z-10',
    isFullscreen: false,
    theme: 'dark',
    notifications: []
  }
};

// Create Zustand store
export const useCockpitStore = create<CockpitStore>((set, get) => ({
  ...initialState,
  
  // Core Actions
  initialize: () => {
    set(state => ({
      ...state,
      isInitialized: true
    }));
  },
  
  setLockout: (reason: string | null, until: number | null) => {
    set(state => ({
      ...state,
      isLocked: !!reason,
      lockoutReason: reason,
      lockoutUntil: until
    }));
  },
  
  checkLockout: () => {
    const state = get();
    if (state.lockoutUntil && Date.now() > state.lockoutUntil) {
      set(state => ({
        ...state,
        isLocked: false,
        lockoutReason: null,
        lockoutUntil: null
      }));
    }
  },
  
  // Voltage Management
  updateVoltage: (level: number) => {
    const state = get();
    const newVoltage = Math.max(0, Math.min(100, level));
    
    set(state => ({
      ...state,
      voltageLevel: newVoltage,
      voltageLogs: [
        ...state.voltageLogs,
        {
          id: `voltage-${Date.now()}`,
          timestamp: Date.now(),
          voltage_level: newVoltage,
          entropy_hash: `hash-${Math.random().toString(36).substr(2, 9)}`,
          source: 'manual'
        }
      ].slice(-50) // Keep last 50 logs
    }));
    
    // Auto-lockout at critical voltage
    if (newVoltage <= 10) {
      get().setLockout('CRITICAL_VOLTAGE', Date.now() + 300000); // 5 minute lockout
    }
  },
  
  addVoltageLog: (log: VoltageLogPayload) => {
    set(state => ({
      ...state,
      voltageLogs: [
        ...state.voltageLogs,
        log
      ].slice(-100) // Keep last 100 logs
    }));
  },
  
  updateMetabolicState: (state: MetabolicState) => {
    set(store => ({
      ...store,
      metabolicState: {
        ...state,
        lastUpdate: Date.now()
      }
    }));
  },
  
  // Fawn Guard Actions
  activateFawnGuard: (signal: CatchersMittSignal) => {
    set(state => ({
      ...state,
      fawnGuard: {
        ...state.fawnGuard,
        isActive: true,
        isModalOpen: true,
        currentSignal: signal,
        lastIntervention: Date.now()
      },
      catchersMitt: {
        ...state.catchersMitt,
        rawSequestered: signal.tier === 'HIGH'
      }
    }));
  },
  
  deactivateFawnGuard: () => {
    set(state => ({
      ...state,
      fawnGuard: {
        ...state.fawnGuard,
        isActive: false,
        isModalOpen: false,
        currentSignal: null
      },
      catchersMitt: {
        ...state.catchersMitt,
        rawSequestered: false
      }
    }));
  },
  
  setFawnGuardMode: (mode: 'passive' | 'active') => {
    set(state => ({
      ...state,
      fawnGuard: {
        ...state.fawnGuard,
        interventionMode: mode
      }
    }));
  },
  
  // Catcher's Mitt Actions
  processVoltageSignal: (signal: CatchersMittSignal) => {
    const state = get();
    
    // Add to signal history
    const newHistory = [
      ...state.catchersMitt.signalHistory,
      {
        ...signal,
        receivedAt: Date.now()
      }
    ].slice(-20); // Keep last 20 signals
    
    // Determine if Fawn Guard should activate
    const shouldActivate = signal.tier === 'HIGH' && 
                          state.fawnGuard.interventionMode === 'active';
    
    set(state => ({
      ...state,
      catchersMitt: {
        ...state.catchersMitt,
        lastSignal: signal,
        signalHistory: newHistory,
        isProcessing: false,
        rawSequestered: signal.tier === 'HIGH'
      },
      fawnGuard: shouldActivate 
        ? {
            ...state.fawnGuard,
            isActive: true,
            isModalOpen: true,
            currentSignal: signal,
            lastIntervention: Date.now()
          }
        : state.fawnGuard
    }));
    
    // Update voltage level based on signal
    if (signal.voltage_score !== undefined) {
      get().updateVoltage(signal.voltage_score);
    }
  },
  
  setProcessing: (isProcessing: boolean) => {
    set(state => ({
      ...state,
      catchersMitt: {
        ...state.catchersMitt,
        isProcessing
      }
    }));
  },
  
  // System Status
  setBackendConnected: (connected: boolean) => {
    set(state => ({
      ...state,
      systemStatus: {
        ...state.systemStatus,
        backendConnected: connected,
        lastHeartbeat: connected ? Date.now() : null
      }
    }));
  },
  
  setWebsocketConnected: (connected: boolean) => {
    set(state => ({
      ...state,
      systemStatus: {
        ...state.systemStatus,
        websocketConnected: connected
      }
    }));
  },
  
  incrementErrorCount: () => {
    set(state => ({
      ...state,
      systemStatus: {
        ...state.systemStatus,
        errorCount: state.systemStatus.errorCount + 1
      }
    }));
  },
  
  resetErrorCount: () => {
    set(state => ({
      ...state,
      systemStatus: {
        ...state.systemStatus,
        errorCount: 0
      }
    }));
  },
  
  // UI Actions
  setActiveRoom: (room: string) => {
    set(state => ({
      ...state,
      ui: {
        ...state.ui,
        activeRoom: room
      }
    }));
  },
  
  toggleFullscreen: () => {
    set(state => ({
      ...state,
      ui: {
        ...state.ui,
        isFullscreen: !state.ui.isFullscreen
      }
    }));
  },
  
  setTheme: (theme: 'light' | 'dark') => {
    set(state => ({
      ...state,
      ui: {
        ...state.ui,
        theme
      }
    }));
  },
  
  addNotification: (notification: { id: string; message: string; type: 'info' | 'warning' | 'error'; duration?: number }) => {
    set(state => ({
      ...state,
      ui: {
        ...state.ui,
        notifications: [
          ...state.ui.notifications,
          notification
        ]
      }
    }));
    
    // Auto-remove notification after duration
    if (notification.duration) {
      setTimeout(() => {
        get().removeNotification(notification.id);
      }, notification.duration);
    }
  },
  
  removeNotification: (id: string) => {
    set(state => ({
      ...state,
      ui: {
        ...state.ui,
        notifications: state.ui.notifications.filter(n => n.id !== id)
      }
    }));
  },
  
  // Reset function
  reset: () => {
    set(initialState);
  }
}));

// WebSocket Integration Hook - Vertex 3 Patch
// Connects to Redis-to-WebSocket bridge at ws://localhost:8031/ws
// Forwards incoming voltage signals to Zustand store's processVoltageSignal()
export function useVoltageSignalProcessor(): typeof useCockpitStore {
  const processVoltageSignal = useCockpitStore(state => state.processVoltageSignal);
  const setWebsocketConnected = useCockpitStore(state => state.setWebsocketConnected);
  const incrementErrorCount = useCockpitStore(state => state.incrementErrorCount);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Connect to WebSocket bridge on mount
    const connectWebSocket = () => {
      console.log('🔌 Connecting to P31 WebSocket Bridge at ws://localhost:8031/ws');
      
      const ws = new WebSocket('ws://localhost:8031/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected to P31 Bridge');
        setWebsocketConnected(true);
        // Clear any reconnect timeout on successful connection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Parse incoming JSON payloads from Redis stream bridge
          // Payload should match CatchersMittSignal interface
          processVoltageSignal(payload as CatchersMittSignal);
        } catch (e) {
          console.error('❌ Failed to parse Cockpit signal:', e);
          incrementErrorCount();
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected (code: ${event.code})`);
        setWebsocketConnected(false);
        
        // Attempt reconnection after 3 seconds if not a deliberate close
        if (event.code !== 1000 && event.code !== 1001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        incrementErrorCount();
      };
    };

    // Initialize connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      setWebsocketConnected(false);
    };
  }, []); // Empty dependency array - run once on mount

  return useCockpitStore;
}

// Export types for external use
export type { CockpitState, CockpitActions, CockpitStore };