// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Progress Store: Persist user progress to IndexedDB
//
// Phase 4: Avatar System
// Tracks all progress stats including bonds, molecules,
// family play sessions, and badge progress.
// ═══════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
<<<<<<< HEAD
import { 
  createBadgeCollection, 
=======
import {
  createBadgeCollection,
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  updateBadgeProgress,
  type BadgeCollection,
  type Badge,
} from '../engine/achievements';

// ── Store Interface ──

interface ProgressState {
  // Core stats
  totalBonds: number;
  totalMolecules: number;
  uniqueMolecules: string[];
  familyPlaySessions: number;
  totalPlayMinutes: number;
  lastSessionDate: string | null;
<<<<<<< HEAD
  
  // Badge collection
  badgeCollection: BadgeCollection;
  
  // Recently earned badges (for celebration)
  recentBadges: string[];
  
  // Family challenge progress
  familyChallengeProgress: FamilyChallengeProgress | null;
  
=======

  // Badge collection
  badgeCollection: BadgeCollection;

  // Recently earned badges (for celebration)
  recentBadges: string[];

  // Family challenge progress
  familyChallengeProgress: FamilyChallengeProgress | null;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Actions
  addBond: () => void;
  addBonds: (count: number) => void;
  addMolecule: (formula: string) => void;
  addFamilyPlaySession: () => void;
  addPlayMinutes: (minutes: number) => void;
  checkAndUpdateBadges: () => { newlyEarned: Badge[] };
  clearRecentBadges: () => void;
  resetProgress: () => void;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Family challenge actions
  startFamilyChallenge: (challengeId: string) => void;
  updateFamilyChallenge: (progress: number) => void;
  completeFamilyChallenge: () => void;
}

// ── Family Challenge Types ──

export interface FamilyChallenge {
  id: string;
  name: string;
  description: string;
  target: number;
  unit: string;
  reward: {
    badges: string[];
    sparks: number;
  };
  expiresAt: string;
}

export interface FamilyChallengeProgress {
  challengeId: string;
  current: number;
  target: number;
  startedAt: string;
  completed: boolean;
}

// ── Initial State Factory ──

function createInitialState() {
  return {
    totalBonds: 0,
    totalMolecules: 0,
    uniqueMolecules: [] as string[],
    familyPlaySessions: 0,
    totalPlayMinutes: 0,
    lastSessionDate: null as string | null,
    badgeCollection: createBadgeCollection(),
    recentBadges: [] as string[],
    familyChallengeProgress: null as FamilyChallengeProgress | null,
  };
}

// ── Create Store ──

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
<<<<<<< HEAD
      
      // ── Core stat actions ──
      
=======

      // ── Core stat actions ──

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      addBond: () => {
        set((state) => {
          const newBonds = state.totalBonds + 1;
          const newCollection = updateBadgeProgress(
            state.badgeCollection,
            newBonds,
            state.totalMolecules,
            null,
            false,
            0
          );
<<<<<<< HEAD
          
          const newlyEarned = newCollection.newlyEarned.map(b => b.id);
          
=======

          const newlyEarned = newCollection.newlyEarned.map(b => b.id);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          return {
            totalBonds: newBonds,
            badgeCollection: newCollection.updated,
            recentBadges: [...state.recentBadges, ...newlyEarned].slice(-5),
          };
        });
<<<<<<< HEAD
        
        // Check for new badge unlocks
        return get().checkAndUpdateBadges();
      },
      
=======

        // Check for new badge unlocks
        return get().checkAndUpdateBadges();
      },

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      addBonds: (count: number) => {
        set((state) => {
          const newBonds = state.totalBonds + count;
          const newCollection = updateBadgeProgress(
            state.badgeCollection,
            newBonds,
            state.totalMolecules,
            null,
            false,
            0
          );
<<<<<<< HEAD
          
          const newlyEarned = newCollection.newlyEarned.map(b => b.id);
          
=======

          const newlyEarned = newCollection.newlyEarned.map(b => b.id);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          return {
            totalBonds: newBonds,
            badgeCollection: newCollection.updated,
            recentBadges: [...state.recentBadges, ...newlyEarned].slice(-5),
          };
        });
      },
