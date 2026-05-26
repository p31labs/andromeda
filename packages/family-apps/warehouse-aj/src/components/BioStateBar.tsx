import { useAppStore } from '../stores/appStore';
import { Battery, Bone, AlertCircle } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export function BioStateBar({ compact = true }: Props) {
  const { spoons, calcium } = useAppStore();

  const calciumValue = calcium ?? 8.4;
  const isCalciumLow = calciumValue < 8.0;
  const isCritical = calciumValue < 7.5 || spoons < 0.2;

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '8px 16px',
          background: isCritical ? 'rgba(204, 98, 71, 0.2)' : 'rgba(93, 202, 165, 0.1)',
          borderRadius: '8px',
          border: `1px solid ${isCritical ? '#cc6247' : '#5DCAA5'}`,
          fontSize: '13px',
        }}
      >
        {/* Spoons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Battery
            size={16}
            style={{ color: spoons < 0.3 ? '#cc6247' : spoons < 0.5 ? '#f9a825' : '#5DCAA5' }}
          />
          <span style={{ fontWeight: 500 }}>{Math.round(spoons * 100)}%</span>
          <span style={{ opacity: 0.6 }}>spoons</span>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

        {/* Calcium */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bone
            size={16}
            style={{ color: isCalciumLow ? '#cc6247' : '#5DCAA5' }}
          />
          <span style={{ fontWeight: 500, color: isCalciumLow ? '#cc6247' : 'inherit' }}>
            Ca: {calciumValue.toFixed(1)}
          </span>
        </div>

        {/* Critical Alert */}
        {isCritical && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cc6247' }}>
              <AlertCircle size={14} />
              <span style={{ fontWeight: 600 }}>GRAY ROCK</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full version for settings panel
  return (
    <div style={{ padding: '16px', background: '#161920', borderRadius: '12px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#999' }}>Bio-State</h3>

      {/* Spoons Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
          <span>Spoon Energy</span>
          <span style={{ color: spoons < 0.3 ? '#cc6247' : '#5DCAA5' }}>{Math.round(spoons * 100)}%</span>
        </div>
        <div style={{ height: '6px', background: '#2a2e35', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${spoons * 100}%`,
              height: '100%',
              background: spoons < 0.3 ? '#cc6247' : spoons < 0.5 ? '#f9a825' : '#5DCAA5',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Calcium Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
          <span>Serum Calcium</span>
          <span style={{ color: isCalciumLow ? '#cc6247' : '#5DCAA5' }}>{calciumValue.toFixed(1)} mg/dL</span>
        </div>
        <div style={{ height: '6px', background: '#2a2e35', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min((calciumValue / 12) * 100, 100)}%`,
              height: '100%',
              background: isCalciumLow ? '#cc6247' : '#5DCAA5',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Target: 8.0-9.0 mg/dL
        </div>
      </div>
    </div>
  );
}

export default BioStateBar;
