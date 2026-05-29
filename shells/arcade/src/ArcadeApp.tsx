import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import ResinWalletDisplay from './components/ResinWalletDisplay';
import PerformanceHUD from './components/PerformanceHUD';
import { usePGLite } from './PGLiteProvider';
import { useSync } from './SyncProvider';
const GamePlaceholder = ({ name }: { name: string }) => (
  <div>
    <h2>{name}</h2>
    <p>Coming soon...</p>
  </div>
);

const Games = {
    smallball: {
        LowEnergy: lazy(() => import('../games/smallball/LowEnergyView')),
        MediumEnergy: lazy(() => import('../games/smallball/MediumEnergyView')),
        HighEnergy: lazy(() => import('../games/smallball/HighEnergyView')),
    },
    gridiron: {
        LowEnergy: lazy(() => import('../games/gridiron/LowEnergyView')),
        MediumEnergy: lazy(() => import('../games/gridiron/MediumEnergyView')),
        HighEnergy: lazy(() => import('../games/gridiron/HighEnergyView')),
    },
    liquid_sculptor: {
        LowEnergy: lazy(() => import('../games/liquid_sculptor/LowEnergyView')),
        MediumEnergy: lazy(() => import('../games/liquid_sculptor/MediumEnergyView')),
        HighEnergy: lazy(() => import('../games/liquid_sculptor/HighEnergyView')),
    },
    resonance_rings: {
      LowEnergy: lazy(() => import('../games/resonance_rings/LowEnergyView')),
      MediumEnergy: lazy(() => import('../games/resonance_rings/MediumEnergyView')),
      HighEnergy: lazy(() => import('../games/resonance_rings/HighEnergyView')),
    },
    orbital_drift: {
      LowEnergy: lazy(() => import('../games/orbital_drift/LowEnergyView')),
      MediumEnergy: lazy(() => import('../games/orbital_drift/MediumEnergyView')),
      HighEnergy: lazy(() => import('../games/orbital_drift/HighEnergyView')),
    },
    card_table: {
      LowEnergy: lazy(() => import('../games/card_table/LowEnergyView')),
      MediumEnergy: lazy(() => import('../games/card_table/MediumEnergyView')),
      HighEnergy: lazy(() => import('../games/card_table/HighEnergyView')),
    },
    strategy_board: {
      LowEnergy: lazy(() => import('../games/strategy_board/LowEnergyView')),
      MediumEnergy: lazy(() => import('../games/strategy_board/MediumEnergyView')),
      HighEnergy: lazy(() => import('../games/strategy_board/HighEnergyView')),
    },
    magnetic_poetry: {
      LowEnergy: lazy(() => import('../games/magnetic_poetry/LowEnergyView')),
      MediumEnergy: lazy(() => import('../games/magnetic_poetry/MediumEnergyView')),
      HighEnergy: lazy(() => import('../games/magnetic_poetry/HighEnergyView')),
    },
    geodesic_builder: {
      LowEnergy: lazy(() => Promise.resolve({ default: () => <GamePlaceholder name="Geodesic Builder - Low Energy" /> })),
      MediumEnergy: lazy(() => Promise.resolve({ default: () => <GamePlaceholder name="Geodesic Builder - Medium Energy" /> })),
      HighEnergy: lazy(() => Promise.resolve({ default: () => <GamePlaceholder name="Geodesic Builder - High Energy" /> })),
    },
  };

export default function ArcadeShell() {
    const [selectedGame, setSelectedGame] = useState<keyof typeof Games | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<'LowEnergy' | 'MediumEnergy' | 'HighEnergy' | null>(null);
    const { sync, syncState } = useSync();
    const [sdpText, setSdpText] = useState<string>('');
    const [showSync, setShowSync] = useState(false);
    const [showHUD, setShowHUD] = useState(true);

    const handleCreateOffer = async () => {
      if (sync) {
        const offer = await sync.createOffer();
        setSdpText(offer);
      }
    };

    const handleJoin = async () => {
      if (sync && sdpText) {
        try {
          const sdp = JSON.parse(sdpText);
          if (sdp.type === 'offer') {
            const answer = await sync.handleOffer(sdpText);
            setSdpText(answer);
          } else if (sdp.type === 'answer') {
            await sync.handleAnswer(sdpText);
          }
        } catch (e) {
          console.error("Invalid SDP", e);
        }
      }
    };
  
    // Using a placeholder franchiseId for now
    const franchiseId = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  
    if (selectedGame && selectedLevel) {
      const GameComponent = Games[selectedGame][selectedLevel];
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <GameComponent onBack={() => setSelectedGame(null)} />
        </Suspense>
      );
    }
  
    return (
      <div className="min-h-screen bg-bg text-white p-4 flex flex-col items-center">
        <header className="w-full max-w-4xl flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-phos-green">P31 Arcade</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${syncState === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <button 
                onClick={() => setShowSync(!showSync)}
                className="text-xs opacity-50 hover:opacity-100 uppercase tracking-widest"
              >
                Mesh: {syncState}
              </button>
            </div>
            <button 
              onClick={() => setShowHUD(!showHUD)}
              className="text-[10px] mt-1 opacity-30 hover:opacity-100 flex items-center gap-1"
            >
              <span className="w-1 h-1 rounded-full bg-phos-green" />
              Toggle HUD
            </button>
          </div>
          <ResinWalletDisplay franchiseId={franchiseId} />
        </header>

        {showSync && (
          <div className="w-full max-w-4xl bg-black/40 border border-phos-green/20 rounded-lg p-4 mb-8">
            <h3 className="text-phos-green font-bold mb-2">Local Mesh Sync</h3>
            <textarea 
              className="w-full h-24 bg-black/60 text-xs font-mono p-2 border border-phos-green/10 rounded mb-2"
              placeholder="Paste SDP here..."
              value={sdpText}
              onChange={(e) => setSdpText(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleCreateOffer} className="glass-button text-xs px-4 py-2">Create Offer</button>
              <button onClick={handleJoin} className="glass-button text-xs px-4 py-2">Process SDP</button>
              <button onClick={() => { setSdpText(''); setShowSync(false); }} className="glass-button text-xs px-4 py-2">Close</button>
            </div>
          </div>
        )}

        <main className="flex-grow flex flex-col items-center justify-center">
          <h2 className="text-2xl mb-4">Select a Game:</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {Object.keys(Games).map((gameId) => (
              <button 
                key={gameId} 
                onClick={() => setSelectedGame(gameId as keyof typeof Games)}
                className="glass-button p-4 rounded-lg text-xl font-semibold hover:text-cyan-vibe"
              >
                {gameId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>

          {selectedGame && (
            <div className="text-center">
              <h2 className="text-2xl mb-4">Select Energy Level for {selectedGame.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:</h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedLevel('LowEnergy')}
                  className="glass-button p-3 rounded-lg flex-1"
                >
                  Low (1 Spoon)
                </button>
                <button 
                  onClick={() => setSelectedLevel('MediumEnergy')}
                  className="glass-button p-3 rounded-lg flex-1"
                >
                  Medium (3 Spoons)
                </button>
                <button 
                  onClick={() => setSelectedLevel('HighEnergy')}
                  className="glass-button p-3 rounded-lg flex-1"
                >
                  High (6 Spoons)
                </button>
              </div>
              <button 
                onClick={() => setSelectedGame(null)}
                className="glass-button mt-4 p-2 rounded-lg text-sm hover:text-orchid-soul"
              >
                Back to Games
              </button>
            </div>
          )}
        </main>
        {showHUD && <PerformanceHUD />}
      </div>
    );
  }
