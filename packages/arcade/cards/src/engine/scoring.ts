// P31 Card Table: Scoring Engine
// Score calculation for all 4 card games

import type { GameId, PlayerId, MatchState, Trick, CrossGameIdentity, XPAwardResult, CrossGameAchievement } from '../types';
import { CARD_ACHIEVEMENTS, XP_AWARDS, XP_FORMULA } from '../types';
import { scoreHeartsHand, checkShootTheMoon, countTricksWon, getPartner, calculateBridgeScore } from './trick-taking';

// ============================================
// GAME SCORING
// ============================================

export interface GameScoreResult {
  scores: Record<PlayerId, number>;
  teamScores?: Record<string, number>;
  winner: PlayerId | null;
  gameComplete: boolean;
  specialEvents: SpecialEvent[];
}

export interface SpecialEvent {
  type: 'shoot-the-moon' | 'euchre-march' | 'bid-made' | 'bid-failed' | 'win';
  playerId: PlayerId;
  points: number;
  description: string;
}

export function scoreGame(matchState: MatchState): GameScoreResult {
  switch (matchState.gameId) {
    case 'crazy-eights':
      return scoreCrazyEights(matchState);
    case 'hearts':
      return scoreHearts(matchState);
    case 'euchre':
      return scoreEuchre(matchState);
    case 'bridge-lite':
      return scoreBridgeLite(matchState);
    default:
      throw new Error(`Unknown game: ${matchState.gameId}`);
  }
}

// ============================================
// CRAZY EIGHTS SCORING
// ============================================

function scoreCrazyEights(matchState: MatchState): GameScoreResult {
  const scores: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  const specialEvents: SpecialEvent[] = [];
  
  // Calculate points from remaining cards in hands
  for (const player of matchState.players) {
    let handPoints = 0;
    for (const card of player.hand.cards) {
      // 8s = 50, face cards = 10, others = face value
      if (card.rank === 8) handPoints += 50;
      else if (card.rank >= 11) handPoints += 10;
      else handPoints += card.rank;
    }
    scores[player.id] = handPoints;
  }
  
  // Winner is first to empty hand
  let winner: PlayerId | null = null;
  for (const player of matchState.players) {
    if (player.hand.cards.length === 0) {
      winner = player.id;
      specialEvents.push({
        type: 'win',
        playerId: player.id,
        points: 0,
        description: 'Emptied hand first',
      });
      break;
    }
  }
  
  // Game complete when someone reaches target score (they lose)
  const targetScore = 100;
  const gameComplete = Object.values(scores).some(s => s >= targetScore);
  
  return {
    scores,
    winner: gameComplete ? null : winner,
    gameComplete,
    specialEvents,
  };
}

// ============================================
// HEARTS SCORING
// ============================================

function scoreHearts(matchState: MatchState): GameScoreResult {
  const scores: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  const specialEvents: SpecialEvent[] = [];
  
  for (const player of matchState.players) {
    const handScore = scoreHeartsHand(matchState.tricks, player.id);
    scores[player.id] = handScore;
  }
  
  // Check for shoot the moon
  for (const player of matchState.players) {
    if (checkShootTheMoon(matchState.tricks, player.id)) {
      specialEvents.push({
        type: 'shoot-the-moon',
        playerId: player.id,
        points: 0,
        description: 'Shot the moon!',
      });
      
      // Reverse scores: shooter gets 0, others get 26
      for (const pid of Object.keys(scores) as PlayerId[]) {
        scores[pid] = (pid === player.id) ? 0 : 26;
      }
      break;
    }
  }
  
  // Game complete when someone reaches target score
  const targetScore = 100;
  const gameComplete = Object.values(scores).some(s => s >= targetScore);
  
  // Winner has lowest score
  let winner: PlayerId | null = null;
  if (gameComplete) {
    let minScore = Infinity;
    for (const [pid, score] of Object.entries(scores)) {
      if (score < minScore) {
        minScore = score;
        winner = pid as PlayerId;
      }
    }
  }
  
  return {
    scores,
    winner,
    gameComplete,
    specialEvents,
  };
}

// ============================================
// EUCHRE SCORING
// ============================================

interface EuchreScoringContext {
  maker: PlayerId;
  trumpSuit: string;
  goingAlone?: boolean;
  teamA: PlayerId[];
  teamB: PlayerId[];
}

