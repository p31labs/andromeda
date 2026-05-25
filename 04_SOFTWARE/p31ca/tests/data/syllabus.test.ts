import { describe, it, expect } from 'vitest';
import { SYLLABUS } from '../../src/data/syllabus';
import type { SyllabusModule, SyllabusVolume } from '../../src/data/syllabus';

describe('syllabus data', () => {
  describe('SYLLABUS structure', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(SYLLABUS)).toBe(true);
      expect(SYLLABUS.length).toBeGreaterThan(0);
    });

    it('contains exactly 3 volumes', () => {
      expect(SYLLABUS).toHaveLength(3);
    });
  });

  describe('Volume structure', () => {
    it('every volume has an id, volume string, and modules array', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        expect(vol).toHaveProperty('id');
        expect(vol).toHaveProperty('volume');
        expect(vol).toHaveProperty('modules');
        expect(typeof vol.id).toBe('number');
        expect(typeof vol.volume).toBe('string');
        expect(Array.isArray(vol.modules)).toBe(true);
      });
    });

    it('volume IDs are sequential starting from 1', () => {
      SYLLABUS.forEach((vol: SyllabusVolume, idx: number) => {
        expect(vol.id).toBe(idx + 1);
      });
    });

    it('every volume has at least one module', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        expect(vol.modules.length).toBeGreaterThan(0);
      });
    });

    it('volume strings are non-empty', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        expect(vol.volume.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Module structure', () => {
    it('every module has all required fields', () => {
      const requiredFields: (keyof SyllabusModule)[] = [
        'id',
        'title',
        'classification',
        'difficulty',
        'icon',
        'summary',
        'core',
      ];
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          requiredFields.forEach((field) => {
            expect(mod).toHaveProperty(field);
          });
        });
      });
    });

    it('all module IDs are strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(typeof mod.id).toBe('string');
        });
      });
    });

    it('all module titles are non-empty strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(typeof mod.title).toBe('string');
          expect(mod.title.length).toBeGreaterThan(0);
        });
      });
    });

    it('all classifications are valid strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(typeof mod.classification).toBe('string');
          expect(mod.classification.length).toBeGreaterThan(0);
        });
      });
    });

    it('all difficulties are valid strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(typeof mod.difficulty).toBe('string');
          expect(mod.difficulty.length).toBeGreaterThan(0);
        });
      });
    });

    it('all summaries are non-empty strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(typeof mod.summary).toBe('string');
          expect(mod.summary.length).toBeGreaterThan(0);
        });
      });
    });

    it('all core fields are non-empty strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(typeof mod.core).toBe('string');
          expect(mod.core.length).toBeGreaterThan(0);
        });
      });
    });

    it('all modules have icon components', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(mod.icon).toBeDefined();
          expect(mod.icon).not.toBeNull();
        });
      });
    });
  });

  describe('Uniqueness constraints', () => {
    it('module IDs are unique within each volume', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        const ids = vol.modules.map((m) => m.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      });
    });

    it('module titles are unique within each volume', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        const titles = vol.modules.map((m) => m.title);
        const uniqueTitles = new Set(titles);
        expect(titles.length).toBe(uniqueTitles.size);
      });
    });
  });

  describe('Module count', () => {
    it('has total module count >= 8', () => {
      const total = SYLLABUS.reduce((sum, vol) => sum + vol.modules.length, 0);
      expect(total).toBeGreaterThanOrEqual(8);
    });

    it('volume 1 has 5 modules', () => {
      expect(SYLLABUS[0].modules).toHaveLength(5);
    });

    it('volume 2 has 3 modules', () => {
      expect(SYLLABUS[1].modules).toHaveLength(3);
    });

    it('volume 3 has 2 modules', () => {
      expect(SYLLABUS[2].modules).toHaveLength(2);
    });
  });

  describe('Volume ordering', () => {
    it('volumes are ordered by ascending id', () => {
      for (let i = 1; i < SYLLABUS.length; i++) {
        expect(SYLLABUS[i].id).toBeGreaterThan(SYLLABUS[i - 1].id);
      }
    });

    it('volume 1 title contains THE HARDWARE AND THE HUSTLE', () => {
      expect(SYLLABUS[0].volume).toContain('THE HARDWARE AND THE HUSTLE');
    });

    it('volume 2 title contains OUTFITS, SPARE TIRES, & REFEREES', () => {
      expect(SYLLABUS[1].volume).toContain('OUTFITS, SPARE TIRES, & REFEREES');
    });

    it('volume 3 title contains WELCOME TO THE DELTA', () => {
      expect(SYLLABUS[2].volume).toContain('WELCOME TO THE DELTA');
    });
  });

  describe('Module ID format', () => {
    it('all module IDs are two-digit strings', () => {
      SYLLABUS.forEach((vol: SyllabusVolume) => {
        vol.modules.forEach((mod: SyllabusModule) => {
          expect(mod.id).toMatch(/^\d{2}$/);
        });
      });
    });
  });
});
