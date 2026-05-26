/**
 * PHOS Atmosphere — Surface config worker
 *
 * Returns atmosphere presets for a given surface.
 * No LLMs — purely deterministic preset resolution.
 */

interface Env {}

interface AtmosphereEndpointResponse {
  status: string;
  surface: string;
  preset: {
    starfield: string;
    palette: Record<string, string>;
    motion: {
      enabled: boolean;
      speed: number;
      particleCount: number;
      transitionMs: number;
    };
    tracking: boolean;
    voice: boolean;
  };
}

// Inline presets for self-contained worker
const GRAY_ROCK = {
  starfield: 'void',
  palette: {
    primary: '#888888',
    secondary: '#666666',
    accent: '#555555',
    background: '#000000',
    text: '#cccccc',
    muted: '#555555',
  },
  motion: { enabled: false, speed: 0, particleCount: 0, transitionMs: 0 },
  tracking: false,
  voice: false,
};

const SURFACE_PRESETS: Record<string, typeof GRAY_ROCK> = {
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
  GRAY_ROCK,
};

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const surface = (url.searchParams.get('surface') || 'GREETING').toUpperCase();
    const grayRock =
      url.searchParams.has('urgent') ||
      url.searchParams.has('grayrock') ||
      url.searchParams.has('crisis');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=60',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const preset = grayRock ? GRAY_ROCK : SURFACE_PRESETS[surface] ?? SURFACE_PRESETS.GREETING;

    const body: AtmosphereEndpointResponse = {
      status: 'ok',
      surface: grayRock ? 'GRAY_ROCK' : surface,
      preset,
    };

    return new Response(JSON.stringify(body, null, 2), { status: 200, headers });
  },
};
