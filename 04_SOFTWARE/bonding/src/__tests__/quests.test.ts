// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Quest engine test suite
// ═══════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import type { QuestProgress } from '../engine/quests';
import {
  getQuestsForMode,
  getCurrentStep,
  checkQuestProgress,
  initializeProgress,
  getQuestPercent,
  GENESIS_QUEST,
  KITCHEN_QUEST,
  POSNER_QUEST,
} from '../engine/quests';

describe('Quest data integrity', () => {
  it('every quest has a unique id', () => {
    const quests = [GENESIS_QUEST, KITCHEN_QUEST, POSNER_QUEST];
    const ids = quests.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every quest step has a non-empty target and narrative', () => {
    const quests = [GENESIS_QUEST, KITCHEN_QUEST, POSNER_QUEST];
    for (const quest of quests) {
      for (const step of quest.steps) {
        expect(step.target).toBeTruthy();
        expect(step.narrative).toBeTruthy();
      }
    }
  });

  it('every quest step target uses Hill system formulas', () => {
    const quests = [GENESIS_QUEST, KITCHEN_QUEST, POSNER_QUEST];
    const hillFormulas = [
      'H\u2082', 'O\u2082', 'H\u2082O', 'H\u2082O\u2082',
      'CO\u2082', 'CH\u2084', 'H\u2083N', 'C\u2082H\u2086',
      'OCa', 'O\u2083P\u2082', 'O\u2085P\u2082',
      'O\u2088P\u2082Ca\u2083', 'O\u2082\u2084P\u2086Ca\u2089',
    ];

    for (const quest of quests) {
      for (const step of quest.steps) {
        expect(hillFormulas).toContain(step.target);
      }
    }
  });

  it('quest modes are valid (seed | sprout | sapling)', () => {
    const quests = [GENESIS_QUEST, KITCHEN_QUEST, POSNER_QUEST];
    const validModes = ['seed', 'sprout', 'sapling'];
    for (const quest of quests) {
      expect(validModes).toContain(quest.mode);
    }
  });

  it('rewards have positive LOVE values', () => {
    const quests = [GENESIS_QUEST, KITCHEN_QUEST, POSNER_QUEST];
    for (const quest of quests) {
      expect(quest.reward.love).toBeGreaterThan(0);
    }
  });

  it('genesis quest has exactly 4 steps', () => {
    expect(GENESIS_QUEST.steps.length).toBe(4);
  });

  it('kitchen quest has exactly 5 steps', () => {
    expect(KITCHEN_QUEST.steps.length).toBe(5);
  });

  it('posner quest has exactly 5 steps', () => {
    expect(POSNER_QUEST.steps.length).toBe(5);
  });
});

describe('getQuestsForMode', () => {
  it('seed mode returns only seed quests', () => {
    const quests = getQuestsForMode('seed');
    expect(quests.length).toBe(1);
    expect(quests[0]!.id).toBe('genesis');
  });

  it('sprout mode returns seed + sprout quests', () => {
    const quests = getQuestsForMode('sprout');
    expect(quests.length).toBe(2);
    const ids = quests.map(q => q.id);
    expect(ids).toContain('genesis');
    expect(ids).toContain('kitchen');
  });

  it('sapling mode returns all quests', () => {
    const quests = getQuestsForMode('sapling');
    expect(quests.length).toBe(5);
    const ids = quests.map(q => q.id);
    expect(ids).toContain('genesis');
    expect(ids).toContain('kitchen');
    expect(ids).toContain('posner');
    expect(ids).toContain('the_forge');
    expect(ids).toContain('the_lab');
  });
});

describe('getCurrentStep', () => {
  it('returns first step for fresh progress', () => {
    const progress: QuestProgress = {
      questId: 'genesis',
      completedSteps: 0,
      completed: false,
      completedAt: null,
    };
    const step = getCurrentStep(GENESIS_QUEST, progress);
    expect(step).toEqual(GENESIS_QUEST.steps[0]);
  });

  it('returns null for completed quest', () => {
    const progress: QuestProgress = {
      questId: 'genesis',
      completedSteps: 4,
      completed: true,
      completedAt: '2026-02-27T00:00:00Z',
    };
    const step = getCurrentStep(GENESIS_QUEST, progress);
    expect(step).toBeNull();
  });

  it('returns correct step mid-quest', () => {
    const progress: QuestProgress = {
      questId: 'genesis',
      completedSteps: 2,
      completed: false,
      completedAt: null,
    };
    const step = getCurrentStep(GENESIS_QUEST, progress);
    expect(step).toEqual(GENESIS_QUEST.steps[2]);
  });
});

