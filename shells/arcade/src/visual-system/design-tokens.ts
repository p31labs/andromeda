/**
 * P31 Arcade Design Tokens
 * Universal Canon Colors + Arcade-specific extensions
 */

export const P31Colors = {
  // Universal Canon
  phosGreen: '#39ff14',
  cyanVibe: '#00f5ff',
  orchidSoul: '#da70d6',
  chumpGold: '#feca57',
  sentinelBlue: '#54a0ff',

  // Arcade Extensions
  sportsRed: '#ff6b6b',
  strategyTeal: '#4ecdc4',
  physicsBlue: '#45b7d1',
  creativeMint: '#96ceb4',

  // Neutrals
  bgDark: '#1a1a2e',
  bgCard: '#16213e',
  textPrimary: '#eeeeee',
  textSecondary: '#a0a0a0',
  border: 'rgba(255, 255, 255, 0.1)',
} as const;

export const P31Gradients = {
  phosCyan: `linear-gradient(135deg, ${P31Colors.phosGreen} 0%, ${P31Colors.cyanVibe} 100%)`,
  orchidGold: `linear-gradient(135deg, ${P31Colors.orchidSoul} 0%, ${P31Colors.chumpGold} 100%)`,
  sentinelFade: `linear-gradient(90deg, ${P31Colors.sentinelBlue}, rgba(84, 160, 255, 0.3))`,
  darkCard: `linear-gradient(135deg, ${P31Colors.bgDark} 0%, ${P31Colors.bgCard} 100%)`,
} as const;

export const P31Shadows = {
  glowPhos: `0 0 20px ${P31Colors.phosGreen}40, 0 0 40px ${P31Colors.phosGreen}20`,
  glowCyan: `0 0 20px ${P31Colors.cyanVibe}40, 0 0 40px ${P31Colors.cyanVibe}20`,
  glowOrchid: `0 0 20px ${P31Colors.orchidSoul}40, 0 0 40px ${P31Colors.orchidSoul}20`,
  glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
  card: '0 4px 16px rgba(0, 0, 0, 0.2)',
} as const;

export const P31Animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    pulse: '1500ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

// CSS Custom Properties generator
export function generateCSSVariables(): string {
  return `
:root {
  /* P31 Universal Canon */
  --p31-phos-green: ${P31Colors.phosGreen};
  --p31-cyan-vibe: ${P31Colors.cyanVibe};
  --p31-orchid-soul: ${P31Colors.orchidSoul};
  --p31-chump-gold: ${P31Colors.chumpGold};
  --p31-sentinel-blue: ${P31Colors.sentinelBlue};

  /* Arcade Palette */
  --arcade-sports-red: ${P31Colors.sportsRed};
  --arcade-strategy-teal: ${P31Colors.strategyTeal};
  --arcade-physics-blue: ${P31Colors.physicsBlue};
  --arcade-creative-mint: ${P31Colors.creativeMint};

  /* Neutrals */
  --arcade-bg-dark: ${P31Colors.bgDark};
  --arcade-bg-card: ${P31Colors.bgCard};
  --arcade-text-primary: ${P31Colors.textPrimary};
  --arcade-text-secondary: ${P31Colors.textSecondary};
  --arcade-border: ${P31Colors.border};

  /* Glows */
  --glow-phos: ${P31Shadows.glowPhos};
  --glow-cyan: ${P31Shadows.glowCyan};
  --glow-orchid: ${P31Shadows.glowOrchid};

  /* Animation */
  --duration-fast: ${P31Animations.duration.fast};
  --duration-normal: ${P31Animations.duration.normal};
  --duration-slow: ${P31Animations.duration.slow};
  --duration-pulse: ${P31Animations.duration.pulse};
}
`;
}
