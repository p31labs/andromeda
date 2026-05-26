import React, { useState } from 'react';
import { Battery, BatteryMedium, BatteryFull, Zap, Droplets } from 'lucide-react';
import { LowEnergyView } from './LowEnergyView';
import { MediumEnergyView } from './MediumEnergyView';
import { HighEnergyView } from './HighEnergyView';

export type SpoonLevel = 'low' | 'medium' | 'high';

export const SpoonRouter: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<SpoonLevel | null>(null);

  if (selectedLevel === 'low') {
    return <LowEnergyView onBack={() => setSelectedLevel(null)} />;
  }
  if (selectedLevel === 'medium') {
    return <MediumEnergyView onBack={() => setSelectedLevel(null)} />;
  }
  if (selectedLevel === 'high') {
    return <HighEnergyView onBack={() => setSelectedLevel(null)} />;
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Droplets className="w-8 h-8 text-orchid" />
            <h1 className="text-4xl font-bold text-white tracking-tight">
              P31 <span className="text-orchid">Liquid Sculptor</span>
            </h1>
          </div>
          <p className="text-white/60 text-sm">
            10,000 Particle Fluid Simulation
          </p>
          <p className="text-xs text-orchid/70">
            Spoon Theory — Energy-Based UX
          </p>
        </div>

        {/* Spoon Selection Cards */}
        <div className="space-y-4">
          {/* Low Energy - 1 Spoon */}
          <button
            onClick={() => setSelectedLevel('low')}
            className="w-full glass-panel rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center group-hover:bg-cyan/20 transition-colors">
                <Battery className="w-7 h-7 text-cyan" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Low Energy</h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan/20 text-cyan text-xs font-bold">
                    1 Spoon
                  </span>
                </div>
                <p className="text-white/50 text-sm mt-1">
                  5-minute loop • Gallery viewing
                </p>
              </div>
              <Zap className="w-5 h-5 text-cyan/50" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                🖼️ Gallery
              </span>
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                👁️ Spectate
              </span>
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                ♻️ Replay
              </span>
            </div>
          </button>

          {/* Medium Energy - 3 Spoons */}
          <button
            onClick={() => setSelectedLevel('medium')}
            className="w-full glass-panel rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-phos/10 border border-phos/30 flex items-center justify-center group-hover:bg-phos/20 transition-colors">
                <BatteryMedium className="w-7 h-7 text-phos" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Medium Energy</h2>
                  <span className="px-2 py-0.5 rounded-full bg-phos/20 text-phos text-xs font-bold">
                    3 Spoons
                  </span>
                </div>
                <p className="text-white/50 text-sm mt-1">
                  15-minute loop • Guided pouring
                </p>
              </div>
              <Zap className="w-5 h-5 text-phos/50" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                💧 Pour Cyan
              </span>
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                💚 Pour Phos
              </span>
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                🌀 Trigger Vortex
              </span>
            </div>
          </button>

          {/* High Energy - 6 Spoons */}
          <button
            onClick={() => setSelectedLevel('high')}
            className="w-full glass-panel rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orchid/10 border border-orchid/30 flex items-center justify-center group-hover:bg-orchid/20 transition-colors">
                <BatteryFull className="w-7 h-7 text-orchid" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">High Energy</h2>
                  <span className="px-2 py-0.5 rounded-full bg-orchid/20 text-orchid text-xs font-bold">
                    6 Spoons
                  </span>
                </div>
                <p className="text-white/50 text-sm mt-1">
                  30-minute loop • Active sculpting
                </p>
              </div>
              <Zap className="w-5 h-5 text-orchid/50" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                🎨 Multi-touch
              </span>
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                🌊 Force Fields
              </span>
              <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-white/70">
                💖 Love Vortex
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-white/30">
            Powered by PGLite • CPU-side Float32Arrays • Custom Shaders
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-white/20">
            <span>10,000 Particles</span>
            <span>•</span>
            <span>60 FPS Target</span>
            <span>•</span>
            <span>Deterministic</span>
          </div>
        </div>
      </div>
    </div>
  );
};
