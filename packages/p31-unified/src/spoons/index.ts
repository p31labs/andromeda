// Global Spoon State Manager
// Manages spoon economy across all games

import type {
  SpoonState,
  SpoonBudget,
  GameId,
  GameRecommendation,
  GAME_MODES,
  ZEN_MODES,
} from '../types.js';

export class GlobalSpoonManager {
  private storage: Storage;
  private state: SpoonState | null = null;

  constructor(storage?: Storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      length: 0,
      clear: () => {},
      key: () => null,
    } as unknown as Storage);
  }

  loadState(): SpoonState | null {
    const data = this.storage.getItem('p31-spoon-state');
    if (data) {
      this.state = JSON.parse(data);
      this.checkAndResetDailyBudget();
      return this.state;
    }
    return null;
  }

  initialize(budget: SpoonBudget = 6): SpoonState {
    this.state = {
      dailyBudget: budget,
      usedToday: 0,
      lastReset: new Date().toISOString(),
      recoveryRate: {
        passive: 0.5,
        active: 0.25,
        sleep: 2.0,
      },
      current: budget,
    };
    this.saveState();
    return this.state;
  }

  private saveState(): void {
    if (!this.state) return;
    this.storage.setItem('p31-spoon-state', JSON.stringify(this.state));
  }

  private checkAndResetDailyBudget(): void {
    if (!this.state) return;

    const lastReset = new Date(this.state.lastReset);
    const now = new Date();
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      // Reset for new day
      this.state.usedToday = 0;
      this.state.current = this.state.dailyBudget;
      this.state.lastReset = now.toISOString();
      this.saveState();
    } else {
      // Calculate recovery
      this.calculateRecovery();
    }
  }

  private calculateRecovery(): void {
    if (!this.state) return;

    // Simplified recovery calculation
    const maxSpoons = this.state.dailyBudget;
    const targetSpoons = Math.min(
      maxSpoons,
      maxSpoons - this.state.usedToday + this.calculatePassiveRecovery()
    );

    this.state.current = Math.floor(targetSpoons);
  }

  private calculatePassiveRecovery(): number {
    if (!this.state) return 0;
    const lastReset = new Date(this.state.lastReset);
    const hoursSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60);
    return hoursSinceReset * this.state.recoveryRate.passive;
  }

  getRemainingSpoons(): number {
    this.checkAndResetDailyBudget();
    return this.state?.current || 0;
  }

  canAfford(spoonCost: number): boolean {
    return this.getRemainingSpoons() >= spoonCost;
  }

  spendSpoons(amount: number, gameId: GameId, mode: string): boolean {
    if (!this.canAfford(amount)) {
      return false;
    }

    if (!this.state) {
      this.initialize();
    }

    this.state!.usedToday += amount;
    this.state!.current -= amount;

    // Track spend
    const spendLog = JSON.parse(this.storage.getItem('p31-spoon-log') || '[]');
    spendLog.push({
      timestamp: new Date().toISOString(),
      amount,
      gameId,
      mode,
      remaining: this.state!.current,
    });
    this.storage.setItem('p31-spoon-log', JSON.stringify(spendLog.slice(-50))); // Keep last 50

    this.saveState();
    return true;
  }

  setBudget(budget: SpoonBudget): void {
    if (!this.state) {
      this.initialize(budget);
      return;
    }

    this.state.dailyBudget = budget;
    // Reset if increasing budget gives more spoons
    if (budget > this.state.dailyBudget) {
      const diff = budget - this.state.dailyBudget;
      this.state.current = Math.min(budget, this.state.current + diff);
    }
    this.saveState();
  }

  getBudget(): number {
    return this.state?.dailyBudget || 6;
  }

  // Get games the player can afford
  getAffordableModes(): GameModeWithSpoonCost[] {
    const remaining = this.getRemainingSpoons();

    // Import game modes dynamically to avoid circular dependency
    const modes: GameModeWithSpoonCost[] = [
      // Sports
      { gameId: 'smallball', mode: 'training', spoonCost: 1, skillTrack: 'athletics', description: 'Pitch training practice' },
      { gameId: 'smallball', mode: 'game', spoonCost: 2, skillTrack: 'athletics', description: 'Full baseball game' },
      { gameId: 'gridiron', mode: 'play', spoonCost: 2, skillTrack: 'athletics', description: 'Quick football play' },
      { gameId: 'gridiron', mode: 'training', spoonCost: 1, skillTrack: 'athletics', description: 'QB training drills' },
      { gameId: 'gridiron', mode: 'match', spoonCost: 4, skillTrack: 'athletics', description: 'Full football match' },
      // Strategy
      { gameId: 'strategy', mode: 'chess-rapid', spoonCost: 2, skillTrack: 'strategy', description: 'Rapid chess (10 min)' },
      { gameId: 'strategy', mode: 'chess-blitz', spoonCost: 1, skillTrack: 'strategy', description: 'Blitz chess (3 min)' },
      { gameId: 'strategy', mode: 'chess-classical', spoonCost: 4, skillTrack: 'strategy', description: 'Classical chess (30 min)' },
      { gameId: 'strategy', mode: 'checkers-casual', spoonCost: 1, skillTrack: 'tactics', description: 'Casual checkers' },
      { gameId: 'strategy', mode: 'checkers-rated', spoonCost: 2, skillTrack: 'tactics', description: 'Rated checkers' },
      { gameId: 'strategy', mode: 'othello-casual', spoonCost: 1, skillTrack: 'tactics', description: 'Casual othello' },
      { gameId: 'strategy', mode: 'othello-rated', spoonCost: 2, skillTrack: 'tactics', description: 'Rated othello' },
      // Cards
      { gameId: 'cards', mode: 'crazy-eights', spoonCost: 1, skillTrack: 'tactics', description: 'Crazy Eights' },
      { gameId: 'cards', mode: 'hearts', spoonCost: 2, skillTrack: 'tactics', description: 'Hearts' },
      { gameId: 'cards', mode: 'euchre', spoonCost: 2, skillTrack: 'tactics', description: 'Euchre' },
      { gameId: 'cards', mode: 'bridge-lite', spoonCost: 3, skillTrack: 'strategy', description: 'Bridge Lite' },
      // Physics (ZEN MODES FREE!)
      { gameId: 'liquid-sculptor', mode: 'zen', spoonCost: 0, skillTrack: 'creativity', description: 'Fluid sculpting zen mode' },
      { gameId: 'liquid-sculptor', mode: 'challenge', spoonCost: 1, skillTrack: 'precision', description: 'Timed fluid challenges' },
      { gameId: 'liquid-sculptor', mode: 'create', spoonCost: 2, skillTrack: 'creativity', description: 'Create and save sculptures' },
      { gameId: 'resonance-rings', mode: 'free', spoonCost: 0, skillTrack: 'intuition', description: 'Free wave exploration' },
      { gameId: 'resonance-rings', mode: 'matcher', spoonCost: 1, skillTrack: 'intuition', description: 'Harmonic matching' },
      { gameId: 'resonance-rings', mode: 'theremin', spoonCost: 1, skillTrack: 'creativity', description: 'Play the wave theremin' },
      { gameId: 'magnetic-poetry', mode: 'sandbox', spoonCost: 0, skillTrack: 'creativity', description: 'Word sandbox' },
      { gameId: 'magnetic-poetry', mode: 'haiku', spoonCost: 1, skillTrack: 'creativity', description: 'Haiku composition' },
      { gameId: 'magnetic-poetry', mode: 'epic', spoonCost: 3, skillTrack: 'creativity', description: 'Epic poetry challenge' },
      { gameId: 'orbital-drift', mode: 'sandbox', spoonCost: 0, skillTrack: 'intuition', description: 'Gravity sandbox' },
      { gameId: 'orbital-drift', mode: 'level', spoonCost: 2, skillTrack: 'precision', description: 'Trajectory challenges' },
      { gameId: 'orbital-drift', mode: 'expert', spoonCost: 4, skillTrack: 'precision', description: 'Expert orbital puzzles' },
    ];

    return modes.filter(m => m.spoonCost <= remaining);
  }

  // Get recommendations based on spoon budget
  getRecommendations(skillTracks?: Record<string, number>): GameRecommendation[] {
    const remaining = this.getRemainingSpoons();
    const affordable = this.getAffordableModes();

    // Score each mode based on:
    // 1. Spoon efficiency (lower cost = higher score when low spoons)
    // 2. Skill track alignment (boost if player has high skills)
    // 3. Variety bonus (don't recommend same game twice)

    const scored = affordable.map(mode => {
      let score = 0;

      // Efficiency: zen modes get bonus when low spoons
      if (mode.spoonCost === 0 && remaining <= 2) {
        score += 50;
      }

      // Skill alignment
      if (skillTracks && skillTracks[mode.skillTrack] > 10) {
        score += skillTracks[mode.skillTrack] * 2;
      }

      // Value per spoon
      if (mode.spoonCost > 0) {
        score += (10 / mode.spoonCost) * remaining;
      }

      return {
        gameId: mode.gameId,
        mode: mode.mode,
        spoonCost: mode.spoonCost,
        reason: mode.spoonCost === 0
          ? `Free zen mode - no spoons needed!`
          : `Good value for ${mode.spoonCost} spoon${mode.spoonCost === 1 ? '' : 's'}`,
        boostAmount: 0,
      };
    });

    return scored.sort((a, b) => b.boostAmount - a.boostAmount).slice(0, 5);
  }

  getZenModes(): GameModeWithSpoonCost[] {
    return this.getAffordableModes().filter(m => m.spoonCost === 0);
  }

  // Check if in "spoon deficit" (1 or fewer spoons remaining)
  isSpoonDeficit(): boolean {
    return this.getRemainingSpoons() <= 1;
  }

  // Get spoon-friendly description
  getSpoonStatus(): { level: 'full' | 'good' | 'low' | 'critical'; emoji: string; message: string } {
    const remaining = this.getRemainingSpoons();
    const budget = this.getBudget();

    if (remaining >= budget * 0.8) {
      return { level: 'full', emoji: '🟢', message: 'Full energy! Go play anything.' };
    } else if (remaining >= budget * 0.5) {
      return { level: 'good', emoji: '🔵', message: 'Good energy. Choose wisely.' };
    } else if (remaining >= 2) {
      return { level: 'low', emoji: '🟡', message: 'Getting tired. Zen modes recommended.' };
    } else {
      return { level: 'critical', emoji: '🔴', message: 'Spoon deficit. Free zen modes only.' };
    }
  }
}

interface GameModeWithSpoonCost {
  gameId: GameId;
  mode: string;
  spoonCost: number;
  skillTrack: string;
  description: string;
}

export * from '../types.js';
