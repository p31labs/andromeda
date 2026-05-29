import React, { useMemo } from 'react';
import type { UnifiedPlayer, GameId } from '@p31/unified';

interface Props {
  player: UnifiedPlayer;
}

const gameIcons: Record<GameId, string> = {
  smallball: '⚾',
  gridiron: '🏈',
  cards: '🃏',
  strategy: '♟️',
  'liquid-sculptor': '💧',
  'resonance-rings': '🌊',
  'magnetic-poetry': '🧲',
  'orbital-drift': '🪐',
  'water-parksimulator': '💦',
};

const gameNames: Record<GameId, string> = {
  smallball: 'Smallball',
  gridiron: 'Gridiron',
  cards: 'Card Table',
  strategy: 'Strategy Board',
  'liquid-sculptor': 'Liquid Sculptor',
  'resonance-rings': 'Resonance Rings',
  'magnetic-poetry': 'Magnetic Poetry',
  'orbital-drift': 'Orbital Drift',
  'water-parksimulator': 'Water Park Simulator',
};

interface Activity {
  gameId: GameId;
  timestamp: string;
  type: 'played' | 'won' | 'leveled';
  detail: string;
}

export const RecentActivityFeed: React.FC<Props> = ({ player }) => {
  const activities = useMemo<Activity[]>(() => {
    const list: Activity[] = [];

    // Add last played activities
    Object.entries(player.lastPlayed).forEach(([gameId, timestamp]) => {
      if (timestamp) {
        list.push({
          gameId: gameId as GameId,
          timestamp,
          type: 'played',
          detail: 'Last played',
        });
      }
    });

    // Add level up activities (mock based on XP milestones)
    Object.entries(player.games).forEach(([gameId, progress]) => {
      if (progress.level > 1 && progress.xp > 0) {
        list.push({
          gameId: gameId as GameId,
          timestamp: progress.lastPlayed,
          type: 'leveled',
          detail: `Reached Level ${progress.level}`,
        });
      }
    });

    // Sort by timestamp (most recent first)
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [player]);

  const formatTimeAgo = (timestamp: string): string => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (activities.length === 0) {
    return (
      <div className="panel">
        <h3>📊 Recent Activity</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Start playing games to see your activity here!
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>📊 Recent Activity</h3>
      <div className="activity-list">
        {activities.map((activity, idx) => (
          <div key={idx} className="activity-item">
            <span className="activity-icon">{gameIcons[activity.gameId]}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{gameNames[activity.gameId]}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {activity.detail}
              </div>
            </div>
            <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
