// ═══════════════════════════════════════════════════════════════════
// WCD-PASS-01: Cognitive Passport Store
// P31 Labs — Cognitive Passport System
//
// Zustand store with IndexedDB persistence via idb-keyval.
// Delta topology: All data stays on device.
// ═══════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import {
  PassportCrypto,
  type CognitivePassportData,
  type CognitiveProfile,
  type GenesisKeyPair,
  type LoveEntry,
  type LoveSource,
  type SignedPassportPayload,
} from '../lib/crypto';

// ─────────────────────────────────────────────────────────────────
// IndexedDB Keys
// ─────────────────────────────────────────────────────────────────
const PASSPORT_STATE_KEY = 'p31_passport_state';

// ─────────────────────────────────────────────────────────────────
// Store State Interface
// ─────────────────────────────────────────────────────────────────
interface PassportState {
  // Identity
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Keys
  keys: GenesisKeyPair | null;
  
  // Passport data
  passport: SignedPassportPayload | null;
  
  // Computed
  totalLove: number;
  profile: CognitiveProfile | null;
  
  // Actions
  initializeGenesis: (profile: CognitiveProfile) => Promise<void>;
  loadPassport: () => Promise<void>;
  awardLove: (amount: number, source: LoveSource, description: string, metadata?: Record<string, unknown>) => Promise<void>;
  updateProfile: (profile: Partial<CognitiveProfile>) => Promise<void>;
  clearPassport: () => Promise<void>;
  getPassport: () => CognitivePassportData | null;
  getKeys: () => GenesisKeyPair | null;
}

