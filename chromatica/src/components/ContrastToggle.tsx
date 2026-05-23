/**
 * ContrastToggle Component
 * Toggle high contrast mode for vision accessibility
 */

import React from 'react';
import { BigButton } from './BigButton';

interface ContrastToggleProps {
  mode: 'normal' | 'high' | 'dark';
  onToggle: () => void;
}

export const ContrastToggle: React.FC<ContrastToggleProps> = ({
  mode,
  onToggle
}) => {
  const modeLabels: Record<string, { icon: string; label: string }> = {
    normal: { icon: '☀️', label: 'Normal' },
    high: { icon: '🔲', label: 'High Contrast' },
    dark: { icon: '🌙', label: 'Dark' }
  };

  return (
    <BigButton
      onClick={onToggle}
      variant={mode === 'high' ? 'primary' : 'neutral'}
      fullWidth
      icon={modeLabels[mode].icon}
    >
      {modeLabels[mode].label}
    </BigButton>
  );
};

export default ContrastToggle;
