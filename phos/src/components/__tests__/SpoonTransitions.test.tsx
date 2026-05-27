import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AtmosphereProvider, useAtmosphere } from '../AtmosphereProvider';

vi.mock('../lib/phos-api', () => ({
  phosAPI: {
    connectStream: () => ({ disconnect: () => {}, send: vi.fn() }),
    getAtmosphere: () => Promise.resolve({
      preset: {
        starfield: 'dense',
        palette: { primary: '#39ff14', secondary: '#00e5ff', accent: '#b026ff', background: '#0a0a0a', text: '#e0e0e0', muted: '#666666' },
        motion: { enabled: true, speed: 0.5, particleCount: 200, transitionMs: 800 },
        tracking: true,
        voice: true,
      },
    }),
  },
  PHOSAPIError: class PHOSAPIError extends Error { constructor(msg: string) { super(msg); this.name = 'PHOSAPIError'; } },
}));

vi.mock('../lib/VoiceEngine', () => ({
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
}));

vi.mock('../lib/EventLogger', () => ({
  logGuardianActivated: vi.fn(),
  logGroundingCompleted: vi.fn(),
  logDeviceSealed: vi.fn(),
  logIntentRouted: vi.fn(),
  logSpoonStateChanged: vi.fn(),
  logSurfaceNavigated: vi.fn(),
  logVoiceToggled: vi.fn(),
  logDeviceUnlocked: vi.fn(),
  logLoveChanged: vi.fn(),
  getEventLog: vi.fn(() => []),
  clearLogs: vi.fn(),
}));

vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: {
    getBalance: vi.fn(() => 0),
    addLove: vi.fn(),
    getHistory: vi.fn(() => []),
  },
}));

vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: {
    sealDevice: vi.fn(() => Promise.resolve()),
    isSealed: vi.fn(() => false),
  },
}));

describe('AtmosphereProvider Spoon State Management', () => {
  // Helper component that displays current state as text for assertion
  const StateDisplay = () => {
    const { spoons, grayRock, currentSurface } = useAtmosphere();
    return React.createElement(
      'div',
      { 'data-testid': 'state-display' },
      `spoons:${spoons}|grayRock:${grayRock}|surface:${currentSurface}`
    );
  };

  const SetSpoonsButton = () => {
    const { setSpoons } = useAtmosphere();
    return React.createElement('button', {
      'data-testid': 'set-spoons',
      onClick: () => act(() => setSpoons(1)),
    }, 'Set 1');
  };

  const SetGrayRockButton = () => {
    const { setGrayRock } = useAtmosphere();
    return React.createElement('button', {
      'data-testid': 'set-gray-rock',
      onClick: () => act(() => setGrayRock(true)),
    }, 'Gray Rock');
  };

  const SetSurfaceButton = () => {
    const { setSurface } = useAtmosphere();
    return React.createElement('button', {
      'data-testid': 'set-surface',
      onClick: () => act(() => setSurface('ARCADE')),
    }, 'Go Arcade');
  };

  const DropToZeroButton = () => {
    const { setSpoons } = useAtmosphere();
    return React.createElement('button', {
      'data-testid': 'drop-zero',
      onClick: () => act(() => setSpoons(0)),
    }, 'Drop 0');
  };

  const DropToOneButton = () => {
    const { setSpoons } = useAtmosphere();
    return React.createElement('button', {
      'data-testid': 'drop-one',
      onClick: () => act(() => setSpoons(1)),
    }, 'Drop 1');
  };

  const renderProvider = (initialSpoons = 3, initialSurface = 'GREETING') => {
    return render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: initialSurface as any, initialSpoons: initialSpoons, remoteEnabled: false },
        React.createElement(StateDisplay),
        React.createElement(SetSpoonsButton),
        React.createElement(SetGrayRockButton),
        React.createElement(SetSurfaceButton),
        React.createElement(DropToZeroButton),
        React.createElement(DropToOneButton),
      )
    );
  };

  const getState = () => {
    const el = screen.getByTestId('state-display');
    return el.textContent || '';
  };

  it('should provide initial spoons value', () => {
    renderProvider(4);
    expect(getState()).toContain('spoons:4');
  });

  it('should provide default spoons of 3', () => {
    renderProvider();
    expect(getState()).toContain('spoons:3');
  });

  it('should update spoons when setSpoons is called', () => {
    renderProvider(3);
    expect(getState()).toContain('spoons:3');
    fireEvent.click(screen.getByTestId('set-spoons'));
    expect(getState()).toContain('spoons:1');
  });

  it('should auto-activate grayRock when spoons drop to 0', () => {
    renderProvider(2);
    expect(getState()).toContain('grayRock:false');
    fireEvent.click(screen.getByTestId('drop-zero'));
    expect(getState()).toContain('grayRock:true');
  });

  it('should auto-activate grayRock when spoons drop to 1', () => {
    renderProvider(3);
    expect(getState()).toContain('grayRock:false');
    fireEvent.click(screen.getByTestId('drop-one'));
    expect(getState()).toContain('grayRock:true');
  });

  it('should allow manual grayRock override', () => {
    renderProvider(4);
    expect(getState()).toContain('grayRock:false');
    fireEvent.click(screen.getByTestId('set-gray-rock'));
    expect(getState()).toContain('grayRock:true');
  });

  it('should change surface when setSurface is called', () => {
    renderProvider(3, 'GREETING');
    expect(getState()).toContain('surface:GREETING');
    fireEvent.click(screen.getByTestId('set-surface'));
    expect(getState()).toContain('surface:ARCADE');
  });

  it('should provide preset data without crashing', () => {
    const { getByTestId } = renderProvider(3);
    // Preset resolved without crashing — the provider rendered successfully
    expect(getByTestId('state-display')).toBeTruthy();
  });

  it('should start with grayRock=false when spoons=0 (no URL params)', () => {
    // grayRock is only auto-activated when setSpoons is called with level <= 1,
    // or when detectGrayRock finds crisis params in the URL.
    // With initialSpoons=0 and no URL params, grayRock starts false.
    renderProvider(0);
    expect(getState()).toContain('grayRock:false');
  });

  it('should activate grayRock when setSpoons(0) is explicitly called', () => {
    renderProvider(3);
    expect(getState()).toContain('grayRock:false');
    fireEvent.click(screen.getByTestId('drop-zero'));
    expect(getState()).toContain('grayRock:true');
  });

  it('should start with grayRock=false when spoons > 0', () => {
    renderProvider(3);
    expect(getState()).toContain('grayRock:false');
  });
});

