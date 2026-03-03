// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// AchievementToast: slide-in notifications for unlocks
//
// Renders from the toast queue in gameStore.
// Auto-dismisses after duration (handled by store).
// CSS animations defined in index.css.
//
// WCD-23: Discovery variant — high-contrast reveal toast
// with molecule name in Inter + formula in JetBrains Mono
// + LOVE reward indicator.
// ═══════════════════════════════════════════════════════

import { useGameStore } from '../store/gameStore';
import { FormulaDisplay } from './FormulaDisplay';

export function AchievementToast() {
  const toasts = useGameStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[400px] pointer-events-none">
      {toasts.slice(0, 3).map((toast) => {
        const age = Date.now() - toast.createdAt;
        const isExiting = age > toast.duration - 300;

        // WCD-23: Discovery variant — special high-contrast treatment
        if (toast.variant === 'discovery') {
          return (
            <div
              key={toast.id}
              className={`
                flex items-center gap-4
                discovery-toast backdrop-blur-md
                px-6 py-4 rounded-xl
                border border-[#FFD700]/25
                max-w-[360px] w-full
                ${isExiting ? 'toast-exit' : 'discovery-enter'}
              `}
              style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(40,20,0,0.85) 100%)' }}
            >
              <span className="text-2xl">{toast.icon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {toast.text}
                </span>
                {toast.subtext && (
                  <span className="text-sm text-[#FFD700]/70 font-mono">
                    <FormulaDisplay formula={toast.subtext} />
                  </span>
                )}
              </div>
              {toast.love != null && toast.love > 0 && (
                <span className="text-sm font-bold text-[#FFD700] ml-auto whitespace-nowrap">
                  +{toast.love} LOVE
                </span>
              )}
            </div>
          );
        }

        // WCD-25: Hero goal variant — gold gradient, crown icon, double LOVE
        if (toast.variant === 'hero') {
          return (
            <div
              key={toast.id}
              className={`
                flex items-center gap-4
                backdrop-blur-md
                px-6 py-5 rounded-xl
                border border-[#FFD700]/40
                max-w-[360px] w-full
                ${isExiting ? 'toast-exit' : 'discovery-enter'}
              `}
              style={{ background: 'linear-gradient(135deg, rgba(40,30,0,0.9) 0%, rgba(60,40,0,0.9) 100%)' }}
            >
              <span className="text-3xl">{toast.icon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-mono text-[#FFD700]/50 uppercase tracking-wider">Hero Goal</span>
                <span className="text-xl font-extrabold text-[#FFD700]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {toast.text}
                </span>
                {toast.subtext && (
                  <span className="text-sm text-[#FFD700]/60 font-mono">
                    <FormulaDisplay formula={toast.subtext} />
                  </span>
                )}
              </div>
              {toast.love != null && toast.love > 0 && (
                <span className="text-lg font-extrabold text-[#FFD700] ml-auto whitespace-nowrap">
                  +{toast.love} LOVE
                </span>
              )}
            </div>
          );
        }

        // Standard toast
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
