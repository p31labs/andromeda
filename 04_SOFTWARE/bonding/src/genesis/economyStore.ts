// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Genesis: economy store (Rev B — PATCH 1: IndexedDB)
//
// Cross-session LOVE persistence via idb-keyval.
// localStorage is NEVER used here — IDB is protected by
// the quota manager and survives mobile process kills.
//
// Daily atom cap: 50 atoms/day to keep the economy honest.
// Streak: consecutive days played — resets if you miss a day.
// ═══════════════════════════════════════════════════════

import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const IDB_KEY = 'p31-love-economy';
const DAILY_ATOM_CAP = 50;
const LOVE_PER_ATOM = 1;
const LOVE_PER_MOLECULE = 10;

// ── Persisted shape (what lives in IDB) ──

interface EconomyPersisted {
  totalLove: number;
  currentStreak: number;
  lastActiveDate: string | null; // 'YYYY-MM-DD'
  dailyAtomCount: number;
}

// ── Store interface ──

interface EconomyStore extends EconomyPersisted {
  _hasHydrated: boolean;
  /** Runtime spoon level (0–12). Not persisted — resets to 12 per session. */
  spoons: number;
  setSpoons: (n: number) => void;
  _hydrate: () => Promise<void>;
  _onAtomPlaced: () => void;
  _onMoleculeCompleted: () => void;
  _onAchievementUnlocked: (loveReward: number) => void;
}

// ── Helpers ──

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function updatedStreak(lastActiveDate: string | null, streak: number): number {
  const today = todayIso();
  if (!lastActiveDate) return 1;
  if (lastActiveDate === today) return streak;
  const diffDays = Math.round(
    (new Date(today).getTime() - new Date(lastActiveDate).getTime()) / 86_400_000,
  );
  return diffDays === 1 ? streak + 1 : 1;
}

function persist(data: EconomyPersisted): void {
  void idbSet(IDB_KEY, data);
}

// ── Store ──

export const useEconomyStore = create<EconomyStore>()((set, get) => ({
  totalLove: 0,
  currentStreak: 1,
  lastActiveDate: null,
  dailyAtomCount: 0,
  _hasHydrated: false,
  spoons: 12,
  setSpoons: (n: number) => set({ spoons: Math.min(12, Math.max(0, n)) }),

  _hydrate: async () => {
    try {
      const stored = await idbGet<EconomyPersisted>(IDB_KEY);
      if (stored) {
        const today = todayIso();
        const isNewDay = stored.lastActiveDate !== today;
        const currentStreak = updatedStreak(stored.lastActiveDate, stored.currentStreak);
        const dailyAtomCount = isNewDay ? 0 : stored.dailyAtomCount;
        const lastActiveDate = isNewDay ? today : stored.lastActiveDate;

        set({ totalLove: stored.totalLove, currentStreak, lastActiveDate, dailyAtomCount, _hasHydrated: true });

        if (isNewDay) {
          persist({ totalLove: stored.totalLove, currentStreak, lastActiveDate, dailyAtomCount });
        }
      } else {
        set({ _hasHydrated: true, lastActiveDate: todayIso() });
      }
    } catch {
      // IDB unavailable (e.g. private browsing on Firefox) — degrade gracefully
      set({ _hasHydrated: true });
    }
  },

  _onAtomPlaced: () => {
    const s = get();
    if (s.dailyAtomCount >= DAILY_ATOM_CAP) return;

    const today = todayIso();
    const isNewDay = s.lastActiveDate !== today;
    const dailyAtomCount = (isNewDay ? 0 : s.dailyAtomCount) + 1;
    const currentStreak = isNewDay ? updatedStreak(s.lastActiveDate, s.currentStreak) : s.currentStreak;
    const totalLove = s.totalLove + LOVE_PER_ATOM;
    const lastActiveDate = today;

    set({ totalLove, dailyAtomCount, lastActiveDate, currentStreak });
    persist({ totalLove, currentStreak, lastActiveDate, dailyAtomCount });
  },

  _onMoleculeCompleted: () => {
    const s = get();
    const totalLove = s.totalLove + LOVE_PER_MOLECULE;
    set({ totalLove });
    persist({ totalLove, currentStreak: s.currentStreak, lastActiveDate: s.lastActiveDate, dailyAtomCount: s.dailyAtomCount });
  },

  _onAchievementUnlocked: (loveReward: number) => {
    const s = get();
    const totalLove = s.totalLove + loveReward;
    set({ totalLove });
    persist({ totalLove, currentStreak: s.currentStreak, lastActiveDate: s.lastActiveDate, dailyAtomCount: s.dailyAtomCount });
  },
}));
