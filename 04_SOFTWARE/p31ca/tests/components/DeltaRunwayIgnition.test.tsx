import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DeltaRunwayIgnition from '../../src/components/DeltaRunwayIgnition';

const mockExec = vi.fn().mockResolvedValue(undefined);
const mockQuery = vi.fn().mockResolvedValue({ rows: [] });

const mockDb = {
  exec: mockExec,
  query: mockQuery,
};

vi.mock('../../src/utils/pglite-warehouse', () => ({
  getWarehouseDB: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock('lucide-react', () => ({
  ChevronRight: () => React.createElement('span', null, '>'),
  Shield: () => React.createElement('span', null, 'shield'),
  Zap: () => React.createElement('span', null, 'zap'),
  Terminal: () => React.createElement('span', null, 'terminal'),
}));

describe('DeltaRunwayIgnition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockResolvedValue(undefined);
  });

  describe('Idle State', () => {
    it('renders idle state with Begin Live Ignition button', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText('Begin Live Ignition')).toBeInTheDocument();
    });

    it('renders the P31 delta runway header', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText('P31 // DELTA RUNWAY')).toBeInTheDocument();
    });

    it('renders descriptive text about ceremony in idle state', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText(/This is not a demo/)).toBeInTheDocument();
    });

    it('renders spoon level helper text in idle state', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText(/Your current spoon level changes how this ritual feels/)).toBeInTheDocument();
    });
  });

  describe('Spoon Dial', () => {
    it('renders 3 spoon buttons', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText('1 Spoon')).toBeInTheDocument();
      expect(screen.getByText('3 Spoons')).toBeInTheDocument();
      expect(screen.getByText('6 Spoons')).toBeInTheDocument();
    });

    it('changes active state when clicking spoon 1', () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('1 Spoon'));
      expect(screen.getByText('Seal It.')).toBeInTheDocument();
    });

    it('changes active state when clicking spoon 6', () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText('Delta Runway Ignition')).toBeInTheDocument();
    });

    it('shows cinematic subtitle at spoon level 3', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText(/"You have read the story. Now walk the runway."/)).toBeInTheDocument();
    });

    it('does not show subtitle at spoon level 1', () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('1 Spoon'));
      expect(screen.queryByText(/"You have read the story. Now walk the runway."/)).not.toBeInTheDocument();
    });

    it('does not show subtitle at spoon level 6', () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.queryByText(/"You have read the story. Now walk the runway."/)).not.toBeInTheDocument();
    });
  });

  describe('Theme Classes', () => {
    it('applies white bg theme at spoon level 1', () => {
      const { container } = render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('1 Spoon'));
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('bg-white');
      expect(root.className).toContain('text-black');
    });

    it('applies zinc bg theme at spoon level 3', () => {
      const { container } = render(React.createElement(DeltaRunwayIgnition));
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('bg-zinc-950');
      expect(root.className).toContain('text-zinc-200');
    });

    it('applies black bg with emerald text at spoon level 6', () => {
      const { container } = render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('6 Spoons'));
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('bg-black');
      expect(root.className).toContain('text-emerald-500');
    });
  });

  describe('Forging State', () => {
    it('transitions to forging state when Begin is clicked', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText('FORGING SOVEREIGN IDENTITY')).toBeInTheDocument();
      });
    });

    it('shows forging message at spoon level 3', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText(/Forging your sovereign identity in the Delta/)).toBeInTheDocument();
      });
    });

    it('shows vault sealing message at spoon level 1', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('1 Spoon'));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText(/Sealing your vault in the background/)).toBeInTheDocument();
      });
    });

    it('does not show idle content during forging', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.queryByText('Begin Live Ignition')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sealed State', () => {
    it('shows sealed state after forging completes', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText('THE ROPES ARE OPEN')).toBeInTheDocument();
      });
    });

    it('displays the public key in sealed state', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        const keyElement = screen.getByText(/This device is now a sovereign node/);
        expect(keyElement).toBeInTheDocument();
      });
    });

    it('displays the sealed message confirming key generation', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText(/Real Ed25519 key generated \+ sealed in local PGLite/)).toBeInTheDocument();
      });
    });

    it('shows the candle emoji in sealed state', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText('🕯️')).toBeInTheDocument();
      });
    });
  });

  describe('Database Persistence', () => {
    it('creates sovereign_identity table on ignition', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE IF NOT EXISTS sovereign_identity')
        );
      });
    });

    it('inserts identity record into database', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT OR REPLACE INTO sovereign_identity')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when ceremony fails', async () => {
      mockExec.mockRejectedValueOnce(new Error('DB locked'));
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText(/Ceremony hit a temporary issue/)).toBeInTheDocument();
      });
    });

    it('transitions to sealed phase even on error', async () => {
      mockExec.mockRejectedValueOnce(new Error('DB locked'));
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText('THE ROPES ARE OPEN')).toBeInTheDocument();
      });
    });
  });

  describe('Header_ALWAYS_VISIBLE', () => {
    it('shows header in idle state', () => {
      render(React.createElement(DeltaRunwayIgnition));
      expect(screen.getByText('P31 // DELTA RUNWAY')).toBeInTheDocument();
    });

    it('shows header during forging', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText('P31 // DELTA RUNWAY')).toBeInTheDocument();
      });
    });

    it('shows header in sealed state', async () => {
      render(React.createElement(DeltaRunwayIgnition));
      fireEvent.click(screen.getByText('Begin Live Ignition'));
      await waitFor(() => {
        expect(screen.getByText('P31 // DELTA RUNWAY')).toBeInTheDocument();
      });
    });
  });
});
