/**
 * Atmosphere Engine — Surface theming engine.
 * Controls starfield preset, color palette, and motion budget per Surface.
 *
 * GRAY_ROCK profile: strips all animation, color, and tracking.
 * Triggered by ?urgent query param, low spoons, or crisis keywords.
 */

export type SurfaceKey =
  | 'GREETING'
  | 'BONDING'
  | 'THE_BUFFER'
  | 'NODE_ZERO'
  | 'ARCADE'
  | 'VAULT'
  | 'GRID'
  | 'COMPASS'
  | 'SETTINGS'
  | 'IGNITION'
  | 'LEDGER'
  | 'LOVE'
  | 'ARCHIVE';

export interface AtmospherePreset {
  starfield: 'dense' | 'sparse' | 'static' | 'void';
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  motion: {
    enabled: boolean;
    speed: number;          // 0 (still) to 1 (max)
    particleCount: number;  // star count
    transitionMs: number;
  };
  tracking: boolean;
  voice: boolean;
}

const GRAY_ROCK_PRESET: AtmospherePreset = {
  starfield: 'void',
  palette: {
    primary: '#888888',
    secondary: '#666666',
    accent: '#555555',
    background: '#000000',
    text: '#cccccc',
    muted: '#555555',
  },
  motion: {
    enabled: false,
    speed: 0,
    particleCount: 0,
    transitionMs: 0,
  },
  tracking: false,
  voice: false,
};

