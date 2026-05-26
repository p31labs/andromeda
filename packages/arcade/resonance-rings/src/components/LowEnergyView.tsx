import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, Play, Activity } from 'lucide-react';
import { useGallery, useLikeGallery, usePulseEvents } from '../db/hooks';
import { createSpringPhysics } from '../engine/SpringPhysics';
import { ResonanceGrid } from './ResonanceGrid';
import type { SpringPhysics } from '../engine/SpringPhysics';

interface LowEnergyViewProps {
  onBack: () => void;
}

export const LowEnergyView: React.FC<LowEnergyViewProps> = ({ onBack }) => {
  const { items, loading: galleryLoading } = useGallery();
  const { like } = useLikeGallery();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [physics, setPhysics] = useState<SpringPhysics | null>(null);

  // Load selected session
  useEffect(() => {
    if (!selectedSession) {
      setPhysics(null);
      return;
    }

    const item = items.find(i => i.session_id === selectedSession);
    if (!item) return;

    // Create physics with session seed
    const newPhysics = createSpringPhysics(item.prng_seed);
    setPhysics(newPhysics);
  }, [selectedSession, items]);

  const handleLike = async (id: string) => {
    await like(id);
  };

  if (selectedSession && physics) {
    const item = items.find(i => i.session_id === selectedSession);
    return (
      <div className="h-screen bg-bg flex flex-col">
        <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSelectedSession(null)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-cyan" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{item?.title || 'Gallery'}</h1>
          </div>
          <button onClick={onBack} className="text-sm text-white/50">
              Exit
            </button>
          </header>

        <main className="flex-1">
          <ResonanceGrid physics={physics} />
        </main>

        <footer className="bg-white/5 backdrop-blur-md px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-white/50">Autonomous playback</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-orchid">Peak: {item?.peak_harmony.toFixed(1)}</span>
            <span className="text-xs text-white/30">by {item?.creator_pubkey.slice(0, 8)}...</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
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
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Resonance Gallery</h2>
          <p className="text-white/50 text-sm">
            Watch autonomous wave simulations
          </p>
        </div>

        {galleryLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/50">Loading gallery...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/50">No sessions in gallery yet</p>
            <p className="text-xs text-white/30 mt-2">
              Create one in High Energy mode
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedSession(item.session_id)}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan/20 to-phos/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/70" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{item.title}</h3>
                    <p className="text-sm text-white/50 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Peak: {item.peak_harmony.toFixed(1)}
                      </span>
                      <span>by {item.creator_pubkey.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(item.id);
                    }}
                    className="flex items-center gap-1 text-orchid hover:text-orchid/80"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-xs">{item.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-white/30">
          Low Energy Mode • Ambient viewing • Gallery sync
        </p>
      </footer>
    </div>
  );
};
