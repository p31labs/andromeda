import React, { useState, useEffect } from 'react';
import { Heart, Cpu, Shield, Share2, BookOpen, Github, Mail, ExternalLink, Activity, Zap, ChevronRight } from 'lucide-react';

// ── Live fleet status from command center ──
function useFleetStatus() {
  const [fleet, setFleet] = useState(null);
  useEffect(() => {
    fetch('https://command-center.trimtab-signal.workers.dev/api/status')
      .then(r => r.json())
      .then(setFleet)
      .catch(() => setFleet(null));
  }, []);
  return fleet;
}

// ── Breathing ring — the heartbeat of the site ──
function BreathRing({ size = 64 }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    let t = 0;
    const loop = setInterval(() => {
      t += 0.07;
      setScale(1 + 0.08 * Math.sin(t));
    }, 100);
    return () => clearInterval(loop);
  }, []);
  return (
    <div className="rounded-full border border-rose-400/30 flex items-center justify-center transition-transform duration-300"
      style={{ width: size, height: size, transform: `scale(${scale})` }}>
      <div className="rounded-full bg-rose-500/20 flex items-center justify-center"
        style={{ width: size * 0.6, height: size * 0.6 }}>
        <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(232,99,111,0.6)]" />
      </div>
    </div>
  );
}

// ── Product card ──
function ProductCard({ icon: Icon, name, desc, status, href, color }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group block p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ color, background: `${color}12` }}>
          {status}
        </span>
      </div>
      <h3 className="text-white font-bold text-lg mb-2 group-hover:translate-x-0.5 transition-transform">{name}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </a>
  );
}

// ── Fleet node ──
function FleetNode({ name, status }) {
  const online = status === 'online';
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-gray-600'}`} />
      <span className="text-xs text-gray-400 font-mono">{name}</span>
    </div>
  );
}

