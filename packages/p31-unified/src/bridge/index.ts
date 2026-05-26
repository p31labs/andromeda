// Skill Bridges System
// Enables cross-game skill transfer and bonuses

import type {
  SkillBridge,
  GameId,
  SkillTrack,
  UnifiedPlayer,
} from '../types.js';

export const SKILL_BRIDGES: SkillBridge[] = [
  // Athletics → Athletics
  {
    from: { gameId: 'smallball', skill: 'pitchAccuracy' },
    to: { gameId: 'gridiron', boost: 'passingAccuracy', skillTrack: 'athletics' },
    transferRate: 0.25,
    minLevel: 3,
    description: 'Pitch accuracy translates to QB precision',
  },
  {
    from: { gameId: 'gridiron', skill: 'passingAccuracy' },
    to: { gameId: 'smallball', boost: 'pitchAccuracy', skillTrack: 'athletics' },
    transferRate: 0.20,
    minLevel: 3,
    description: 'QB accuracy translates to pitching precision',
  },

  // Strategy → Strategy
  {
    from: { gameId: 'strategy', skill: 'endgamePrecision' },
    to: { gameId: 'gridiron', boost: 'clockManagement', skillTrack: 'strategy' },
    transferRate: 0.30,
    minLevel: 5,
    description: 'Chess endgame precision aids clock management',
  },
  {
    from: { gameId: 'strategy', skill: 'positionEvaluation' },
    to: { gameId: 'cards', boost: 'handReading', skillTrack: 'tactics' },
    transferRate: 0.25,
    minLevel: 4,
    description: 'Board position evaluation improves card reading',
  },
  {
    from: { gameId: 'cards', skill: 'probabilityCalculation' },
    to: { gameId: 'strategy', boost: 'tacticalPlanning', skillTrack: 'strategy' },
    transferRate: 0.20,
    minLevel: 4,
    description: 'Card probability aids tactical evaluation',
  },

  // Creativity → Athletics
  {
    from: { gameId: 'liquid-sculptor', skill: 'patternRecognition' },
    to: { gameId: 'smallball', boost: 'pitchPrediction', skillTrack: 'athletics' },
    transferRate: 0.20,
    minLevel: 5,
    description: 'Fluid patterns aid pitch reading',
  },

  // Precision → Precision
  {
    from: { gameId: 'orbital-drift', skill: 'trajectoryPrediction' },
    to: { gameId: 'gridiron', boost: 'deepBallAccuracy', skillTrack: 'precision' },
    transferRate: 0.35,
    minLevel: 6,
    description: 'Orbital mechanics improve deep passing',
  },
  {
    from: { gameId: 'orbital-drift', skill: 'gravityCalculation' },
    to: { gameId: 'smallball', boost: 'homerunArcPrediction', skillTrack: 'precision' },
    transferRate: 0.25,
    minLevel: 4,
    description: 'Gravity physics helps predict ball trajectory',
  },
  {
    from: { gameId: 'liquid-sculptor', skill: 'viscosityControl' },
    to: { gameId: 'orbital-drift', boost: 'flowPrediction', skillTrack: 'intuition' },
    transferRate: 0.20,
    minLevel: 3,
    description: 'Fluid dynamics intuition aids orbital mechanics',
  },

  // Tactics → Tactics
  {
    from: { gameId: 'cards', skill: 'cardCounting' },
    to: { gameId: 'strategy', boost: 'pieceVisualization', skillTrack: 'tactics' },
    transferRate: 0.15,
    minLevel: 5,
    description: 'Card counting aids piece visualization',
  },

  // Intuition → All
  {
    from: { gameId: 'resonance-rings', skill: 'harmonicMatching' },
    to: { gameId: 'gridiron', boost: 'audibleRecognition', skillTrack: 'intuition' },
    transferRate: 0.20,
    minLevel: 4,
    description: 'Wave patterns help read defensive shifts',
  },
  {
    from: { gameId: 'resonance-rings', skill: 'frequencyMemory' },
    to: { gameId: 'cards', boost: 'patternMemory', skillTrack: 'intuition' },
    transferRate: 0.15,
    minLevel: 3,
    description: 'Frequency memory aids card pattern recall',
  },
  {
    from: { gameId: 'magnetic-poetry', skill: 'semanticAssociation' },
    to: { gameId: 'cards', boost: 'cardAssociation', skillTrack: 'intuition' },
    transferRate: 0.15,
    minLevel: 2,
    description: 'Word associations strengthen card memory',
  },

  // Creative Physics → Strategy
  {
    from: { gameId: 'magnetic-poetry', skill: 'compositionalBalance' },
    to: { gameId: 'strategy', boost: 'positionBalance', skillTrack: 'strategy' },
    transferRate: 0.15,
    minLevel: 4,
    description: 'Poetry composition balance aids positional play',
  },
];

