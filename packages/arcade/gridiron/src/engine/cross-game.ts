// P31 Gridiron: Cross-Game Identity Integration (10000%)
// Unified progression with Smallball

import type {
  CrossGameIdentity,
  CrossGameAchievement,
  Player,
  MinigameResult,
} from '../types';
import { XP_FORMULA, CROSS_GAME_ACHIEVEMENTS } from '../types';

// ============================================
// CROSS-GAME SYNC (KV/D1 backed)
// ============================================

const CROSS_GAME_KV_KEY = 'cross_game_identity';
const GRIDIRON_GAME_ID = 'gridiron';
const SMALLBALL_GAME_ID = 'smallball';

export interface CrossGameSync {
  identity: CrossGameIdentity;
  lastSyncedAt: string;
}

// Local storage fallback (for offline-first)
const STORAGE_KEY = 'p31_cross_game_identity';

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

// ============================================
// IDENTITY INITIALIZATION
// ============================================

export function createNewIdentity(playerId: string): CrossGameIdentity {
  const avatarColors = generateAvatarColors(playerId);

  return {
    playerId,
    globalLevel: 1,
    totalXP: 0,
    gamesPlayed: {
      smallball: 0,
      gridiron: 0,
    },
    achievements: CROSS_GAME_ACHIEVEMENTS.map(a => ({
      ...a,
      unlockedAt: null,
      progress: 0,
    })),
    avatar: {
      primaryColor: avatarColors.primary,
      secondaryColor: avatarColors.secondary,
      pattern: ['stripes', 'solid', 'checkered', 'gradient'][Math.floor(Math.random() * 4)],
    },
    lastSyncedAt: new Date().toISOString(),
  };
}

function generateAvatarColors(playerId: string): { primary: string; secondary: string } {
  // Deterministic colors from player ID hash
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

export interface XPAwardResult {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  previousLevel: number;
  achievementsUnlocked: CrossGameAchievement[];
}

export function addXP(
  identity: CrossGameIdentity,
  xpAmount: number,
  gameId: typeof GRIDIRON_GAME_ID | typeof SMALLBALL_GAME_ID
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
  const updatedAchievements = checkAchievements(identity, newTotalXP, gamesPlayed);
  const newlyUnlocked = updatedAchievements.filter(a =>
    a.unlockedAt && !identity.achievements.find(oa => oa.id === a.id)?.unlockedAt
  );

  const result: XPAwardResult = {
    xpGained: xpAmount,
    leveledUp: newLevel > previousLevel,
    newLevel,
    previousLevel,
    achievementsUnlocked: newlyUnlocked,
  };

  return result;
}

// ============================================
// ACHIEVEMENT CHECKING
// ============================================

function checkAchievements(
  identity: CrossGameIdentity,
  totalXP: number,
  gamesPlayed: { smallball: number; gridiron: number }
): CrossGameAchievement[] {
  return identity.achievements.map(achievement => {
    let progress = achievement.progress;
    let unlockedAt = achievement.unlockedAt;

    switch (achievement.id) {
      case 'first_steps':
        progress = Math.min(100, (gamesPlayed.smallball + gamesPlayed.gridiron) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'dual_threat':
        const wins = Math.min(gamesPlayed.smallball, gamesPlayed.gridiron);  // Simplified
        progress = Math.min(100, (wins / 10) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'ironman':
        const maxLevel = 50;
        progress = Math.min(100, (identity.globalLevel / maxLevel) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;

      case 'master_athlete':
        // Requires both games at high completion
        const smallballProgress = gamesPlayed.smallball / 100;
        const gridironProgress = gamesPlayed.gridiron / 100;
        progress = Math.min(100, ((smallballProgress + gridironProgress) / 2) * 100);
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
// TRAINING RESULT PROCESSING
// ============================================

export interface ProcessedTrainingResult {
  identity: CrossGameIdentity;
  xpAward: XPAwardResult;
  playerUpdates: Partial<Player>;
}

export function processTrainingResult(
  identity: CrossGameIdentity,
  player: Player,
  result: MinigameResult
): ProcessedTrainingResult {
  // Award XP
  const xpAward = addXP(identity, result.xpGained, GRIDIRON_GAME_ID);

  // Update identity
  const updatedIdentity: CrossGameIdentity = {
    ...identity,
    globalLevel: xpAward.newLevel,
    totalXP: identity.totalXP + result.xpGained,
    achievements: xpAward.achievementsUnlocked.length > 0
      ? identity.achievements.map(a => {
          const unlocked = xpAward.achievementsUnlocked.find(ua => ua.id === a.id);
          return unlocked || a;
        })
      : identity.achievements,
    lastSyncedAt: new Date().toISOString(),
  };

  // Update player
  const updatedPlayer: Partial<Player> = {
    energy: Math.max(0, player.energy - result.energyBurned),
    fatigue: Math.min(100, player.fatigue + result.fatigueDelta),
    lastTrainedAt: result.timestamp,
    // Apply XP to attributes based on training type
    attributes: {
      ...player.attributes,
      ...result.attributesImproved.reduce((acc, attr) => ({
        ...acc,
        [attr]: Math.min(99, player.attributes[attr] + Math.floor(result.xpGained / 20)),
      }), {}),
    },
  };

  // Persist locally
  saveLocalIdentity(updatedIdentity);

  return {
    identity: updatedIdentity,
    xpAward,
    playerUpdates: updatedPlayer,
  };
}

// ============================================
// SYNC WITH REMOTE (KV/D1)
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
// LEADERBOARD
// ============================================

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
