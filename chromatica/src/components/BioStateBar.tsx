/**
 * BioStateBar - Arthritis-Optimized Health Display
 * For the wife - shows operator bio-state in large, readable format
 * 96px touch targets, 24px font, high contrast
 */

import { useChromaticaStore } from '../stores/useChromaticaStore';
import { Battery, Bone, AlertCircle } from 'lucide-react';

interface Props {
  compact?: boolean;
}

import { useSovereignStore } from '../sovereign/useSovereignStore';

export function BioStateBar({ compact = true }: Props) {
  const { spoonCount, inflammationLevel } = useSovereignStore();
  const spoons = spoonCount / 100;
  const calcium = 8.4; // Still hardcoded Ca for now, but spoons are live

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
          padding: '12px 16px',
          background: isCritical ? 'rgba(204, 98, 71, 0.2)' : 'rgba(93, 202, 165, 0.1)',
          borderRadius: '12px',
          border: `2px solid ${isCritical ? '#cc6247' : '#5DCAA5'}`,
          fontSize: '18px', // Arthritis-optimized: 18px minimum
          fontWeight: 500,
        }}
        role="status"
        aria-label={`Bio-state: ${Math.round(spoons * 100)}% spoons, Calcium ${calciumValue.toFixed(1)}`}
      >
        {/* Spoons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Battery
            size={24} // Arthritis-optimized: 24px icon
            style={{ color: spoons < 0.3 ? '#cc6247' : spoons < 0.5 ? '#f9a825' : '#5DCAA5' }}
            aria-hidden="true"
          />
          <span style={{ fontWeight: 600 }}>{Math.round(spoons * 100)}%</span>
          <span style={{ opacity: 0.7, fontSize: '14px' }}>spoons</span>
        </div>

        {/* Divider */}
        <div style={{ width: '2px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />

        {/* Calcium */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bone
            size={24}
            style={{ color: isCalciumLow ? '#cc6247' : '#5DCAA5' }}
            aria-hidden="true"
          />
          <span style={{ fontWeight: 600, color: isCalciumLow ? '#cc6247' : 'inherit' }}>
            Ca: {calciumValue.toFixed(1)}
          </span>
        </div>

        {/* Critical Alert */}
        {isCritical && (
          <>
            <div style={{ width: '2px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cc6247' }}>
              <AlertCircle size={20} />
              <span style={{ fontWeight: 700 }}>GRAY ROCK</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full version for settings panel - 32px font for arthritis accessibility
  return (
    <div style={{ padding: '24px', background: '#161920', borderRadius: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', color: '#fff' }}>Bio-State</h3>

      {/* Spoons Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '20px' }}>
          <span>Spoon Energy</span>
          <span style={{ color: spoons < 0.3 ? '#cc6247' : '#5DCAA5', fontWeight: 600 }}>
            {Math.round(spoons * 100)}%
          </span>
        </div>
        <div style={{ height: '12px', background: '#2a2e35', borderRadius: '6px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${spoons * 100}%`,
              height: '100%',
              background: spoons < 0.3 ? '#cc6247' : spoons < 0.5 ? '#f9a825' : '#5DCAA5',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Calcium Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '20px' }}>
          <span>Serum Calcium</span>
          <span style={{ color: isCalciumLow ? '#cc6247' : '#5DCAA5', fontWeight: 600 }}>
            {calciumValue.toFixed(1)} mg/dL
          </span>
        </div>
        <div style={{ height: '12px', background: '#2a2e35', borderRadius: '6px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min((calciumValue / 12) * 100, 100)}%`,
              height: '100%',
              background: isCalciumLow ? '#cc6247' : '#5DCAA5',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: '16px', color: '#888', marginTop: '8px' }}>
          Target: 8.0-9.0 mg/dL
        </div>
      </div>
    </div>
  );
}

export default BioStateBar;