describe('checkQuestProgress', () => {
  it('advances step when formula matches current target', () => {
    const progressMap = {
      genesis: {
        questId: 'genesis',
        completedSteps: 0,
        completed: false,
        completedAt: null,
      } as QuestProgress,
    };

    const result = checkQuestProgress('H\u2082', [GENESIS_QUEST], progressMap);

    expect(result.updatedProgress.genesis!.completedSteps).toBe(1);
    expect(result.newlyCompleted).toEqual([]);
  });

  it('does not advance when formula matches future step (order enforced)', () => {
    const progressMap = {
      genesis: {
        questId: 'genesis',
        completedSteps: 0,
        completed: false,
        completedAt: null,
      } as QuestProgress,
    };

    const result = checkQuestProgress('H\u2082O', [GENESIS_QUEST], progressMap);

    expect(result.updatedProgress.genesis!.completedSteps).toBe(0);
    expect(result.newlyCompleted).toEqual([]);
  });

  it('does not advance when formula matches past step', () => {
    const progressMap = {
      genesis: {
        questId: 'genesis',
        completedSteps: 1,
        completed: false,
        completedAt: null,
      } as QuestProgress,
    };

    const result = checkQuestProgress('H\u2082', [GENESIS_QUEST], progressMap);

    expect(result.updatedProgress.genesis!.completedSteps).toBe(1);
    expect(result.newlyCompleted).toEqual([]);
  });

  it('marks quest complete when last step finished', () => {
    const progressMap = {
      genesis: {
        questId: 'genesis',
        completedSteps: 3,
        completed: false,
        completedAt: null,
      } as QuestProgress,
    };

    const result = checkQuestProgress('H\u2082O\u2082', [GENESIS_QUEST], progressMap);

    expect(result.updatedProgress.genesis!.completed).toBe(true);
    expect(result.updatedProgress.genesis!.completedSteps).toBe(4);
    expect(result.newlyCompleted).toEqual(['genesis']);
  });

  it('advances multiple quests simultaneously', () => {
    const progressMap = {
      genesis: {
        questId: 'genesis',
        completedSteps: 2,
        completed: false,
        completedAt: null,
      } as QuestProgress,
      kitchen: {
        questId: 'kitchen',
        completedSteps: 0,
        completed: false,
        completedAt: null,
      } as QuestProgress,
    };

    const result = checkQuestProgress('H\u2082O', [GENESIS_QUEST, KITCHEN_QUEST], progressMap);

    expect(result.updatedProgress.genesis!.completedSteps).toBe(3);
    expect(result.updatedProgress.kitchen!.completedSteps).toBe(1);
    expect(result.newlyCompleted).toEqual([]);
  });

  it('no-ops when formula matches nothing', () => {
    const progressMap = {
      genesis: {
        questId: 'genesis',
        completedSteps: 0,
        completed: false,
        completedAt: null,
      } as QuestProgress,
    };

    const result = checkQuestProgress('XYZ', [GENESIS_QUEST], progressMap);

    expect(result.updatedProgress.genesis!.completedSteps).toBe(0);
    expect(result.newlyCompleted).toEqual([]);
  });
});

describe('initializeProgress', () => {
  it('creates progress for each quest at step 0', () => {
    const quests = [GENESIS_QUEST, KITCHEN_QUEST];
    const progress = initializeProgress(quests);

    expect(Object.keys(progress)).toHaveLength(2);
    expect(progress.genesis!.completedSteps).toBe(0);
    expect(progress.genesis!.completed).toBe(false);
    expect(progress.kitchen!.completedSteps).toBe(0);
  });
});

describe('getQuestPercent', () => {
  it('returns 0 for fresh quest', () => {
    const progress: QuestProgress = {
      questId: 'genesis',
      completedSteps: 0,
      completed: false,
      completedAt: null,
    };
    expect(getQuestPercent(GENESIS_QUEST, progress)).toBe(0);
  });

  it('returns 100 for completed quest', () => {
    const progress: QuestProgress = {
      questId: 'genesis',
      completedSteps: 4,
      completed: true,
      completedAt: '2026-02-27T00:00:00Z',
    };
    expect(getQuestPercent(GENESIS_QUEST, progress)).toBe(100);
  });

  it('returns correct percentage mid-quest', () => {
    const progress: QuestProgress = {
      questId: 'genesis',
      completedSteps: 2,
      completed: false,
      completedAt: null,
    };
    expect(getQuestPercent(GENESIS_QUEST, progress)).toBe(50);
  });
});
