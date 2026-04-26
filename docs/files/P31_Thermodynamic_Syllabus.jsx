import React, { useState, useEffect, useRef } from 'react';

const theme = {
  bg: '#080810', surface: '#0f0f18', card: '#141420',
  border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.87)',
  muted: 'rgba(255,255,255,0.5)', coral: '#E8636F', teal: '#2A9D8F',
  blue: '#3b82f6', red: '#ef4444'
};

const PointPeterSimulation = ({ isInstitutionalMode, simulationSpeed, forceMultiplier }) => {
  const canvasRef = useRef(null);
  const [entropy, setEntropy] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const fortRadius = 40;

    let defenders = Array.from({ length: 116 }, () => ({
      x: center.x + (Math.random() - 0.5) * fortRadius,
      y: center.y + (Math.random() - 0.5) * fortRadius,
      active: true
    }));

    const attackerCount = Math.floor(1500 * (forceMultiplier / 100));
    let attackers = Array.from({ length: attackerCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 250 + Math.random() * 100;
      return {
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        speed: 0.5 + Math.random() * 0.5
      };
    });

    const render = () => {
      ctx.fillStyle = 'rgba(8, 8, 16, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(center.x, center.y, fortRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isInstitutionalMode ? theme.teal : theme.blue;
      ctx.lineWidth = 2;
      ctx.stroke();

      let activeCount = 0;
      defenders.forEach(d => {
        if (d.active) {
          activeCount++;
          ctx.fillStyle = isInstitutionalMode ? theme.teal : theme.blue;
          ctx.fillRect(d.x, d.y, 2, 2);
        }
      });

      attackers.forEach(a => {
        const dx = center.x - a.x;
        const dy = center.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > fortRadius * 0.5) {
          a.x += (dx / dist) * a.speed * (simulationSpeed / 50);
          a.y += (dy / dist) * a.speed * (simulationSpeed / 50);
        }
        if (dist < fortRadius && Math.random() < 0.01 * (simulationSpeed / 50)) {
          const target = defenders.find(d => d.active);
          if (target) target.active = false;
        }
        ctx.fillStyle = theme.coral;
        ctx.fillRect(a.x, a.y, 2, 2);
      });

      setEntropy(((116 - activeCount) / 116 * 100).toFixed(1));

      if (activeCount === 0) {
        setTimeout(() => {
          defenders.forEach(d => { d.active = true; d.x = center.x + (Math.random()-0.5)*fortRadius; d.y = center.y + (Math.random()-0.5)*fortRadius; });
          attackers.forEach(a => { const angle = Math.random()*Math.PI*2; const dist = 250+Math.random()*100; a.x = center.x+Math.cos(angle)*dist; a.y = center.y+Math.sin(angle)*dist; });
        }, 1500);
      }
      frameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isInstitutionalMode, simulationSpeed, forceMultiplier]);

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{background: theme.surface, borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden'}}>
      <div className="absolute top-4 left-4 z-10">
        <div className="text-xs font-bold uppercase tracking-widest" style={{color: theme.coral}}>
          {isInstitutionalMode ? 'Systemic Attack' : 'British Imperial Navy'}
        </div>
        <div className="text-[10px]" style={{color: theme.muted}}>
          {isInstitutionalMode ? 'Centralized Bureaucracy' : `${Math.floor(1500 * forceMultiplier / 100)} Troops`}
        </div>
      </div>
      <div className="absolute bottom-4 left-4 z-10">
        <div className="text-xs font-bold uppercase tracking-widest" style={{color: isInstitutionalMode ? theme.teal : theme.blue}}>
          {isInstitutionalMode ? 'Isolated Node' : 'Point Peter Battery'}
        </div>
        <div className="text-[10px]" style={{color: theme.muted}}>
          {isInstitutionalMode ? 'Single Parent' : '116 Defenders'}
        </div>
      </div>
      <div className="absolute top-4 right-4 z-10 text-right">
        <div className="text-xl font-black text-white">{entropy}%</div>
        <div className="text-[10px] uppercase tracking-widest" style={{color: theme.muted}}>System Entropy</div>
      </div>
      <canvas ref={canvasRef} width={400} height={400} style={{maxWidth: '100%', height: 'auto'}} />
    </div>
  );
};