export class SkillBridgeManager {
  private player: UnifiedPlayer | null = null;

  setPlayer(player: UnifiedPlayer): void {
    this.player = player;
  }

  // Get active bridges for a target game
  getActiveBridges(targetGameId: GameId): ActiveBridge[] {
    if (!this.player) return [];

    return SKILL_BRIDGES
      .filter(bridge => bridge.to.gameId === targetGameId)
      .filter(bridge => {
        // Check if player has sufficient level in source game
        const sourceProgress = this.player!.games[bridge.from.gameId];
        return sourceProgress && sourceProgress.level >= bridge.minLevel;
      })
      .map(bridge => ({
        ...bridge,
        sourceLevel: this.player!.games[bridge.from.gameId].level,
        boostAmount: Math.floor(
          this.player!.games[bridge.from.gameId].level * bridge.transferRate * 10
        ) / 10,
      }));
  }

  // Calculate total bonus for a specific skill in a game
  calculateBonus(gameId: GameId, skill: string): number {
    const bridges = this.getActiveBridges(gameId);
    const relevant = bridges.filter(b => b.to.boost === skill);

    return relevant.reduce((sum, b) => sum + b.boostAmount, 0);
  }

  // Get cross-game recommendations
  getRecommendations(currentGameId: GameId): CrossGameRecommendation[] {
    if (!this.player) return [];

    // Find bridges FROM current game TO other games
    const outgoingBridges = SKILL_BRIDGES.filter(
      b => b.from.gameId === currentGameId
    );

    return outgoingBridges
      .filter(b => {
        const progress = this.player!.games[currentGameId];
        return progress && progress.level >= b.minLevel;
      })
      .map(b => ({
        targetGame: b.to.gameId,
        benefit: b.description,
        boostSkill: b.to.boost,
        boostAmount: Math.floor(
          this.player!.games[currentGameId].level * b.transferRate * 10
        ) / 10,
        reason: `Your level ${this.player!.games[currentGameId].level} in ${currentGameId} gives +${Math.floor(b.transferRate * 100)}% boost to ${b.to.boost}`,
      }))
      .sort((a, b) => b.boostAmount - a.boostAmount);
  }

  // Generate "bridge unlocked" message when player reaches new level
  checkNewBridges(gameId: GameId, oldLevel: number, newLevel: number): UnlockedBridge[] {
    const unlocked: UnlockedBridge[] = [];

    for (const bridge of SKILL_BRIDGES) {
      if (bridge.from.gameId === gameId) {
        // Check if we crossed the threshold
        if (oldLevel < bridge.minLevel && newLevel >= bridge.minLevel) {
          unlocked.push({
            from: bridge.from,
            to: bridge.to,
            description: bridge.description,
            transferRate: bridge.transferRate,
          });
        }
      }
    }

    return unlocked;
  }
}

interface ActiveBridge extends SkillBridge {
  sourceLevel: number;
  boostAmount: number;
}

interface CrossGameRecommendation {
  targetGame: GameId;
  benefit: string;
  boostSkill: string;
  boostAmount: number;
  reason: string;
}

interface UnlockedBridge {
  from: { gameId: GameId; skill: string };
  to: { gameId: GameId; boost: string; skillTrack: SkillTrack };
  description: string;
  transferRate: number;
}

export * from '../types.js';
