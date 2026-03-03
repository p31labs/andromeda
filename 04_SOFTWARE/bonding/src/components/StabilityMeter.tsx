// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// StabilityMeter: formula display + stability progress bar
//
// Color interpolates from red (0%) through yellow (50%)
// to green (100%). Pulses on molecule completion.
// ═══════════════════════════════════════════════════════

import { useGameStore } from '../store/gameStore';
import { calculateStability, generateFormula, displayFormula, MOLECULE_NAMES } from '../engine/chemistry';
import { FormulaDisplay } from './FormulaDisplay';

export function StabilityMeter() {
  const atoms = useGameStore((s) => s.atoms);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const knownFormulaMatch = useGameStore((s) => s.knownFormulaMatch);

  if (atoms.length === 0) return null;

  const stability = calculateStability(atoms);
  const formula = generateFormula(atoms);
  const percent = Math.round(stability * 100);

  // Red → Yellow → Green interpolation
  const r = percent < 50 ? 255 : Math.round((100 - percent) * 5.1);
  const g = percent < 50 ? Math.round(percent * 5.1) : 255;
  const barColor = `rgb(${r}, ${g}, 0)`;

  return (
    <div className="absolute right-6 flex items-center gap-3 p-3 px-5 max-w-[calc(100vw-5rem)] hud-text" style={{ minWidth: 0, top: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
      <span className={`text-lg font-bold font-mono truncate ${knownFormulaMatch ? 'formula-checkpoint text-white' : 'text-white/80'}`} style={{ minWidth: 0, direction: 'ltr' }}>
        <FormulaDisplay formula={displayFormula(formula)} />
        {knownFormulaMatch && (
          <span className="text-xs text-emerald-400 ml-2 font-semibold">
            = {MOLECULE_NAMES[knownFormulaMatch] ?? knownFormulaMatch}!
          </span>
        )}
      </span>
      <div className="w-28 shrink-0 h-[3px] bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            gamePhase === 'complete' ? 'stability-pulse' : ''
          }`}
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs text-white/40 font-mono shrink-0">{percent}%</span>
    </div>
  );
}