<<<<<<< HEAD
      
      addMolecule: (formula: string) => {
        set((state) => {
          const isNew = !state.uniqueMolecules.includes(formula);
          const newUnique = isNew 
            ? [...state.uniqueMolecules, formula]
            : state.uniqueMolecules;
          
=======

      addMolecule: (formula: string) => {
        set((state) => {
          const isNew = !state.uniqueMolecules.includes(formula);
          const newUnique = isNew
            ? [...state.uniqueMolecules, formula]
            : state.uniqueMolecules;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          const newCollection = updateBadgeProgress(
            state.badgeCollection,
            state.totalBonds,
            state.totalMolecules + 1,
            formula,
            false,
            0
          );
<<<<<<< HEAD
          
          const newlyEarned = newCollection.newlyEarned.map(b => b.id);
          
=======

          const newlyEarned = newCollection.newlyEarned.map(b => b.id);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          return {
            totalMolecules: state.totalMolecules + 1,
            uniqueMolecules: newUnique,
            badgeCollection: newCollection.updated,
            recentBadges: [...state.recentBadges, ...newlyEarned].slice(-5),
          };
        });
      },
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      addFamilyPlaySession: () => {
        set((state) => {
          const newCollection = updateBadgeProgress(
            state.badgeCollection,
            state.totalBonds,
            state.totalMolecules,
            null,
            true,
            0
          );
<<<<<<< HEAD
          
          const newlyEarned = newCollection.newlyEarned.map(b => b.id);
          
=======

          const newlyEarned = newCollection.newlyEarned.map(b => b.id);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          return {
            familyPlaySessions: state.familyPlaySessions + 1,
            badgeCollection: newCollection.updated,
            recentBadges: [...state.recentBadges, ...newlyEarned].slice(-5),
          };
        });
      },
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      addPlayMinutes: (minutes: number) => {
        set((state) => {
          const newCollection = updateBadgeProgress(
            state.badgeCollection,
            state.totalBonds,
            state.totalMolecules,
            null,
            false,
            minutes
          );
<<<<<<< HEAD
          
          const newlyEarned = newCollection.newlyEarned.map(b => b.id);
          
=======

          const newlyEarned = newCollection.newlyEarned.map(b => b.id);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          return {
            totalPlayMinutes: state.totalPlayMinutes + minutes,
            lastSessionDate: new Date().toISOString(),
            badgeCollection: newCollection.updated,
            recentBadges: [...state.recentBadges, ...newlyEarned].slice(-5),
          };
        });
      },
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Check for newly earned badges (called after any action)
      checkAndUpdateBadges: () => {
        const state = get();
        const newCollection = updateBadgeProgress(
          state.badgeCollection,
          state.totalBonds,
          state.totalMolecules,
          null,
          state.familyPlaySessions > 0,
          0
        );
<<<<<<< HEAD
        
        const newlyEarned = newCollection.newlyEarned;
        
=======

        const newlyEarned = newCollection.newlyEarned;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        if (newlyEarned.length > 0) {
          set({
            badgeCollection: newCollection.updated,
            recentBadges: [
<<<<<<< HEAD
              ...state.recentBadges, 
=======
              ...state.recentBadges,
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              ...newlyEarned.map(b => b.id)
            ].slice(-5),
          });
        }
<<<<<<< HEAD
        
        return { newlyEarned };
      },
      
      clearRecentBadges: () => {
        set({ recentBadges: [] });
      },
      
=======

        return { newlyEarned };
      },

      clearRecentBadges: () => {
        set({ recentBadges: [] });
      },

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      resetProgress: () => {
        set({
          ...createInitialState(),
          badgeCollection: createBadgeCollection(),
        });
      },
<<<<<<< HEAD
      
      // ── Family Challenge actions ──
      
      startFamilyChallenge: (challengeId: string) => {
        const challenge = getFamilyChallengeById(challengeId);
        if (!challenge) return;
        
=======

      // ── Family Challenge actions ──

      startFamilyChallenge: (challengeId: string) => {
        const challenge = getFamilyChallengeById(challengeId);
        if (!challenge) return;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        set({
          familyChallengeProgress: {
            challengeId,
            current: 0,
            target: challenge.target,
            startedAt: new Date().toISOString(),
            completed: false,
          },
        });
      },
<<<<<<< HEAD
      
      updateFamilyChallenge: (progress: number) => {
        set((state) => {
          if (!state.familyChallengeProgress) return state;
          
=======

      updateFamilyChallenge: (progress: number) => {
        set((state) => {
          if (!state.familyChallengeProgress) return state;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          const newProgress = {
            ...state.familyChallengeProgress,
            current: Math.min(progress, state.familyChallengeProgress.target),
            completed: progress >= state.familyChallengeProgress.target,
          };
<<<<<<< HEAD
          
          return { familyChallengeProgress: newProgress };
        });
      },
      
      completeFamilyChallenge: () => {
        set((state) => {
          if (!state.familyChallengeProgress) return state;
          
          // Add sparks/rewards
          // TODO: Add to LOVE balance
          
=======

          return { familyChallengeProgress: newProgress };
        });
      },

      completeFamilyChallenge: () => {
        set((state) => {
          if (!state.familyChallengeProgress) return state;

          // Add sparks/rewards
          // TODO: Add to LOVE balance

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          return {
            familyChallengeProgress: {
              ...state.familyChallengeProgress,
              completed: true,
            },
          };
        });
      },
    }),
    {
      name: 'bonding-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        totalBonds: state.totalBonds,
        totalMolecules: state.totalMolecules,
        uniqueMolecules: state.uniqueMolecules,
        familyPlaySessions: state.familyPlaySessions,
        totalPlayMinutes: state.totalPlayMinutes,
        lastSessionDate: state.lastSessionDate,
        badgeCollection: {
          ...state.badgeCollection,
          // Convert Set to Array for storage
          uniqueMolecules: Array.from(state.badgeCollection.uniqueMolecules),
        },
      }),
    }
  )
);

