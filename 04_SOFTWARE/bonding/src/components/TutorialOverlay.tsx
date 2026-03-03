// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// TutorialOverlay: step-by-step guided tutorial
//
// WCD-35 D1: Wired to tutorial engine via gameStore.
// WCD-25: Repositioned to bottom-left (Clippy zone) —
//         above palette, left of Jitterbug Navigator.
//         Keeps glassmorphism style, tap-to-advance UX.
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getCurrentStep } from '../engine/tutorial';

export function TutorialOverlay() {
  const activeTutorial = useGameStore((s) => s.activeTutorial);
  const tutorialState = useGameStore((s) => s.tutorialState);
  const fireTutorialEvent = useGameStore((s) => s.fireTutorialEvent);
  const [minimized, setMinimized] = useState(false);

  if (!activeTutorial || !tutorialState) return null;

  const step = getCurrentStep(activeTutorial, tutorialState);
  if (!step) return null;

  const stepNum = tutorialState.currentStep + 1;
  const totalSteps = activeTutorial.steps.length;

  const handleTap = () => {
    fireTutorialEvent({ type: 'any_tap' });
  };

  // WCD-25: Minimized pill — bottom-left (Clippy zone)
  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed left-4 z-50 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-amber-400/30 text-sm text-amber-400/60 cursor-pointer hover:text-amber-400/80 transition-colors pointer-events-auto"
        style={{ bottom: 'calc(160px + env(safe-area-inset-bottom, 0px))', minHeight: 40, touchAction: 'manipulation' }}
      >
        {step.emoji} Step {stepNum}/{totalSteps} — tap to show
      </button>
    );
  }

  return (
    <>
      {/* Full-screen tap target for any_tap steps */}
      {step.waitFor.type === 'any_tap' && (
        <button
          type="button"
          onPointerDown={handleTap}
          className="fixed inset-0 z-40 cursor-pointer pointer-events-auto"
          aria-label="Continue tutorial"
        />
      )}

      {/* WCD-25: Clippy zone — bottom-left, above palette, left of Jitterbug */}
      <div
        className="fixed left-4 z-50 pointer-events-auto"
        style={{
          bottom: 'calc(160px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 'min(70vw, 320px)',
        }}
      >
        <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 px-5 py-3 text-center relative">
          {/* Dismiss / minimize button */}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="absolute top-2 right-3 text-white/20 hover:text-white/50 transition-colors cursor-pointer text-sm"
            style={{ minWidth: 32, minHeight: 32, touchAction: 'manipulation' }}
          >
            {'\u2715'}
          </button>

          {/* Horizontal layout: emoji + message */}
          <div className="flex items-center gap-3 pr-6">
            <span className="text-3xl flex-shrink-0">{step.emoji}</span>
            <div className="text-left flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-snug">{step.message}</p>
              {step.celebration && (
                <p className="text-xs text-green mt-0.5">{step.celebration}</p>
              )}
            </div>
          </div>

          {/* Footer: step counter + tap hint */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-white/20 font-mono">
              {stepNum} of {totalSteps}
            </p>
            {step.waitFor.type === 'any_tap' && (
              <p className="text-[10px] text-white/20">Tap anywhere</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
