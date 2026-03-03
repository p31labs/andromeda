// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// LoveCounter: cross-session LOVE display (Rev B)
//
// Rev B change: reads from economyStore (IndexedDB-backed)
// instead of gameStore (session-only). Gates on _hasHydrated
// to avoid showing 0 during async IDB rehydration.
// ═══════════════════════════════════════════════════════

import { useEconomyStore } from '../genesis/economyStore';

export function LoveCounter() {
  const totalLove = useEconomyStore((s) => s.totalLove);
  const currentStreak = useEconomyStore((s) => s.currentStreak);
  const hasHydrated = useEconomyStore((s) => s._hasHydrated);

  // Don't show stale 0 during IndexedDB hydration
  if (!hasHydrated) return null;
  if (totalLove === 0) return null;

  // WCD-08: Absolute positioning stripped — now a flex child inside TopBar.
  // (This component is superseded by the inline LoveCounter in TopBar.tsx.)
  return (
    <div className="flex items-center gap-2 font-mono text-lg font-bold text-[#FFD700] pointer-events-none">
      <span className="text-xl">💛</span>
      <span>{totalLove % 1 === 0 ? totalLove.toFixed(0) : totalLove.toFixed(1)}</span>
      {currentStreak > 1 && (
        <span className="text-xs opacity-70">🔥 {currentStreak}d</span>
      )}
    </div>
  );
}
