// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// QuestHUD: compact quest progress display
//
// Shows below the mode emoji (top-left).
// Each active quest: icon + progress bar + current step.
// Completed quests show a checkmark.
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getCurrentStep, getQuestPercent } from '../engine/quests';

export function QuestHUD() {
  const activeQuests = useGameStore((s) => s.activeQuests);
  const questProgress = useGameStore((s) => s.questProgress);
  const [collapsed, setCollapsed] = useState(false);

  const checkWidth = useCallback(() => {
    setCollapsed(window.innerWidth < 640);
  }, []);

  useEffect(() => {
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [checkWidth]);

  if (activeQuests.length === 0) return null;

  // Find first active (non-completed) quest for the pill
  const primaryQuest = activeQuests[0]!;
  const primaryProgress = questProgress[primaryQuest.id];

  // Mobile: compact pill
  if (collapsed && primaryProgress) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute top-16 left-6 z-10 px-3 py-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/5 flex items-center gap-1.5 cursor-pointer"
      >
        <span className="text-sm">{primaryQuest.icon}</span>
        <span className="text-[11px] font-semibold text-white/40 truncate max-w-[120px]">
          {primaryQuest.name}
        </span>
        <span className="text-[10px] text-white/25 font-mono">
          {primaryProgress.completedSteps}/{primaryQuest.steps.length}
        </span>
      </button>
    );
  }

  return (
    <div className="absolute top-16 left-6 flex flex-col gap-2 z-10 pointer-events-none max-w-[200px]">
      {activeQuests.map((quest) => {
        const progress = questProgress[quest.id];
        if (!progress) return null;

        const percent = getQuestPercent(quest, progress);
        const currentStep = getCurrentStep(quest, progress);

        return (
          <div
            key={quest.id}
            className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/5"
          >
            {/* Header row */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{quest.icon}</span>
              <span className="text-[11px] font-semibold text-white/50 truncate">
                {quest.name}
              </span>
              {progress.completed && (
                <span className="text-emerald-400/60 text-[10px]">{'\u2713'}</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-white/20 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Current step narrative */}
            {currentStep && (
              <p className="text-[10px] text-white/25 leading-tight truncate">
                {currentStep.narrative}
              </p>
            )}

            {/* Step counter */}
            <p className="text-[9px] text-white/15 font-mono mt-0.5">
              {progress.completedSteps}/{quest.steps.length}
            </p>
          </div>
        );
      })}
    </div>
  );
}
