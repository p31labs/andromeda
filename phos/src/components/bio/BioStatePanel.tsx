import { motion } from 'framer-motion';
import { useBioStore } from '../../lib/bioStore';

interface Props {
  compact?: boolean;
}

export function BioStatePanel({ compact = false }: Props) {
  const { calcium, spoons, hrv, lastUpdate, getQMUState } = useBioStore();
  const qmuState = getQMUState();
  
  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (compact) {
    return (
      <div className="p-4 border-t border-white/5">
        <h3 className="text-sm font-medium text-[#6b7280] mb-3">Bio-State</h3>
        <div className="space-y-2">
          <CompactMetric 
            label="Spoons" 
            value={`${Math.round(spoons * 100)}%`} 
            percentage={spoons * 100}
            color="#5DCAA5"
          />
          <CompactMetric 
            label="Calcium" 
            value={`${calcium.toFixed(1)}`} 
            percentage={(calcium / 12) * 100}
            color={calcium < 8 ? '#ef4444' : '#5DCAA5'}
            unit="mg/dL"
          />
          <CompactMetric 
            label="HRV" 
            value={`${hrv}`} 
            percentage={(hrv / 100) * 100}
            color="#a78bfa"
            unit="ms"
          />
        </div>
        <div className="text-xs text-[#6b7280] mt-3">
          Updated {formatTime(lastUpdate)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {qmuState !== 'normal' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            qmuState === 'critical' 
              ? 'bg-red-500/20 border-red-500/50' 
              : 'bg-yellow-500/20 border-yellow-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{qmuState === 'critical' ? '🚨' : '⚠️'}</span>
            <div>
              <div className={`font-bold ${qmuState === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                {qmuState === 'critical' ? 'CRITICAL: Gray Rock Protocol' : 'LOW SPOONS WARNING'}
              </div>
              <div className="text-sm text-[#6b7280]">
                {qmuState === 'critical' 
                  ? `Calcium at ${calcium} mg/dL. Emergency mode active.` 
                  : 'Consider deferring non-essential tasks.'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Spoon Energy"
          value={`${Math.round(spoons * 100)}%`}
          subtitle={spoons > 0.6 ? 'Well resourced' : spoons > 0.3 ? 'Moderate' : 'Depleted'}
          percentage={spoons * 100}
          color="#5DCAA5"
          icon="⚡"
        />
        <MetricCard
          title="Serum Calcium"
          value={calcium.toFixed(1)}
          unit="mg/dL"
          subtitle={calcium < 7.5 ? 'CRITICAL' : calcium < 8 ? 'Low' : calcium > 10 ? 'Elevated' : 'Normal'}
          percentage={(calcium / 12) * 100}
          color={calcium < 7.5 ? '#ef4444' : calcium < 8 ? '#fbbf24' : '#5DCAA5'}
          icon="🦴"
        />
        <MetricCard
          title="Heart Rate Variability"
          value={hrv}
          unit="ms"
          subtitle={hrv < 40 ? 'High stress' : hrv < 60 ? 'Moderate' : 'Good recovery'}
          percentage={(hrv / 100) * 100}
          color="#a78bfa"
          icon="💓"
        />
      </div>

      {/* Manual Entry */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-medium mb-3">Manual Update</h3>
        <div className="grid grid-cols-3 gap-3">
          <button className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
            Log Calcium
          </button>
          <button className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
            Estimate Spoons
          </button>
          <button className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
            Sync Wearable
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactMetric({ label, value, percentage, color, unit }: { 
  label: string; 
  value: string; 
  percentage: number; 
  color: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-[#6b7280]">{label}</span>
          <span style={{ color }}>{value}{unit}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, percentage)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, subtitle, percentage, color, icon }: {
  title: string;
  value: string | number;
  unit?: string;
  subtitle: string;
  percentage: number;
  color: string;
  icon: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-[#6b7280]">{title}</span>
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color }}>
        {value}{unit && <span className="text-lg text-[#6b7280] ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-[#6b7280] mb-3">{subtitle}</div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percentage)}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
}
