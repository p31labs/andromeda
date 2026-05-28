/**
 * @p31/design-system — Design Tokens
 * Single source of truth for P31 Arcade visual identity
 */

export const P31Colors = {
  phosGreen: '#39ff14',
  cyanVibe: '#00f5ff',
  orchidSoul: '#da70d6',
  chumpGold: '#feca57',
  sentinelBlue: '#54a0ff',
  lovePink: '#ff9ff3',
  sportsRed: '#ff6b6b',
  strategyTeal: '#4ecdc4',
  physicsBlue: '#45b7d1',
  creativeMint: '#96ceb4',
  bgDark: '#1a1a2e',
  bgCard: '#16213e',
  textPrimary: '#eeeeee',
  textSecondary: '#a0a0a0',
  bgPrimary: '#0f0f1a',
  bgSecondary: '#1a1a2e',
  accentBlue: '#3b82f6',
  accentGreen: '#22c55e',
  accentGold: '#f59e0b',
  accentPurple: '#8b5cf6',
  accentCyan: '#22d3ee',
  textMuted: '#64748b',
} as const;

export type P31Color = keyof typeof P31Colors;

export const P31Gradients = {
  phosCyan: `linear-gradient(135deg, ${P31Colors.phosGreen} 0%, ${P31Colors.cyanVibe} 100%)`,
  orchidGold: `linear-gradient(135deg, ${P31Colors.orchidSoul} 0%, ${P31Colors.chumpGold} 100%)`,
  sentinelFade: `linear-gradient(90deg, ${P31Colors.sentinelBlue}, rgba(84, 160, 255, 0.3))`,
  darkCard: `linear-gradient(135deg, ${P31Colors.bgDark} 0%, ${P31Colors.bgCard} 100%)`,
  brand: `linear-gradient(90deg, ${P31Colors.chumpGold}, ${P31Colors.lovePink})`,
} as const;

export const P31Shadows = {
  glowPhos: `0 0 20px ${P31Colors.phosGreen}40, 0 0 40px ${P31Colors.phosGreen}20`,
  glowCyan: `0 0 20px ${P31Colors.cyanVibe}40, 0 0 40px ${P31Colors.cyanVibe}20`,
  glowOrchid: `0 0 20px ${P31Colors.orchidSoul}40, 0 0 40px ${P31Colors.orchidSoul}20`,
  glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
  card: '0 4px 16px rgba(0, 0, 0, 0.2)',
} as const;

export const P31Animations = {
  duration: { fast: '150ms', normal: '300ms', slow: '500ms', pulse: '1500ms' },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

/**
 * Generate CSS custom properties from design tokens
 * Call this in the HTML head or root layout
 */
export function generateCSSVariables(): string {
  return `
:root {
  --p31-phos: ${P31Colors.phosGreen};
  --p31-cyan: ${P31Colors.cyanVibe};
  --p31-orchid: ${P31Colors.orchidSoul};
  --p31-gold: ${P31Colors.chumpGold};
  --p31-sentinel: ${P31Colors.sentinelBlue};
  --p31-love: ${P31Colors.lovePink};
  --p31-sports: ${P31Colors.sportsRed};
  --p31-strategy: ${P31Colors.strategyTeal};
  --p31-physics: ${P31Colors.physicsBlue};
  --p31-creative: ${P31Colors.creativeMint};
  --p31-bg-dark: ${P31Colors.bgDark};
  --p31-bg-card: ${P31Colors.bgCard};
  --p31-text: ${P31Colors.textPrimary};
  --p31-text-secondary: ${P31Colors.textSecondary};
  --p31-bg-primary: ${P31Colors.bgPrimary};
  --p31-bg-secondary: ${P31Colors.bgSecondary};
  --p31-accent-blue: ${P31Colors.accentBlue};
  --p31-accent-green: ${P31Colors.accentGreen};
  --p31-accent-gold: ${P31Colors.accentGold};
  --p31-accent-purple: ${P31Colors.accentPurple};
  --p31-text-muted: ${P31Colors.textMuted};
  --glow-phos: ${P31Shadows.glowPhos};
  --glow-cyan: ${P31Shadows.glowCyan};
  --duration-fast: ${P31Animations.duration.fast};
  --duration-normal: ${P31Animations.duration.normal};
  --duration-slow: ${P31Animations.duration.slow};
  --duration-pulse: ${P31Animations.duration.pulse};
}
`;
}
