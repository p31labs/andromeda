import { describe, it, expect } from 'vitest';
import { resolveAtmosphere, AtmospherePreset, SurfaceKey, GRAY_ROCK_PRESET } from '../atmosphere';

describe('resolveAtmosphere', () => {
  it('should return the correct preset for a given surface', () => {
    const preset = resolveAtmosphere('GREETING');
    expect(preset.starfield).toBe('dense');
    expect(preset.palette.primary).toBe('#39ff14');
  });

  it('should return GRAY_ROCK_PRESET when grayRock is true', () => {
    const preset = resolveAtmosphere('GREETING', true);
    expect(preset).toEqual(GRAY_ROCK_PRESET);
  });

  it('should fallback to GREETING for unknown surface', () => {
    const preset = resolveAtmosphere('UNKNOWN_SURFACE' as SurfaceKey);
    expect(preset.starfield).toBe('dense');
    expect(preset.palette.primary).toBe('#39ff14');
  });
});