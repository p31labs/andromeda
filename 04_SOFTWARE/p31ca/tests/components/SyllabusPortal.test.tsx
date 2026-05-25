import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SyllabusPortal from '../../src/components/SyllabusPortal';

vi.mock('lucide-react', () => ({
  ChevronRight: () => React.createElement('span', null, '>'),
  Shield: () => React.createElement('span', null, 'shield'),
  Zap: () => React.createElement('span', null, 'zap'),
  Terminal: () => React.createElement('span', null, 'terminal'),
  Coffee: () => React.createElement('span', null, 'coffee'),
  Lock: () => React.createElement('span', null, 'lock'),
  Smartphone: () => React.createElement('span', null, 'smartphone'),
  Database: () => React.createElement('span', null, 'database'),
  Globe: () => React.createElement('span', null, 'globe'),
}));

describe('SyllabusPortal', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText('P31 // Sovereign Edge')).toBeInTheDocument();
    });

    it('renders the header text at spoon level 3 (default)', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText("The P31 Center For Family Members Who Can't Tech Good")).toBeInTheDocument();
    });

    it('renders the subtitle at spoon level 3', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText(/"And wanna learn to do other stuff good too."/)).toBeInTheDocument();
    });
  });

  describe('Spoon Dial', () => {
    it('renders 3 spoon buttons', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText('1 Spoon')).toBeInTheDocument();
      expect(screen.getByText('3 Spoons')).toBeInTheDocument();
      expect(screen.getByText('6 Spoons')).toBeInTheDocument();
    });

    it('changes header text to compact mode at spoon 1', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('1 Spoon'));
      expect(screen.getByText('The P31 Handbook.')).toBeInTheDocument();
    });

    it('changes header text to terminal mode at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText('> P31_SOVEREIGN_EDGE // INITIALIZED')).toBeInTheDocument();
    });

    it('shows COGNITIVE_LOAD label at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText('COGNITIVE_LOAD')).toBeInTheDocument();
    });

    it('shows abbreviated spoon labels at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText('1S')).toBeInTheDocument();
      expect(screen.getByText('3S')).toBeInTheDocument();
      expect(screen.getByText('6S')).toBeInTheDocument();
    });

    it('displays telemetry line at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText(/LARMOR 863 Hz/)).toBeInTheDocument();
    });

    it('does not show subtitle at spoon 1', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('1 Spoon'));
      expect(screen.queryByText(/"And wanna learn to do other stuff good too."/)).not.toBeInTheDocument();
    });

    it('does not show subtitle at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.queryByText(/"And wanna learn to do other stuff good too."/)).not.toBeInTheDocument();
    });
  });

  describe('Volume Navigation', () => {
    it('renders all 3 volume tabs', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText('Vol. 1')).toBeInTheDocument();
      expect(screen.getByText('Vol. 2')).toBeInTheDocument();
      expect(screen.getByText('Vol. 3')).toBeInTheDocument();
    });

    it('shows volume 1 title by default', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText('VOLUME I: THE HARDWARE AND THE HUSTLE')).toBeInTheDocument();
    });

    it('switches to volume 2 when clicked', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 2'));
      expect(screen.getByText('VOLUME II: OUTFITS, SPARE TIRES, & REFEREES')).toBeInTheDocument();
    });

    it('switches to volume 3 when clicked', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      expect(screen.getByText('VOLUME III: WELCOME TO THE DELTA')).toBeInTheDocument();
    });

    it('shows abbreviated volume labels at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText('VOL1')).toBeInTheDocument();
      expect(screen.getByText('VOL2')).toBeInTheDocument();
      expect(screen.getByText('VOL3')).toBeInTheDocument();
    });
  });

  describe('Module Display', () => {
    it('shows modules for volume 1', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText('The Magic Screen')).toBeInTheDocument();
      expect(screen.getByText('The Big Brain in the Other Room')).toBeInTheDocument();
      expect(screen.getByText('The Invisible Walkie-Talkie')).toBeInTheDocument();
      expect(screen.getByText('The Virtual Balloon Trap')).toBeInTheDocument();
      expect(screen.getByText('The Magic Button')).toBeInTheDocument();
    });

    it('shows modules for volume 2', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 2'));
      expect(screen.getByText('The Outfit Problem')).toBeInTheDocument();
      expect(screen.getByText('The Spoon Dial')).toBeInTheDocument();
      expect(screen.getByText('The Four Nodes of the Delta')).toBeInTheDocument();
    });

    it('shows modules for volume 3', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      expect(screen.getByText('The VIP Pass')).toBeInTheDocument();
      expect(screen.getByText('The Calcium Cage')).toBeInTheDocument();
    });

    it('displays module summaries', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText(/The phone or little Chromebook you hold is the Steering Wheel/)).toBeInTheDocument();
    });

    it('displays module ID badges', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText(/MOD 01/)).toBeInTheDocument();
    });

    it('displays classification via getAllByText for duplicates', () => {
      render(React.createElement(SyllabusPortal));
      const matches = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('HIGHLY CONFIDENTIAL') ?? false;
      });
      expect(matches.length).toBeGreaterThan(0);
    });

    it('displays at least one difficulty label', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.getByText(/Difficulty: Blue Steel/)).toBeInTheDocument();
    });
  });

  describe('Module Expansion', () => {
    it('expands module to show core content when clicked at spoon 3', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('The Magic Screen'));
      expect(screen.getByText('Architectural Truth')).toBeInTheDocument();
      expect(screen.getByText(/By separating the Steering Wheel from the Engine/)).toBeInTheDocument();
    });

    it('collapses module when clicked again', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('The Magic Screen'));
      fireEvent.click(screen.getByText('The Magic Screen'));
      expect(screen.queryByText('Architectural Truth')).not.toBeInTheDocument();
    });
  });

  describe('Volume 3 VIP Section', () => {
    it('shows ignition button in volume 3', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      expect(screen.getByText('Initiate Ignition Sequence')).toBeInTheDocument();
    });

    it('shows VIP content after clicking ignition button', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      fireEvent.click(screen.getByText('Initiate Ignition Sequence'));
      expect(screen.getByText('Welcome to the Delta')).toBeInTheDocument();
    });

    it('does not show VIP section in volumes 1 and 2', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.queryByText('Initiate Ignition Sequence')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Vol. 2'));
      expect(screen.queryByText('Initiate Ignition Sequence')).not.toBeInTheDocument();
    });

    it('shows key generation message in VIP section', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      fireEvent.click(screen.getByText('Initiate Ignition Sequence'));
      expect(screen.getByText(/Non-Exportable Ed25519 Key Generated/)).toBeInTheDocument();
    });

    it('shows rope message in VIP section', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      fireEvent.click(screen.getByText('Initiate Ignition Sequence'));
      expect(screen.getByText(/The ropes are open/)).toBeInTheDocument();
    });

    it('shows storybook disclaimer at spoon 3 in VIP', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('Vol. 3'));
      fireEvent.click(screen.getByText('Initiate Ignition Sequence'));
      expect(screen.getByText(/This is the storybook side/)).toBeInTheDocument();
    });

    it('shows Enter the Delta button text at spoon 1', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('1 Spoon'));
      fireEvent.click(screen.getByText('Vol. 3'));
      expect(screen.getByText('Enter the Delta')).toBeInTheDocument();
    });

    it('shows terminal-style VIP header at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      fireEvent.click(screen.getByText('VOL3'));
      fireEvent.click(screen.getByText(/Initiate Ignition Sequence/));
      expect(screen.getByText('> DELTA_IGNITION: COMPLETE')).toBeInTheDocument();
    });
  });

  describe('Telemetry Footer', () => {
    it('shows telemetry footer at spoon 6', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText(/SYS::P31_EDGE/)).toBeInTheDocument();
    });

    it('does not show telemetry footer at spoon 3', () => {
      render(React.createElement(SyllabusPortal));
      expect(screen.queryByText(/SYS::P31_EDGE/)).not.toBeInTheDocument();
    });

    it('does not show telemetry footer at spoon 1', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('1 Spoon'));
      expect(screen.queryByText(/SYS::P31_EDGE/)).not.toBeInTheDocument();
    });

    it('displays module count in telemetry', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText(/MODS_RENDERED: 5/)).toBeInTheDocument();
    });

    it('displays current volume in telemetry', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      fireEvent.click(screen.getByText('VOL2'));
      expect(screen.getByText(/VOL: 2/)).toBeInTheDocument();
    });

    it('shows RELAY and LARMOR info in telemetry', () => {
      render(React.createElement(SyllabusPortal));
      fireEvent.click(screen.getByText('6 Spoons'));
      expect(screen.getByText(/bonding-relay/)).toBeInTheDocument();
      expect(screen.getByText(/RELAY:/)).toBeInTheDocument();
    });
  });
});
