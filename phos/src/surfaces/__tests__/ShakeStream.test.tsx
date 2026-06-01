import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShakeStream } from '../ShakeStream';

const mockVault = {
  query: vi.fn().mockResolvedValue({ rows: [] }),
};

vi.mock('../../lib/ChaosVault', () => ({
  getChaosVault: () => Promise.resolve(mockVault),
}));

describe('ShakeStream', () => {
  it('should render search input', () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    expect(screen.getByPlaceholderText('Search your journal...')).toBeTruthy();
    expect(screen.getByText('SEARCH')).toBeTruthy();
  });

  it('should disable search when query is empty', () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const btn = screen.getByText('SEARCH');
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });

  it('should enable search when query is entered', () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const input = screen.getByPlaceholderText('Search your journal...');
    fireEvent.change(input, { target: { value: 'test query' } });
    const btn = screen.getByText('SEARCH');
    expect(btn.getAttribute('disabled')).toBeNull();
  });

  it('should show no results message for empty vault', async () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const input = screen.getByPlaceholderText('Search your journal...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByText('SEARCH'));
    await waitFor(() => {
      expect(screen.getByText(/No matching entries|Search requires/)).toBeTruthy();
    });
  });

  it('should not show results container initially', () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    expect(screen.queryByText(/Enter a search term/)).toBeNull();
  });

  it('should display search results with source door and text', async () => {
    mockVault.query.mockResolvedValueOnce({
      rows: [
        { source_door: 'journal', raw_text: 'Today was a good day', created_at: '2026-01-01' },
      ],
    });

    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const input = screen.getByPlaceholderText('Search your journal...');
    fireEvent.change(input, { target: { value: 'good' } });
    fireEvent.click(screen.getByText('SEARCH'));

    await waitFor(() => {
      expect(screen.getByText(/Found 1 matching entries/)).toBeTruthy();
      expect(screen.getByText(/journal/)).toBeTruthy();
    });
  });

  it('should handle Enter key to trigger search', async () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const input = screen.getByPlaceholderText('Search your journal...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/No matching entries|Search requires/)).toBeTruthy();
    });
  });

  it('should show error message on search failure', async () => {
    mockVault.query.mockRejectedValueOnce(new Error('DB error'));

    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const input = screen.getByPlaceholderText('Search your journal...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByText('SEARCH'));

    await waitFor(() => {
      expect(screen.getByText(/Search requires journal entries/)).toBeTruthy();
    });
  });

  it('should truncate long text in results', async () => {
    mockVault.query.mockResolvedValueOnce({
      rows: [
        { source_door: 'door1', raw_text: 'x'.repeat(200), created_at: '2026-01-01' },
      ],
    });

    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="" />);
    const input = screen.getByPlaceholderText('Search your journal...');
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.click(screen.getByText('SEARCH'));

    await waitFor(() => {
      expect(screen.getByText(/\.\.\./)).toBeTruthy();
    });
  });

  it('should set initial query from props', () => {
    render(<ShakeStream theme={{ name: 'QUANTUM' }} initialQuery="hello" />);
    const input = screen.getByPlaceholderText('Search your journal...') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });
});
