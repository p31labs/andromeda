// P31 Card Table: Scoreboard Component
// Live scoring and game status display

import { useMemo } from 'react';
import type { MatchState, SpoonState, CrossGameIdentity, CrossGameAchievement, GameId } from '../types';
import { SPOON_CONFIG, GAMES, formatXP, getLevelProgress } from '../types';

function getRarityColor(rarity: CrossGameAchievement['rarity']): string {
  const colors: Record<string, string> = {
    common: '#9e9e9e',
    rare: '#2196f3',
    epic: '#9c27b0',
    legendary: '#ff9800',
  };
  return colors[rarity] || colors.common;
}

interface ScoreboardProps {
  matchState: MatchState;
  spoons: SpoonState;
}

export function Scoreboard({ matchState, spoons }: ScoreboardProps) {
  const spoonConfig = SPOON_CONFIG[spoons];
  const game = GAMES[matchState.gameId];
  
  const sortedScores = useMemo(() => {
    return Object.entries(matchState.scores)
      .sort(([, a], [, b]) => b - a);
  }, [matchState.scores]);
  
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      minWidth: '200px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Game title */}
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
        {game.name}
      </h3>
      
      {/* Scores */}
      {spoonConfig.scoreVisibility !== 'hidden' && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af' }}>
            Scores
          </h4>
          {sortedScores.map(([playerId, score]) => (
            <div
              key={playerId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: '14px',
              }}
            >
              <span style={{ 
                color: playerId === 'player' ? '#3b82f6' : '#9ca3af',
                fontWeight: playerId === 'player' ? 600 : 400,
              }}>
                {playerId === 'player' ? 'You' : playerId === 'ai-north' ? 'North' : playerId === 'ai-east' ? 'East' : 'West'}
              </span>
              <span>{score}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Current turn */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Turn: </span>
        <span style={{ 
          color: matchState.currentPlayer === 'player' ? '#10b981' : '#fbbf24',
          fontWeight: 600,
        }}>
          {matchState.currentPlayer === 'player' ? 'Your turn' : 'AI thinking...'}
        </span>
      </div>
      
      {/* Phase indicator */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Phase: </span>
        <span style={{ textTransform: 'capitalize' }}>
          {matchState.gamePhase}
        </span>
      </div>
      
      {/* Spoon indicator */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '8px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '4px',
      }}>
        <span style={{ fontSize: '18px' }}>🥄</span>
        <span style={{ fontSize: '12px' }}>
          {spoons} Spoon{spoons > 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          ({spoonConfig.mode})
        </span>
      </div>
    </div>
  );
}

// Compact scoreboard for minimal display
export function CompactScoreboard({ scores, currentPlayer }: { scores: Record<string, number>; currentPlayer: string }) {
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '8px 16px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '20px',
      color: 'white',
      fontSize: '12px',
    }}>
      {Object.entries(scores).map(([playerId, score]) => (
        <span key={playerId} style={{ 
          fontWeight: playerId === currentPlayer ? 700 : 400,
          color: playerId === 'player' ? '#3b82f6' : '#9ca3af',
        }}>
          {playerId === 'player' ? 'You' : playerId === 'ai-north' ? 'N' : playerId === 'ai-east' ? 'E' : 'W'}: {score}
        </span>
      ))}
    </div>
  );
}

// Identity display (XP, level, achievements)
interface IdentityDisplayProps {
  identity: CrossGameIdentity;
}

export function IdentityDisplay({ identity }: IdentityDisplayProps) {
  const levelProgress = getLevelProgress(identity);
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minWidth: '200px',
    }}>
      {/* Level and XP */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: identity.avatar.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            {identity.globalLevel}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Level {identity.globalLevel}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{formatXP(identity.totalXP)} XP</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div style={{
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${levelProgress.percentage}%`,
            height: '100%',
            background: '#3b82f6',
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
          {formatXP(levelProgress.current)} / {formatXP(levelProgress.next)}
        </div>
      </div>
      
      {/* Recent achievements */}
      {identity.achievements.some(a => a.unlockedAt) && (
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', color: '#9ca3af' }}>
            Recent Achievements
          </h4>
          {identity.achievements
            .filter(a => a.unlockedAt)
            .slice(0, 3)
            .map(achievement => (
              <div
                key={achievement.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 0',
                  fontSize: '11px',
                }}
              >
                <span style={{
                  color: getRarityColor(achievement.rarity),
                  fontSize: '14px',
                }}>
                  {achievement.rarity === 'legendary' ? '👑' : 
                   achievement.rarity === 'epic' ? '⭐' : 
                   achievement.rarity === 'rare' ? '🏆' : '🎖️'}
                </span>
                <span>{achievement.name}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Game selector
interface GameSelectorProps {
  currentGame: GameId;
  onSelectGame: (gameId: GameId) => void;
}

export function GameSelector({ currentGame, onSelectGame }: GameSelectorProps) {
  const games: GameId[] = ['crazy-eights', 'hearts', 'euchre', 'bridge-lite'];
  
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '8px',
    }}>
      {games.map(gameId => {
        const game = GAMES[gameId];
        const isActive = gameId === currentGame;
        
        return (
          <button
            key={gameId}
            onClick={() => onSelectGame(gameId)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 400,
              transition: 'background 0.2s',
            }}
          >
            {game.name}
          </button>
        );
      })}
    </div>
  );
}

// Bidding panel for Euchre/Bridge
interface BiddingPanelProps {
  isVisible: boolean;
  suggestedBid: { bid: string; confidence: number; reasoning: string } | null;
  onBid: (bid: string) => void;
  onPass: () => void;
  disabled?: boolean;
}

export function BiddingPanel({ 
  isVisible, 
  suggestedBid, 
  onBid, 
  onPass,
  disabled 
}: BiddingPanelProps) {
  if (!isVisible) return null;
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '120px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      minWidth: '280px',
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Bidding</h4>
      
      {/* Suggestion */}
      {suggestedBid && (
        <div style={{
          padding: '8px',
          background: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '12px',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Suggestion: {suggestedBid.bid}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '11px' }}>
            {suggestedBid.reasoning}
          </div>
        </div>
      )}
      
      {/* Bid buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onPass}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '4px',
            background: disabled ? '#6b7280' : '#ef4444',
            color: 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          Pass
        </button>
        <button
          onClick={() => onBid('order-up')}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '4px',
            background: disabled ? '#6b7280' : '#10b981',
            color: 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          Order Up
        </button>
      </div>
    </div>
  );
}
