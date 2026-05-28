import React from 'react';
import { P31Colors } from './tokens';

export interface ReturnRibbonProps {
  gameTitle?: string;
  className?: string;
}

const ribbonStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  padding: '0.5rem 1rem',
  background: P31Colors.bgCard,
  borderTop: `1px solid rgba(255,255,255,0.1)`,
  fontSize: '0.8rem',
  zIndex: 9999,
  backdropFilter: 'blur(8px)',
};

const linkStyle: React.CSSProperties = {
  color: P31Colors.textSecondary,
  textDecoration: 'none',
  transition: 'color 0.2s',
};

/**
 * ReturnRibbon — persistent P31 navigation spine
 * Shown at the bottom of every game frame
 */
export const ReturnRibbon: React.FC<ReturnRibbonProps> = ({ gameTitle, className = '' }) => {
  return (
    <nav
      style={ribbonStyle}
      className={`p31-return-ribbon ${className}`}
      aria-label="P31 Navigation"
    >
      <span style={{ color: P31Colors.phosGreen, fontWeight: 600 }}>◈ P31</span>
      {gameTitle && <span style={{ color: P31Colors.textMuted }}>· {gameTitle}</span>}
      <span style={{ color: P31Colors.textMuted }}>·</span>
      <a href="https://p31ca.org" style={linkStyle} target="_blank" rel="noopener">🌐 hub</a>
      <span style={{ color: P31Colors.textMuted }}>·</span>
      <a href="/" style={{ ...linkStyle, color: P31Colors.accentCyan, fontWeight: 600 }}>
        ← Back to Arcade
      </a>
    </nav>
  );
};

export default ReturnRibbon;
