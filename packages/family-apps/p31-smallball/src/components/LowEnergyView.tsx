import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, FileText, Gift, Clock, Plus, Trash2, Play, CheckCircle, X, Loader2 } from 'lucide-react';
import { useFranchise, useScoutReports, useClaimScoutReport, useInitDemoData, usePlayers, useScheduledTraining, useSetScheduledTraining, useDeleteScheduledTraining, useToggleScheduledTraining, useExecuteScheduledTraining } from '../db/hooks';
import type { ScoutReport, ScheduledTrainingRow } from '../db/hooks';
import { ATTRIBUTE_DISPLAY_NAMES, STATION_CONFIGS } from '../data/facilities';
import type { TrainingStation } from '../types';

interface LowEnergyViewProps {
  onBack: () => void;
}

const STATIONS: { key: TrainingStation; icon: string }[] = [
  { key: 'IRON_MIKE', icon: '⚾' },
  { key: 'TRACK_SLEDS', icon: '🏃' },
  { key: 'BULLPEN', icon: '🎯' },
  { key: 'POP_FLY', icon: '🧤' },
  { key: 'FILM_ROOM', icon: '🧠' },
];

export const LowEnergyView: React.FC<LowEnergyViewProps> = ({ onBack }) => {
  const { franchise, loading: franchiseLoading } = useFranchise();
  const { reports, loading: reportsLoading } = useScoutReports();
  const { claim } = useClaimScoutReport();
  const { init } = useInitDemoData();
  const { players } = usePlayers();
  const { schedules, loading: schedLoading, refresh: refreshSchedules } = useScheduledTraining();
  const { setSchedule } = useSetScheduledTraining();
  const { deleteSchedule } = useDeleteScheduledTraining();
  const { toggle } = useToggleScheduledTraining();
  const { executeAll } = useExecuteScheduledTraining();

  const [claiming, setClaiming] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formPlayer, setFormPlayer] = useState<string>('');
  const [formStation, setFormStation] = useState<TrainingStation | ''>('');
  const [saving, setSaving] = useState(false);
  const [autoResults, setAutoResults] = useState<Array<{ playerName: string; station: string; sessions: number; xpSummary: string }>>([]);
  const [autoRunning, setAutoRunning] = useState(false);

  // Initialize demo data + auto-execute on mount
  useEffect(() => {
    init();
  }, [init]);

  const runAutoExecute = useCallback(async () => {
    if (!franchise?.id || autoRunning) return;
    setAutoRunning(true);
    const result = await executeAll(franchise.id);
    if (result.executed.length > 0) {
      setAutoResults(result.results);
      refreshSchedules();
    }
    setAutoRunning(false);
  }, [franchise?.id, executeAll, autoRunning, refreshSchedules]);

  // Auto-execute when franchise loads
  useEffect(() => {
    if (franchise?.id) {
      runAutoExecute();
    }
  }, [franchise?.id, runAutoExecute]);

  const handleClaim = async (reportId: string) => {
    setClaiming(reportId);
    try {
      await claim(reportId);
    } catch (err) {
      console.error('Failed to claim:', err);
    } finally {
      setClaiming(null);
    }
  };

  const handleSaveSchedule = async () => {
    if (!formPlayer || !formStation || !franchise?.id) return;
    setSaving(true);
    try {
      await setSchedule(formPlayer, franchise.id, formStation);
      setShowForm(false);
      setFormPlayer('');
      setFormStation('');
      refreshSchedules();
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSchedule(id);
    refreshSchedules();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggle(id, current);
    refreshSchedules();
  };

  const formatTimeSince = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const ms = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-cyan" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Low Energy Mode</h1>
          <p className="text-xs text-white/50">1 Spoon • 5-Minute Loop</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Resin Balance</p>
          <p className="text-lg font-bold text-gold">
            {franchiseLoading ? '...' : `${franchise?.resin_balance || 0} 🧪`}
          </p>
        </div>
      </header>

      {/* Auto-Execute Results Toast */}
      {autoResults.length > 0 && (
        <div className="mx-4 mt-3 space-y-1">
          {autoResults.map((r, i) => (
            <div key={i} className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 border-phos/30">
              <Play className="w-4 h-4 text-phos shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{r.playerName}</p>
                <p className="text-xs text-white/50">{r.sessions} session{r.sessions > 1 ? 's' : ''} at {STATION_CONFIGS[r.station as TrainingStation]?.name || r.station}</p>
              </div>
              <span className="text-phos text-sm font-bold">{r.xpSummary}</span>
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Scout Reports */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-cyan">
            <FileText className="w-5 h-5" />
            <h2 className="font-bold text-lg">Scout Reports</h2>
          </div>
          {reportsLoading ? (
            <div className="glass-panel rounded-xl p-8 text-center">
              <p className="text-white/50">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-panel rounded-xl p-8 text-center">
              <p className="text-white/50">No new scout reports</p>
              <p className="text-xs text-white/30 mt-2">Check back later for talent discoveries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ScoutReportCard
                  key={report.id}
                  report={report}
                  onClaim={() => handleClaim(report.id)}
                  claiming={claiming === report.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Auto-Training Scheduler */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-phos">
              <Clock className="w-5 h-5" />
              <h2 className="font-bold text-lg">Auto-Training</h2>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="glass-panel rounded-lg px-3 py-2 text-xs font-bold text-phos border-phos/30 hover:bg-white/10 flex items-center gap-1"
            >
              {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showForm ? 'Cancel' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-white/50">
            Set players to train automatically while you're away.
          </p>

          {/* Add Schedule Form */}
          {showForm && (
            <div className="glass-panel rounded-xl p-4 space-y-4">
              {/* Player Picker */}
              <div>
                <p className="text-xs font-bold text-white/70 mb-2">Player</p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setFormPlayer(p.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                        formPlayer === p.id
                          ? 'bg-phos/20 text-phos border border-phos/50'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {p.first_name} #{p.jersey_number}
                    </button>
                  ))}
                </div>
              </div>

              {/* Station Picker */}
              <div>
                <p className="text-xs font-bold text-white/70 mb-2">Station</p>
                <div className="flex flex-wrap gap-2">
                  {STATIONS.map((s) => {
                    const cfg = STATION_CONFIGS[s.key];
                    return (
                      <button
                        key={s.key}
                        onClick={() => setFormStation(s.key)}
                        className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                          formStation === s.key
                            ? 'bg-phos/20 text-phos border border-phos/50'
                            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {s.icon} {cfg.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveSchedule}
                disabled={!formPlayer || !formStation || saving}
                className="w-full glass-button py-3 rounded-lg font-bold text-phos border-phos/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Set Auto-Training'}
              </button>
            </div>
          )}

          {/* Schedule List */}
          {schedLoading ? (
            <div className="glass-panel rounded-xl p-6 text-center">
              <p className="text-white/50">Loading schedules...</p>
            </div>
          ) : schedules.length === 0 && !showForm ? (
            <div className="glass-panel rounded-xl p-6 text-center">
              <p className="text-white/50">No auto-training schedules</p>
              <p className="text-xs text-white/30 mt-2">Set one up to train players while idle</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.map((sched) => {
                const cfg = STATION_CONFIGS[sched.station as TrainingStation];
                const stationIcon = STATIONS.find(s => s.key === sched.station)?.icon || '⚙️';
                return (
                  <div
                    key={sched.id}
                    className={`glass-panel rounded-xl p-4 transition-all ${sched.auto_enabled ? 'border-phos/20' : 'opacity-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{stationIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">
                          {sched.first_name} {sched.last_name[0]}.
                        </p>
                        <p className="text-xs text-white/50">
                          {cfg?.name || sched.station}
                          {sched.focus_attribute !== 'BALANCED' && ` → ${ATTRIBUTE_DISPLAY_NAMES[sched.focus_attribute as keyof typeof ATTRIBUTE_DISPLAY_NAMES] || sched.focus_attribute}`}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          Last: {formatTimeSince(sched.last_executed_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle(sched.id, sched.auto_enabled)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          sched.auto_enabled ? 'bg-phos' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          sched.auto_enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`} />
                      </button>
                      <button
                        onClick={() => handleDelete(sched.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Async Match Results */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-orchid">
            <Gift className="w-5 h-5" />
            <h2 className="font-bold text-lg">Async Match Results</h2>
          </div>
          <div className="glass-panel rounded-xl p-6 text-center">
            <p className="text-white/50">No completed async matches to claim</p>
            <p className="text-xs text-white/30 mt-2">
              Defensive wins appear here when opponents challenge you
            </p>
          </div>
        </section>
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-white/30">
          Low Energy Mode — auto-training replays while you were away
        </p>
      </footer>
    </div>
  );
};

// Scout Report Card Component
interface ScoutReportCardProps {
  report: ScoutReport;
  onClaim: () => void;
  claiming: boolean;
}

const ScoutReportCard: React.FC<ScoutReportCardProps> = ({ report, onClaim, claiming }) => {
  const timeLeft = new Date(report.expires_at).getTime() - Date.now();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  const reportTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
    talent_spotting: { label: 'Talent Spotting', icon: '👁️', color: 'text-cyan' },
    opponent_analysis: { label: 'Opponent Analysis', icon: '📊', color: 'text-orchid' },
    training_insight: { label: 'Training Insight', icon: '💡', color: 'text-phos' },
  };

  const typeInfo = reportTypeLabels[report.report_type] || {
    label: report.report_type,
    icon: '📋',
    color: 'text-white',
  };

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{typeInfo.icon}</span>
        <div className="flex-1">
          <h3 className={`font-bold ${typeInfo.color}`}>{typeInfo.label}</h3>
          <p className="text-xs text-white/50 mt-1">
            Reward: <span className="text-gold font-bold">{report.reward_resin} Resin</span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/40">
          <Clock className="w-3 h-3" />
          <span>{hoursLeft}h left</span>
        </div>
      </div>
      <button
        onClick={onClaim}
        disabled={claiming}
        className="w-full glass-button py-3 rounded-lg font-bold text-cyan border-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {claiming ? 'Claiming...' : 'Claim Reward'}
      </button>
    </div>
  );
};
