import { useState, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { SYLLABUS } from '../data/syllabus';
import type { SyllabusVolume } from '../data/syllabus';

type SpoonLevel = 1 | 3 | 6;

interface ThemeConfig {
  bg: string;
  text: string;
  container: string;
  header: string;
  card: string;
  title: string;
  body: string;
  hideExtra: boolean;
}

const getThemeClasses = (spoonLevel: SpoonLevel): ThemeConfig => {
  switch (spoonLevel) {
    case 1:
      return {
        bg: "bg-white",
        text: "text-black",
        container: "max-w-3xl mx-auto p-6",
        header: "text-4xl font-black tracking-tight mb-8",
        card: "bg-gray-100 p-8 rounded-3xl mb-6 shadow-sm border-4 border-black transition-all",
        title: "text-3xl font-bold mb-4",
        body: "text-2xl leading-relaxed font-medium",
        hideExtra: true,
      };
    case 3:
      return {
        bg: "bg-zinc-950",
        text: "text-zinc-200",
        container: "max-w-4xl mx-auto p-8",
        header: "text-3xl font-serif font-light tracking-widest text-center mb-12 uppercase text-zinc-100",
        card: "bg-zinc-900/50 p-8 rounded-xl mb-8 backdrop-blur-sm border border-zinc-800 hover:border-zinc-600 transition-all shadow-2xl",
        title: "text-2xl font-serif mb-3 text-white flex items-center gap-3",
        body: "text-lg leading-loose text-zinc-400 font-light",
        hideExtra: false,
      };
    case 6:
      return {
        bg: "bg-black",
        text: "text-emerald-500",
        container: "max-w-6xl mx-auto p-4 font-mono",
        header: "text-xl font-bold tracking-tighter border-b border-emerald-900 pb-4 mb-8",
        card: "bg-black p-6 mb-4 border border-emerald-900 hover:bg-emerald-950/20 transition-all",
        title: "text-xl font-bold mb-2 uppercase tracking-widest flex items-center gap-2",
        body: "text-sm leading-relaxed",
        hideExtra: false,
      };
  }
};

export default function SyllabusPortal() {
  const [spoonLevel, setSpoonLevel] = useState<SpoonLevel>(3);
  const [activeVolume, setActiveVolume] = useState<number>(1);
  const [showVIP, setShowVIP] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Force light mode supremacy for 1-spoon (overrides global dark html rule)
  useEffect(() => {
    const root = document.documentElement;
    if (spoonLevel === 1) {
      root.setAttribute('data-syllabus-spoon', '1');
      root.style.colorScheme = 'light';
    } else {
      root.removeAttribute('data-syllabus-spoon');
      root.style.colorScheme = '';
    }
    return () => {
      root.removeAttribute('data-syllabus-spoon');
      root.style.colorScheme = '';
    };
  }, [spoonLevel]);

  const theme = getThemeClasses(spoonLevel);

  // Deterministic "random" for QR grid so it doesn't flicker on re-render
  const qrSeed = useMemo(() => {
    const grid: boolean[] = [];
    for (let i = 0; i < 49; i++) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const isCorner = (row < 3 && col < 3) || (row < 3 && col >= 4) || (row >= 4 && col < 3);
      grid.push(isCorner ? true : ((i * 7 + 13) % 10) > 4);
    }
    return grid;
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme.bg} ${theme.text}`}>
      {/* 6-SPOON: Matrix rain backdrop */}
      {spoonLevel === 6 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
          <div className="matrix-rain">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="matrix-column"
                style={{
                  left: `${i * 5}%`,
                  animationDuration: `${3 + (i % 5)}s`,
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                {Array.from({ length: 30 }).map((_, j) => (
                  <span key={j} className="block text-emerald-500 text-xs leading-tight">
                    {String.fromCharCode(0x30A0 + ((i * j * 7) % 96))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP NAVIGATION & SPOON DIAL */}
      <div className={`sticky top-0 z-50 backdrop-blur-md border-b border-current/10 ${spoonLevel === 1 ? 'bg-white' : 'bg-inherit'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className={`font-bold tracking-widest uppercase text-sm ${spoonLevel === 6 ? 'animate-pulse' : ''}`}>
            P31 // Sovereign Edge
            {spoonLevel === 6 && <span className="ml-2 text-emerald-700">▮</span>}
          </div>

          {/* THE SPOON DIAL */}
          <div className="flex items-center gap-3 bg-current/5 p-1 rounded-full border border-current/10">
            <span className="text-xs font-bold uppercase pl-3 opacity-70">
              {spoonLevel === 6 ? 'COGNITIVE_LOAD' : 'Cognitive Load:'}
            </span>
            {([1, 3, 6] as SpoonLevel[]).map((spoons) => (
              <button
                key={spoons}
                onClick={() => {
                  setSpoonLevel(spoons);
                  setShowVIP(false);
                }}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  spoonLevel === spoons
                    ? spoonLevel === 1
                      ? 'bg-black text-white'
                      : spoonLevel === 3
                        ? 'bg-white text-black'
                        : 'bg-emerald-500 text-black'
                    : 'hover:bg-current/10 opacity-50'
                }`}
              >
                {spoonLevel === 6 ? `${spoons}S` : `${spoons} Spoon${spoons > 1 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={theme.container}>
        {/* HEADER */}
        <h1 className={`${theme.header} ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          {spoonLevel === 1
            ? "The P31 Handbook."
            : spoonLevel === 6
              ? '> P31_SOVEREIGN_EDGE // INITIALIZED'
              : "The P31 Center For Family Members Who Can't Tech Good"}
        </h1>

        {spoonLevel === 3 && (
          <p className={`text-center italic text-zinc-500 mb-12 ${mounted ? 'animate-fade-in-up animate-delay-200' : 'opacity-0'}`}>
            "And wanna learn to do other stuff good too."
          </p>
        )}

        {spoonLevel === 6 && (
          <div className={`text-emerald-700 text-xs mb-8 ${mounted ? 'animate-fade-in animate-delay-200' : 'opacity-0'}`}>
            {'>'} LARMOR 863 Hz — DELTA_MESH: STANDBY — SPOON_DIAL: ACTIVE — PHOS: DORMANT
          </div>
        )}

        {/* VOLUME TABS */}
        <div className={`flex flex-wrap gap-2 mb-12 justify-center ${mounted ? 'animate-fade-in-up animate-delay-300' : 'opacity-0'}`}>
          {SYLLABUS.map((vol: SyllabusVolume) => (
            <button
              key={vol.id}
              onClick={() => {
                setActiveVolume(vol.id);
                setShowVIP(false);
                setActiveModule(null);
              }}
              className={`px-6 py-3 border transition-all text-sm uppercase tracking-widest font-bold ${
                activeVolume === vol.id
                  ? spoonLevel === 1
                    ? 'border-black bg-black text-white'
                    : spoonLevel === 3
                      ? 'border-white bg-white text-black'
                      : 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-current/20 hover:border-current/50 opacity-60'
              } ${
                spoonLevel === 1
                  ? 'rounded-2xl'
                  : spoonLevel === 3
                    ? 'rounded-none'
                    : 'rounded-sm'
              }`}
            >
              {spoonLevel === 6 ? `VOL${vol.id}` : `Vol. ${vol.id}`}
            </button>
          ))}
        </div>

        {/* CONTENT RENDERER */}
        <div
          className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {SYLLABUS.filter((v: SyllabusVolume) => v.id === activeVolume).map(
            (volume: SyllabusVolume) => (
              <div key={volume.id}>
                <h2
                  className={`mb-8 uppercase tracking-widest opacity-50 ${
                    spoonLevel === 1 ? 'text-2xl font-bold' : 'text-sm'
                  }`}
                >
                  {volume.volume}
                </h2>

                {/* 3-SPOON: Magazine grid layout */}
                {spoonLevel === 3 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {volume.modules.map((mod, idx) => {
                      const IconComponent = mod.icon;
                      const isActive = activeModule === mod.id;
                      const isFeature = idx === 0;
                      return (
                        <div
                          key={mod.id}
                          onClick={() => setActiveModule(isActive ? null : mod.id)}
                          className={`${theme.card} cursor-pointer ${
                            isFeature ? 'md:col-span-2' : ''
                          } ${isActive ? 'ring-1 ring-zinc-500' : ''} animate-fade-in-up`}
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          {isFeature && (
                            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mb-4">
                              ★ Cover Story
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-4">
                            <h3 className={theme.title}>
                              <span className="opacity-50">
                                <IconComponent size={24} />
                              </span>
                              <span className="opacity-50 mr-2 text-xs">
                                MOD {mod.id} //
                              </span>
                              {mod.title}
                            </h3>
                          </div>
                          <div className="space-y-4">
                            <p className={theme.body}>{mod.summary}</p>
                            {isActive && (
                              <div className="pt-4 border-t border-zinc-800 animate-fade-in">
                                <h4 className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-600 mb-2">
                                  Architectural Truth
                                </h4>
                                <p className={theme.body}>{mod.core}</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                            {mod.classification} — Difficulty: {mod.difficulty}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 1-SPOON and 6-SPOON: Linear stack */
                  volume.modules.map((mod, idx) => {
                    const IconComponent = mod.icon;
                    return (
                      <div
                        key={mod.id}
                        className={`${theme.card} animate-fade-in-up`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className={theme.title}>
                            {!theme.hideExtra && (
                              <span className="opacity-50">
                                <IconComponent size={24} />
                              </span>
                            )}
                            {spoonLevel !== 1 && (
                              <span className="opacity-50 mr-2">
                                MOD {mod.id} //
                              </span>
                            )}
                            {mod.title}
                          </h3>

                          {spoonLevel === 6 && (
                            <div className="text-right text-xs opacity-70">
                              <div>CLASS: {mod.classification}</div>
                              <div>DIFF: {mod.difficulty}</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div>
                            {!theme.hideExtra && (
                              <h4 className="text-xs uppercase font-bold tracking-widest opacity-50 mb-2">
                                {spoonLevel === 6 ? '// SUMMARY' : 'Executive Summary'}
                              </h4>
                            )}
                            <p className={theme.body}>{mod.summary}</p>
                          </div>

                          {!theme.hideExtra && (
                            <div className="pt-4 border-t border-current/10">
                              <h4 className="text-xs uppercase font-bold tracking-widest opacity-50 mb-2">
                                {spoonLevel === 6 ? '// CORE' : 'Architectural Truth'}
                              </h4>
                              <p className={theme.body}>{mod.core}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )
          )}

          {/* THE GRAND FINALE (Only in Volume 3) */}
          {activeVolume === 3 && (
            <div className="mt-12 text-center animate-fade-in-up">
              {!showVIP ? (
                <button
                  onClick={() => setShowVIP(true)}
                  className={`group relative inline-flex items-center justify-center px-8 py-4 font-bold tracking-widest uppercase overflow-hidden transition-all ${
                    spoonLevel === 1
                      ? 'bg-black text-white text-2xl rounded-full w-full py-8'
                      : spoonLevel === 3
                        ? 'bg-zinc-100 text-black rounded hover:bg-white'
                        : 'border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-900/30'
                  }`}
                >
                  <span className="mr-2">
                    {spoonLevel === 1 ? 'Enter the Delta' : 'Initiate Ignition Sequence'}
                  </span>
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <div
                  className={`p-8 transition-all duration-500 animate-scale-in ${
                    spoonLevel === 1
                      ? 'bg-black text-white rounded-3xl'
                      : spoonLevel === 3
                        ? 'bg-zinc-900 border border-zinc-700 rounded-xl'
                        : 'border border-emerald-500 bg-black'
                  }`}
                >
                  <h3
                    className={`mb-6 uppercase tracking-widest font-bold ${
                      spoonLevel === 1 ? 'text-3xl' : 'text-xl'
                    }`}
                  >
                    {spoonLevel === 6
                      ? '> DELTA_IGNITION: COMPLETE'
                      : 'Welcome to the Delta'}
                  </h3>

                  {/* FAKE QR CODE — storybook teaser */}
                  <div className={`w-48 h-48 mx-auto mb-6 bg-white p-2 relative ${spoonLevel === 6 ? 'border border-emerald-900' : ''}`}>
                    <div className="grid grid-cols-7 grid-rows-7 gap-0.5 w-full h-full">
                      {qrSeed.map((filled, i) => {
                        const row = Math.floor(i / 7);
                        const col = i % 7;
                        const isCorner =
                          (row < 3 && col < 3) ||
                          (row < 3 && col >= 4) ||
                          (row >= 4 && col < 3);
                        return (
                          <div
                            key={i}
                            className={`${
                              filled ? (spoonLevel === 6 ? 'bg-emerald-900' : 'bg-black') : 'bg-white'
                            } ${isCorner ? 'border border-gray-300' : ''}`}
                          />
                        );
                      })}
                    </div>
                    {spoonLevel === 6 && (
                      <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                    )}
                  </div>

                  <p
                    className={`${
                      spoonLevel === 1 ? 'text-2xl' : 'text-sm'
                    } opacity-80 uppercase tracking-widest`}
                  >
                    Non-Exportable Ed25519 Key Generated.
                    <br />
                    PGLite Schema Hydrated.
                    <br />
                    {spoonLevel === 6 && (
                      <>
                        CRDT_MESH: ACTIVE
                        <br />
                        LOVE_LEDGER: SEEDED
                        <br />
                      </>
                    )}
                    <span className="font-bold mt-4 block">
                      The ropes are open.
                    </span>
                  </p>

                  {spoonLevel === 3 && (
                    <p className="mt-6 text-xs text-zinc-600 italic">
                      This is the storybook side. The live ignition is real and waiting.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6-SPOON: Telemetry footer */}
        {spoonLevel === 6 && (
          <div className="mt-16 border-t border-emerald-900 pt-4 text-[10px] text-emerald-800 space-y-1">
            <div>SYS::P31_EDGE // SPOON_DIAL: {spoonLevel}S // VOL: {activeVolume} // MODS_RENDERED: {SYLLABUS.find(v => v.id === activeVolume)?.modules.length ?? 0}</div>
            <div>RELAY: bonding-relay.trimtab-signal.workers.dev // LARMOR: 863 Hz // PHOS: STANDBY</div>
            <div className="opacity-50">{'>'} AWAITING_INPUT_</div>
          </div>
        )}
      </div>
    </div>
  );
}
