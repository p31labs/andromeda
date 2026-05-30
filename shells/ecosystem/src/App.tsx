import { useState, useMemo } from 'react';
import { apps, categoryLabels, categoryIcons, type AppCategory, type AppStatus } from './data/apps';
import { Search, ExternalLink, Hexagon } from 'lucide-react';

const statusConfig: Record<AppStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-400' },
  building: { label: 'Building', color: 'text-p31-gold', bg: 'bg-p31-gold' },
  shipped: { label: 'Shipped', color: 'text-p31-cyan', bg: 'bg-p31-cyan' },
};

const categories: AppCategory[] = ['shells', 'arcade', 'family', 'tools', 'workers'];
const categoryIds: (AppCategory | 'all')[] = ['all', ...categories];

const statusOptions: (AppStatus | 'all')[] = ['all', 'active', 'building', 'shipped'];

function AppCard({ app }: { app: typeof apps[number] }) {
  const s = statusConfig[app.status];

  return (
    <a
      href={app.domain || undefined}
      target={app.domain ? '_blank' : undefined}
      rel={app.domain ? 'noopener noreferrer' : undefined}
      className="glass rounded-xl p-5 border border-white/5 hover:border-white/15 transition-all group block"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-base group-hover:text-p31-teal transition-colors">
          {app.name}
        </h3>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={`w-2 h-2 rounded-full ${s.bg}`} />
          <span className={`text-xs ${s.color}`}>{s.label}</span>
        </div>
      </div>
      <p className="text-white/50 text-sm leading-relaxed mb-4">{app.description}</p>
      {app.domain && (
        <div className="flex items-center gap-1.5 text-xs text-white/30 group-hover:text-p31-cyan transition-colors">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate font-mono">{app.domain}</span>
        </div>
      )}
    </a>
  );
}

function Sidebar({
  activeCategory,
  onCategoryChange,
  counts,
}: {
  activeCategory: AppCategory | 'all';
  onCategoryChange: (c: AppCategory | 'all') => void;
  counts: Record<AppCategory | 'all', number>;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-white/5 flex flex-col">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Hexagon className="w-6 h-6 text-p31-teal" />
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">ECOSYSTEM</h1>
            <p className="text-white/40 text-[10px] leading-tight">P31 App Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <button
          onClick={() => onCategoryChange('all')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
            activeCategory === 'all'
              ? 'bg-p31-teal/10 text-p31-teal'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>All</span>
          <span className="text-xs text-white/30">{counts.all}</span>
        </button>

        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-semibold">Deploy</span>
        </div>

        {categories.slice(0, 2).map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              activeCategory === cat
                ? 'bg-p31-teal/10 text-p31-teal'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs opacity-60">{categoryIcons[cat]}</span>
              {categoryLabels[cat]}
            </span>
            <span className="text-xs text-white/30">{counts[cat]}</span>
          </button>
        ))}

        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-semibold">Build</span>
        </div>

        {categories.slice(2, 4).map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              activeCategory === cat
                ? 'bg-p31-teal/10 text-p31-teal'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs opacity-60">{categoryIcons[cat]}</span>
              {categoryLabels[cat]}
            </span>
            <span className="text-xs text-white/30">{counts[cat]}</span>
          </button>
        ))}

        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-semibold">Infra</span>
        </div>

        {categories.slice(4).map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              activeCategory === cat
                ? 'bg-p31-teal/10 text-p31-teal'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs opacity-60">{categoryIcons[cat]}</span>
              {categoryLabels[cat]}
            </span>
            <span className="text-xs text-white/30">{counts[cat]}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-p31-teal/10 border border-p31-teal/20 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-p31-teal animate-pulse" />
          <span className="text-[10px] text-p31-teal font-medium">Ecosystem Online</span>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [activeCategory, setActiveCategory] = useState<AppCategory | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<AppStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const cat of categories) {
      c[cat] = apps.filter((a) => a.category === cat).length;
    }
    return c;
  }, []);

  const filtered = useMemo(() => {
    let result = apps;
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (activeStatus !== 'all') {
      result = result.filter((a) => a.status === activeStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, activeStatus, search]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        counts={counts}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="border-b border-white/5 px-6 py-4 sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-p31-teal/50 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {categoryIds.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-p31-teal/20 text-p31-teal'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {cat === 'all' ? 'All' : categoryLabels[cat]}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeStatus === s
                      ? 'bg-p31-teal/20 text-p31-teal'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <Search className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-sm">No apps match your filters</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-xs text-white/30">
                {filtered.length} app{filtered.length !== 1 ? 's' : ''}
                {activeCategory !== 'all' && ` in ${categoryLabels[activeCategory]}`}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((app) => (
                  <AppCard key={app.name} app={app} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