const SURFACE_PRESETS: Record<SurfaceKey, AtmospherePreset> = {
  GREETING: {
    starfield: 'dense',
    palette: {
      primary: '#39ff14',
      secondary: '#00e5ff',
      accent: '#b026ff',
      background: '#0a0a0a',
      text: '#e0e0e0',
      muted: '#666666',
    },
    motion: { enabled: true, speed: 0.5, particleCount: 200, transitionMs: 800 },
    tracking: true,
    voice: true,
  },
  IGNITION: {
    starfield: 'sparse',
    palette: {
      primary: '#ffb000',
      secondary: '#ff8855',
      accent: '#ffcc88',
      background: '#1a1408',
      text: '#f0e6d0',
      muted: '#887744',
    },
    motion: { enabled: true, speed: 0.15, particleCount: 40, transitionMs: 2000 },
    tracking: false,
    voice: true,
  },
  BONDING: {
    starfield: 'dense',
    palette: {
      primary: '#ffb000',
      secondary: '#ff8855',
      accent: '#ff3355',
      background: '#0a0a0a',
      text: '#f0e6d0',
      muted: '#665544',
    },
    motion: { enabled: true, speed: 0.3, particleCount: 150, transitionMs: 1200 },
    tracking: true,
    voice: true,
  },
  THE_BUFFER: {
    starfield: 'sparse',
    palette: {
      primary: '#00e5ff',
      secondary: '#66bbff',
      accent: '#3399ff',
      background: '#0a0a14',
      text: '#c8d8e8',
      muted: '#446688',
    },
    motion: { enabled: true, speed: 0.2, particleCount: 80, transitionMs: 1500 },
    tracking: false,
    voice: true,
  },
  NODE_ZERO: {
    starfield: 'static',
    palette: {
      primary: '#b026ff',
      secondary: '#dd66ff',
      accent: '#ff88ee',
      background: '#0a000a',
      text: '#e8c8f0',
      muted: '#553366',
    },
    motion: { enabled: true, speed: 0.1, particleCount: 60, transitionMs: 2000 },
    tracking: true,
    voice: true,
  },
  ARCADE: {
    starfield: 'dense',
    palette: {
      primary: '#39ff14',
      secondary: '#ffb000',
      accent: '#ff3355',
      background: '#0a0a0a',
      text: '#e0e0e0',
      muted: '#444444',
    },
    motion: { enabled: true, speed: 0.7, particleCount: 300, transitionMs: 400 },
    tracking: true,
    voice: false,
  },
  VAULT: {
    starfield: 'sparse',
    palette: {
      primary: '#00e5ff',
      secondary: '#39ff14',
      accent: '#b026ff',
      background: '#000814',
      text: '#ccddee',
      muted: '#334466',
    },
    motion: { enabled: true, speed: 0.15, particleCount: 40, transitionMs: 1000 },
    tracking: false,
    voice: true,
  },
  GRID: {
    starfield: 'sparse',
    palette: {
      primary: '#39ff14',
      secondary: '#00e5ff',
      accent: '#b026ff',
      background: '#0a0a0a',
      text: '#e0e0e0',
      muted: '#444444',
    },
    motion: { enabled: true, speed: 0.4, particleCount: 100, transitionMs: 600 },
    tracking: true,
    voice: true,
  },
  COMPASS: {
    starfield: 'static',
    palette: {
      primary: '#b026ff',
      secondary: '#3399ff',
      accent: '#00e5ff',
      background: '#0a0000',
      text: '#e0c0e0',
      muted: '#442244',
    },
    motion: { enabled: true, speed: 0.25, particleCount: 50, transitionMs: 2000 },
    tracking: true,
    voice: true,
  },
  SETTINGS: {
    starfield: 'sparse',
    palette: {
      primary: '#888888',
      secondary: '#aaaaaa',
      accent: '#cccccc',
      background: '#0a0a0a',
      text: '#e0e0e0',
      muted: '#666666',
    },
    motion: { enabled: true, speed: 0.1, particleCount: 30, transitionMs: 300 },
    tracking: false,
    voice: false,
  },
  LEDGER: {
    starfield: 'static',
    palette: {
      primary: '#667788',
      secondary: '#556677',
      accent: '#00e5ff',
      background: '#0a0a0f',
      text: '#c0c8d0',
      muted: '#445566',
    },
    motion: { enabled: true, speed: 0.15, particleCount: 30, transitionMs: 1500 },
    tracking: true,
    voice: true,
  },
  LOVE: {
    starfield: 'sparse',
    palette: {
      primary: '#ffb000',
      secondary: '#00e5ff',
      accent: '#ff8800',
      background: '#0a0800',
      text: '#e0d0b0',
      muted: '#554422',
    },
    motion: { enabled: true, speed: 0.2, particleCount: 40, transitionMs: 1500 },
    tracking: true,
    voice: true,
  },
  ARCHIVE: {
    starfield: 'static',
    palette: {
      primary: '#00e5ff',
      secondary: '#39ff14',
      accent: '#66ffcc',
      background: '#001122',
      text: '#cce0ff',
      muted: '#224466',
    },
    motion: { enabled: true, speed: 0.15, particleCount: 30, transitionMs: 2000 },
    tracking: true,
    voice: true,
  },
};

/**
 * Resolve the atmosphere preset for a given surface.
 * If grayRock is true, returns the GRAY_ROCK_PRESET unconditionally.
 */
export function resolveAtmosphere(
  surface: SurfaceKey,
  grayRock: boolean = false
): AtmospherePreset {
  if (grayRock) {
    return GRAY_ROCK_PRESET;
  }
  return SURFACE_PRESETS[surface] ?? SURFACE_PRESETS.GREETING;
}

/**
 * Detect Gray Rock mode from URL search params or a list of crisis keywords.
 */
export function detectGrayRock(
  search: string,
  inputText?: string
): boolean {
  const params = new URLSearchParams(search);
  if (params.has('urgent') || params.has('grayrock') || params.has('crisis')) {
    return true;
  }

  if (inputText) {
    const crisisWords = [
      'crisis', 'urgent', 'emergency', 'overwhelmed',
      'can\'t', 'cannot', 'spoon', 'exhausted',
    ];
    const lower = inputText.toLowerCase();
    return crisisWords.some((w) => lower.includes(w));
  }

  return false;
}

export { GRAY_ROCK_PRESET, SURFACE_PRESETS };