// ─────────────────────────────────────────────────────────────────
// Default Profile Factory
// ─────────────────────────────────────────────────────────────────
function createDefaultProfile(): CognitiveProfile {
  return {
    name: '',
    diagnoses: [],
    cognitiveStyle: 'geometric',
    triggers: [],
    accommodations: [],
    emergencyProtocol: {
      primaryContact: '',
      secondaryContact: '',
      medicalNotes: '',
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Generate Genesis Block ID
// ─────────────────────────────────────────────────────────────────
function generateGenesisBlockId(): string {
  const timestamp = Date.now();
  const random = crypto.getRandomValues(new Uint8Array(16));
  const hashInput = `${timestamp}-${arrayBufferToHex(random.buffer)}`;
  
  // Simple hash for genesis block ID
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hex = new Array(bytes.length * 2);
  for (let i = 0, j = 0; i < bytes.length; i++, j += 2) {
    const nibble = bytes[i] >>> 4;
    hex[j] = nibble < 10 ? 48 + nibble : 87 + nibble;
    const lo = bytes[i] & 15;
    hex[j + 1] = lo < 10 ? 48 + lo : 87 + lo;
  }
  return String.fromCharCode(...hex);
}

// ─────────────────────────────────────────────────────────────────
// Store Creation
// ─────────────────────────────────────────────────────────────────
export const usePassportStore = create<PassportState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isLoading: false,
  error: null,
  keys: null,
  passport: null,
  totalLove: 0,
  profile: null,

  /**
   * Initialize genesis identity with profile data
   * This creates the cryptographic keys and initial passport
   */
  initializeGenesis: async (profile: CognitiveProfile) => {
    set({ isLoading: true, error: null });
    
    try {
      // Generate new ECDSA P-384 key pair
      const keys = await PassportCrypto.generateGenesisKeys();
      
      // Create initial passport payload
      const now = new Date().toISOString();
      const genesisBlock = generateGenesisBlockId();
      
      const passportData: CognitivePassportData = {
        operatorId: keys.keyId,
        genesisBlock,
        profile,
        loveLedger: [],
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
      };
      
      // Sign the initial passport
      const signedPassport = await PassportCrypto.signPassport(passportData);
      
      // Update state
      set({
        isInitialized: true,
        isLoading: false,
        keys,
        passport: signedPassport,
        totalLove: 0,
        profile,
      });
      
      // Persist state to IndexedDB
      await idbSet(PASSPORT_STATE_KEY, {
        isInitialized: true,
        keys,
        passport: signedPassport,
        totalLove: 0,
        profile,
      });
      
      console.log('[PassportStore] Genesis initialized:', {
        keyId: keys.keyId,
        genesisBlock,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ isLoading: false, error: errorMessage });
      console.error('[PassportStore] Initialization failed:', error);
      throw error;
    }
  },

  /**
   * Load passport from IndexedDB
   */
  loadPassport: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Try to load persisted state
      const persisted = await idbGet<{
        isInitialized: boolean;
        keys: GenesisKeyPair;
        passport: SignedPassportPayload;
        totalLove: number;
        profile: CognitiveProfile;
      }>(PASSPORT_STATE_KEY);
      
      if (persisted && persisted.isInitialized && persisted.passport) {
        // Calculate total LOVE
        const totalLove = persisted.passport.payload.loveLedger.reduce(
          (sum, entry) => sum + entry.amount,
          0
        );
        
        set({
          isInitialized: persisted.isInitialized,
          isLoading: false,
          keys: persisted.keys,
          passport: persisted.passport,
          totalLove,
          profile: persisted.passport.payload.profile,
        });
        
        console.log('[PassportStore] Passport loaded:', {
          keyId: persisted.keys?.keyId,
          totalLove,
        });
        return;
      }
      
      // No passport found - not initialized
      set({ isLoading: false, isInitialized: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ isLoading: false, error: errorMessage });
      console.error('[PassportStore] Load failed:', error);
    }
  },

  /**
   * Award LOVE to the passport ledger
   * LOVE is earned, not spent (unlike Spoons)
   */
  awardLove: async (
    amount: number,
    source: LoveSource,
    description: string,
    metadata?: Record<string, unknown>
  ) => {
    const { passport, profile } = get();
    
    if (!passport || !profile) {
      throw new Error('Passport not initialized');
    }
    
    // Create new LOVE entry
    const newEntry: LoveEntry = {
      id: crypto.randomUUID(),
      amount,
      source,
      description,
      timestamp: new Date().toISOString(),
      metadata,
    };
    
    // Update passport with new ledger entry
    const updatedPayload: CognitivePassportData = {
      ...passport.payload,
      loveLedger: [...passport.payload.loveLedger, newEntry],
      updatedAt: new Date().toISOString(),
    };
    
    // Re-sign the updated passport
    const updatedPassport = await PassportCrypto.signPassport(updatedPayload);
    
    // Calculate new total
    const totalLove = updatedPassport.payload.loveLedger.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );
    
    // Update state
    set({
      passport: updatedPassport,
      totalLove,
    });
    
    // Persist to IndexedDB
    await idbSet(PASSPORT_STATE_KEY, {
      isInitialized: true,
      keys: get().keys,
      passport: updatedPassport,
      totalLove,
      profile,
    });
    
    console.log('[PassportStore] LOVE awarded:', {
      amount,
      source,
      totalLove,
    });
  },

  /**
   * Update cognitive profile
   */
  updateProfile: async (updates: Partial<CognitiveProfile>) => {
    const { passport, profile } = get();
    
    if (!passport || !profile) {
      throw new Error('Passport not initialized');
    }
    
    const updatedProfile = { ...profile, ...updates };
    
    // Update passport
    const updatedPayload: CognitivePassportData = {
      ...passport.payload,
      profile: updatedProfile,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedPassport = await PassportCrypto.signPassport(updatedPayload);
    
    // Update state
    set({
      passport: updatedPassport,
      profile: updatedProfile,
    });
    
    // Persist to IndexedDB
    await idbSet(PASSPORT_STATE_KEY, {
      isInitialized: true,
      keys: get().keys,
      passport: updatedPassport,
      totalLove: get().totalLove,
      profile: updatedProfile,
    });
    
    console.log('[PassportStore] Profile updated:', updates);
  },

  /**
   * Clear all passport data (reset)
   */
  clearPassport: async () => {
    await PassportCrypto.clearPassport();
    await idbDel(PASSPORT_STATE_KEY);
    
    set({
      isInitialized: false,
      isLoading: false,
      error: null,
      keys: null,
      passport: null,
      totalLove: 0,
      profile: null,
    });
    
    console.log('[PassportStore] Passport cleared');
  },

  /**
   * Get current passport data
   */
  getPassport: () => {
    const { passport } = get();
    return passport?.payload ?? null;
  },

  /**
   * Get current keys
   */
  getKeys: () => {
    return get().keys;
  },
}));

// ─────────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────────
export const usePassportInitialized = () => 
  usePassportStore((state) => state.isInitialized);

export const usePassportLoading = () => 
  usePassportStore((state) => state.isLoading);

export const usePassportError = () => 
  usePassportStore((state) => state.error);

export const useTotalLove = () => 
  usePassportStore((state) => state.totalLove);

export const useCognitiveProfile = () => 
  usePassportStore((state) => state.profile);

export const useOperatorId = () => 
  usePassportStore((state) => state.passport?.payload.operatorId ?? null);

export const useGenesisBlock = () => 
  usePassportStore((state) => state.passport?.payload.genesisBlock ?? null);

// ─────────────────────────────────────────────────────────────────
// Export store type for external use
// ─────────────────────────────────────────────────────────────────
export type { PassportState };
