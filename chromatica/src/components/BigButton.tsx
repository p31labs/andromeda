/**
 * BigButton Component
 * 96px touch target for arthritis accessibility
 */

import React from 'react';

interface BigButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral';
  disabled?: boolean;
  voiceCommand?: string;  // Optional voice trigger
  icon?: string;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

const variantStyles = {
  primary: {
    backgroundColor: '#5DCAA5',
    color: '#fff',
    border: 'none'
  },
  secondary: {
    backgroundColor: '#6B8DD6',
    color: '#fff',
    border: 'none'
  },
  danger: {
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none'
  },
  neutral: {
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '2px solid #ddd'
  }
};

export const BigButton: React.FC<BigButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  voiceCommand,
  icon,
  fullWidth = false,
  style
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={voiceCommand ? `Button: ${children}. Say "${voiceCommand}" to activate.` : undefined}
      style={{
        minWidth: '96px',
        minHeight: '96px',
        padding: '16px 24px',
        fontSize: '20px',
        fontWeight: 'bold',
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.1s, box-shadow 0.2s',
        ...variantStyles[variant],
        width: fullWidth ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
        ...style
      }}
    >
      {icon && <span style={{ fontSize: '32px' }}>{icon}</span>}
      {children}
    </button>
  );
};

export default BigButton;