// ── Main Page ──
export default function P31Landing() {
  const fleet = useFleetStatus();
  const onlineCount = fleet?.workers?.filter(w => w.status === 'online').length || 0;

  return (
    <div className="min-h-screen text-gray-200" style={{ background: '#080810' }}>
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 20% 0%, rgba(232,99,111,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(13,79,79,0.06) 0%, transparent 60%)'
      }} />

      {/* ── NAV ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <BreathRing size={32} />
          <div>
            <span className="text-white font-bold text-sm tracking-tight">P31 Labs</span>
            <span className="text-gray-500 text-xs ml-2 hidden sm:inline">Open-Source Assistive Technology</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <a href="https://bonding.p31ca.org" className="text-gray-400 hover:text-white transition-colors">BONDING</a>
          <a href="https://phosphorus31.org" className="text-gray-400 hover:text-white transition-colors hidden sm:block">Research</a>
          <a href="https://github.com/p31labs" className="text-gray-400 hover:text-white transition-colors">
            <Github className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 px-6 md:px-12 pt-20 pb-16 md:pt-28 md:pb-24 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">{onlineCount} nodes online</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
          Technology that<br />
          <span style={{ color: '#E8636F' }}>meets you where you are.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mb-10">
          P31 Labs builds open-source assistive technology for neurodivergent individuals.
          Our tools don't ask you to be someone else. They amplify who you already are.
        </p>

        <div className="flex flex-wrap gap-3">
          <a href="https://bonding.p31ca.org" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: '#E8636F' }}>
            Play BONDING <ChevronRight className="w-4 h-4" />
          </a>
          <a href="https://phosphorus31.org" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-300 border border-white/[0.1] hover:border-white/[0.2] hover:text-white transition-all">
            Read the Research
          </a>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section className="relative z-10 px-6 md:px-12 pb-20 max-w-5xl mx-auto">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">What We Build</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProductCard
            icon={Heart}
            name="BONDING"
            desc="Molecular chemistry game for neurodivergent families. Build water, breathe together, stay connected across distance. 413 automated tests."
            status="Live"
            href="https://bonding.p31ca.org"
            color="#E8636F"
          />
          <ProductCard
            icon={Cpu}
            name="Node Zero"
            desc="ESP32-S3 cognitive prosthetic. Haptic feedback, LoRa mesh, secure element. The hardware layer of the Delta topology."
            status="Prototype"
            href="https://phosphorus31.org"
            color="#06b6d4"
          />
          <ProductCard
            icon={Shield}
            name="The Buffer"
            desc="Communication processor with Fawn Guard. Detects people-pleasing language patterns before you hit send."
            status="In Progress"
            href="https://fawn-guard.trimtab-signal.workers.dev"
            color="#a78bfa"
          />
          <ProductCard
            icon={Share2}
            name="P31 Mesh"
            desc="WebRTC peer-to-peer vagal sync. Two devices, one room code, 4-2-6 breathing with haptic feedback. No server required."
            status="Live"
            href="https://p31-mesh.pages.dev"
            color="#22c55e"
          />
        </div>
      </section>

      {/* ── RESEARCH ── */}
      <section className="relative z-10 px-6 md:px-12 pb-20 max-w-5xl mx-auto">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">Research Series</h2>
        <div className="p-6 md:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">The Tetrahedron Protocol</h3>
              <p className="text-sm text-gray-400">17 papers spanning quantum cognition, network topology, care economics, and cognitive engineering.</p>
            </div>
            <BookOpen className="w-5 h-5 text-gray-500 hidden md:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="text-2xl font-black text-white mb-1">4</div>
              <div className="text-gray-500 text-xs">Published on Zenodo with DOIs</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="text-2xl font-black text-white mb-1">13</div>
              <div className="text-gray-500 text-xs">Styled and gate-checked, ready for upload</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="text-2xl font-black text-white mb-1">0</div>
              <div className="text-gray-500 text-xs">Uncorrected hallucinations remaining</div>
            </div>
          </div>

          <a href="https://orcid.org/0009-0002-2492-9079" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-xs text-gray-400 hover:text-white transition-colors">
            ORCID: 0009-0002-2492-9079 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      {/* ── FLEET STATUS ── */}
      {fleet && (
        <section className="relative z-10 px-6 md:px-12 pb-20 max-w-5xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">Infrastructure</h2>
          <div className="p-6 md:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white font-semibold">{onlineCount} Workers Online</span>
              <span className="text-[10px] text-gray-500 ml-auto font-mono">Cloudflare Edge Network</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
              {fleet.workers?.map(w => (
                <FleetNode key={w.name} name={w.name} status={w.status} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="relative z-10 px-6 md:px-12 py-12 border-t border-white/[0.04] max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BreathRing size={24} />
              <span className="text-white font-bold text-sm">P31 Labs, Inc.</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
              Georgia Domestic Nonprofit Corporation.<br />
              EIN: 42-1888158. Incorporated April 3, 2026.
            </p>
          </div>
          <div className="flex gap-12 text-xs">
            <div className="space-y-2.5">
              <div className="text-gray-500 font-semibold uppercase tracking-wider mb-3">Products</div>
              <a href="https://bonding.p31ca.org" className="block text-gray-400 hover:text-white transition-colors">BONDING</a>
              <a href="https://p31-mesh.pages.dev" className="block text-gray-400 hover:text-white transition-colors">Mesh</a>
              <a href="https://p31-vault.pages.dev" className="block text-gray-400 hover:text-white transition-colors">Vault</a>
              <a href="https://fawn-guard.trimtab-signal.workers.dev" className="block text-gray-400 hover:text-white transition-colors">Fawn Guard</a>
            </div>
            <div className="space-y-2.5">
              <div className="text-gray-500 font-semibold uppercase tracking-wider mb-3">Connect</div>
              <a href="https://github.com/p31labs" className="block text-gray-400 hover:text-white transition-colors">GitHub</a>
              <a href="https://phosphorus31.org" className="block text-gray-400 hover:text-white transition-colors">Research</a>
              <a href="mailto:will@p31ca.org" className="block text-gray-400 hover:text-white transition-colors">will@p31ca.org</a>
              <a href="https://ko-fi.com/trimtab69420" className="block text-gray-400 hover:text-white transition-colors">Ko-fi</a>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/[0.04] text-[10px] text-gray-600 text-center">
          Open-source assistive technology for neurodivergent individuals. CC BY 4.0.
        </div>
      </footer>

      <style>{`
        html, body, #root, [data-artifact] { background: #080810 !important; }
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          h1 { font-size: 2.25rem !important; }
        }
      `}</style>
    </div>
  );
}
