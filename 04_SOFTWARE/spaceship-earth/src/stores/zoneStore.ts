// ═══════════════════════════════════════════════════════════════════
// WCD-SE02-EXEC: Zone Management Store
// Spaceship Earth - P31 Labs
//
// Zustand store for spatial navigation, zone state, and environmental UI
// Manages ZUI levels, zone transitions, and spatial culling
// ═══════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { get as idbGet, set as idbSet } from 'idb-keyval';

// ─────────────────────────────────────────────────────────────────
// Zone Types and Interfaces
// ─────────────────────────────────────────────────────────────────

export interface SpatialZone {
  id: string;
  name: string;
  description: string;
  color: string;
  position: [number, number, number];
  radius: number;
  creatorId: string;
  elemental: 'Calcium' | 'Phosphorus' | 'Oxygen' | 'Violet';
  faces: ZoneFace[];
}

export interface ZoneFace {
  id: string;
  title: string;
  description: string;
  component: string; // Component identifier
  permissions: 'read' | 'write' | 'admin';
}

export interface SpatialNavigationState {
  currentLevel: 'Level0' | 'Level1' | 'Level2';
  currentZone: string | null;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  zoomLevel: number;
  isTransitioning: boolean;
  transitionProgress: number;
}

export interface EnvironmentalUIState {
  isGrounded: boolean;
  groundingProgress: number;
  lastThresholdCrossing: string | null;
  visitorMode: boolean;
  groundingDuration: number;
}

// ─────────────────────────────────────────────────────────────────
// Default Zones Configuration
// ─────────────────────────────────────────────────────────────────

const DEFAULT_ZONES: SpatialZone[] = [
  {
    id: 'zone-001',
    name: 'Shelter',
    description: 'Physical base layer and architectural controls',
    color: '#39FF14', // Phosphor Green (Calcium)
    position: [0, 0, 0],
    radius: 20,
    creatorId: 'system',
    elemental: 'Calcium',
    faces: [
      { id: 'face-001', title: 'System Controls', description: 'Base layer management', component: 'SystemControls', permissions: 'admin' },
      { id: 'face-002', title: 'Architecture', description: 'Physical space controls', component: 'Architecture', permissions: 'write' }
    ]
  },
  {
    id: 'zone-002',
    name: 'Node One',
    description: 'Hardware telemetry and sensor dashboards',
    color: '#06B6D4', // Cyan (Phosphorus)
    position: [40, 0, 0],
    radius: 15,
    creatorId: 'system',
    elemental: 'Phosphorus',
    faces: [
      { id: 'face-003', title: 'Telemetry', description: 'Hardware monitoring', component: 'Telemetry', permissions: 'read' },
      { id: 'face-004', title: 'Sensors', description: 'Environmental sensors', component: 'Sensors', permissions: 'read' }
    ]
  },
  {
    id: 'zone-003',
    name: 'The Fold',
    description: 'Semantic capture and knowledge graphing',
    color: '#F59E0B', // Decoherence Amber (Oxygen)
    position: [-40, 0, 0],
    radius: 18,
    creatorId: 'system',
    elemental: 'Oxygen',
    faces: [
      { id: 'face-005', title: 'Knowledge Graph', description: 'Semantic relationships', component: 'KnowledgeGraph', permissions: 'write' },
      { id: 'face-006', title: 'Semantic Capture', description: 'Information processing', component: 'SemanticCapture', permissions: 'write' }
    ]
  }
];

// ─────────────────────────────────────────────────────────────────
// Store State Interface
// ─────────────────────────────────────────────────────────────────

interface ZoneState {
  // Zones
  zones: SpatialZone[];
  activeZoneId: string | null;
  
  // Spatial Navigation
  spatialState: SpatialNavigationState;
  
  // Environmental UI
  environmentalState: EnvironmentalUIState;
  
