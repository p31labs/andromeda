import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
vi.mock('../lib/EventLogger', () => ({ logEvent: vi.fn(), getEventLog: vi.fn(() => []), clearLogs: vi.fn() }));
vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: { getBalance: vi.fn(() => 0), addLove: vi.fn(), getHistory: vi.fn(() => []) },
}));
vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: { sealDevice: vi.fn(() => Promise.resolve()), isSealed: vi.fn(() => false) },
}));
vi.mock('../lib/Embedder', () => ({
  embedText: vi.fn(() => Promise.resolve(new Array(384).fill(0.1))),
  ingestAndEmbedChunks: vi.fn(() => Promise.resolve({ total: 2, embedded: 2 })),
}));
vi.mock('../lib/ChaosVault', () => ({
  getChaosVault: vi.fn(() => Promise.resolve({
    query: vi.fn(() => Promise.resolve({ rows: [] })),
  })),
  getDoorStats: vi.fn(() => Promise.resolve({ archive: 5, hearth: 3 })),
  recentEntries: vi.fn(() => Promise.resolve([])),
  queryByDoor: vi.fn(() => Promise.resolve([])),
  getAllEmbeddedRows: vi.fn(() => Promise.resolve([])),
  ingestChunks: vi.fn(() => Promise.resolve({ total: 1, embedded: 1 })),
}));
vi.mock('../lib/ChunkingEngine', () => ({
  semanticChunker: vi.fn((text: string) => [{ text, heading: '', chunkIndex: 0, totalChunks: 1, charCount: text.length, isCodeBlock: false }]),
}));
vi.mock('../lib/VectorMath', () => ({
  rankSearchResults: vi.fn(() => []),
  formatContext: vi.fn(() => ''),
  buildSystemPrompt: vi.fn(() => 'You are PHOS.'),
  isValidEmbedding: vi.fn(() => true),
}));

Object.defineProperty(window, 'localStorage', {
  value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
  writable: true,
});

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { ArchiveSurface } from '../ArchiveSurface';

const renderArchive = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(ArchiveSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderArchive();
  });

  it('renders the Archive header', () => {
    renderArchive();
    expect(screen.getByText(/The Archive/)).toBeTruthy();
  });

  it('renders three tab buttons', () => {
    renderArchive();
    const tabContainer = screen.getAllByRole('button').filter((btn) =>
      btn.getAttribute('class')?.includes('flex-1') &&
      btn.getAttribute('class')?.includes('py-2') &&
      btn.getAttribute('class')?.includes('rounded-lg')
    );
    expect(tabContainer.length).toBeGreaterThanOrEqual(3);
  });

  it('renders search input in search tab', () => {
    renderArchive();
    expect(screen.getByPlaceholderText(/Ask PHOS about your data/)).toBeTruthy();
  });

  it('renders ask button in search tab', () => {
    renderArchive();
    const allBtns = screen.getAllByRole('button');
    const askBtn = allBtns.find((b) => b.getAttribute('type') === 'submit');
    expect(askBtn).toBeTruthy();
  });

  it('switches to browse tab', () => {
    renderArchive();
    const allBtns = screen.getAllByRole('button');
    const browseBtn = allBtns.find((b) => b.textContent?.includes('\uD83D\uDC\uDA Browse'));
    if (browseBtn) fireEvent.click(browseBtn);
    expect(screen.getByText(/Filter entries/)).toBeTruthy();
  });

  it('switches to ingest tab', () => {
    renderArchive();
    const allBtns = screen.getAllByRole('button');
    const ingestBtn = allBtns.find((b) => b.textContent?.includes('\u2B07 Ingest'));
    if (ingestBtn) fireEvent.click(ingestBtn);
    expect(screen.getByPlaceholderText(/Paste documents/)).toBeTruthy();
  });

  it('renders top-k and threshold controls', () => {
    renderArchive();
    expect(screen.getByText(/top-k/)).toBeTruthy();
    expect(screen.getByText(/threshold/)).toBeTruthy();
  });

  it('renders empty state message in search tab', () => {
    renderArchive();
    expect(screen.getByText(/Search your knowledge graph/)).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderArchive(0);
    expect(screen.getByText(/The Archive/)).toBeTruthy();
  });

  it('renders at spoons=1 without crashing', () => {
    renderArchive(1);
    expect(screen.getByText(/The Archive/)).toBeTruthy();
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports ArchiveSurface as named export', () => {
    expect(ArchiveSurface).toBeDefined();
  });

  it('exports ArchiveSurface as default export', async () => {
    const mod = await import('../ArchiveSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderArchive();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderArchive();
    unmount();
  });

  it('full render cycle through all tabs', () => {
    const { unmount } = renderArchive();
    const allBtns = screen.getAllByRole('button');
    const browseBtn = allBtns.find((b) => b.textContent?.includes('\uD83D\uDC\uDA Browse'));
    const ingestBtn = allBtns.find((b) => b.textContent?.includes('\u2B07 Ingest'));
    const searchBtn = allBtns.find((b) => b.textContent?.includes('\uD83D\uDD0D Search'));
    if (browseBtn) fireEvent.click(browseBtn);
    if (ingestBtn) fireEvent.click(ingestBtn);
    if (searchBtn) fireEvent.click(searchBtn);
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderArchive();
    unmount();
    renderArchive();
    expect(screen.getByText(/The Archive/)).toBeTruthy();
  });
});
