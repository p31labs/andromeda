import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'classic-from': '#FFF7ED',
        'classic-to': '#FFEDD5',
        'bridge-bg': '#FAFAFA',
        'quantum-bg': '#020617',
      },
    },
  },
  plugins: [],
} satisfies Config;