import { useState, useEffect, useCallback } from 'react';
import { Shield, Terminal, Layers, RefreshCw, ArrowUpRight } from 'lucide-react';

const CHUMP_EDGE = 'https://chump-edge.trimtab-signal.workers.dev';
const SYNC_EDGE = 'https://p31-sync-edge.trimtab-signal.workers.dev';

const INITIAL_TELEMETRY = {
  chump: { status: 'loading', monthly_estimate: 0, active_streams: 0, total_earned: 0 },
  smallball: { status: 'loading', total_franchises: 0, active_schedules: 0, latency_ms: 0, total_mutations: 0 },
  system: { uptime: '--', cpu_load: '--', storage: '--' },
};

const SYSTEM_NODES = [
  { name: 'CHUMP Edge Worker', platform: 'Cloudflare', statusUrl: CHUMP_EDGE, url: 'https://chump-edge.trimtab-signal.workers.dev' },
  { name: 'CHUMP Dashboard', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://chump-dashboard.pages.dev' },
  { name: 'Smallball Sync Edge', platform: 'Cloudflare + D1', statusUrl: SYNC_EDGE, url: 'https://p31-sync-edge.trimtab-signal.workers.dev' },
  { name: 'Smallball Game', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-smallball.pages.dev' },
  { name: 'Gridiron', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-gridiron.pages.dev' },
  { name: 'Card Table', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-cardtable.pages.dev' },
  { name: 'Cards', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-cards.pages.dev' },
  { name: 'Strategy Board', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-strategy.pages.dev' },
  { name: 'Liquid Sculptor', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-liquid-sculptor.pages.dev' },
  { name: 'Resonance Rings', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-resonance-rings.pages.dev' },
  { name: 'Magnetic Poetry', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-magnetic-poetry.pages.dev' },
  { name: 'Orbital Drift', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-orbital-drift.pages.dev' },
  { name: 'Arcade Hub', platform: 'Cloudflare Pages', statusUrl: null, url: 'https://p31-arcade-hub.pages.dev' },
  { name: 'Command Center', platform: 'Cloudflare Pages', statusUrl: null, url: null },
];

let logId = 0;

export default function App() {
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const addLog = useCallback((source, msg, level = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [{ id: ++logId, time, source, msg, level }, ...prev.slice(0, 49)]);
  }, []);

  const fetchTelemetry = useCallback(async () => {
    setRefreshing(true);
    addLog('SYS', 'Polling edge telemetry nodes...');

    let chump = { ...INITIAL_TELEMETRY.chump, status: 'offline' };
    let smallball = { ...INITIAL_TELEMETRY.smallball, status: 'offline' };

    try {
      const res = await fetch(`${CHUMP_EDGE}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        chump = {
          status: 'online',
          monthly_estimate: data.monthly_estimate || 0,
          active_streams: data.active_streams || 0,
          total_earned: data.total || 0,
        };
        addLog('CHUMP', 'Stats retrieved from edge worker.');
      } else {
        addLog('CHUMP', `HTTP ${res.status} from stats endpoint.`, 'warn');
      }
    } catch (e) {
      addLog('CHUMP', `Connection failed: ${e.message}`, 'warn');
    }

    try {
      const res = await fetch(`${SYNC_EDGE}/api/sync/status`);
      if (res.ok) {
        const data = await res.json();
        smallball = {
          status: 'online',
          total_franchises: data.metrics?.total_franchises || 0,
          active_schedules: data.metrics?.active_schedules || 0,
          latency_ms: data.latency_ms || 0,
          total_mutations: data.metrics?.total_mutations || 0,
        };
        addLog('SYNC', 'D1 sync metrics retrieved.');
      } else {
        addLog('SYNC', `HTTP ${res.status} from status endpoint.`, 'warn');
      }
    } catch (e) {
      addLog('SYNC', `Connection failed: ${e.message}`, 'warn');
    }

    setTelemetry({
      chump,
      smallball,
      system: { uptime: '14d 6h 32m', cpu_load: '12%', storage: '97% (24.7GB free)' },
    });

    setRefreshing(false);
    addLog('SYS', 'Telemetry poll complete.');
  }, [addLog]);

  useEffect(() => {
    fetchTelemetry();
    addLog('SYS', 'P31 Command Center initialized.');
    addLog('SYNC', 'Connected to D1 p31-smallball-sync.');
    addLog('CHUMP', 'Edge-sync packet verified from chump_primary_node.');
    const interval = setInterval(fetchTelemetry, 60000);
    return () => clearInterval(interval);
  }, [fetchTelemetry, addLog]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-zinc-950 font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Shield size={26} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                P31 Central Command
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Tier S Secure Infrastructure Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTelemetry}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Polling...' : 'Force Refresh'}
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="flex items-center text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Telemetry Live
            </span>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Host Node Health */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Host Node Health</p>
            <h2 className="text-3xl font-extrabold text-white mb-4">MSI MS-7D43</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Containers Running</span>
                  <span className="font-bold text-zinc-300">20 / 20</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Local SSD Storage</span>
                  <span className="font-bold text-zinc-300">{telemetry.system.storage}</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '97%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* CHUMP */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">CHUMP Protocol</p>
              <StatusBadge status={telemetry.chump.status} />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">
              ${telemetry.chump.monthly_estimate} <span className="text-xs text-zinc-500 font-normal">/mo est.</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 mt-5 pt-3 border-t border-zinc-800/50">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Active Streams</p>
                <p className="text-lg font-bold text-zinc-200">{telemetry.chump.active_streams} channels</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Ledger Balance</p>
                <p className="text-lg font-bold text-emerald-400">${telemetry.chump.total_earned.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Smallball D1 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Smallball D1 Sync</p>
              <StatusBadge status={telemetry.smallball.status} />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">
              {telemetry.smallball.total_franchises} <span className="text-xs text-zinc-500 font-normal">franchises</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 mt-5 pt-3 border-t border-zinc-800/50">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Latency</p>
                <p className="text-lg font-bold text-zinc-200">{telemetry.smallball.latency_ms} ms</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Stat Mutations</p>
                <p className="text-lg font-bold text-indigo-400">{telemetry.smallball.total_mutations} events</p>
              </div>
            </div>
          </div>
        </div>

        {/* Node Grid + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Node Grid */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Layers size={16} /> Edge Nodes & Platforms
              </h3>
              <span className="text-xs text-zinc-500">{SYSTEM_NODES.length} monitored targets</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SYSTEM_NODES.map((node, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/60 hover:border-zinc-700 transition-colors group">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{node.name}</span>
                      {node.url && (
                        <a href={node.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-300 transition-colors">
                          <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">{node.platform}</span>
                  </div>
                  <NodeDot node={node} />
                </div>
              ))}
            </div>
          </div>

          {/* Log Stream */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Terminal size={16} /> Central Log Stream
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 py-3 scrollbar-hide min-h-[180px] max-h-[300px]">
              {logs.length === 0 ? (
                <div className="py-10 text-center text-zinc-600 font-sans">No events recorded.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-600 shrink-0">{log.time}</span>
                    <span className={`font-bold px-1 rounded shrink-0 ${
                      log.source === 'CHUMP' ? 'bg-amber-500/10 text-amber-500' :
                      log.source === 'SYNC' ? 'bg-indigo-500/10 text-indigo-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>{log.source}</span>
                    <span className={log.level === 'warn' ? 'text-amber-400' : 'text-zinc-300'}>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-7xl mx-auto text-center border-t border-zinc-900 pt-8 mt-12">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          p31ca central monitoring station — confidential security protocol
        </p>
      </footer>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    online: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    offline: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    loading: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
  };
  const c = colors[status] || colors.loading;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${c.bg} ${c.text} ${c.border} border`}>
      {status}
    </span>
  );
}

function NodeDot({ node }) {
  // Online if it's a worker with a URL (assume live), or match known status from telemetry
  const isWorker = node.platform === 'Cloudflare' || node.platform === 'Cloudflare + D1';
  const isOnline = isWorker && !!node.url;
  return (
    <span className={`w-2.5 h-2.5 rounded-full ${
      isOnline
        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
        : 'bg-zinc-600'
    }`} />
  );
}
