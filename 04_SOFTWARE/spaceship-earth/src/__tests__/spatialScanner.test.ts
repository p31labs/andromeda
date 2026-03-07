import { describe, it, expect } from 'vitest';
import { parseMfgData, emaSmooth } from '../services/spatialScanner';

describe('parseMfgData', () => {
  it('returns zeros for undefined data', () => {
    expect(parseMfgData(undefined)).toEqual({ valency: 0, flags: 0 });
  });

  it('returns zeros for empty data', () => {
    expect(parseMfgData(new Uint8Array([]))).toEqual({ valency: 0, flags: 0 });
  });

  it('returns zeros for single byte', () => {
    expect(parseMfgData(new Uint8Array([3]))).toEqual({ valency: 0, flags: 0 });
  });

  it('parses valency from byte 0 (lower nibble)', () => {
    expect(parseMfgData(new Uint8Array([4, 0]))).toEqual({ valency: 4, flags: 0 });
    expect(parseMfgData(new Uint8Array([2, 0]))).toEqual({ valency: 2, flags: 0 });
  });

  it('masks valency to lower nibble', () => {
    // 0xF3 & 0x0F = 3
    expect(parseMfgData(new Uint8Array([0xf3, 0]))).toEqual({ valency: 3, flags: 0 });
  });

  it('parses flags from byte 1', () => {
    expect(parseMfgData(new Uint8Array([0, 0x01]))).toEqual({ valency: 0, flags: 1 }); // handshake-ready
    expect(parseMfgData(new Uint8Array([0, 0x03]))).toEqual({ valency: 0, flags: 3 }); // ready + in-handshake
  });

  it('parses combined valency and flags', () => {
    expect(parseMfgData(new Uint8Array([2, 0x01]))).toEqual({ valency: 2, flags: 1 });
  });
});

describe('emaSmooth', () => {
  it('returns raw value when prev equals raw', () => {
    expect(emaSmooth(-60, -60)).toBeCloseTo(-60);
  });

  it('moves toward raw value with default alpha=0.3', () => {
    const result = emaSmooth(-80, -60);
    // 0.3 * -60 + 0.7 * -80 = -18 + -56 = -74
    expect(result).toBeCloseTo(-74);
  });

  it('converges toward raw value over many iterations', () => {
    let smoothed = -80;
    for (let i = 0; i < 20; i++) {
      smoothed = emaSmooth(smoothed, -50);
    }
    expect(smoothed).toBeCloseTo(-50, 0);
  });

  it('respects custom alpha', () => {
    // alpha=1.0 should immediately snap to raw
    expect(emaSmooth(-80, -50, 1.0)).toBeCloseTo(-50);
    // alpha=0.0 should never change
    expect(emaSmooth(-80, -50, 0.0)).toBeCloseTo(-80);
  });
});
