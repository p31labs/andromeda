/**
 * P31 operator lane — Tailwind CDN preset for p31ca.org static HTML.
 * Matches Astro tailwind.config.mjs (Inter + Space Mono, void/phosphor).
 * Loaded after https://cdn.tailwindcss.com
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        void: '#050505',
        surface: '#161920',
        phosphor: 'var(--color-phosphor)',
        phosphorus: 'var(--color-phosphor)',
        coral: 'var(--color-coral)',
        amber: '#FFD700',
        teal: '#25897d',
        cyan: 'var(--color-cyan)',
        cloud: 'var(--color-cloud)',
        butter: 'var(--color-amber)',
        lavender: 'var(--color-lavender)',
        paper: '#f4f4f5',
        ink: '#1e293b',
        glass: {
          border: 'rgba(255, 255, 255, 0.08)',
          surface: 'rgba(255, 255, 255, 0.04)',
        },
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
};
