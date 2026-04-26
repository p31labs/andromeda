import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Triangle, 
  Share2, 
  Database, 
  Shield, 
  Terminal, 
  Cpu, 
  Activity,
  Gem,
  Code,
  TreePine,
  Zap,
  Lock
} from 'lucide-react';

const VagalCore = () => {
  const [phase, setPhase] = useState('INHALE');
  const [timer, setTimer] = useState(4);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const loop = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (phase === 'INHALE') { setPhase('HOLD'); return 2; }
          if (phase === 'HOLD') { setPhase('EXHALE'); setPulse(true); setTimeout(() => setPulse(false), 800); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); return 6; }
          if (phase === 'EXHALE') { setPhase('INHALE'); return 4; }
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(loop);
  }, [phase]);

  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden rounded-3xl bg-black/40 border border-cyan-900/30">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${pulse ? 'bg-cyan-900/20' : 'bg-transparent'}`} />
      <div className="absolute top-6 left-6 text-[10px] text-cyan-600 font-black uppercase tracking-widest">4-2-6 Vagal Sync</div>
      <div className="relative w-80 h-80 flex items-center justify-center">
        <div className={`absolute inset-0 rounded-full border-2 border-cyan-400/30 transition-all duration-[4000ms] ${phase === 'INHALE' ? 'scale-110 opacity-60' : 'scale-90 opacity-20'}`} />
        <div className={`absolute inset-8 rounded-full border border-yellow-500/30 transition-all duration-[6000ms] ${phase === 'EXHALE' ? 'scale-75 opacity-10' : 'scale-105 opacity-50'}`} />
        <div className={`relative z-20 w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-700 ${pulse ? 'border-white scale-125 shadow-[0_0_40px_#00f3ff]' : 'border-cyan-900'}`}>
          <div className="text-4xl font-black text-white">{timer}</div>
          <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{phase}</div>
        </div>
      </div>
    </div>
  );
};

const K4Seal = () => {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const loop = setInterval(() => { setPulse(true); setTimeout(() => setPulse(false), 1000); }, 5000);
    return () => clearInterval(loop);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden rounded-3xl bg-black/40 border border-yellow-900/20">
      <div className="absolute top-6 left-6 text-[10px] text-yellow-500 font-black uppercase tracking-widest">K₄ Tetrahedron — Isostatic Rigid</div>
      <div className="absolute top-14 left-8 text-[10px] text-yellow-500 font-black uppercase flex items-center gap-2"><TreePine className="w-4 h-4" /> W.J.</div>
      <div className="absolute top-24 left-8 text-[10px] text-green-400 font-black uppercase flex items-center gap-2"><Code className="w-4 h-4" /> S.J.</div>
      <div className="absolute bottom-24 right-8 text-[10px] text-red-500 font-black uppercase flex items-center gap-2">C.E.J. <Shield className="w-4 h-4" /></div>
      <div className="absolute bottom-14 right-8 text-[10px] text-cyan-400 font-black uppercase flex items-center gap-2">W.R.J. <Zap className="w-4 h-4" /></div>
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className={`absolute w-full h-full border-2 border-red-900/20 rounded-full transition-all duration-[2000ms] ${pulse ? 'scale-110 opacity-40' : 'scale-100 opacity-10'}`} style={{animation: 'spin 15s linear infinite'}} />
        <div className="relative w-40 h-40" style={{animation: 'spin 10s linear infinite'}}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_15px_#ffbf00] z-30" />
          <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-400 rounded-full shadow-[0_0_15px_#4ade80] z-30" />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_#ef4444] z-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_#00f3ff] z-10" />
          <div className={`absolute inset-0 border-2 transition-all ${pulse ? 'border-white' : 'border-cyan-900/40'} rotate-45 skew-x-12`} />
          <div className={`absolute inset-0 border-2 transition-all ${pulse ? 'border-white' : 'border-cyan-900/40'} -rotate-12 -skew-y-6`} />
        </div>
      </div>
    </div>
  );
};

