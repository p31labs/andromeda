import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

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
import { ChaosIngest } from '../ChaosIngest';

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

  it('should render textarea and submit button', () => {
    renderInProvider();
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByText('INGEST CHAOS')).toBeTruthy();
  });

  it('should adapt placeholder for SANCTUARY (spoons <= 2)', () => {
    renderInProvider(1);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('weighing on you');
  });

  it('should adapt placeholder for BRIDGE (spoons = 3)', () => {
    renderInProvider(3);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('on your mind');
  });

  it('should disable button when textarea is empty', () => {
    renderInProvider();
    expect(screen.getByText('INGEST CHAOS').getAttribute('disabled')).not.toBeNull();
  });

  it('should enable button when text is entered', async () => {
    renderInProvider();
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    });
    expect(screen.getByText('INGEST CHAOS').getAttribute('disabled')).toBeNull();
  });

  it('should show error state on failed ingestion', async () => {
    const mod = await import('../../lib/Embedder');
    (mod.ingestAndEmbedChunks as any).mockRejectedValueOnce(new Error('fail'));
    renderInProvider();
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'fail' } });
    });
    await act(async () => { fireEvent.click(screen.getByText('INGEST CHAOS')); });
    expect(screen.getByText(/ingestion failed/i)).toBeTruthy();
  });

  it('should show character count', () => {
    renderInProvider();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(screen.getByText('5 chars')).toBeTruthy();
  });

  it('should show chunk count in char display after ingestion', async () => {
    renderInProvider();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello world test' } });
    await act(async () => { fireEvent.click(screen.getByText('INGEST CHAOS')); });
    expect(screen.getByText(/1\/1 chunks embedded/)).toBeTruthy();
  });
});
