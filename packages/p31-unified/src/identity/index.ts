// Unified Identity System
// Manages cross-game player identity, XP, and progression

import type {
  UnifiedPlayer,
  GameId,
  GameProgress,
  Achievement,
  XPBreakdown,
  SkillTrack,
} from '../types.js';

export class UnifiedIdentityManager {
  private storage: Storage;
  private player: UnifiedPlayer | null = null;

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

  async loadPlayer(playerId?: string): Promise<UnifiedPlayer | null> {
    const id = playerId || this.storage.getItem('p31-player-id');
    if (!id) {
      // Create new player
      return this.createNewPlayer();
    }

    const data = this.storage.getItem(`p31-player-${id}`);
    if (data) {
      this.player = JSON.parse(data);
      return this.player;
    }

    return this.createNewPlayer();
  }

  private createNewPlayer(): UnifiedPlayer {
    const id = crypto.randomUUID();
    const player: UnifiedPlayer = {
      id,
      displayName: `Player_${id.slice(0, 4)}`,
      avatar: {
        id: 'default',
        name: 'Default Avatar',
        icon: '🎮',
        color: '#3b82f6',
        level: 1,
      },
      globalLevel: 1,
      totalXP: 0,
      skillTracks: {
        athletics: 0,
        strategy: 0,
        creativity: 0,
        precision: 0,
        tactics: 0,
        intuition: 0,
      },
      games: {
        smallball: this.createEmptyProgress(),
        gridiron: this.createEmptyProgress(),
        cards: this.createEmptyProgress(),
        strategy: this.createEmptyProgress(),
        'liquid-sculptor': this.createEmptyProgress(),
        'resonance-rings': this.createEmptyProgress(),
        'magnetic-poetry': this.createEmptyProgress(),
        'orbital-drift': this.createEmptyProgress(),
      },
      achievements: [],
      lastPlayed: {},
      totalPlayTime: 0,
      spoonState: {
        dailyBudget: 6,
        usedToday: 0,
        lastReset: new Date().toISOString(),
        recoveryRate: {
          passive: 0.5,
          active: 0.25,
          sleep: 2.0,
        },
        current: 6,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.player = player;
    this.savePlayer();
    return player;
  }

  private createEmptyProgress(): GameProgress {
    return {
      level: 1,
      xp: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      achievements: [],
      lastPlayed: '',
      streak: 0,
    };
  }

  savePlayer(): void {
    if (!this.player) return;
    this.player.updatedAt = new Date().toISOString();
    this.storage.setItem('p31-player-id', this.player.id);
    this.storage.setItem(`p31-player-${this.player.id}`, JSON.stringify(this.player));
  }

  updateGameProgress(gameId: GameId, updates: Partial<GameProgress>): void {
    if (!this.player) return;

    const progress = this.player.games[gameId];
    Object.assign(progress, updates);
    progress.lastPlayed = new Date().toISOString();

    // Recalculate global level
    this.recalculateGlobalLevel();
    this.savePlayer();
  }

  addXP(gameId: GameId, xpBreakdown: XPBreakdown): void {
    if (!this.player) return;

    const progress = this.player.games[gameId];
    progress.xp += xpBreakdown.totalXP;
    this.player.totalXP += xpBreakdown.totalXP;

    // Check for level up
    const newLevel = Math.floor(Math.log2(progress.xp / 100 + 1)) + 1;
    if (newLevel > progress.level) {
      progress.level = newLevel;
    }

    this.recalculateGlobalLevel();
    this.savePlayer();
  }

  private recalculateGlobalLevel(): void {
    if (!this.player) return;

    const gameLevels = Object.values(this.player.games).map(g => g.level);
    const avgLevel = gameLevels.reduce((a, b) => a + b, 0) / gameLevels.length;
    this.player.globalLevel = Math.floor(avgLevel * 0.8 + Math.log2(this.player.totalXP / 1000 + 1));

    // Update skill tracks
    this.recalculateSkillTracks();
  }

  private recalculateSkillTracks(): void {
    if (!this.player) return;

    const games = this.player.games;

    // Athletics: weighted average of sports games
    this.player.skillTracks.athletics = Math.floor(
      (games.smallball.xp * 0.6 + games.gridiron.xp * 0.4) / 100
    );

    // Strategy: weighted average of strategy games
    this.player.skillTracks.strategy = Math.floor(
      (games.strategy.xp * 0.7 + games.gridiron.xp * 0.3) / 100
    );

    // Creativity: physics games
    this.player.skillTracks.creativity = Math.floor(
      (games['liquid-sculptor'].xp + games['magnetic-poetry'].xp + games['resonance-rings'].xp) / 150
    );

    // Precision: precision-focused games
    this.player.skillTracks.precision = Math.floor(
      (games['orbital-drift'].xp * 0.5 + games['liquid-sculptor'].xp * 0.3 + games.gridiron.xp * 0.2) / 100
    );

    // Tactics: card and board games
    this.player.skillTracks.tactics = Math.floor(
      (games.cards.xp + games.strategy.xp * 0.5) / 100
    );

    // Intuition: pattern recognition games
    this.player.skillTracks.intuition = Math.floor(
      (games['resonance-rings'].xp + games['orbital-drift'].xp * 0.5) / 100
    );
  }

  unlockAchievement(achievement: Achievement): boolean {
    if (!this.player) return false;

    const exists = this.player.achievements.some(a => a.id === achievement.id);
    if (exists) return false;

    this.player.achievements.push(achievement);
    this.player.totalXP += achievement.xpBonus;
    this.savePlayer();
    return true;
  }

  getPlayer(): UnifiedPlayer | null {
    return this.player;
  }

  // Cross-game session tracking
  startGameSession(gameId: GameId): void {
    if (!this.player) return;

    const sessionStart = Date.now();
    this.storage.setItem(`p31-session-${gameId}`, JSON.stringify({
      startTime: sessionStart,
      gameId,
    }));
  }

  endGameSession(gameId: GameId, result: 'win' | 'loss' | 'draw'): void {
    if (!this.player) return;

    const sessionData = this.storage.getItem(`p31-session-${gameId}`);
    if (!sessionData) return;

    const session = JSON.parse(sessionData);
    const duration = Math.floor((Date.now() - session.startTime) / 60000); // minutes

    const progress = this.player.games[gameId];
    progress.gamesPlayed++;
    this.player.totalPlayTime += duration;

    if (result === 'win') {
      progress.wins++;
      progress.streak++;
    } else if (result === 'loss') {
      progress.losses++;
      progress.streak = 0;
    }

    this.player.lastPlayed[gameId] = new Date().toISOString();

    this.storage.removeItem(`p31-session-${gameId}`);
    this.savePlayer();
  }
}

export * from '../types.js';
