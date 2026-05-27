import { describe, it, expect } from 'vitest';

// Test the SurfaceContent routing logic and grayRock behavior
// by replicating the pure logic from PHOSShell.tsx

type SurfaceKey =
  | 'GREETING' | 'IGNITION' | 'THE_BUFFER' | 'NODE_ZERO' | 'GRID'
  | 'HEARTH' | 'COMPASS' | 'ARCADE' | 'VAULT' | 'LEDGER'
  | 'LOVE' | 'ARCHIVE' | 'SETTINGS' | 'BONDING';

// Replicate the surface content rendering logic from PHOSShell.tsx
// This tests the routing switch without needing React rendering
const getSurfaceContent = (surface: string, grayRock: boolean, spoons: number): { type: string; surface: string } => {
  if (grayRock || spoons === 0) {
    return { type: 'CRISIS_OVERLAY', surface };
  }

  const surfaceMap: Record<string, string> = {
    GREETING: 'GREETING_CONTENT',
    IGNITION: 'IGNITION_SURFACE',
    THE_BUFFER: 'CHAOS_INGEST',
    NODE_ZERO: 'NODE_ZERO_CONTENT',
    GRID: 'SERVICE_MESH',
    HEARTH: 'HEARTH_CONTENT',
    COMPASS: 'COMPASS_CONTENT',
    ARCADE: 'ARCADE_CONTENT',
    VAULT: 'VAULT_CONTENT',
    LEDGER: 'LEDGER_CONTENT',
    LOVE: 'LOVE_CONTENT',
    ARCHIVE: 'ARCHIVE_CONTENT',
    SETTINGS: 'SETTINGS_CONTENT',
    BONDING: 'BONDING_CONTENT',
  };

  return { type: surfaceMap[surface] || 'UNKNOWN_SURFACE', surface };
};

describe('SurfaceContent Routing Logic', () => {
  describe('CRISIS/Gray Rock override', () => {
    it('should return CRISIS_OVERLAY when spoons=0', () => {
      const result = getSurfaceContent('GREETING', false, 0);
      expect(result.type).toBe('CRISIS_OVERLAY');
    });

    it('should return CRISIS_OVERLAY when grayRock=true regardless of surface', () => {
      expect(getSurfaceContent('ARCADE', true, 4).type).toBe('CRISIS_OVERLAY');
      expect(getSurfaceContent('NODE_ZERO', true, 3).type).toBe('CRISIS_OVERLAY');
      expect(getSurfaceContent('COMPASS', true, 5).type).toBe('CRISIS_OVERLAY');
    });

    it('should preserve surface name even in CRISIS mode', () => {
      const result = getSurfaceContent('ARCADE', true, 4);
      expect(result.surface).toBe('ARCADE');
    });
  });

  describe('Surface routing switch', () => {
    it('should route GREETING to GREETING_CONTENT', () => {
      expect(getSurfaceContent('GREETING', false, 3).type).toBe('GREETING_CONTENT');
    });

    it('should route IGNITION to IGNITION_SURFACE', () => {
      expect(getSurfaceContent('IGNITION', false, 3).type).toBe('IGNITION_SURFACE');
    });

    it('should route THE_BUFFER to CHAOS_INGEST', () => {
      expect(getSurfaceContent('THE_BUFFER', false, 3).type).toBe('CHAOS_INGEST');
    });

    it('should route NODE_ZERO to NODE_ZERO_CONTENT', () => {
      expect(getSurfaceContent('NODE_ZERO', false, 3).type).toBe('NODE_ZERO_CONTENT');
    });

    it('should route GRID to SERVICE_MESH', () => {
      expect(getSurfaceContent('GRID', false, 3).type).toBe('SERVICE_MESH');
    });

    it('should route HEARTH to HEARTH_CONTENT', () => {
      expect(getSurfaceContent('HEARTH', false, 3).type).toBe('HEARTH_CONTENT');
    });

    it('should route COMPASS to COMPASS_CONTENT', () => {
      expect(getSurfaceContent('COMPASS', false, 3).type).toBe('COMPASS_CONTENT');
    });

    it('should route ARCADE to ARCADE_CONTENT', () => {
      expect(getSurfaceContent('ARCADE', false, 3).type).toBe('ARCADE_CONTENT');
    });

    it('should route VAULT to VAULT_CONTENT', () => {
      expect(getSurfaceContent('VAULT', false, 3).type).toBe('VAULT_CONTENT');
    });

    it('should route LEDGER to LEDGER_CONTENT', () => {
      expect(getSurfaceContent('LEDGER', false, 3).type).toBe('LEDGER_CONTENT');
    });

    it('should route LOVE to LOVE_CONTENT', () => {
      expect(getSurfaceContent('LOVE', false, 3).type).toBe('LOVE_CONTENT');
    });

    it('should route ARCHIVE to ARCHIVE_CONTENT', () => {
      expect(getSurfaceContent('ARCHIVE', false, 3).type).toBe('ARCHIVE_CONTENT');
    });

    it('should route SETTINGS to SETTINGS_CONTENT', () => {
      expect(getSurfaceContent('SETTINGS', false, 3).type).toBe('SETTINGS_CONTENT');
    });

    it('should route BONDING to BONDING_CONTENT', () => {
      expect(getSurfaceContent('BONDING', false, 3).type).toBe('BONDING_CONTENT');
    });

    it('should return UNKNOWN_SURFACE for unrecognized surfaces', () => {
      expect(getSurfaceContent('NONEXISTENT', false, 3).type).toBe('UNKNOWN_SURFACE');
    });
  });

  describe('All 14 surfaces covered', () => {
    const allSurfaces: SurfaceKey[] = [
      'GREETING', 'IGNITION', 'THE_BUFFER', 'NODE_ZERO', 'GRID',
      'HEARTH', 'COMPASS', 'ARCADE', 'VAULT', 'LEDGER',
      'LOVE', 'ARCHIVE', 'SETTINGS', 'BONDING',
    ];

    it('should route all 14 surfaces to a non-crisis type when spoons > 0', () => {
      allSurfaces.forEach(surface => {
        const result = getSurfaceContent(surface, false, 3);
        expect(result.type).not.toBe('CRISIS_OVERLAY');
        expect(result.type).not.toBe('UNKNOWN_SURFACE');
        expect(result.type).toContain('_');
      });
    });

    it('should route all 14 surfaces to CRISIS_OVERLAY when spoons=0', () => {
      allSurfaces.forEach(surface => {
        const result = getSurfaceContent(surface, false, 0);
        expect(result.type).toBe('CRISIS_OVERLAY');
      });
    });
  });
});