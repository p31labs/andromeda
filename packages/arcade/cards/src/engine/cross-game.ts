// P31 Card Table: Cross-Game Identity Integration
// Unified progression with Smallball and Gridiron

import type {
  CrossGameIdentity,
  CrossGameAchievement,
  MatchState,
  XPAwardResult,
} from '../types';
import { XP_FORMULA, CARD_ACHIEVEMENTS } from '../types';
import { scoreGame, calculateMatchXP, checkAchievements as checkCardAchievements, GameScoreResult } from './scoring';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'p31_cross_game_identity';
const CARD_GAME_ID = 'cards';
const SMALLBALL_GAME_ID = 'smallball';
const GRIDIRON_GAME_ID = 'gridiron';

// ============================================
// IDENTITY MANAGEMENT
// ============================================

export function getLocalIdentity(): CrossGameIdentity | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function saveLocalIdentity(identity: CrossGameIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Ignore storage errors
  }
}

export function createNewIdentity(playerId: string): CrossGameIdentity {
  const avatarColors = generateAvatarColors(playerId);
  
  return {
    playerId,
    globalLevel: 1,
    totalXP: 0,
    gamesPlayed: {
      smallball: 0,
      gridiron: 0,
      cards: 0,
    },
    achievements: [
      ...CARD_ACHIEVEMENTS.map(a => ({
        ...a,
        unlockedAt: null,
        progress: 0,
      })),
      // Include base cross-game achievements
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Play your first game in any sport',
        rarity: 'common' as const,
        unlockedAt: null,
        progress: 0,
        required: 1,
      },
      {
        id: 'dual_threat',
        name: 'Dual Threat',
        description: 'Win 10 games across all P31 games',
        rarity: 'rare' as const,
        unlockedAt: null,
        progress: 0,
        required: 10,
      },
      {
        id: 'master_athlete',
        name: 'Master Athlete',
        description: 'Achieve 100% completion across all games',
        rarity: 'legendary' as const,
        unlockedAt: null,
        progress: 0,
        required: 100,
      },
    ],
    avatar: {
      primaryColor: avatarColors.primary,
      secondaryColor: avatarColors.secondary,
      pattern: ['stripes', 'solid', 'checkered', 'gradient'][Math.floor(Math.random() * 4)],
    },
    cardUnlocks: {
      cardBacks: ['default'],
      tableThemes: ['classic-wood'],
      avatars: ['default'],
    },
    lastSyncedAt: new Date().toISOString(),
  };
}

function generateAvatarColors(playerId: string): { primary: string; secondary: string } {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i);
    hash = hash & hash;
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 180) % 360;

  return {
    primary: `hsl(${hue1}, 70%, 50%)`,
    secondary: `hsl(${hue2}, 70%, 50%)`,
  };
}

// ============================================
// XP & LEVELING
// ============================================

export function addXP(
  identity: CrossGameIdentity,
  xpAmount: number,
  gameId: typeof CARD_GAME_ID | typeof SMALLBALL_GAME_ID | typeof GRIDIRON_GAME_ID
): XPAwardResult {
  const previousLevel = identity.globalLevel;
  const newTotalXP = identity.totalXP + xpAmount;
  const newLevel = XP_FORMULA.xpToLevel(newTotalXP);

  // Update games played
  const gamesPlayed = {
    ...identity.gamesPlayed,
    [gameId]: identity.gamesPlayed[gameId as keyof typeof identity.gamesPlayed] + 1,
  };

  // Check achievements
  const updatedAchievements = checkBaseAchievements(
    identity,
    newTotalXP,
    gamesPlayed,
    identity.achievements
  );
  
  const newlyUnlocked = updatedAchievements.filter(a =>
    a.unlockedAt && !identity.achievements.find(oa => oa.id === a.id)?.unlockedAt
  );

  return {
    xpGained: xpAmount,
    leveledUp: newLevel > previousLevel,
    newLevel,
    previousLevel,
    achievementsUnlocked: newlyUnlocked,
  };
}

