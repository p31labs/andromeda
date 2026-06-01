import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChaosIngest } from '../ChaosIngest';

vi.mock('../../lib/ChaosVault', () => ({
  getChaosVault: vi.fn().mockResolvedValue({
    query: vi.fn().mockReturnValue(new Promise(() => {}))  // never resolves — keeps syncing true
  }),
}));

const mockTheme = {
  name: 'QUANTUM',
  input: 'bg-black border border-emerald-900/60 text-emerald-300 rounded-none',
  button: 'bg-emerald-950/20 border border-emerald-500/40 text-emerald-400 rounded-none',
};

describe('ChaosIngest', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render textarea', () => {
    render(<ChaosIngest theme={mockTheme} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('should disable submit when text is empty', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });

  it('should enable submit when text is entered', () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test entry' } });
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('disabled')).toBeNull();
  });

  it('should show processing state on submit', async () => {
    render(<ChaosIngest theme={mockTheme} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test journal entry' } });
    const btn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(btn);
    });
    // After click + microtask flush, syncing is true and status shows COMMITTING
    expect(screen.getAllByText(/COMMITTING|PROCESSING/).length).toBeGreaterThan(0);
  });
});