function scoreEuchre(matchState: MatchState): GameScoreResult {
  const scores: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  const teamScores: Record<string, number> = { 'team-a': 0, 'team-b': 0 };
  const specialEvents: SpecialEvent[] = [];
  
  const teamA = ['player', 'ai-east'] as PlayerId[];
  const teamB = ['ai-north', 'ai-west'] as PlayerId[];
  
  // Count tricks per player
  const tricksWon: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  for (const trick of matchState.tricks) {
    if (trick.winner) {
      tricksWon[trick.winner]++;
    }
  }
  
  // Sum team tricks
  const teamATricks = teamA.reduce((sum, pid) => sum + tricksWon[pid], 0);
  const teamBTricks = teamB.reduce((sum, pid) => sum + tricksWon[pid], 0);
  
  // Determine maker team
  const maker = matchState.bidWinner || 'player';
  const makerTeam = teamA.includes(maker) ? 'team-a' : 'team-b';
  const makerTricks = makerTeam === 'team-a' ? teamATricks : teamBTricks;
  
  // Score based on maker performance
  if (matchState.goingAlone) {
    if (makerTricks === 5) {
      teamScores[makerTeam] = 4;  // March alone
      specialEvents.push({
        type: 'euchre-march',
        playerId: maker,
        points: 4,
        description: 'March alone - won all 5 tricks!',
      });
    } else if (makerTricks >= 3) {
      teamScores[makerTeam] = 1;
    } else {
      // Euchred - opponents get 2
      const opponentTeam = makerTeam === 'team-a' ? 'team-b' : 'team-a';
      teamScores[opponentTeam] = 2;
    }
  } else {
    if (makerTricks === 5) {
      teamScores[makerTeam] = 2;  // March
      specialEvents.push({
        type: 'euchre-march',
        playerId: maker,
        points: 2,
        description: 'March - won all 5 tricks!',
      });
    } else if (makerTricks >= 3) {
      teamScores[makerTeam] = 1;
    } else {
      // Euchred
      const opponentTeam = makerTeam === 'team-a' ? 'team-b' : 'team-a';
      teamScores[opponentTeam] = 2;
    }
  }
  
  // Game complete at 10 points
  const targetScore = 10;
  const gameComplete = teamScores['team-a'] >= targetScore || teamScores['team-b'] >= targetScore;
  
  let winner: PlayerId | null = null;
  if (gameComplete) {
    const winningTeam = teamScores['team-a'] >= targetScore ? 'team-a' : 'team-b';
    // First player on winning team
    winner = winningTeam === 'team-a' ? 'player' : 'ai-north';
  }
  
  return {
    scores,
    teamScores,
    winner,
    gameComplete,
    specialEvents,
  };
}

// ============================================
// BRIDGE LITE SCORING
// ============================================

function scoreBridgeLite(matchState: MatchState): GameScoreResult {
  const scores: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  const teamScores: Record<string, number> = { 'team-a': 0, 'team-b': 0 };
  const specialEvents: SpecialEvent[] = [];
  
  const teamA = ['player', 'ai-east'] as PlayerId[];
  const teamB = ['ai-north', 'ai-west'] as PlayerId[];
  
  // Count tricks per team
  const tricksWon: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  for (const trick of matchState.tricks) {
    if (trick.winner) {
      tricksWon[trick.winner]++;
    }
  }
  
  const teamATricks = teamA.reduce((sum, pid) => sum + tricksWon[pid], 0);
  const teamBTricks = teamB.reduce((sum, pid) => sum + tricksWon[pid], 0);
  
  // Calculate score based on contract
  const declarer = matchState.bidWinner || 'player';
  const bid = matchState.tricksBid?.[declarer] || 7;
  const trump = matchState.trumpSuit;
  
  const declarerTeam = teamA.includes(declarer) ? 'team-a' : 'team-b';
  const declarerTricks = declarerTeam === 'team-a' ? teamATricks : teamBTricks;
  
  const handScore = calculateBridgeScore(declarerTricks, bid, trump);
  teamScores[declarerTeam] += handScore;
  
  if (declarerTricks >= bid) {
    specialEvents.push({
      type: 'bid-made',
      playerId: declarer,
      points: handScore,
      description: `Made ${bid} contract for ${handScore} points`,
    });
  } else {
    specialEvents.push({
      type: 'bid-failed',
      playerId: declarer,
      points: handScore,
      description: `Failed ${bid} contract, penalty ${handScore}`,
    });
  }
  
  // Game complete at 100 points (rubber bridge)
  const targetScore = 100;
  const gameComplete = teamScores['team-a'] >= targetScore || teamScores['team-b'] >= targetScore;
  
  let winner: PlayerId | null = null;
  if (gameComplete) {
    const winningTeam = teamScores['team-a'] >= targetScore ? 'team-a' : 'team-b';
    winner = winningTeam === 'team-a' ? 'player' : 'ai-north';
  }
  
  return {
    scores,
    teamScores,
    winner,
    gameComplete,
    specialEvents,
  };
}

// ============================================
// XP AWARDS
// ============================================