const LoomSimulator = () => {
  const [packets, setPackets] = useState([]);
  useEffect(() => {
    const loop = setInterval(() => {
      if (Math.random() > 0.3) setPackets(p => [...p, { id: Date.now(), progress: 0 }]);
    }, 1500);
    return () => clearInterval(loop);
  }, []);
  useEffect(() => {
    if (packets.length === 0) return;
    const anim = setInterval(() => {
      setPackets(p => p.map(pkt => ({ ...pkt, progress: pkt.progress + 2 })).filter(pkt => pkt.progress < 100));
    }, 50);
    return () => clearInterval(anim);
  }, [packets]);

  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden rounded-3xl bg-black/40 border border-purple-900/30">
      <div className="absolute top-6 left-6 text-[10px] text-purple-400 font-black uppercase tracking-widest">Delta Mesh — WebRTC P2P</div>
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute left-1/4 top-1/3 w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center bg-black z-20">
          <Cpu className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="absolute right-1/4 bottom-1/3 w-8 h-8 rounded-full border-2 border-yellow-500 flex items-center justify-center bg-black z-20">
          <Share2 className="w-4 h-4 text-yellow-500" />
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="25%" y1="33%" x2="75%" y2="66%" stroke="#4c1d95" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
          {packets.map(pkt => (
            <circle key={pkt.id} cx={`${25 + (pkt.progress / 100) * 50}%`} cy={`${33 + (pkt.progress / 100) * 33}%`} r="3" fill="#a855f7" className="drop-shadow-[0_0_8px_#a855f7]" />
          ))}
        </svg>
      </div>
      <div className="absolute bottom-6 w-3/4 bg-black/60 border border-purple-900/50 p-3 rounded-lg flex items-center justify-between text-[8px] font-mono text-purple-300">
        <span>[P2P] WebRTC Tunnel Active</span>
        <span className="text-green-400 animate-pulse">SYNCING</span>
      </div>
    </div>
  );
};

const OracleLedger = () => {
  const [blocks, setBlocks] = useState([
    { n: 0, payload: "GENESIS_BLOCK", hash: "000000000019D6689C085AE165831E93..." }
  ]);
  const mineBlock = () => {
    setBlocks(prev => {
      const n = prev.length;
      const payload = `CARE_EVENT_OQE_N${n}`;
      const hash = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}${Math.random().toString(16).substring(2, 10).toUpperCase()}...`;
      return [{ n, payload, hash }, ...prev].slice(0, 8);
    });
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden rounded-3xl bg-black/40 border border-green-900/30 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="text-[10px] text-green-400 font-black uppercase tracking-widest">L.O.V.E. Ledger</div>
        <button onClick={mineBlock} className="px-4 py-2 bg-green-900/30 border border-green-500 text-green-400 text-[10px] font-black uppercase rounded hover:bg-green-500 hover:text-black transition-all">
          Mint Care Token
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2" style={{scrollbarWidth: 'thin', scrollbarColor: '#22c55e transparent'}}>
        {blocks.map(b => (
          <div key={b.n} className="p-3 bg-black/60 border-l-2 border-green-500 rounded font-mono">
            <div className="flex justify-between text-[8px] text-gray-500 mb-1">
              <span>Block {b.n}</span>
              <span className="text-green-500">Verified</span>
            </div>
            <div className="text-[9px] text-white mb-1">Payload: {b.payload}</div>
            <div className="text-[8px] text-green-500">H(n): {b.hash}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function P31SovereignVault() {
  const [activeTab, setActiveTab] = useState('VAGAL');
  const tabs = [
    { id: 'VAGAL', icon: Heart, label: 'Vagal Core', component: VagalCore },
    { id: 'K4', icon: Triangle, label: 'K₄ Seal', component: K4Seal },
    { id: 'LOOM', icon: Share2, label: 'Mesh Loom', component: LoomSimulator },
    { id: 'LEDGER', icon: Database, label: 'L.O.V.E.', component: OracleLedger },
  ];
  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || VagalCore;

  return (
    <div className="min-h-screen bg-[#050510] text-cyan-400 font-mono p-4 md:p-8 flex flex-col items-center justify-center select-none">
      <div className="w-full max-w-5xl h-[85vh] flex flex-col md:flex-row gap-6">
        <nav className="md:w-56 flex flex-col gap-3">
          <div className="bg-black/60 border border-cyan-900/50 p-5 rounded-2xl mb-2">
            <h1 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">P31 Vault</h1>
            <p className="text-[8px] text-cyan-600 font-bold uppercase tracking-[0.25em]">EIN 42-1888158</p>
          </div>
          <div className="flex md:flex-col gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 md:flex-none flex items-center gap-3 p-3 rounded-xl border transition-all duration-300
                    ${isActive ? 'bg-cyan-900/30 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'bg-black/40 border-cyan-900/30 text-cyan-800 hover:border-cyan-700 hover:text-cyan-400'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto bg-black/40 border border-cyan-900/20 p-3 rounded-xl flex items-center gap-3 text-gray-600">
            <Lock className="w-3 h-3" />
            <div className="text-[7px] uppercase font-bold tracking-widest leading-tight">Isostatic Rigidity<br/>Maintained</div>
          </div>
        </nav>
        <main className="flex-1 relative">
          <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_center,_#164e63_0%,_transparent_70%)] pointer-events-none" />
          <div className="relative z-10 h-full w-full">
            <ActiveComponent />
          </div>
        </main>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        html, body, #root, [data-artifact] { background: #050510 !important; color: #00f3ff !important; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
