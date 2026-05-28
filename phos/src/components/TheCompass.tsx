import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DecryptedArtifact } from '../types/phos';

export const TheCompass: React.FC<{ decryptedLedger: DecryptedArtifact[] }> = ({ decryptedLedger }) => {
  const [activeCategory, setActiveCategory] = useState<DecryptedArtifact['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredResults = useMemo(() => {
    return decryptedLedger.filter(artifact => {
      const matchCategory = activeCategory === 'all' || artifact.category === activeCategory;
      const matchQuery = artifact.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [decryptedLedger, activeCategory, searchQuery]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [activeCategory, searchQuery]);

  const activeArtifact = filteredResults[currentIndex];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-200">
      <div className="p-4 border-b border-zinc-900 space-y-4">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fuzzy context filter..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {filteredResults.length === 0 ? (
          <span className="text-zinc-600 font-mono">NULL BASELINE LOGS RETRIEVED</span>
        ) : (
          <div className="w-full h-full max-h-[50vh] bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
            <header className="flex justify-between border-b border-zinc-800 pb-4 text-xs font-mono text-zinc-500">
              <span className="text-emerald-500 uppercase font-mono">{activeArtifact.category} SPECIFICATION</span>
              <span>{new Date(activeArtifact.timestamp).toLocaleDateString()}</span>
            </header>
            <div className="text-zinc-300 text-lg flex-grow py-4 overflow-y-auto font-serif">{activeArtifact.content}</div>
            <div className="text-[10px] text-zinc-600 font-mono tracking-widest text-center border-t border-zinc-800 pt-4">
              SIGNATURE ASSURED // HASH MATRIX INTENDED
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-900 flex items-center justify-between">
        <button
          disabled={currentIndex === 0 || filteredResults.length === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
          className="p-4 bg-zinc-900 rounded-full disabled:opacity-30"
        >
          <ChevronLeft size={24} className="text-emerald-500" />
        </button>
        <span className="font-mono text-zinc-500 text-sm">{filteredResults.length > 0 ? `${currentIndex + 1} / ${filteredResults.length}` : '0 / 0'}</span>
        <button
          disabled={currentIndex === filteredResults.length - 1 || filteredResults.length === 0}
          onClick={() => setCurrentIndex(prev => prev + 1)}
          className="p-4 bg-zinc-900 rounded-full disabled:opacity-30"
        >
          <ChevronRight size={24} className="text-emerald-500" />
        </button>
      </div>
    </div>
  );
};
