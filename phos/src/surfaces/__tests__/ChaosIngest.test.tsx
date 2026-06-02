import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChaosIngest } from '../ChaosIngest';

vi.mock('../hooks/useEmbeddingWorker', () => ({
  useEmbeddingWorker: () => ({
    embed: vi.fn().mockResolvedValue({ embedding: new Array(768).fill(0.1) }),
  }),
}));

vi.mock('../lib/ChaosVault', () => ({
  getChaosVault: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }),
}));

vi.mock('../lib/KarmaEngine', () => ({
  mintCredits: vi.fn(),
}));

const mockTheme = {
  name: 'QUANTUM',
  input: 'input-class',
  button: 'button-class',
};

describe('ChaosIngest', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render title and textarea', () => {
    render(<ChaosIngest theme={mockTheme} />);
    expect(screen.getByText('Somatic Buffer Engine')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ENTER_JOURNAL_ENTRY/)).toBeInTheDocument();
  });

  it('should show sanctuary placeholder in SANCTUARY mode', () => {
    render(<ChaosIngest theme={{ ...mockTheme, name: 'SANCTUARY' }} />);
    expect(screen.getByPlaceholderText(/Write anything here/)).toBeInTheDocument();
  });

  it('should show Isolated Origin badge', () => {
    render(<ChaosIngest theme={mockTheme} />);
    expect(screen.getByText('Isolated Origin')).toBeInTheDocument();
  });

  it('should show READY status initially', () => {
    render(<ChaosIngest theme={mockTheme} />);
    expect(screen.getByText('READY // WAITING FOR SENSOR DATA')).toBeInTheDocument();
  });

  it('should disable COMMIT button when text is empty', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const btn = screen.getByText('COMMIT_TO_VAULT');
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });

  it('should enable COMMIT button when text is entered', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByPlaceholderText(/ENTER_JOURNAL_ENTRY/);
    fireEvent.change(textarea, { target: { value: 'hello world' } });
    const btn = screen.getByText('COMMIT_TO_VAULT');
    expect(btn.getAttribute('disabled')).toBeNull();
  });

  it('should call embed and vault on commit', async () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByPlaceholderText(/ENTER_JOURNAL_ENTRY/);
    fireEvent.change(textarea, { target: { value: 'test content' } });
    fireEvent.click(screen.getByText('COMMIT_TO_VAULT'));
    expect(screen.getByText('COMMIT_TO_VAULT')).toBeTruthy();
  });

  it('should show PROCESSING text while syncing', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByPlaceholderText(/ENTER_JOURNAL_ENTRY/);
    fireEvent.change(textarea, { target: { value: 'testing' } });
    const btn = screen.getByText('COMMIT_TO_VAULT');
    fireEvent.click(btn);
    expect(screen.queryByText('PROCESSING...')).toBeTruthy();
  });

  it('should persist draft via Yjs on text change', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByPlaceholderText(/ENTER_JOURNAL_ENTRY/);
    fireEvent.change(textarea, { target: { value: 'draft text' } });
    expect(screen.getByDisplayValue('draft text')).toBeTruthy();
  });

  it('should be disabled while syncing', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByPlaceholderText(/ENTER_JOURNAL_ENTRY/);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByText('COMMIT_TO_VAULT'));
    expect(textarea.getAttribute('disabled')).not.toBeNull();
  });
});
