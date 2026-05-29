import React, { useState, useEffect } from 'react';
import { Target, Clock, DollarSign, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

const CASHPILOT_API_URL = 'http://localhost:8081';
const API_KEY = 'chump_master_key_2026';

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${CASHPILOT_API_URL}/api/tasks`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      if (!response.ok) throw new Error(`API returned status ${response.status}`);
      const data = await response.json();
      setTasks(data.tasks || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setError("Failed to connect to CashPilot Node. Ensure the local worker is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Target className="text-amber-500 w-8 h-8" />
              Active Bounties
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">
              Curated high-value micro-tasks sourced via CashPilot bridge. Minimum threshold: $12.00/hr.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
             <div className="text-xs text-zinc-500">
               Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
             <button
                onClick={fetchTasks}
                disabled={isLoading}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
             >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Connection Error</h3>
              <p className="text-xs mt-1 opacity-80">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {!isLoading && tasks.length === 0 && !error && (
            <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
              No bounties currently meet the minimum threshold. Check back later.
            </div>
          )}

          {isLoading && tasks.length === 0 ? (
             [1, 2, 3].map((n) => (
                <div key={n} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 animate-pulse h-48"></div>
             ))
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col h-full"
              >
                <div className="absolute top-4 right-4">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                    task.platform === 'MTurk'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {task.platform}
                  </span>
                </div>

                <div className="text-xs text-zinc-500 font-medium mb-3 uppercase tracking-wider">
                  {task.requester}
                </div>

                <h3 className="text-lg font-bold text-zinc-100 leading-snug mb-4 flex-grow">
                  {task.title}
                </h3>

                <div className="mt-auto space-y-4">
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-800/50">
                    <div>
                       <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Payout</div>
                       <div className="text-emerald-400 font-bold flex items-center gap-1">
                          <DollarSign size={14} />
                          {task.reward.toFixed(2)}
                       </div>
                    </div>
                    <div>
                       <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Time</div>
                       <div className="text-zinc-300 font-medium flex items-center gap-1 text-sm">
                          <Clock size={14} className="text-zinc-500" />
                          {task.timeEstimateMins}m
                       </div>
                    </div>
                    <div>
                       <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Est. /Hr</div>
                       <div className="text-amber-500 font-bold text-sm">
                          ${task.hourlyRateEst.toFixed(2)}
                       </div>
                    </div>
                  </div>

                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    Accept Bounty
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
