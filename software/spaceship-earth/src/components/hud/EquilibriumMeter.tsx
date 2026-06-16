import { useEquilibrium } from '../../hooks/useEquilibrium';
import { STAGE_COLORS } from '../../lib/theme/stageColors';

export function EquilibriumMeter() {
  const { equilibrium } = useEquilibrium(30000);
  if (!equilibrium) return null;

  const stageColor = STAGE_COLORS[equilibrium.stage] ?? '#00FFFF';
  const entropyPct = Math.min(100, Math.max(0, (equilibrium.entropy / 5) * 100));
  const fidelityPct = Math.min(100, Math.max(0, equilibrium.fidelity));

  const arcRadius = 40;
  const arcWidth = 6;
  const cx = 52;
  const cy = 52;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const filledAngle = startAngle + (entropyPct / 100) * (endAngle - startAngle);

  function polarToCart(angle: number, r: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const bgStart = polarToCart(startAngle, arcRadius);
  const bgEnd = polarToCart(endAngle, arcRadius);
  const fillStart = polarToCart(startAngle, arcRadius);
  const fillEnd = polarToCart(filledAngle, arcRadius);

  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${arcRadius} ${arcRadius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;
      const fillPath = `M ${fillStart.x} ${fillStart.y} A ${arcRadius} ${arcRadius} 0 0 1 ${fillEnd.x} ${fillEnd.y}`;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="104" height="70" viewBox="0 0 104 70">
        <path
          d={bgPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={stageColor}
            strokeWidth={arcWidth}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${stageColor}66)` }}
          />
        )}
        <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold">
          {(100 - entropyPct).toFixed(0)}
        </text>
      </svg>
      <div className="mt-0.5 text-center">
        <div className="text-[9px] uppercase tracking-wider" style={{ color: stageColor }}>{equilibrium.stage}</div>
        <div className="text-[9px] text-white/35">Fidelity {fidelityPct.toFixed(0)}%</div>
      </div>
    </div>
  );
}
