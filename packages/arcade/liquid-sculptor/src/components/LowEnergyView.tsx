import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Play, Clock, User } from 'lucide-react';
import { useGallery, useLikeSculpture } from '../db/hooks';
import { FluidCanvas } from './FluidCanvas';

interface LowEnergyViewProps {
  onBack: () => void;
}

export const LowEnergyView: React.FC<LowEnergyViewProps> = ({ onBack }) => {
  const { items, loading } = useGallery();
  const { like } = useLikeSculpture();
  const [selectedSculpture, setSelectedSculpture] = useState<string | null>(null);

  const handleLike = async (id: string) => {
    await like(id);
  };

  if (selectedSculpture) {
    const item = items.find(i => i.id === selectedSculpture);
    return (
      <div className="h-screen bg-bg flex flex-col">
        <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSelectedSculpture(null)}
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
          <FluidCanvas
            sessionId={item?.session_id || ''}
            seed={123456789}
            mode="gallery"
          />
        </main>

        <footer className="glass-panel px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-white/50">Autonomous playback</p>
          <p className="text-xs text-white/30">by {item?.creator_pubkey.slice(0, 8)}...</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
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
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Sculpture Gallery</h2>
          <p className="text-white/50 text-sm">
            Watch autonomous replays of fluid sculptures
          </p>
        </div>

        {loading ? (
          <div className="glass-panel rounded-xl p-6 text-center">
            <p className="text-white/50">Loading gallery...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-center">
            <p className="text-white/50">No sculptures in gallery yet</p>
            <p className="text-xs text-white/30 mt-2">
              Create one in High Energy mode
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="glass-panel rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setSelectedSculpture(item.id)}
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
                        <User className="w-3 h-3" />
                        {item.creator_pubkey.slice(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.added_at).toLocaleDateString()}
                      </span>
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
          Low Energy Mode • Autonomous viewing • Gallery sync
        </p>
      </footer>
    </div>
  );
};