export default function ThermodynamicSyllabus() {
  const [isInstitutionalMode, setIsInstitutionalMode] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(50);
  const [forceMultiplier, setForceMultiplier] = useState(100);

  return (
    <div className="min-h-screen flex flex-col" style={{background: theme.bg, color: theme.text, fontFamily: "'DM Sans', system-ui, sans-serif"}}>

      <header className="sticky top-0 z-50 flex justify-between items-center p-4" style={{background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}`}}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{background: theme.coral, boxShadow: `0 0 10px rgba(232,99,111,0.4)`}} />
          <span className="font-extrabold text-sm tracking-tight text-white">P31 LABS</span>
          <span style={{color: 'rgba(255,255,255,0.2)'}}>/</span>
          <span className="font-extrabold text-sm tracking-tight text-white">THERMODYNAMIC SYLLABUS</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded" style={{color: theme.teal, border: `1px solid ${theme.teal}`, background: 'rgba(42,157,143,0.1)'}}>
          Offline Ready
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-1 p-1" style={{minHeight: 'calc(100vh - 60px)'}}>

        {/* CHANNEL 1: EXPLORE */}
        <section className="p-6 flex flex-col gap-6 overflow-y-auto" style={{background: theme.card, borderRadius: '8px 0 0 8px'}}>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{color: 'rgba(255,255,255,0.3)'}}>Channel 1: Control</h2>
            <p className="text-sm" style={{color: theme.muted}}>
              Adjust thermodynamic variables. Observe the strict physical translation in Channel 2.
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{border: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.02)'}}>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold">Topological Inversion</span>
              <div className="relative" onClick={() => setIsInstitutionalMode(!isInstitutionalMode)}>
                <div className="w-10 h-6 rounded-full transition-colors" style={{background: isInstitutionalMode ? theme.teal : theme.coral}} />
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform" style={{left: isInstitutionalMode ? 22 : 4}} />
              </div>
            </label>
            <p className="text-xs mt-2" style={{color: 'rgba(255,255,255,0.4)'}}>
              Same physics. Different labels. 1815 → 2026.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{color: 'rgba(255,255,255,0.6)'}}>Force Gradient (Attackers)</span>
              <span className="font-mono" style={{color: theme.coral}}>{forceMultiplier}%</span>
            </div>
            <input type="range" min="10" max="200" value={forceMultiplier}
              onChange={e => setForceMultiplier(Number(e.target.value))}
              className="w-full" style={{accentColor: theme.coral}} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{color: 'rgba(255,255,255,0.6)'}}>Simulation Velocity</span>
              <span className="font-mono text-white">{simulationSpeed}</span>
            </div>
            <input type="range" min="10" max="100" value={simulationSpeed}
              onChange={e => setSimulationSpeed(Number(e.target.value))}
              className="w-full" style={{accentColor: 'white'}} />
          </div>

          <div className="mt-auto p-4 rounded-lg text-xs" style={{background: 'rgba(232,99,111,0.05)', border: '1px solid rgba(232,99,111,0.1)', color: theme.muted}}>
            <strong style={{color: theme.coral}}>Pedagogical note:</strong> The toggle does not change the math. It only changes the labels and colors. The physics of overwhelming force against an isolated node is identical whether the year is 1815 or 2026.
          </div>
        </section>

        {/* CHANNEL 2: DISCOVER */}
        <section className="flex items-center justify-center relative p-2" style={{background: 'black'}}>
          <div className="absolute top-5 left-5 z-10">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1" style={{color: 'rgba(255,255,255,0.5)'}}>Channel 2: Geometry</h2>
            <div className="text-xs" style={{color: 'rgba(255,255,255,0.3)'}}>F = ma — Mechanical Translation</div>
          </div>
          <PointPeterSimulation
            isInstitutionalMode={isInstitutionalMode}
            simulationSpeed={simulationSpeed}
            forceMultiplier={forceMultiplier}
          />
        </section>

        {/* CHANNEL 3: ENCODE */}
        <section className="p-6 flex flex-col overflow-y-auto font-mono" style={{background: theme.card, borderRadius: '0 8px 8px 0'}}>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4" style={{fontFamily: 'DM Sans, sans-serif', color: 'rgba(255,255,255,0.3)'}}>Channel 3: OQE Data</h2>

          <div className="flex-1 space-y-5">
            <div className="pl-4" style={{borderLeft: `2px solid ${theme.coral}`}}>
              <div className="text-xs" style={{color: 'rgba(255,255,255,0.4)'}}>Epoch</div>
              <div className="text-sm text-white">{isInstitutionalMode ? 'CURRENT — 2026' : 'JANUARY 13, 1815'}</div>
            </div>

            <div className="pl-4" style={{borderLeft: '2px solid rgba(255,255,255,0.2)'}}>
              <div className="text-xs" style={{color: 'rgba(255,255,255,0.4)'}}>Location</div>
              <div className="text-sm text-white">St. Marys, GA — Point Peter</div>
            </div>

            <div className="p-4 rounded" style={{background: theme.surface, border: '1px solid rgba(255,255,255,0.05)'}}>
              <div className="text-xs mb-2" style={{color: 'rgba(255,255,255,0.4)'}}>Thermodynamic Analysis</div>
              <p className="text-xs leading-relaxed" style={{fontFamily: 'DM Sans, sans-serif', color: 'rgba(255,255,255,0.7)'}}>
                {isInstitutionalMode ? (
                  <>
                    <strong style={{color: theme.teal}}>Institutional Capture:</strong> The isolated node (parent) expends finite metabolic energy (spoons) defending against a centralized system capable of generating localized force at near-zero personal cost.
                    <br /><br />
                    A single node cannot survive sustained Cartesian assault. Survival requires topological shift: Wye (Y) → Delta (Δ) mesh.
                  </>
                ) : (
                  <>
                    <strong style={{color: theme.coral}}>Historical Topology:</strong> 1,500 British troops advanced via Cumberland Sound against 116 American defenders at Fort Peter.
                    <br /><br />
                    The overwhelming mass gradient (F=ma) made structural failure inevitable. Entropy is mathematical, not moral. The fall of Point Peter was physics.
                  </>
                )}
              </p>
            </div>

            <div className="pt-4" style={{borderTop: '1px solid rgba(255,255,255,0.1)'}}>
              <div className="text-[10px] uppercase mb-2" style={{color: 'rgba(255,255,255,0.3)'}}>Syllabus Modules</div>
              <div className="space-y-2 text-xs" style={{color: theme.muted}}>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{background: theme.coral}} /> 1815 Ash — Point Peter</div>
                <div className="flex items-center gap-2 opacity-40"><div className="w-1.5 h-1.5 rounded-full" style={{background: 'rgba(255,255,255,0.2)'}} /> 1925 Wye — Floating Neutral</div>
                <div className="flex items-center gap-2 opacity-40"><div className="w-1.5 h-1.5 rounded-full" style={{background: 'rgba(255,255,255,0.2)'}} /> Posner Precession — Ca₉(PO₄)₆</div>
                <div className="flex items-center gap-2 opacity-40"><div className="w-1.5 h-1.5 rounded-full" style={{background: 'rgba(255,255,255,0.2)'}} /> 2025 Delta — Node Zero Mesh</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        html, body, #root, [data-artifact] { background: #080810 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="range"] { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); outline: none; -webkit-appearance: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: white; cursor: pointer; }
      `}</style>
    </div>
  );
}
