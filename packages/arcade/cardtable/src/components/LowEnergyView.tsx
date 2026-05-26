import React, { useEffect, useState } from 'react';
import { ArrowLeft, Gift, Play, Users, Coins } from 'lucide-react';
import { useDailyRewards, useClaimReward, useGameSessions } from '../db/hooks';

interface LowEnergyViewProps {
  onBack: () => void;
}

export const LowEnergyView: React.FC<LowEnergyViewProps> = ({ onBack }) => {
  const { rewards, loading: rewardsLoading } = useDailyRewards();
  const { sessions, loading: sessionsLoading } = useGameSessions();
  const { claim } = useClaimReward();
  const [claiming, setClaiming] = useState<string | null>(null);

  const handleClaim = async (rewardId: string) => {
    setClaiming(rewardId);
    try {
      await claim(rewardId);
    } finally {
      setClaiming(null);
    }
  };

  const totalChips = rewards
    .filter(r => !r.is_claimed)
    .reduce((sum, r) => sum + r.chip_amount, 0);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-cyan" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Low Energy Mode</h1>
          <p className="text-xs text-white/50">1 Spoon • 5-Minute Loop</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Available</p>
          <p className="text-lg font-bold text-gold">{totalChips} 💰</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Daily Rewards */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <Gift className="w-5 h-5" />
            <h2 className="font-bold text-lg">Daily Rewards</h2>
          </div>

          {rewardsLoading ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-white/50">Loading rewards...</p>
            </div>
          ) : rewards.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-white/50">No rewards available</p>
              <p className="text-xs text-white/30 mt-2">
                Check back tomorrow for new rewards
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div key={reward.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {reward.reward_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gold">+{reward.chip_amount} chips</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaim(reward.id)}
                      disabled={claiming === reward.id}
                      className="glass-button px-4 py-2 rounded-lg font-bold text-gold border-gold/30
                                 disabled:opacity-50"
                    >
                      {claiming === reward.id ? 'Claiming...' : 'Claim'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Sessions */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-orchid">
            <Users className="w-5 h-5" />
            <h2 className="font-bold text-lg">Active Sessions</h2>
          </div>

          {sessionsLoading ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-white/50">Loading...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-white/50">No active sessions</p>
              <p className="text-xs text-white/30 mt-2">
                Start a game in High Energy mode
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{session.game_type}</p>
                      <p className="text-sm text-white/50">
                        Pot: {session.pot_size} chips
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-phos animate-pulse" />
                      <span className="text-xs text-phos">LIVE</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Replay Archive */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-phos">
            <Play className="w-5 h-5" />
            <h2 className="font-bold text-lg">Replay Archive</h2>
          </div>

          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-white/50">No replays available</p>
            <p className="text-xs text-white/30 mt-2">
              Completed games appear here for spectating
            </p>
          </div>
        </section>
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-white/30">
          Low Energy Mode • Passive collection • Async gameplay
        </p>
      </footer>
    </div>
  );
};
