/**
 * P31 12-Pillar MVP Template - Zustand Store
 * Version: 2.0.0 - Pure in-memory, NO PGlite
 * 
 * Pillar 4: State Management
 * Pure JavaScript in-memory storage - no WASM, no IndexedDB
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// === Types ===

export interface Entity {
  id: string;
  context: 'home' | 'business' | 'family';
  createdAt: number;
  updatedAt: number;
  data: Record<string, unknown>;
  pqcSignature?: string;
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  touchTarget: 'standard' | 'large';
  voiceEnabled: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
}

export interface Session {
  id: string;
  startedAt: number;
  userId: string;
  context: 'home' | 'business' | 'family';
}

export interface StateChange {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  signature?: string;
}

export interface CreateDTO {
  context: Entity['context'];
  data: Record<string, unknown>;
}

export interface UpdateDTO {
  data: Record<string, unknown>;
}

// === Store Interface ===

export interface MVPStore {
  // Core data (Pillar 3: Database)
  entities: Entity[];
  
  // User preferences
  context: Entity['context'];
  preferences: Preferences;
  
  // Session state
  activeSession: Session | null;
  isLoading: boolean;
  error: string | null;
  
  // State change log (Pillar 12: PQC audit)
  stateChanges: StateChange[];
  
  // Actions
  setEntities: (entities: Entity[]) => void;
  createEntity: (data: CreateDTO) => Promise<void>;
  updateEntity: (id: string, data: UpdateDTO) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  setContext: (context: Entity['context']) => void;
  setPreferences: (prefs: Partial<Preferences>) => void;
  setError: (error: string | null) => void;
  setSession: (session: Session | null) => void;
  reset: () => void;
}

// === Default State ===

const defaultPreferences: Preferences = {
  theme: 'system',
  touchTarget: 'large',
  voiceEnabled: false,
  highContrast: false,
  reduceMotion: false,
  fontSize: 'large',
};

const sampleEntities: Entity[] = [
  {
    id: generateEntityId(),
    context: 'home',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    data: { name: 'Sample Project', description: 'A demo entity' }
  }
];

const defaultState = {
  entities: sampleEntities,
  context: 'home' as const,
  preferences: defaultPreferences,
  activeSession: null,
  isLoading: false,
  error: null,
  stateChanges: [],
};

// === Store Implementation ===

export const useChromaticaStore = create<MVPStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultState,

        // === Entity Actions ===
        
        setEntities: (entities) => {
          set({ entities }, false, 'setEntities');
        },

        createEntity: async (data) => {
          const { entities } = get();
          
          set({ isLoading: true, error: null }, false, 'createEntity/start');
          
          try {
            const newEntity: Entity = {
              id: generateEntityId(),
              context: data.context || get().context,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              data: data.data,
            };

            const updatedEntities = [...entities, newEntity];
            set({ 
              entities: updatedEntities,
              isLoading: false,
            }, false, 'createEntity/success');
            
          } catch (error) {
            set({ 
              error: `Failed to create entity: ${error}`,
              isLoading: false,
            }, false, 'createEntity/error');
            throw error;
          }
        },

        updateEntity: async (id, data) => {
          const { entities } = get();
          
          set({ isLoading: true, error: null }, false, 'updateEntity/start');
          
          try {
            const entityIndex = entities.findIndex(e => e.id === id);
            if (entityIndex === -1) {
              throw new Error(`Entity not found: ${id}`);
            }

            const updatedEntity: Entity = {
              ...entities[entityIndex],
              data: { ...entities[entityIndex].data, ...data.data },
              updatedAt: Date.now(),
            };

            const updatedEntities = [...entities];
            updatedEntities[entityIndex] = updatedEntity;
            
            set({ 
              entities: updatedEntities,
              isLoading: false,
            }, false, 'updateEntity/success');
            
          } catch (error) {
            set({ 
              error: `Failed to update entity: ${error}`,
              isLoading: false,
            }, false, 'updateEntity/error');
            throw error;
          }
        },

        deleteEntity: async (id) => {
          const { entities } = get();
          
          set({ isLoading: true, error: null }, false, 'deleteEntity/start');
          
          try {
            const updatedEntities = entities.filter(e => e.id !== id);
            
            set({ 
              entities: updatedEntities,
              isLoading: false,
            }, false, 'deleteEntity/success');
            
          } catch (error) {
            set({ 
              error: `Failed to delete entity: ${error}`,
              isLoading: false,
            }, false, 'deleteEntity/error');
            throw error;
          }
        },

        // === Context & Preferences ===

        setContext: (context) => {
          set({ context }, false, 'setContext');
        },

        setPreferences: (prefs) => {
          const { preferences } = get();
          set({ 
            preferences: { ...preferences, ...prefs }
          }, false, 'setPreferences');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        setSession: (session) => {
          set({ activeSession: session }, false, 'setSession');
        },

        reset: () => {
          set({
            ...defaultState
          }, false, 'reset');
        },
      }),
      {
        name: 'p31-mvp-storage',
        partialize: (state) => ({
          context: state.context,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'P31 MVP Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// === Helper Functions ===

function generateEntityId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ent-${timestamp}-${random}`;
}

// === Selectors ===

export const selectEntitiesByContext = (store: MVPStore, context: Entity['context']) => 
  store.entities.filter(e => e.context === context);

export const selectEntityById = (store: MVPStore, id: string) =>
  store.entities.find(e => e.id === id);

export const selectRecentEntities = (store: MVPStore, limit: number = 10) =>
  [...store.entities]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

// === Hook Exports ===

export default useChromaticaStore;
