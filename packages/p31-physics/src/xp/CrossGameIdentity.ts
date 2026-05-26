/**
 * Cross-Game Identity & XP System
 * P31 Arcade - Shared progression layer
 */

import { XPEvent, Achievement } from '../types/physics';

export interface CrossGameProfile {
  id: string;
  displayName: string;
  totalXP: number;
  gamesPlayed: string[];
  achievements: Achievement[];
  lastPlayed: string;
}

export interface XPNotification {
  amount: number;
  source: string;
  timestamp: number;
  message?: string;
}

export class CrossGameIdentity {
  private static STORAGE_KEY = 'p31-arcade-identity';
  private static XP_HISTORY_KEY = 'p31-arcade-xp-history';

  private profile: CrossGameProfile;
  private xpHistory: XPEvent[];
  private listeners: Set<(event: XPNotification) => void> = new Set();

  constructor() {
    this.profile = this.loadProfile();
    this.xpHistory = this.loadXPHistory();
    this.setupEventListener();
  }

  private loadProfile(): CrossGameProfile {
    if (typeof window === 'undefined') {
      return this.createDefaultProfile();
    }

    try {
      const stored = localStorage.getItem(CrossGameIdentity.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load profile:', e);
    }

    return this.createDefaultProfile();
  }

  private createDefaultProfile(): CrossGameProfile {
    return {
      id: crypto.randomUUID(),
      displayName: 'Player',
      totalXP: 0,
      gamesPlayed: [],
      achievements: [],
      lastPlayed: new Date().toISOString(),
    };
  }

  private loadXPHistory(): XPEvent[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(CrossGameIdentity.XP_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveProfile(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CrossGameIdentity.STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('Failed to save profile:', e);
    }
  }

  private saveXPHistory(): void {
    if (typeof window === 'undefined') return;

    try {
      // Only keep last 100 events
      const trimmed = this.xpHistory.slice(-100);
      localStorage.setItem(CrossGameIdentity.XP_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save XP history:', e);
    }
  }

  private setupEventListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('p31-xp-update', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.xp && detail.source) {
        this.addXP({
          amount: detail.xp,
          source: detail.source,
          metadata: detail.metadata,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  public addXP(event: XPEvent): { newTotal: number; leveledUp: boolean } {
    // Record event
    this.xpHistory.push(event);
    this.saveXPHistory();

    // Update profile
    const previousXP = this.profile.totalXP;
    this.profile.totalXP += event.amount;
    this.profile.lastPlayed = new Date().toISOString();

    // Track games played
    if (!this.profile.gamesPlayed.includes(event.source)) {
      this.profile.gamesPlayed.push(event.source);
    }

    this.saveProfile();

    // Notify listeners
    this.listeners.forEach(listener => {
      listener({
        amount: event.amount,
        source: event.source,
        timestamp: Date.now(),
        message: `+${event.amount} XP from ${event.source}`,
      });
    });

    // Check for level up (every 500 XP)
    const previousLevel = Math.floor(previousXP / 500);
    const currentLevel = Math.floor(this.profile.totalXP / 500);

    return {
      newTotal: this.profile.totalXP,
      leveledUp: currentLevel > previousLevel,
    };
  }

  public unlockAchievement(achievement: Omit<Achievement, 'unlockedAt'>): boolean {
    const exists = this.profile.achievements.find(a => a.id === achievement.id);
    if (exists) return false;

    const fullAchievement: Achievement = {
      ...achievement,
      unlockedAt: new Date().toISOString(),
    };

    this.profile.achievements.push(fullAchievement);
    this.saveProfile();

    // Notify listeners
    this.listeners.forEach(listener => {
      listener({
        amount: 0,
        source: 'achievement',
        timestamp: Date.now(),
        message: `Achievement unlocked: ${achievement.name}!`,
      });
    });

    return true;
  }

  public getProfile(): CrossGameProfile {
    return { ...this.profile };
  }

  public getXPHistory(limit = 50): XPEvent[] {
    return this.xpHistory.slice(-limit);
  }

  public getLeaderboardPosition(): number {
    // In production: Query server for global ranking
    // For now: Return random position based on XP
    return Math.max(1, 10000 - this.profile.totalXP);
  }

  public onXP(listener: (event: XPNotification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getStats(): {
    totalXP: number;
    gamesPlayed: number;
    achievements: number;
    playTime: string;
  } {
    return {
      totalXP: this.profile.totalXP,
      gamesPlayed: this.profile.gamesPlayed.length,
      achievements: this.profile.achievements.length,
      playTime: 'Coming soon',
    };
  }

  public export(): string {
    return JSON.stringify({
      profile: this.profile,
      xpHistory: this.xpHistory,
      exportDate: new Date().toISOString(),
    });
  }

  public import(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.profile && parsed.xpHistory) {
        this.profile = parsed.profile;
        this.xpHistory = parsed.xpHistory;
        this.saveProfile();
        this.saveXPHistory();
        return true;
      }
    } catch (e) {
      console.error('Failed to import data:', e);
    }
    return false;
  }
}

// Singleton instance
let identityInstance: CrossGameIdentity | null = null;

export function getCrossGameIdentity(): CrossGameIdentity {
  if (!identityInstance) {
    identityInstance = new CrossGameIdentity();
  }
  return identityInstance;
}

export function resetCrossGameIdentity(): void {
  identityInstance = null;
}

export default CrossGameIdentity;