  // Actions
  setActiveZone: (zoneId: string | null) => void;
  setSpatialLevel: (level: SpatialNavigationState['currentLevel']) => void;
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setZoomLevel: (zoom: number) => void;
  
  // Zone Transitions
  triggerZoneTransition: (zoneId: string) => void;
  completeZoneTransition: () => void;
  
  // Environmental State
  startGrounding: (duration?: number) => void;
  updateGroundingProgress: (progress: number) => void;
  completeGrounding: () => void;
  
  // Zone Management
  addZone: (zone: Omit<SpatialZone, 'faces'> & { faces?: ZoneFace[] }) => void;
  removeZone: (zoneId: string) => void;
  updateZone: (zoneId: string, updates: Partial<SpatialZone>) => void;
  
  // Persistence
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Store Creation
// ─────────────────────────────────────────────────────────────────

export const useZoneStore = create<ZoneState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        zones: DEFAULT_ZONES,
        activeZoneId: null,
        
        spatialState: {
          currentLevel: 'Level0',
          currentZone: null,
          cameraPosition: [0, 0, 100],
          cameraTarget: [0, 0, 0],
          zoomLevel: 1,
          isTransitioning: false,
          transitionProgress: 0,
        },
        
        environmentalState: {
          isGrounded: false,
          groundingProgress: 0,
          lastThresholdCrossing: null,
          visitorMode: false,
          groundingDuration: 3000, // 3 seconds default
        },

        // Actions
        setActiveZone: (zoneId: string | null) => {
          set((state) => ({
            activeZoneId: zoneId,
            spatialState: {
              ...state.spatialState,
              currentZone: zoneId,
            },
          }));
        },

        setSpatialLevel: (level: SpatialNavigationState['currentLevel']) => {
          set((state) => ({
            spatialState: {
              ...state.spatialState,
              currentLevel: level,
            },
          }));
        },

        setCameraPosition: (position: [number, number, number]) => {
          set((state) => ({
            spatialState: {
              ...state.spatialState,
              cameraPosition: position,
            },
          }));
        },

        setCameraTarget: (target: [number, number, number]) => {
          set((state) => ({
            spatialState: {
              ...state.spatialState,
              cameraTarget: target,
            },
          }));
        },

        setZoomLevel: (zoom: number) => {
          set((state) => ({
            spatialState: {
              ...state.spatialState,
              zoomLevel: zoom,
            },
          }));
        },

        triggerZoneTransition: (zoneId: string) => {
          const zone = get().zones.find(z => z.id === zoneId);
          if (!zone) return;

          set((state) => ({
            activeZoneId: zoneId,
            spatialState: {
              ...state.spatialState,
              currentLevel: 'Level1',
              currentZone: zoneId,
              isTransitioning: true,
              transitionProgress: 0,
            },
            environmentalState: {
              ...state.environmentalState,
              visitorMode: true,
              lastThresholdCrossing: zone.name,
            },
          }));

          // Broadcast ZONE_TRANSITION event
          window.dispatchEvent(new CustomEvent('ZONE_TRANSITION', {
            detail: {
              zoneId,
              zoneName: zone.name,
              transitionType: 'entering',
            },
          }));
        },

        completeZoneTransition: () => {
          set((state) => ({
            spatialState: {
              ...state.spatialState,
              isTransitioning: false,
              transitionProgress: 1,
            },
            environmentalState: {
              ...state.environmentalState,
              visitorMode: false,
            },
          }));
        },

        startGrounding: (duration = 3000) => {
          set((state) => ({
            environmentalState: {
              ...state.environmentalState,
              isGrounded: false,
              groundingProgress: 0,
              groundingDuration: duration,
            },
          }));
        },

        updateGroundingProgress: (progress: number) => {
          set((state) => ({
            environmentalState: {
              ...state.environmentalState,
              groundingProgress: Math.min(1, Math.max(0, progress)),
            },
          }));
        },

