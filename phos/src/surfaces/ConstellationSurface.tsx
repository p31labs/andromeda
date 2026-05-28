import React, { useState } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import {
  Scissors, Hammer, Trophy, Cpu,
  Utensils, LineChart, BookOpen, ChevronRight, ExternalLink
} from 'lucide-react';

type AppDomain = 'capital' | 'legacy' | 'sustenance' | 'sanctuary';

interface AppNode {
  id: string;
  name: string;
  domain: AppDomain;
  url: string;
  icon: React.ReactNode;
  description: string;
  themeColor: string;
}

const CONSTELLATION: AppNode[] = [
  { id: 'chromatica', name: 'Chromatica', domain: 'sanctuary', url: 'https://c63bf112.chromatica.pages.dev', icon: <Scissors size={20} strokeWidth={1.5} />, description: 'Salon & Creative Workstation', themeColor: 'text-pink-400' },
  { id: 'fence-pro', name: 'Fence Pro', domain: 'capital', url: 'https://a1580867.fence-pro.pages.dev', icon: <Hammer size={20} strokeWidth={1.5} />, description: 'Contractor Quoting Engine', themeColor: 'text-amber-500' },
  { id: 'fantasy', name: 'Fantasy Sports', domain: 'sanctuary', url: 'https://954b98d4.fantasy-sports.pages.dev', icon: <Trophy size={20} strokeWidth={1.5} />, description: 'Roster & Matchup Analytics', themeColor: 'text-yellow-400' },
  { id: 'vibe-studio', name: 'Vibe Studio', domain: 'sanctuary', url: 'https://4b2cd2af.p31-vibe-studio.pages.dev', icon: <Cpu size={20} strokeWidth={1.5} />, description: 'AI Code Editor & Voice', themeColor: 'text-purple-400' },
  { id: 'matriarch', name: 'Matriarch Culinary', domain: 'sustenance', url: 'https://matriarch-culinary-node-dashboard.pages.dev', icon: <Utensils size={20} strokeWidth={1.5} />, description: 'Recipes & Meal Planning', themeColor: 'text-orange-400' },
  { id: 'cashpilot', name: 'CashPilot', domain: 'capital', url: 'https://e2a391ce.cashpilot-drp.pages.dev', icon: <LineChart size={20} strokeWidth={1.5} />, description: 'Financial Tracking & Budgets', themeColor: 'text-emerald-500' },
  { id: 'lighthouse', name: 'Lighthouse Edu', domain: 'legacy', url: 'https://c3a808b5.lighthouse-edu.pages.dev', icon: <BookOpen size={20} strokeWidth={1.5} />, description: 'S.J./W.J. Lesson Tracker', themeColor: 'text-blue-400' },
];

const DOMAIN_META: Record<AppDomain | 'all', { label: string; hint: string }> = {
  all: { label: 'ALL', hint: 'Every surface' },
  capital: { label: 'CAPITAL', hint: 'Money tools' },
  sustenance: { label: 'SUSTENANCE', hint: 'Food & health' },
  legacy: { label: 'LEGACY', hint: 'Children & learning' },
  sanctuary: { label: 'SANCTUARY', hint: 'Creative & play' },
};

export const ConstellationSurface = ({ className }: { className?: string }) => {
  const { grayRock, spoons } = useAtmosphere();
  const [activeDomain, setActiveDomain] = useState<AppDomain | 'all'>('all');
  const [iframeApp, setIframeApp] = useState<AppNode | null>(null);

  const filteredApps = activeDomain === 'all'
    ? CONSTELLATION
    : CONSTELLATION.filter(app => app.domain === activeDomain);

  const isTriageMode = spoons <= 1;

  if (iframeApp) {
    return (
      <div className={`flex flex-col h-full w-full bg-zinc-950 ${className || ''}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
          <button
            onClick={() => setIframeApp(null)}
            className="font-mono text-xs text-zinc-500 hover:text-zinc-300 tracking-widest uppercase touch-manipulation active:scale-95 transition-colors px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
          >
            &larr; CONSTELLATION
          </button>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xs tracking-wider ${iframeApp.themeColor}`}>
              {iframeApp.name}
            </span>
            <a
              href={iframeApp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors touch-manipulation"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <iframe
          src={iframeApp.url}
          title={iframeApp.name}
          className="flex-grow w-full border-0 bg-zinc-950"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full w-full bg-zinc-950 text-zinc-200 p-4 font-sans select-none ${className || ''}`}>
      <div className="flex overflow-x-auto gap-3 pb-6 mb-2 scrollbar-hide snap-x border-b border-zinc-900/80">
        {(Object.keys(DOMAIN_META) as (AppDomain | 'all')[]).map(domain => (
          <button
            key={domain}
            onClick={() => setActiveDomain(domain)}
            className={`snap-start whitespace-nowrap px-6 py-3 rounded-full font-mono text-xs tracking-widest transition-all outline-none touch-manipulation active:scale-95 ${activeDomain === domain ? 'bg-zinc-800 text-white border border-zinc-600 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300'} ${grayRock ? 'text-zinc-600' : ''}`}
          >
            {DOMAIN_META[domain].label}
          </button>
        ))}
      </div>

      {!isTriageMode && (
        <p className="font-mono text-[10px] text-zinc-600 tracking-widest uppercase mb-4 px-1">
          {DOMAIN_META[activeDomain].hint}
        </p>
      )}

      <div className="flex flex-col gap-4 flex-grow overflow-y-auto pb-24">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="group flex items-center justify-between p-5 bg-zinc-900/30 border border-zinc-800/80 rounded-xl hover:bg-zinc-900 hover:border-zinc-700 transition-all active:scale-[0.98] touch-manipulation outline-none"
          >
            <button
              onClick={() => setIframeApp(app)}
              className="flex items-center gap-5 flex-grow text-left min-w-0"
            >
              <div className={`p-4 rounded-xl bg-zinc-950 border border-zinc-800 transition-colors group-hover:border-zinc-700 ${grayRock ? 'text-zinc-600' : app.themeColor}`}>
                {app.icon}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-mono text-lg text-zinc-200 tracking-wide truncate">
                  {app.name}
                </span>
                <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {app.description}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors touch-manipulation border border-transparent hover:border-zinc-700/50"
                title={`Open ${app.name} in new tab`}
              >
                <ExternalLink size={16} />
              </a>
              <button
                onClick={() => setIframeApp(app)}
                className="p-3 rounded-xl text-zinc-600 group-hover:text-zinc-400 transition-colors touch-manipulation"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConstellationSurface;
