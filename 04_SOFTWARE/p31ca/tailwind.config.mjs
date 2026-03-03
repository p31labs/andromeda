/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        void: '#050505',
        phosphor: '#39FF14',
        amber: '#FFD700',
        glass: {
          border: 'rgba(255, 255, 255, 0.08)',
          surface: 'rgba(255, 255, 255, 0.04)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
};
