import React, { useState } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';

export function HearthSurface({ theme, spoons }: { theme: Record<string, string>; spoons: number }) {
  const { setSpoons } = useAtmosphere();
  const [activeTab, setActiveTab] = useState('overview');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [recipeScale, setRecipeScale] = useState(4);

  const handleEnergyChange = (level: number) => {
    setEnergyLevel(level);
    if (level <= 3 && spoons > 1) {
      setSpoons(Math.max(1, spoons - 1));
    }
  };

  const energyColor = energyLevel >= 7 ? 'text-emerald-400' : energyLevel >= 4 ? 'text-amber-400' : 'text-red-400';
  const energyLabel = energyLevel >= 7 ? 'Good' : energyLevel >= 4 ? 'Moderate' : 'Low';

  if (spoons <= 2) {
    return (
      <div className="space-y-4 w-full">
        <div className="text-xs font-mono tracking-widest uppercase opacity-60 text-center">Hearth</div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center space-y-3">
          <div className="text-xs opacity-70">How are you feeling?</div>
          <input
            type="range"
            min="1"
            max="10"
            value={energyLevel}
            onChange={(e) => handleEnergyChange(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className={`font-mono text-sm font-bold ${energyColor}`}>
            {energyLevel}/10 — {energyLabel}
          </div>
        </div>
        <div className="text-[10px] font-mono opacity-30 text-center">
          {energyLevel <= 3 ? 'Energy low. Consider resting or journaling.' : 'Logging your energy helps PHOS adapt.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono tracking-widest uppercase opacity-60">Hearth</h3>
        <div className="flex gap-2 font-mono text-[9px]">
          {['overview', 'energy', 'kitchen'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-2 py-0.5 rounded capitalize ${t === activeTab ? 'bg-white/10 text-white border border-white/10' : 'opacity-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <div className="text-xs opacity-70 mb-2">Current Energy</div>
            <div className={`text-lg font-mono font-bold ${energyColor}`}>{energyLevel}/10 — {energyLabel}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveTab('energy')} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs font-mono text-left hover:bg-white/10 transition-colors">
              <div className="text-orange-400 mb-1">⚡ Log Energy</div>
              <div className="opacity-50 text-[10px]">Track how you feel</div>
            </button>
            <button onClick={() => setActiveTab('kitchen')} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs font-mono text-left hover:bg-white/10 transition-colors">
              <div className="text-amber-400 mb-1">🍳 Kitchen</div>
              <div className="opacity-50 text-[10px]">Meal planning</div>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'energy' && (
        <div className="space-y-3">
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
            <div className="text-xs opacity-70">Energy Level</div>
            <input
              type="range"
              min="1"
              max="10"
              value={energyLevel}
              onChange={(e) => handleEnergyChange(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-[10px] font-mono opacity-40">
              <span>Exhausted</span>
              <span className={`font-bold ${energyColor}`}>{energyLevel}/10</span>
              <span>Energized</span>
            </div>
          </div>
          {energyLevel <= 3 && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs font-mono text-red-400">
              ⚠️ Energy very low. PHOS has simplified your interface. Consider resting.
            </div>
          )}
        </div>
      )}

      {activeTab === 'kitchen' && (
        <div className="space-y-3">
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <div className="text-xs font-mono text-amber-400 mb-1">Sovereign Oat Base</div>
            <div className="text-[10px] opacity-50 mb-2">
              {recipeScale} servings · {600 * recipeScale}mL water · {60 * recipeScale}g oats
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="opacity-40">Scale:</span>
              {[1, 2, 4, 6, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setRecipeScale(s)}
                  className={`px-2 py-0.5 rounded ${s === recipeScale ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40' : 'opacity-40 hover:opacity-60'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] opacity-70">
            <div className="font-mono text-[10px] opacity-40 uppercase mb-1">Instructions</div>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Bring {600 * recipeScale}mL water to boil</li>
              <li>Add {60 * recipeScale}g oats, reduce heat</li>
              <li>Stir 3-5 minutes until thickened</li>
              <li>Serve with toppings of choice</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
