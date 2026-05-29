import React from 'react';

vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    waitReady: Promise.resolve(),
    connected: true,
  })),
}));
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    waitReady: Promise.resolve(),
    connected: true,
  })),
}));
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    waitReady: Promise.resolve(),
    connected: true,
  })),
}));
import '@testing-library/jest-dom/vitest';

vi.mock('@electric-sql/pglite', () => {
  const mockQuery = vi.fn(() => Promise.resolve({ rows: [] }));
  const mockImpl = vi.fn(() => ({
    waitReady: Promise.resolve(),
    query: mockQuery,
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }));
  return { PGlite: mockImpl, _mockQuery: mockQuery };
});

vi.mock('../../lib/Embedder', () => ({
  ingestAndEmbed: vi.fn(() => Promise.resolve({ id: 'test-id-123' })),
  ingestAndEmbedChunks: vi.fn(() => Promise.resolve({ total: 1, embedded: 1 })),
}));

vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: { getBalanceCents: vi.fn(() => 4200), addLove: vi.fn(), getBalance: vi.fn(() => 42), getHistory: vi.fn(() => []) },
}));

vi.mock('../lib/EventLogger', () => ({ logEvent: vi.fn() }));

vi.mock('../lib/phos-api', () => ({
  phosAPI: {
    connectStream: () => ({ disconnect: () => {}, send: vi.fn() }),
    getAtmosphere: () => Promise.resolve({
      preset: {
        starfield: 'dense',
        palette: { primary: '#39ff14', secondary: '#00e5ff', accent: '#b026ff', background: '#0a0a0a', text: '#e0e0e0', muted: '#666666' },
        motion: { enabled: true, speed: 0.5, particleCount: 200, transitionMs: 800 },
        tracking: true, voice: true,
      },
    }),
  },
  PHOSAPIError: class PHOSAPIError extends Error { constructor(msg: string) { super(msg); this.name = 'PHOSAPIError'; } },
}));

vi.mock('../lib/VoiceEngine', () => ({ speak: vi.fn(), cancelSpeech: vi.fn() }));
vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: { sealDevice: vi.fn(() => Promise.resolve()), isSealed: vi.fn(() => false) },
}));

import { AtmosphereProvider } from '../../components/AtmosphereProvider';

vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    waitReady: Promise.resolve(),
    connected: true,
  })),
}));
import { ChaosIngest } from '../ChaosIngest';


vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    waitReady: Promise.resolve(),
    connected: true,
  })),
}));
const renderInProvider = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(ChaosIngest)
    )
  );
};

describe('ChaosIngest', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should render textarea and mic button', () => {
    renderInProvider();
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('should render static placeholder', () => {
    renderInProvider();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('Brain dump');
  });

  it('should render placeholder at spoons=1', () => {
    renderInProvider(1);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('Brain dump');
  });

  it('should render placeholder at spoons=3', () => {
    renderInProvider(3);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('Brain dump');
  });

  it('should accept text input', async () => {
    renderInProvider();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'test chaos' } });
    });
    expect(textarea.value).toBe('test chaos');
  });

  it('should render shield banner', () => {
    renderInProvider();
    expect(screen.getByText(/FL TWO-PARTY CONSENT/)).toBeTruthy();
  });

  it('should render mic button', () => {
    renderInProvider();
    const btn = screen.getByRole('button');
    expect(btn).toBeTruthy();
    expect(btn.querySelector('svg')).toBeTruthy();
  });

  it('should update text and clear', async () => {
    renderInProvider();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'some chaos data' } });
    });
    expect(textarea.value).toBe('some chaos data');
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '' } });
    });
    expect(textarea.value).toBe('');
  });
});
