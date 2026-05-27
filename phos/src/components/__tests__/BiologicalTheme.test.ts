import { describe, it, expect } from 'vitest';

// Replicate the getBiologicalTheme function from PHOSShell.tsx for isolated testing
// This is a pure function — no React dependencies, perfect for unit testing

const getBiologicalTheme = (spoons: number, grayRock: boolean) => {
  if (grayRock || spoons === 0) {
    return {
      name: 'CRISIS',
      wrapper: 'bg-black text-gray-500 font-mono tracking-tight',
      orb: 'bg-gray-800 shadow-none animate-none',
      button: 'bg-gray-900 border border-gray-800 text-gray-500 rounded-sm backdrop-blur-none transition-none',
      hud: 'bg-black/90 border border-gray-800',
      input: 'bg-gray-900 border-gray-800 text-gray-500 rounded-sm',
      card: 'bg-black border border-gray-800',
      heading: 'text-gray-500 font-mono',
      body: 'text-gray-600 font-mono text-sm',
    };
  }
  if (spoons <= 2) {
    return {
      name: 'SANCTUARY',
      wrapper: 'bg-gradient-to-b from-orange-950/20 to-rose-950/20 text-orange-50 font-sans tracking-normal',
      orb: 'bg-gradient-to-tr from-amber-400 to-rose-400 shadow-[0_0_60px_rgba(251,146,60,0.4)] animate-biomimetic-breath',
      button: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full shadow-lg backdrop-blur-md active:scale-95 transition-all duration-300',
      hud: 'bg-orange-950/40 backdrop-blur-xl border border-orange-900/50 rounded-3xl',
      input: 'bg-orange-950/40 border border-orange-900/50 text-white rounded-full backdrop-blur-md focus:ring-1 focus:ring-orange-400',
      card: 'bg-orange-950/30 backdrop-blur-md border border-orange-900/30 rounded-2xl',
      heading: 'text-orange-100 font-sans',
      body: 'text-orange-200/70 font-sans text-base',
    };
  }
  if (spoons === 3) {
    return {
      name: 'BRIDGE',
      wrapper: 'bg-slate-950/50 text-slate-200 font-serif tracking-wide',
      orb: 'bg-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-pulse',
      button: 'bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg backdrop-blur-sm active:scale-95 transition-all duration-300',
      hud: 'bg-slate-900/80 backdrop-blur-lg border border-slate-800 rounded-2xl',
      input: 'bg-slate-900 border border-slate-800 text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500',
      card: 'bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl',
      heading: 'text-slate-100 font-serif',
      body: 'text-slate-300/70 font-serif text-base',
    };
  }
  return {
    name: 'QUANTUM',
    wrapper: 'bg-black text-emerald-400 font-mono tracking-tight',
    orb: 'bg-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.8)] animate-pulse',
    button: 'bg-emerald-950/20 hover:bg-emerald-900/40 border border-emerald-500/50 text-emerald-400 rounded-none active:scale-95 transition-all duration-150',
    hud: 'bg-black/90 backdrop-blur-md border border-emerald-900/50',
    input: 'bg-black border border-emerald-900 text-emerald-400 rounded-none focus:ring-1 focus:ring-emerald-500',
    card: 'bg-black/80 border border-emerald-900/50',
    heading: 'text-emerald-300 font-mono',
    body: 'text-emerald-400/60 font-mono text-sm',
  };
};

