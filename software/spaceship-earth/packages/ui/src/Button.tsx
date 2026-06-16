import React from 'react';
import { tokens } from './tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'phosphor' | 'stage';
  size?: keyof typeof tokens.space;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  style,
  ...rest
}) => {
  // Map variants to token colors
  const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
    primary: {
      backgroundColor: tokens.color.stage.fruit,
      color: tokens.color.text.primary,
    },
    phosphor: {
      backgroundColor: 'transparent',
      color: tokens.color.text.phosphor,
      border: `1px solid ${tokens.color.text.phosphor}`,
    },
    stage: {
      backgroundColor: tokens.color.stage.sprout,
      color: tokens.color.background.deepSpace,
    },
  };

  return (
    <button
      style={{
        padding: tokens.space[size],
        fontFamily: tokens.fontFamily.sans,
        border: 'none',
        borderRadius: tokens.space.xs,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...variantStyles[variant],
        ...style, // Allow override (but scanner will flag if it uses raw hex)
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

// Add display name for debugging
Button.displayName = 'Button';