        completeGrounding: () => {
          set((state) => ({
            environmentalState: {
              ...state.environmentalState,
              isGrounded: true,
              groundingProgress: 1,
              visitorMode: false,
            },
          }));

          // Complete the zone transition
          get().completeZoneTransition();
        },

        addZone: (zoneData) => {
          const newZone: SpatialZone = {
            ...zoneData,
            faces: zoneData.faces || [],
          };
          
          set((state) => ({
            zones: [...state.zones, newZone],
          }));
        },

        removeZone: (zoneId: string) => {
          set((state) => ({
            zones: state.zones.filter(z => z.id !== zoneId),
            activeZoneId: state.activeZoneId === zoneId ? null : state.activeZoneId,
          }));
        },

        updateZone: (zoneId: string, updates: Partial<SpatialZone>) => {
          set((state) => ({
            zones: state.zones.map(zone => 
              zone.id === zoneId ? { ...zone, ...updates } : zone
            ),
          }));
        },

        saveState: async () => {
          const state = get();
          await idbSet('spaceship_earth_zone_state', {
            zones: state.zones,
            activeZoneId: state.activeZoneId,
            spatialState: state.spatialState,
            environmentalState: state.environmentalState,
          });
        },

        loadState: async () => {
          try {
            const saved = await idbGet<{
              zones: SpatialZone[];
              activeZoneId: string | null;
              spatialState: SpatialNavigationState;
              environmentalState: EnvironmentalUIState;
            }>('spaceship_earth_zone_state');
            
            if (saved) {
              set(saved);
            }
          } catch (error) {
            console.warn('[ZoneStore] Failed to load state:', error);
          }
        },
      }),
      {
        name: 'spaceship-earth-zone-store',
        partialize: (state) => ({
          zones: state.zones,
          activeZoneId: state.activeZoneId,
          spatialState: state.spatialState,
          environmentalState: state.environmentalState,
        }),
      }
    )
  )
);

// ─────────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────────

export const useActiveZone = () => 
  useZoneStore((state) => state.activeZoneId);

export const useZones = () => 
  useZoneStore((state) => state.zones);

export const useSpatialState = () => 
  useZoneStore((state) => state.spatialState);

export const useEnvironmentalState = () => 
  useZoneStore((state) => state.environmentalState);

export const useCurrentLevel = () => 
  useZoneStore((state) => state.spatialState.currentLevel);

export const useIsTransitioning = () => 
  useZoneStore((state) => state.spatialState.isTransitioning);

export const useVisitorMode = () => 
  useZoneStore((state) => state.environmentalState.visitorMode);

export const useGroundingProgress = () => 
  useZoneStore((state) => state.environmentalState.groundingProgress);

// ─────────────────────────────────────────────────────────────────
// Zone Utilities
// ─────────────────────────────────────────────────────────────────

export const getZoneById = (zoneId: string | null) => {
  const zones = useZoneStore.getState().zones;
  return zoneId ? zones.find(z => z.id === zoneId) : null;
};

export const getZoneByPosition = (position: [number, number, number]) => {
  const zones = useZoneStore.getState().zones;
  
  for (const zone of zones) {
    const distance = Math.sqrt(
      Math.pow(position[0] - zone.position[0], 2) +
      Math.pow(position[1] - zone.position[1], 2) +
      Math.pow(position[2] - zone.position[2], 2)
    );
    
    if (distance <= zone.radius) {
      return zone;
    }
  }
  
  return null;
};

export const checkZoneThreshold = (position: [number, number, number]) => {
  const currentZone = useZoneStore.getState().activeZoneId;
  const zoneAtPosition = getZoneByPosition(position);
  
  if (zoneAtPosition && zoneAtPosition.id !== currentZone) {
    return zoneAtPosition;
  }
  
  return null;
};

// ─────────────────────────────────────────────────────────────────
// Export store type for external use
// ─────────────────────────────────────────────────────────────────

export type { ZoneState };