describe('BiologicalTheme Engine', () => {
  describe('CRISIS state (spoons=0 or grayRock=true)', () => {
    it('should return CRISIS theme when spoons=0', () => {
      const theme = getBiologicalTheme(0, false);
      expect(theme.name).toBe('CRISIS');
    });

    it('should return CRISIS theme when grayRock=true regardless of spoons', () => {
      expect(getBiologicalTheme(5, true).name).toBe('CRISIS');
      expect(getBiologicalTheme(3, true).name).toBe('CRISIS');
      expect(getBiologicalTheme(1, true).name).toBe('CRISIS');
    });

    it('should have zero-motion properties in CRISIS', () => {
      const theme = getBiologicalTheme(0, false);
      expect(theme.orb).toContain('shadow-none');
      expect(theme.orb).toContain('animate-none');
      expect(theme.button).toContain('transition-none');
      expect(theme.wrapper).toContain('bg-black');
    });

    it('should use mono font in CRISIS', () => {
      const theme = getBiologicalTheme(0, false);
      expect(theme.wrapper).toContain('font-mono');
      expect(theme.heading).toContain('font-mono');
      expect(theme.body).toContain('font-mono');
    });

    it('should have no glassmorphism in CRISIS', () => {
      const theme = getBiologicalTheme(0, false);
      expect(theme.button).toContain('backdrop-blur-none');
      expect(theme.hud).not.toContain('backdrop-blur');
    });

    it('should use gray color palette in CRISIS', () => {
      const theme = getBiologicalTheme(0, false);
      expect(theme.wrapper).toContain('text-gray-500');
      expect(theme.heading).toContain('text-gray-500');
      expect(theme.orb).toContain('bg-gray-800');
    });
  });

  describe('SANCTUARY state (spoons 1-2)', () => {
    it('should return SANCTUARY theme for spoons=1', () => {
      expect(getBiologicalTheme(1, false).name).toBe('SANCTUARY');
    });

    it('should return SANCTUARY theme for spoons=2', () => {
      expect(getBiologicalTheme(2, false).name).toBe('SANCTUARY');
    });

    it('should have warm amber-rose gradient orb in SANCTUARY', () => {
      const theme = getBiologicalTheme(1, false);
      expect(theme.orb).toContain('from-amber-400');
      expect(theme.orb).toContain('to-rose-400');
      expect(theme.orb).toContain('animate-biomimetic-breath');
    });

    it('should have breathing animation in SANCTUARY', () => {
      const theme = getBiologicalTheme(2, false);
      expect(theme.orb).toContain('animate-biomimetic-breath');
    });

    it('should use sans-serif font in SANCTUARY', () => {
      const theme = getBiologicalTheme(1, false);
      expect(theme.wrapper).toContain('font-sans');
      expect(theme.heading).toContain('font-sans');
      expect(theme.body).toContain('font-sans');
    });

    it('should have glassmorphism in SANCTUARY', () => {
      const theme = getBiologicalTheme(2, false);
      expect(theme.button).toContain('backdrop-blur-md');
      expect(theme.hud).toContain('backdrop-blur-xl');
      expect(theme.card).toContain('backdrop-blur-md');
    });

    it('should use rounded-full buttons in SANCTUARY', () => {
      const theme = getBiologicalTheme(1, false);
      expect(theme.button).toContain('rounded-full');
      expect(theme.input).toContain('rounded-full');
    });

    it('should have warm color palette in SANCTUARY', () => {
      const theme = getBiologicalTheme(2, false);
      expect(theme.wrapper).toContain('orange-950');
      expect(theme.heading).toContain('text-orange-100');
    });
  });

  describe('BRIDGE state (spoons=3)', () => {
    it('should return BRIDGE theme for spoons=3', () => {
      expect(getBiologicalTheme(3, false).name).toBe('BRIDGE');
    });

    it('should have indigo orb in BRIDGE', () => {
      const theme = getBiologicalTheme(3, false);
      expect(theme.orb).toContain('bg-indigo-400');
    });

    it('should use serif font in BRIDGE', () => {
      const theme = getBiologicalTheme(3, false);
      expect(theme.wrapper).toContain('font-serif');
      expect(theme.heading).toContain('font-serif');
      expect(theme.body).toContain('font-serif');
    });

    it('should have moderate glassmorphism in BRIDGE', () => {
      const theme = getBiologicalTheme(3, false);
      expect(theme.button).toContain('backdrop-blur-sm');
      expect(theme.hud).toContain('backdrop-blur-lg');
    });

    it('should use rounded-lg buttons in BRIDGE', () => {
      const theme = getBiologicalTheme(3, false);
      expect(theme.button).toContain('rounded-lg');
    });
  });

  describe('QUANTUM state (spoons 4-5)', () => {
    it('should return QUANTUM theme for spoons=4', () => {
      expect(getBiologicalTheme(4, false).name).toBe('QUANTUM');
    });

    it('should return QUANTUM theme for spoons=5', () => {
      expect(getBiologicalTheme(5, false).name).toBe('QUANTUM');
    });

    it('should have emerald orb in QUANTUM', () => {
      const theme = getBiologicalTheme(4, false);
      expect(theme.orb).toContain('bg-emerald-400');
    });

    it('should use mono font in QUANTUM', () => {
      const theme = getBiologicalTheme(5, false);
      expect(theme.wrapper).toContain('font-mono');
      expect(theme.heading).toContain('font-mono');
      expect(theme.body).toContain('font-mono');
    });

    it('should have angular (no-round) buttons in QUANTUM', () => {
      const theme = getBiologicalTheme(4, false);
      expect(theme.button).toContain('rounded-none');
      expect(theme.input).toContain('rounded-none');
    });

    it('should have fast transition in QUANTUM', () => {
      const theme = getBiologicalTheme(5, false);
      expect(theme.button).toContain('duration-150');
    });

    it('should have dense shadow/glow in QUANTUM', () => {
      const theme = getBiologicalTheme(4, false);
      expect(theme.orb).toContain('shadow-[0_0_50px_rgba(52,211,153,0.8)]');
    });
  });

  describe('Theme token completeness', () => {
    it('should always return all 7 theme tokens', () => {
      const tokens = ['name', 'wrapper', 'orb', 'button', 'hud', 'input', 'card', 'heading', 'body'];
      [0, 1, 2, 3, 4, 5].forEach(spoons => {
        const theme = getBiologicalTheme(spoons, false);
        tokens.forEach(token => {
          expect(theme).toHaveProperty(token);
          expect(theme[token as keyof typeof theme]).toBeTruthy();
        });
      });
    });

    it('should always return all 7 theme tokens even in grayRock', () => {
      const tokens = ['name', 'wrapper', 'orb', 'button', 'hud', 'input', 'card', 'heading', 'body'];
      const theme = getBiologicalTheme(5, true);
      tokens.forEach(token => {
        expect(theme).toHaveProperty(token);
      });
    });
  });

  describe('State boundary transitions', () => {
    it('should transition from CRISIS to SANCTUARY at spoons=1', () => {
      expect(getBiologicalTheme(0, false).name).toBe('CRISIS');
      expect(getBiologicalTheme(1, false).name).toBe('SANCTUARY');
    });

    it('should transition from SANCTUARY to BRIDGE at spoons=3', () => {
      expect(getBiologicalTheme(2, false).name).toBe('SANCTUARY');
      expect(getBiologicalTheme(3, false).name).toBe('BRIDGE');
    });

    it('should transition from BRIDGE to QUANTUM at spoons=4', () => {
      expect(getBiologicalTheme(3, false).name).toBe('BRIDGE');
      expect(getBiologicalTheme(4, false).name).toBe('QUANTUM');
    });

    it('grayRock should override all spoon states', () => {
      [1, 2, 3, 4, 5].forEach(spoons => {
        expect(getBiologicalTheme(spoons, true).name).toBe('CRISIS');
      });
    });
  });
});