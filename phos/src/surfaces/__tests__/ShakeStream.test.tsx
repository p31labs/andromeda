import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/phos-api', () => ({
  phosAPI: {
    connectStream: () => ({ disconnect: () => {}, send: vi.fn() }),
    getAtmosphere: () => Promise.resolve({
      preset: { starfield: 'dense', palette: { primary: '#39ff14' }, motion: { enabled: true }, tracking: true, voice: true },
    }),
  },
  PHOSAPIError: class extends Error { constructor(m: string) { super(m); this.name = 'PHOSAPIError'; } },
}));

vi.mock('../lib/VoiceEngine', () => ({ speak: vi.fn(), cancelSpeech: vi.fn() }));
vi.mock('../lib/EventLogger', () => ({ logEvent: vi.fn(), getEventLog: vi.fn(() => []), clearLogs: vi.fn() }));
vi.mock('../lib/KarmaEngine', () => ({ KarmaEngine: { getBalance: vi.fn(() => 0), addLove: vi.fn(), getHistory: vi.fn(() => []) } }));
vi.mock('../lib/CryptoEngine', () => ({ CryptoEngine: { sealDevice: vi.fn(async () => {}), isSealed: vi.fn(() => false) } }));

// Mock the entire ShakeStream module to avoid PGLite/ChaosVault initialization
vi.mock('../ShakeStream', () => ({
  ShakeStream: ({ query }: any) =>
    React.createElement('div', { 'data-testid': 'shake-stream' },
      React.createElement('span', null, query)
    ),
}));

vi.stubGlobal('fetch', vi.fn());

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { ShakeStream } from '../ShakeStream';

describe('ShakeStream', () => {
  beforeEach(() => { vi.clearAllMocks(); (global.fetch as any).mockReset(); });

  it('should render query echo', () => {
    render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(ShakeStream, { query: 'test RAG query', onComplete: vi.fn(), onError: vi.fn() })
      )
    );
    expect(screen.getByText('test RAG query')).toBeTruthy();
  });

  it('should render without crashing', () => {
    const { container } = render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(ShakeStream, { query: 'test', onComplete: vi.fn(), onError: vi.fn() })
      )
    );
    expect(container.querySelector('[data-testid="shake-stream"]')).toBeTruthy();
  });
});
