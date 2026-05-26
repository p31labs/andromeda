import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Activity, BookOpen, Moon, CheckCircle } from 'lucide-react';
import { useFranchise, usePlayers, useInjuryReports, useSetPlayerStatus, useInitDemoData } from '../db/hooks';
import type { Player } from '../db/hooks';

interface LowEnergyViewProps {
  onBack: () => void;
}

export const LowEnergyView: React.FC<LowEnergyViewProps> = ({ onBack }) => {
  const { franchise, loading: franchiseLoading } = useFranchise();
  const { players, loading: playersLoading } = usePlayers();
  const { reports, loading: reportsLoading } = useInjuryReports();
  const { setStatus } = useSetPlayerStatus();
  const { init } = useInitDemoData();

  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const handleSetStatus = async (playerId: string, status: Player['status']) => {
    setUpdating(playerId);
    try {
      await setStatus(playerId, status);
    } finally {
      setUpdating(null);
    }
  };

  const positionColors: Record<string, string> = {
    QB: 'text-cyan',
    RB: 'text-phos',
    WR: 'text-gold',
    LB: 'text-orchid',
    CB: 'text-sentinel',
    DL: 'text-white',
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
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
          <p className="text-xs text-white/50">Resin</p>
          <p className="text-lg font-bold text-gold">
            {franchiseLoading ? '...' : `${franchise?.resin_balance || 0} 🧪`}
          </p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Injury Reports */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-cyan">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold text-lg">Injury Reports</h2>
          </div>

          {reportsLoading ? (
            <div className="glass-panel rounded-xl p-6 text-center">
              <p className="text-white/50">Loading...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-panel rounded-xl p-6 text-center">
              <p className="text-white/50">No active injuries</p>
              <p className="text-xs text-white/30 mt-2">
                All players are healthy and ready to play
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="glass-panel rounded-xl p-4 border-l-4 border-l-yellow-400"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white">{report.player_name}</h3>
                      <p className="text-sm text-yellow-400">{report.injury_type}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded">
                        {report.recovery_games} games
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-white/50">Severity:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < report.severity ? 'bg-yellow-400' : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5v5 Roster */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-phos">
            <Activity className="w-5 h-5" />
            <h2 className="font-bold text-lg">5v5 Roster</h2>
          </div>

          {playersLoading ? (
            <div className="glass-panel rounded-xl p-6 text-center">
              <p className="text-white/50">Loading roster...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`glass-panel rounded-xl p-3 flex items-center gap-3 ${
                    player.status === 'injured' ? 'opacity-50' : ''
                  }`}
                >
                  <div className={`font-bold text-lg ${positionColors[player.position]}`}>
                    {player.position}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{player.name}</p>
                    <p className="text-xs text-white/50">
                      XP: {player.xp} • Fatigue: {player.fatigue}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <StatusButton
                      icon={<Moon className="w-4 h-4" />}
                      label="Rest"
                      active={player.status === 'resting'}
                      onClick={() => handleSetStatus(player.id, 'resting')}
                      disabled={updating === player.id}
                      color="cyan"
                    />
                    <StatusButton
                      icon={<BookOpen className="w-4 h-4" />}
                      label="Film"
                      active={player.status === 'film_study'}
                      onClick={() => handleSetStatus(player.id, 'film_study')}
                      disabled={updating === player.id}
                      color="phos"
                    />
                    <StatusButton
                      icon={<CheckCircle className="w-4 h-4" />}
                      label="Active"
                      active={player.status === 'active'}
                      onClick={() => handleSetStatus(player.id, 'active')}
                      disabled={updating === player.id}
                      color="orchid"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Results */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-gold">
            <Activity className="w-5 h-5" />
            <h2 className="font-bold text-lg">Async Results</h2>
          </div>

          <div className="glass-panel rounded-xl p-6 text-center">
            <p className="text-white/50">No completed matches to display</p>
            <p className="text-xs text-white/30 mt-2">
              Defensive match results appear here
            </p>
          </div>
        </section>
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-white/30">
          Low Energy Mode • Passive XP/Resin generation
        </p>
      </footer>
    </div>
  );
};

interface StatusButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  color: 'cyan' | 'phos' | 'orchid';
}

const StatusButton: React.FC<StatusButtonProps> = ({
  icon,
  label,
  active,
  onClick,
  disabled,
  color,
}) => {
  const colorClasses = {
    cyan: active ? 'bg-cyan/20 text-cyan border-cyan/50' : 'text-white/50 hover:bg-white/5',
    phos: active ? 'bg-phos/20 text-phos border-phos/50' : 'text-white/50 hover:bg-white/5',
    orchid: active ? 'bg-orchid/20 text-orchid border-orchid/50' : 'text-white/50 hover:bg-white/5',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg border border-transparent transition-all ${colorClasses[color]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={label}
    >
      {icon}
    </button>
  );
};
