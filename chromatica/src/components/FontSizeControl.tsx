/**
 * FontSizeControl Component
 * Adjust text size for readability
 */

import React from 'react';
import { BigButton } from './BigButton';

interface FontSizeControlProps {
  size: 24 | 32 | 40;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const FontSizeControl: React.FC<FontSizeControlProps> = ({
  size,
  onIncrease,
  onDecrease
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <BigButton
        onClick={onDecrease}
        variant="neutral"
        disabled={size <= 24}
      >
        A−
      </BigButton>
      
      <span
        style={{
          fontSize: `${size}px`,
          fontWeight: 'bold',
          minWidth: '80px',
          textAlign: 'center'
        }}
      >
        {size}px
      </span>
      
      <BigButton
        onClick={onIncrease}
        variant="neutral"
        disabled={size >= 40}
      >
        A+
      </BigButton>
    </div>
  );
};

export default FontSizeControl;