export function calculateMatchXP(
  matchState: MatchState,
  winner: PlayerId | null,
  specialEvents: SpecialEvent[]
): Record<PlayerId, number> {
  const xp: Record<PlayerId, number> = { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 };
  
  for (const player of matchState.players) {
    // Base XP for playing
    xp[player.id] += XP_AWARDS.playAnyGame;
    
    // Win bonus
    if (winner === player.id) {
      xp[player.id] += XP_AWARDS.winGame;
    }
    
    // Special events
    for (const event of specialEvents) {
      if (event.playerId === player.id) {
        switch (event.type) {
          case 'shoot-the-moon':
            xp[player.id] += XP_AWARDS.shootTheMoon;
            break;
          case 'euchre-march':
            xp[player.id] += XP_AWARDS.euchreMarch;
            break;
          case 'win':
            xp[player.id] += XP_AWARDS.winHand;
            break;
        }
      }
    }
  }
  
  return xp;
}

// ============================================
// ACHIEVEMENT CHECKING
// ============================================

export function checkAchievements(
  identity: CrossGameIdentity,
  matchState: MatchState,
  winner: PlayerId | null,
  specialEvents: SpecialEvent[],
  gameHistory: { gameId: GameId; won: boolean }[]
): CrossGameAchievement[] {
  const updatedAchievements = [...identity.achievements];
  
  for (const achievement of updatedAchievements) {
    let progress = achievement.progress;
    let unlockedAt = achievement.unlockedAt;
    
    switch (achievement.id) {
      case 'card_shark':
        // Count wins across all card games
        const cardWins = gameHistory.filter(g => g.won).length;
        progress = Math.min(100, (cardWins / 10) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
        
      case 'grand_slam':
        // Won all 5 tricks in Euchre
        const hasMarch = specialEvents.some(e => 
          e.type === 'euchre-march' && e.playerId === 'player'
        );
        if (hasMarch && !unlockedAt) {
          progress = 100;
          unlockedAt = new Date().toISOString();
        }
        break;
        
      case 'heart_breaker':
        // Shot the moon in Hearts
        const hasShotMoon = specialEvents.some(e => 
          e.type === 'shoot-the-moon' && e.playerId === 'player'
        );
        if (hasShotMoon && !unlockedAt) {
          progress = 100;
          unlockedAt = new Date().toISOString();
        }
        break;
        
      case 'bridge_builder':
        // Complete 5 Bridge Lite rubbers
        const bridgeWins = gameHistory.filter(g => 
          g.gameId === 'bridge-lite' && g.won
        ).length;
        progress = Math.min(100, (bridgeWins / 5) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
        
      case 'table_master':
        // Win at least once in all 4 games
        const gamesWon = new Set(gameHistory.filter(g => g.won).map(g => g.gameId));
        progress = Math.min(100, (gamesWon.size / 4) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
        
      case 'crazy_eights_champion':
        const crazyEightsWins = gameHistory.filter(g => 
          g.gameId === 'crazy-eights' && g.won
        ).length;
        progress = Math.min(100, (crazyEightsWins / 20) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
        
      case 'euchre_expert':
        const euchreWins = gameHistory.filter(g => 
          g.gameId === 'euchre' && g.won
        ).length;
        progress = Math.min(100, (euchreWins / 15) * 100);
        if (progress >= 100 && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }
        break;
    }
    
    achievement.progress = progress;
    if (unlockedAt) {
      achievement.unlockedAt = unlockedAt;
    }
  }
  
  return updatedAchievements;
}

// ============================================
// RUBBER TRACKING
// ============================================

export interface RubberState {
  games: { gameId: GameId; winner: PlayerId; scores: Record<PlayerId, number> }[];
  runningScores: Record<PlayerId, number>;
  complete: boolean;
  rubberWinner: PlayerId | null;
}

export function createRubber(gameId: GameId): RubberState {
  return {
    games: [],
    runningScores: { player: 0, 'ai-north': 0, 'ai-east': 0, 'ai-west': 0 },
    complete: false,
    rubberWinner: null,
  };
}

export function addGameToRubber(
  rubber: RubberState,
  gameResult: { gameId: GameId; winner: PlayerId; scores: Record<PlayerId, number> }
): RubberState {
  const games = [...rubber.games, gameResult];
  const runningScores = { ...rubber.runningScores };
  
  // Update running scores
  for (const [pid, score] of Object.entries(gameResult.scores)) {
    runningScores[pid as PlayerId] += score;
  }
  
  // Check if rubber is complete (for Bridge)
  let complete = false;
  let rubberWinner: PlayerId | null = null;
  
  if (gameResult.gameId === 'bridge-lite') {
    const targetScore = 100;
    for (const [pid, score] of Object.entries(runningScores)) {
      if (score >= targetScore) {
        complete = true;
        rubberWinner = pid as PlayerId;
        break;
      }
    }
  }
  
  return {
    games,
    runningScores,
    complete,
    rubberWinner,
  };
}