function checkBaseAchievements(
  identity: CrossGameIdentity,
  totalXP: number,
  gamesPlayed: { smallball: number; gridiron: number; cards: number },
  currentAchievements: CrossGameAchievement[]
): CrossGameAchievement[] {
  const totalGames = gamesPlayed.smallball + gamesPlayed.gridiron + gamesPlayed.cards;
  
  return currentAchievements.map(achievement => {
    let progress = achievement.progress;
    let unlockedAt = achievement.unlockedAt;

    switch (achievement.id) {
      case 'first_steps':
        progress = Math.min(100, totalGames * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'dual_threat':
        const totalWins = Math.floor(totalGames / 3);  // Approximate
        progress = Math.min(100, (totalWins / 10) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'master_athlete':
        const avgProgress = (totalGames / 3) / 100;
        progress = Math.min(100, avgProgress * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
    }

    return {
      ...achievement,
      progress,
      unlockedAt,
    };
  });
}

// ============================================
// MATCH PROCESSING
// ============================================

export interface ProcessedMatchResult {
  identity: CrossGameIdentity;
  xpAward: XPAwardResult;
  scoreResult: GameScoreResult;
  totalXPEarned: number;
}

export function processMatchResult(
  identity: CrossGameIdentity,
  matchState: MatchState,
  gameHistory: { gameId: string; won: boolean }[]
): ProcessedMatchResult {
  // Score the game
  const scoreResult = scoreGame(matchState);
  
  // Calculate XP
  const xpPerPlayer = calculateMatchXP(matchState, scoreResult.winner, scoreResult.specialEvents);
  const playerXP = xpPerPlayer.player || 0;
  
  // Update identity
  const xpAward = addXP(identity, playerXP, CARD_GAME_ID);
  
  // Check card-specific achievements
  const updatedAchievements = checkCardGameAchievements(
    identity,
    matchState,
    scoreResult,
    gameHistory
  );
  
  const newlyUnlocked = updatedAchievements.filter(a =>
    a.unlockedAt && !identity.achievements.find(oa => oa.id === a.id)?.unlockedAt
  );
  
  xpAward.achievementsUnlocked.push(...newlyUnlocked);
  
  // Build updated identity
  const updatedIdentity: CrossGameIdentity = {
    ...identity,
    globalLevel: xpAward.newLevel,
    totalXP: identity.totalXP + playerXP,
    gamesPlayed: {
      ...identity.gamesPlayed,
      cards: identity.gamesPlayed.cards + 1,
    },
    achievements: updatedAchievements,
    cardUnlocks: checkUnlocks(identity.cardUnlocks, xpAward.newLevel, updatedAchievements),
    lastSyncedAt: new Date().toISOString(),
  };
  
  // Check for new unlocks
  const newUnlocks = checkUnlocks(identity.cardUnlocks, xpAward.newLevel, identity.achievements);
  updatedIdentity.cardUnlocks = newUnlocks;
  
  // Persist locally
  saveLocalIdentity(updatedIdentity);
  
  return {
    identity: updatedIdentity,
    xpAward,
    scoreResult,
    totalXPEarned: playerXP,
  };
}

function checkCardGameAchievements(
  identity: CrossGameIdentity,
  matchState: MatchState,
  scoreResult: GameScoreResult,
  gameHistory: { gameId: string; won: boolean }[]
): CrossGameAchievement[] {
  return checkAchievementsInternal(
    identity.achievements,
    matchState,
    scoreResult,
    gameHistory
  );
}

function checkAchievementsInternal(
  achievements: CrossGameAchievement[],
  matchState: MatchState,
  scoreResult: GameScoreResult,
  gameHistory: { gameId: string; won: boolean }[]
): CrossGameAchievement[] {
  return achievements.map(achievement => {
    let progress = achievement.progress;
    let unlockedAt = achievement.unlockedAt;

    switch (achievement.id) {
      case 'card_shark':
        const cardWins = gameHistory.filter(g => g.gameId.startsWith('card') && g.won).length;
        progress = Math.min(100, (cardWins / 10) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'grand_slam':
        const hasMarch = scoreResult.specialEvents.some(e => 
          e.type === 'euchre-march' && e.playerId === 'player'
        );
        if (hasMarch && !unlockedAt) {
          progress = 100;
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'heart_breaker':
        const hasShotMoon = scoreResult.specialEvents.some(e => 
          e.type === 'shoot-the-moon' && e.playerId === 'player'
        );
        if (hasShotMoon && !unlockedAt) {
          progress = 100;
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'bridge_builder':
        const bridgeWins = gameHistory.filter(g => g.gameId === 'bridge-lite' && g.won).length;
        progress = Math.min(100, (bridgeWins / 5) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'table_master':
        const gameIdsWon = new Set(gameHistory.filter(g => g.won).map(g => g.gameId));
        const uniqueWins = gameIdsWon.size;
        progress = Math.min(100, (uniqueWins / 4) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'crazy_eights_champion':
        const crazyEightsWins = gameHistory.filter(g => g.gameId === 'crazy-eights' && g.won).length;
        progress = Math.min(100, (crazyEightsWins / 20) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'euchre_expert':
        const euchreWins = gameHistory.filter(g => g.gameId === 'euchre' && g.won).length;
        progress = Math.min(100, (euchreWins / 15) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
    }

    return {
      ...achievement,
      progress,
      unlockedAt,
    };
  });
}

// ============================================
// UNLOCKS
// ============================================

function checkUnlocks(
  currentUnlocks: { cardBacks: string[]; tableThemes: string[]; avatars: string[] },
  level: number,
  achievements: CrossGameAchievement[]
): { cardBacks: string[]; tableThemes: string[]; avatars: string[] } {
  const unlocks = { ...currentUnlocks };
  
  // Level-based card backs
  if (level >= 5 && !unlocks.cardBacks.includes('gold-accent')) {
    unlocks.cardBacks = [...unlocks.cardBacks, 'gold-accent'];
  }
  if (level >= 10 && !unlocks.cardBacks.includes('platinum')) {
    unlocks.cardBacks = [...unlocks.cardBacks, 'platinum'];
  }
  if (level >= 20 && !unlocks.cardBacks.includes('cosmic')) {
    unlocks.cardBacks = [...unlocks.cardBacks, 'cosmic'];
  }
  
  // Achievement-based table themes
  const hasTableMaster = achievements.some(a => a.id === 'table_master' && a.unlockedAt);
  if (hasTableMaster && !unlocks.tableThemes.includes('master-table')) {
    unlocks.tableThemes = [...unlocks.tableThemes, 'master-table'];
  }
  
  const hasHeartBreaker = achievements.some(a => a.id === 'heart_breaker' && a.unlockedAt);
  if (hasHeartBreaker && !unlocks.tableThemes.includes('hearts-red')) {
    unlocks.tableThemes = [...unlocks.tableThemes, 'hearts-red'];
  }
  
  return unlocks;
}

// ============================================
// SYNC WITH REMOTE
// ============================================

export async function syncWithRemote(
  identity: CrossGameIdentity,
  apiEndpoint: string
): Promise<{ success: boolean; remoteIdentity?: CrossGameIdentity; error?: string }> {
  try {
    const response = await fetch(`${apiEndpoint}/api/identity/${identity.playerId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const data = await response.json();

    // Merge remote and local (highest XP wins)
    if (data.identity && data.identity.totalXP > identity.totalXP) {
      saveLocalIdentity(data.identity);
      return { success: true, remoteIdentity: data.identity };
    }

    return { success: true };
  } catch (error) {
    console.error('Cross-game sync failed:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

export function getLevelProgress(identity: CrossGameIdentity): {
  current: number;
  next: number;
  percentage: number;
} {
  const currentLevelXP = XP_FORMULA.levelToXP(identity.globalLevel);
  const nextLevelXP = XP_FORMULA.levelToXP(identity.globalLevel + 1);
  const progress = identity.totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;

  return {
    current: progress,
    next: needed,
    percentage: Math.min(100, Math.round((progress / needed) * 100)),
  };
}

export function getRarityColor(rarity: CrossGameAchievement['rarity']): string {
  const colors: Record<string, string> = {
    common: '#9e9e9e',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800',
  };
  return colors[rarity] || colors.common;
}

export interface LeaderboardEntry {
  playerId: string;
  globalLevel: number;
  totalXP: number;
  avatar: CrossGameIdentity['avatar'];
  achievements: number;
}

export async function fetchLeaderboard(
  apiEndpoint: string,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(`${apiEndpoint}/api/leaderboard?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return await response.json();
  } catch (error) {
    console.error('Leaderboard fetch failed:', error);
    return [];
  }
}

// ============================================
// INITIALIZATION
// ============================================

export function initializeIdentity(): CrossGameIdentity {
  const existing = getLocalIdentity();
  if (existing) {
    return existing;
  }
  
  const newId = `p31-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const identity = createNewIdentity(newId);
  saveLocalIdentity(identity);
  return identity;
}
