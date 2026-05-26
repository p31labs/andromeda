// P31 Cross-Game Identity System v3.0
// Unified player identity across Smallball, Gridiron, and future games

export interface UnifiedPlayer {
  // Core identity (stable across all games)
  playerId: string;
  displayName: string;
  avatarHash: string; // Deterministic avatar from ID

  // Cross-game progression
  totalXp: number;
  level: number;
  achievements: CrossGameAchievement[];

  // Per-game stats
  gameStats: {
    smallball: SmallballStats | null;
    gridiron: GridironStats | null;
  };

  // Meta
  createdAt: number;
  lastActive: number;
  gamesPlayed: number;
  totalPlayTime: number; // seconds
}

export interface CrossGameAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  gameSource: 'smallball' | 'gridiron' | 'cross';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SmallballStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  battingAverage: number;
  homeRuns: number;
  rbis: number;
  era: number;
  strikeouts: number;
  rank: string;
  xp: number;
}

export interface GridironStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  championships: number;
  rank: string;
  xp: number;
}

// Generate deterministic avatar from player ID
export function generateAvatar(playerId: string): {
  hash: string;
  colors: [string, string, string];
  pattern: string;
} {
  // Simple hash function for deterministic output
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Generate colors from hash
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 120) % 360;
  const h3 = (h1 + 240) % 360;

  const colors: [string, string, string] = [
    `hsl(${h1}, 70%, 50%)`,
    `hsl(${h2}, 70%, 50%)`,
    `hsl(${h3}, 70%, 50%)`
  ];

  const patterns = ['tetrahedron', 'hexagon', 'wave', 'spiral', 'grid'];
  const pattern = patterns[Math.abs(hash) % patterns.length];

  return {
    hash: Math.abs(hash).toString(16).padStart(8, '0'),
    colors,
    pattern
  };
}

// Calculate XP for actions
export function calculateXp(
  action: 'game_complete' | 'win' | 'achievement' | 'milestone' | 'streak',
  context?: { streak?: number; difficulty?: number; isClutch?: boolean }
): number {
  const baseXp: Record<string, number> = {
    game_complete: 50,
    win: 100,
    achievement: 200,
    milestone: 500,
    streak: 75
  };

  let xp = baseXp[action] || 50;

  if (context?.streak && context.streak > 2) {
    xp += context.streak * 10; // Streak bonus
  }

  if (context?.difficulty && context.difficulty > 1) {
    xp *= context.difficulty; // Difficulty multiplier
  }

  if (context?.isClutch) {
    xp *= 1.5; // Clutch bonus
  }

  return Math.floor(xp);
}

// Level progression (exponential curve)
export function calculateLevel(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpToNextLevel: number;
  progress: number; // 0-1
} {
  // Level 1: 0 XP, Level 2: 1000 XP, Level 3: 2250 XP, etc.
  // Formula: xpForLevel(n) = 1000 * n * (n + 1) / 2

  let level = 1;
  let xpForNextLevel = 1000;

  while (totalXp >= xpForNextLevel) {
    level++;
    xpForNextLevel = 1000 * level * (level + 1) / 2;
  }

  const xpForCurrentLevel = 1000 * (level - 1) * level / 2;
  const currentLevelXp = totalXp - xpForCurrentLevel;
  const xpToNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progress = currentLevelXp / xpToNextLevel;

  return {
    level,
    currentLevelXp,
    xpToNextLevel,
    progress
  };
}

// Achievement definitions
export const ACHIEVEMENTS: Record<string, Omit<CrossGameAchievement, 'unlockedAt'>> = {
  'first_win': {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first game',
    icon: '🏆',
    gameSource: 'cross',
    rarity: 'common'
  },
  'winning_streak_5': {
    id: 'winning_streak_5',
    name: 'On Fire',
    description: 'Win 5 games in a row',
    icon: '🔥',
    gameSource: 'cross',
    rarity: 'rare'
  },
  'winning_streak_10': {
    id: 'winning_streak_10',
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    icon: '⚡',
    gameSource: 'cross',
    rarity: 'epic'
  },
  'smallball_master': {
    id: 'smallball_master',
    name: 'Diamond Legend',
    description: 'Reach level 25 in Smallball',
    icon: '⚾',
    gameSource: 'smallball',
    rarity: 'legendary'
  },
  'gridiron_champion': {
    id: 'gridiron_champion',
    name: 'Gridiron Champion',
    description: 'Win a championship in Gridiron',
    icon: '🏈',
    gameSource: 'gridiron',
    rarity: 'epic'
  },
  'dual_threat': {
    id: 'dual_threat',
    name: 'Dual Threat',
    description: 'Reach level 10 in both games',
    icon: '🌟',
    gameSource: 'cross',
    rarity: 'legendary'
  },
  'comeback_king': {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win after being down by 5+ runs',
    icon: '👑',
    gameSource: 'cross',
    rarity: 'rare'
  },
  'perfectionist': {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete a game with 0 errors',
    icon: '✨',
    gameSource: 'cross',
    rarity: 'rare'
  }
};

// Check if player qualifies for achievements
export function checkAchievements(player: UnifiedPlayer): CrossGameAchievement[] {
  const newAchievements: CrossGameAchievement[] = [];
  const existingIds = new Set(player.achievements.map(a => a.id));

  // First win
  if (!existingIds.has('first_win') && (player.gameStats.smallball?.wins || 0) + (player.gameStats.gridiron?.wins || 0) >= 1) {
    newAchievements.push({ ...ACHIEVEMENTS['first_win'], unlockedAt: Date.now() });
  }

  // Smallball master
  if (!existingIds.has('smallball_master') && player.gameStats.smallball) {
    const level = calculateLevel(player.gameStats.smallball.xp).level;
    if (level >= 25) {
      newAchievements.push({ ...ACHIEVEMENTS['smallball_master'], unlockedAt: Date.now() });
    }
  }

  // Dual threat
  if (!existingIds.has('dual_threat') && player.gameStats.smallball && player.gameStats.gridiron) {
    const sbLevel = calculateLevel(player.gameStats.smallball.xp).level;
    const grLevel = calculateLevel(player.gameStats.gridiron.xp).level;
    if (sbLevel >= 10 && grLevel >= 10) {
      newAchievements.push({ ...ACHIEVEMENTS['dual_threat'], unlockedAt: Date.now() });
    }
  }

  return newAchievements;
}

// Cross-game leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  avatarHash: string;
  totalXp: number;
  level: number;
  achievementCount: number;
  gamesPlayed: number;
}

// Generate cross-game leaderboard from player data
export function generateLeaderboard(players: UnifiedPlayer[]): LeaderboardEntry[] {
  return players
    .map(p => ({
      rank: 0, // Assigned after sort
      playerId: p.playerId,
      displayName: p.displayName,
      avatarHash: p.avatarHash,
      totalXp: p.totalXp,
      level: calculateLevel(p.totalXp).level,
      achievementCount: p.achievements.length,
      gamesPlayed: p.gamesPlayed
    }))
    .sort((a, b) => b.totalXp - a.totalXp)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// Export for Worker usage
export const CrossGameIdentity = {
  generateAvatar,
  calculateXp,
  calculateLevel,
  checkAchievements,
  generateLeaderboard,
  ACHIEVEMENTS
};
