export const P31Colors = {
  phosGreen: '#39ff14',
  teal: '#5DCAA5',
  cyan: '#00d4ff',
  purple: '#a78bfa',
  gold: '#fbbf24',
  red: '#ef4444',
  void: '#0a0b0d',
  cloud: '#e8e8e8',
  muted: '#6b7280',
};

export function generateCSSVariables(): string {
  return `
    :root {
      --p31-phos: ${P31Colors.phosGreen};
      --p31-teal: ${P31Colors.teal};
      --p31-cyan: ${P31Colors.cyan};
      --p31-purple: ${P31Colors.purple};
      --p31-gold: ${P31Colors.gold};
      --p31-red: ${P31Colors.red};
      --p31-void: ${P31Colors.void};
      --p31-cloud: ${P31Colors.cloud};
    }
  `;
}
