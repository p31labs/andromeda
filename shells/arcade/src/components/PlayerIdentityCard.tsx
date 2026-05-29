import React from 'react';
import type { UnifiedPlayer } from '@p31/unified';

interface Props {
  player: UnifiedPlayer;
}

export const PlayerIdentityCard: React.FC<Props> = ({ player }) => {
  // Calculate XP to next level
  const currentLevelXP = Math.pow(2, player.globalLevel - 1) * 1000;
  const nextLevelXP = Math.pow(2, player.globalLevel) * 1000;
  const xpInLevel = player.totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpProgress = Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));

  // Format play time
  const hours = Math.floor(player.totalPlayTime / 60);
  const minutes = player.totalPlayTime % 60;
  const playTimeText = hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;

  return (
    <div className="identity-card">
      <div
        className="identity-avatar"
        style={{ borderColor: player.avatar.color }}
      >
        {player.avatar.icon}
      </div>
      <div className="identity-info">
        <h3>{player.displayName}</h3>
        <p className="identity-level">
          Level {player.globalLevel} • {playTimeText} played
        </p>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          {player.totalXP.toLocaleString()} XP • {player.achievements.length} achievements
        </p>
      </div>

      {/* Skill Track Summary */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginLeft: 'auto',
        paddingLeft: '2rem',
        borderLeft: '1px solid var(--border-color)'
      }}>
        {Object.entries(player.skillTracks).map(([track, level]) => (
          <div key={track} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: level > 10 ? 'var(--accent-green)' : 'var(--text-primary)'
            }}>
              {level}
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {track}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