// ── Helper Functions ──

/**
 * Get all available family challenges
 */
export function getFamilyChallenges(): FamilyChallenge[] {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return [
    {
      id: 'water_weekly',
      name: 'Water Week',
      description: 'Build 10 water molecules together!',
      target: 10,
      unit: 'water molecules',
      reward: {
        badges: ['first_water'],
        sparks: 50,
      },
      expiresAt: weekEnd.toISOString(),
    },
    {
      id: 'unique_weekly',
      name: 'Discovery Week',
      description: 'Create 5 unique molecules together!',
      target: 5,
      unit: 'unique molecules',
      reward: {
        badges: ['explorer'],
        sparks: 75,
      },
      expiresAt: weekEnd.toISOString(),
    },
    {
      id: 'playtime_weekly',
      name: 'Family Time',
      description: 'Play for 30 minutes total!',
      target: 30,
      unit: 'minutes',
      reward: {
        badges: ['family_champion'],
        sparks: 100,
      },
      expiresAt: weekEnd.toISOString(),
    },
    {
      id: 'bond_building',
      name: 'Bond Builders',
      description: 'Make 25 bonds together!',
      target: 25,
      unit: 'bonds',
      reward: {
        badges: ['molecule_builder'],
        sparks: 50,
      },
      expiresAt: weekEnd.toISOString(),
    },
  ];
}

/**
 * Get challenge by ID
 */
function getFamilyChallengeById(id: string): FamilyChallenge | undefined {
  return getFamilyChallenges().find(c => c.id === id);
}

/**
 * Get current week's active challenge
 */
export function getCurrentChallenge(): FamilyChallenge | null {
  const challenges = getFamilyChallenges();
  const now = new Date();
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Return first non-expired challenge
  return challenges.find(c => new Date(c.expiresAt) > now) || null;
}

// ── Selectors ──

export const selectTotalBonds = (state: ProgressState) => state.totalBonds;
export const selectTotalMolecules = (state: ProgressState) => state.totalMolecules;
export const selectUniqueMolecules = (state: ProgressState) => state.uniqueMolecules;
export const selectFamilyPlaySessions = (state: ProgressState) => state.familyPlaySessions;
export const selectTotalPlayMinutes = (state: ProgressState) => state.totalPlayMinutes;
export const selectBadgeCollection = (state: ProgressState) => state.badgeCollection;
export const selectRecentBadges = (state: ProgressState) => state.recentBadges;
export const selectFamilyChallengeProgress = (state: ProgressState) => state.familyChallengeProgress;

<<<<<<< HEAD
export default useProgressStore;
=======
export default useProgressStore;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
