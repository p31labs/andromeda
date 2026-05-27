/**
 * HearthSurface.tsx — The Hearth (Family & Care Mesh).
 *
 * Reads from Maid Manager and Matriarch Culinary Node data.
 * Consolidates: active recipes, next paced chores, pain levels.
 * If pain threshold exceeded → dispatches spoon decrement event.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface ChoreEntry {
  id: string;
  title: string;
  zone: string;
  painRisk: 'low' | 'medium' | 'high';
  estimatedMin: number;
  status: 'pending' | 'active' | 'done';
  nextScheduled: string;
}

interface RecipeEntry {
  id: string;
  name: string;
  servings: number;
  prepTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: number;
}

interface PainLog {
  id: string;
  level: number; // 0-10
  location: string;
  timestamp: string;
}

interface HearthData {
  chores: ChoreEntry[];
  recipes: RecipeEntry[];
  recentPain: PainLog[];
  activeChoreCount: number;
  completedToday: number;
}

interface Props {
  className?: string;
  spoons: number;
  grayRock: boolean;
  onPainAlert: () => void;
}

export const HearthSurface: React.FC<Props> = ({ className, spoons, grayRock, onPainAlert }) => {
  const [data, setData] = useState<HearthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'chores' | 'kitchen'>('overview');

  const loadData = useCallback(async () => {
    // Read from localStorage-based state (Maid Manager + Culinary use localStorage)
    try {
      // Maid Manager data
      const maidState = localStorage.getItem('maid-manager-storage');
      const chores: ChoreEntry[] = [];
      let activeCount = 0;
      let completed = 0;

      if (maidState) {
        try {
          const parsed = JSON.parse(maidState);
          // Extract whatever state the maid manager stores
          if (parsed.state) {
            activeCount = parsed.state.activeChoreCount || 0;
            completed = parsed.state.completedToday || 0;
          }
        } catch { /* malformed */ }
      }

      // Culinary node data
      const culinaryState = localStorage.getItem('matriarch-culinary-storage');
      const recipes: RecipeEntry[] = [];
      if (culinaryState) {
        try {
          const parsed = JSON.parse(culinaryState);
          if (parsed.state?.recipes) {
            recipes.push(...(parsed.state.recipes as RecipeEntry[]));
          }
        } catch { /* malformed */ }
      }

      // Pain logs from EventLogger
      const eventLogRaw = localStorage.getItem('phos_event_log');
      const recentPain: PainLog[] = [];
      if (eventLogRaw) {
        try {
          const events = JSON.parse(eventLogRaw);
          for (const evt of events) {
            if (evt.type === 'PAIN_LOGGED' || (evt.data && evt.data.painLevel !== undefined)) {
              recentPain.push({
                id: evt.id,
                level: evt.data.painLevel || 0,
                location: evt.data.location || 'unknown',
                timestamp: evt.timestamp,
              });
            }
          }
        } catch { /* malformed */ }
      }

      // Check pain threshold
      const latestPain = recentPain[0];
      if (latestPain && latestPain.level >= 7 && !grayRock) {
        onPainAlert();
      }

      setData({
        chores,
        recipes,
        recentPain: recentPain.slice(0, 5),
        activeChoreCount: activeCount,
        completedToday: completed,
      });
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [grayRock, onPainAlert]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (grayRock || spoons === 0) {
    return (
      <div className={className}>
        <p className="text-xs opacity-50">Hearth suspended.</p>
      </div>
    );
  }

  if (loading) return <div className={className}>Loading hearth…</div>;

  // SANCTUARY: simplified view
  if (spoons <= 2) {
    return (
      <div className={className}>
        <h2 className="text-2xl font-semibold mb-4">The Hearth</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <div className="text-3xl mb-2">{data?.activeChoreCount || 0}</div>
            <div className="text-sm text-gray-400">Active Chores</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <div className="text-3xl mb-2">{data?.completedToday || 0}</div>
            <div className="text-sm text-gray-400">Completed Today</div>
          </div>
          {data?.recentPain[0] && (
            <div className={`p-4 rounded-xl text-center ${data.recentPain[0].level >= 7 ? 'bg-red-950/30 border border-red-800/30' : 'bg-white/5'}`}>
              <div className="text-sm">Pain: {data.recentPain[0].level}/10 — {data.recentPain[0].location}</div>
              {data.recentPain[0].level >= 7 && <div className="text-xs text-red-400 mt-1">⚠ Reducing spoons. Rest recommended.</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // QUANTUM/BRIDGE: full dashboard
  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-4">The Hearth</h2>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        {(['overview', 'chores', 'kitchen'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              activeTab === tab
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-amber-400">{data?.activeChoreCount || 0}</div>
            <div className="text-[10px] text-gray-500 uppercase">Active Chores</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-emerald-400">{data?.completedToday || 0}</div>
            <div className="text-[10px] text-gray-500 uppercase">Done Today</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-purple-400">{data?.recipes?.length || 0}</div>
            <div className="text-[10px] text-gray-500 uppercase">Recipes</div>
          </div>
          {data?.recentPain.map((p) => (
            <div key={p.id} className={`p-3 rounded-lg border text-center ${
              p.level >= 7 ? 'bg-red-950/20 border-red-800/30' : 'bg-white/5 border-white/10'
            }`}>
              <div className={`text-lg font-bold ${p.level >= 7 ? 'text-red-400' : 'text-gray-300'}`}>{p.level}/10</div>
              <div className="text-[10px] text-gray-500">{p.location}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'chores' && (
        <div className="space-y-2">
          {data?.chores?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No chores scheduled. Open Maid Manager to add.</p>
          ) : (
            data?.chores.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  c.painRisk === 'high' ? 'bg-red-400' : c.painRisk === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <span className="flex-1">{c.title}</span>
                <span className="text-xs text-gray-500">{c.estimatedMin}m</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  c.status === 'done' ? 'bg-emerald-900/30 text-emerald-400' :
                  c.status === 'active' ? 'bg-amber-900/30 text-amber-400' :
                  'bg-white/5 text-gray-500'
                }`}>{c.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'kitchen' && (
        <div className="space-y-2">
          {data?.recipes?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No recipes loaded. Open Matriarch Culinary Node to add.</p>
          ) : (
            data?.recipes.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-sm">
                <span className="flex-1">{r.name}</span>
                <span className="text-xs text-gray-500">{r.servings} srv</span>
                <span className="text-xs text-gray-500">{r.prepTime}m</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  r.difficulty === 'easy' ? 'bg-emerald-900/30 text-emerald-400' :
                  r.difficulty === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                  'bg-red-900/30 text-red-400'
                }`}>{r.difficulty}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HearthSurface;
