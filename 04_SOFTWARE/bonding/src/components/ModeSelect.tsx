// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// ModeSelect: difficulty mode + quest chain selection
//
// Phase 1: Three mode cards (Seed, Sprout, Sapling)
// Phase 2: Quest chain selector for chosen mode
// WCD-35 D2: Quest chain selector wiring
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import { MODES } from '../data/modes';
import type { DifficultyId } from '../data/modes';
import { useGameStore } from '../store/gameStore';
import { getGallery, getGalleryCount, getTotalLove } from '../engine/gallery';
import type { GalleryEntry } from '../engine/gallery';
import { getQuestsForMode } from '../engine/quests';

const MODE_EMOJI: Record<string, string> = {
  seed: '\u{1F331}',
  sprout: '\u{1F33F}',
  sapling: '\u{1F333}',
};

const MODE_HOVER_BORDER: Record<string, string> = {
  seed: 'hover:border-[#4ADE80]',
  sprout: 'hover:border-[#22D3EE]',
  sapling: 'hover:border-[#A78BFA]',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function GalleryRow({ entry }: { entry: GalleryEntry }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 text-xs">
      <span className="text-white/70 font-mono font-bold min-w-[60px]">
        {entry.displayFormula}
      </span>
      <span className="text-white/40 flex-1 truncate">
        {entry.name}
        {entry.isDiscovery && ' \u2728'}
      </span>
      <span className="text-amber-400/60 font-mono">
        {'\u2665'}{entry.love}
      </span>
      <span className="text-white/20">
        {MODE_EMOJI[entry.mode] ?? ''}
      </span>
      <span className="text-white/15 text-[10px] min-w-[55px] text-right">
        {relativeTime(entry.completedAt)}
      </span>
    </div>
  );
}

export function ModeSelect() {
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setLobbyActive = useGameStore((s) => s.setLobbyActive);
  const [showAll, setShowAll] = useState(false);
  const [pendingMode, setPendingMode] = useState<DifficultyId | null>(null);

  const gallery = getGallery();
  const count = getGalleryCount();
  const totalLove = getTotalLove();
  const visible = showAll ? gallery : gallery.slice(0, 5);

  // Phase 2: Quest selection
  if (pendingMode) {
    const quests = getQuestsForMode(pendingMode);
    const modeData = MODES.find(m => m.id === pendingMode);

    return (
      <div className="relative w-full h-screen bg-[#0a0a1a] flex flex-col items-center justify-center gap-6 select-none overflow-y-auto py-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => setPendingMode(null)}
          className="absolute top-6 left-6 text-white/40 hover:text-white/70 transition-colors cursor-pointer text-sm"
          style={{ minHeight: 48, touchAction: 'manipulation' }}
        >
          {'\u2190'} Back
        </button>

        {/* Mode header */}
        <div className="text-center">
          <p className="text-4xl mb-2">{modeData?.emoji}</p>
          <h2 className="text-2xl font-black text-white mb-1">
            {modeData?.label}
          </h2>
          <p className="text-sm text-white/40 font-mono">
            Choose a quest or free build
          </p>
        </div>

        {/* Quest cards */}
        <div className="flex flex-col gap-3 w-full max-w-sm px-6">
          {quests.map((quest) => (
            <button
              key={quest.id}
              type="button"
              onClick={() => setGameMode(pendingMode, quest.id)}
              className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer text-left"
              style={{ minHeight: 64, touchAction: 'manipulation' }}
            >
              <span className="text-2xl flex-shrink-0">{quest.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                  {quest.name}
                </p>
                <p className="text-[11px] text-white/30 truncate">
                  {quest.description}
                </p>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[10px] text-white/20 font-mono">
                  {quest.steps.length} molecules
                </span>
                <span className="text-[10px] text-amber-400/50 font-mono">
                  {'\u2665'}{quest.reward.love}
                </span>
              </div>
            </button>
          ))}

          {/* Free Build option */}
          <button
            type="button"
            onClick={() => setGameMode(pendingMode, 'free_build')}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 hover:border-white/15 transition-all active:scale-[0.98] cursor-pointer text-left"
            style={{ minHeight: 64, touchAction: 'manipulation' }}
          >
            <span className="text-2xl flex-shrink-0">{'\u{1F3A8}'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white/60 group-hover:text-white/80 transition-colors">
                Free Build
              </p>
              <p className="text-[11px] text-white/20">
                No quest. Build anything.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Phase 1: Mode selection
  return (
    <div className="relative w-full h-screen bg-[#0a0a1a] flex flex-col items-center justify-center gap-8 select-none overflow-y-auto py-8">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-[0.3em] text-white title-glow mb-2">
          BONDING
        </h1>
        <p className="text-sm text-white/50 font-mono">
          Build molecules together
        </p>
      </div>

      {/* Mode cards */}
      <div className="flex items-stretch gap-4 px-6">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setPendingMode(mode.id)}
            className={`mode-card group flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 ${MODE_HOVER_BORDER[mode.id] ?? ''} transition-all active:scale-95 cursor-pointer`}
            style={{ minWidth: 140, minHeight: 160, touchAction: 'manipulation' }}
          >
            <span className="text-5xl group-hover:scale-110 transition-transform">
              {mode.emoji}
            </span>
            <span className="text-base font-bold text-white/80 group-hover:text-white transition-colors">
              {mode.label}
            </span>
            <span className="text-xs text-white/30 text-center leading-relaxed">
              {mode.description}
            </span>
            <span className="text-[10px] text-white/15 font-mono mt-auto">
              {mode.palette.join(' + ')}
            </span>
          </button>
        ))}
      </div>

      {/* Play Together button */}
      <button
        type="button"
        onClick={() => setLobbyActive(true)}
        className="text-sm text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-6 py-2 transition-all cursor-pointer font-medium"
        style={{ minHeight: 48, touchAction: 'manipulation' }}
      >
        {'\u{1F91D}'} Play Together
      </button>

      {/* Gallery section */}
      {count > 0 ? (
        <div className="w-full max-w-md px-6">
          <div className="text-center text-xs text-white/25 mb-3">
            {'\u2500'.repeat(3)} Your Creations ({count} molecule{count !== 1 ? 's' : ''} {'\u00B7'} {'\u2665'} {totalLove} L.O.V.E.) {'\u2500'.repeat(3)}
          </div>
          <div className="flex flex-col gap-1">
            {visible.map((entry) => (
              <GalleryRow key={entry.id} entry={entry} />
            ))}
          </div>
          {gallery.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-2 text-[11px] text-white/20 hover:text-white/40 transition-colors cursor-pointer"
            >
              {showAll ? 'Show less' : `Show all ${gallery.length}...`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-white/15 font-mono">
          No molecules yet. Pick a mode and start building!
        </p>
      )}
    </div>
  );
}
