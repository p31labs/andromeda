// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// AchievementToast: slide-in notifications for unlocks
//
// Renders from the toast queue in gameStore.
// Auto-dismisses after duration (handled by store).
// CSS animations defined in index.css.
// ═══════════════════════════════════════════════════════

import { useGameStore } from '../store/gameStore';

export function AchievementToast() {
  const toasts = useGameStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full px-4 pointer-events-none z-20">
      {toasts.slice(0, 3).map((toast) => {
        const age = Date.now() - toast.createdAt;
        const isExiting = age > toast.duration - 300;

        return (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3
              bg-black/80 backdrop-blur-md
              px-5 py-3 rounded-xl
              border border-white/10
              max-w-[360px] w-full
              achievement-shimmer
              ${isExiting ? 'toast-exit' : 'toast-enter-center'}
            `}
          >
            <span className="text-xl">{toast.icon}</span>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-white/90">
                {toast.text}
              </span>
              {toast.subtext && (
                <span className="text-[13px] text-white/40">
                  {toast.subtext}
                </span>
              )}
            </div>
            {toast.love != null && toast.love > 0 && (
              <span className="text-xs font-bold text-love ml-2">
                +{toast.love} L.O.V.E.
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