describe('AtmosphereProvider Surface Rendering', () => {
  const SurfaceCapture = ({ onRender }: { onRender: (surface: string) => void }) => {
    const { currentSurface } = useAtmosphere();
    onRender(currentSurface);
    return React.createElement('div', { 'data-testid': 'surface' }, currentSurface);
  };

  const renderSurface = (surface: string, spoons = 3) => {
    let lastSurface = '';
    const result = render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: surface as any, initialSpoons: spoons, remoteEnabled: false },
        React.createElement(SurfaceCapture, { onRender: (s: string) => { lastSurface = s; } })
      )
    );
    return { ...result, getLastSurface: () => lastSurface };
  };

  const allSurfaces = [
    'GREETING', 'IGNITION', 'THE_BUFFER', 'NODE_ZERO', 'GRID',
    'HEARTH', 'COMPASS', 'ARCADE', 'VAULT', 'LEDGER',
    'LOVE', 'ARCHIVE', 'SETTINGS', 'BONDING',
  ];

  it.each(allSurfaces)('should render %s surface', (surface) => {
    renderSurface(surface);
    expect(screen.getByTestId('surface').textContent).toBe(surface);
  });
});

describe('AtmosphereProvider Preset Resolution', () => {
  it('should resolve preset for current surface without crashing', () => {
    render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(() => {
          const { preset } = useAtmosphere();
          return React.createElement('div', { 'data-testid': 'preset' },
            preset ? 'preset-loaded' : 'no-preset'
          );
        })
      )
    );
    expect(screen.getByTestId('preset').textContent).toBe('preset-loaded');
  });

  it('should return GRAY_ROCK preset when grayRock is activated via setSpoons', () => {
    const { getByTestId } = render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(() => {
          const { preset, grayRock, setSpoons } = useAtmosphere();
          return React.createElement('div', null,
            React.createElement('div', { 'data-testid': 'preset-state' },
              grayRock && preset.motion.enabled === false ? 'gray-rock-active' : 'not-gray-rock'
            ),
            React.createElement('button', {
              'data-testid': 'trigger-gray-rock',
              onClick: () => act(() => setSpoons(0)),
            }, 'Trigger')
          );
        })
      )
    );
    // Initially not gray rock
    expect(getByTestId('preset-state').textContent).toBe('not-gray-rock');
    // Trigger setSpoons(0) which should activate grayRock
    fireEvent.click(getByTestId('trigger-gray-rock'));
    expect(getByTestId('preset-state').textContent).toBe('gray-rock-active');
  });
});