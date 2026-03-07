import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../services/somaticCircularBuffer';

describe('CircularBuffer', () => {
  it('tracks length correctly', () => {
    const buf = new CircularBuffer<number>(5);
    expect(buf.length).toBe(0);
    buf.push(1);
    expect(buf.length).toBe(1);
    buf.push(2);
    buf.push(3);
    expect(buf.length).toBe(3);
  });

  it('reports full correctly', () => {
    const buf = new CircularBuffer<number>(3);
    expect(buf.isFull()).toBe(false);
    buf.push(1);
    buf.push(2);
    expect(buf.isFull()).toBe(false);
    buf.push(3);
    expect(buf.isFull()).toBe(true);
  });

  it('returns items in insertion order', () => {
    const buf = new CircularBuffer<number>(5);
    buf.push(10);
    buf.push(20);
    buf.push(30);
    expect(buf.toArray()).toEqual([10, 20, 30]);
  });

  it('overwrites oldest items when full', () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4); // overwrites 1
    expect(buf.toArray()).toEqual([2, 3, 4]);
    buf.push(5); // overwrites 2
    expect(buf.toArray()).toEqual([3, 4, 5]);
  });

  it('handles wrap-around correctly over many pushes', () => {
    const buf = new CircularBuffer<number>(3);
    for (let i = 0; i < 10; i++) buf.push(i);
    expect(buf.toArray()).toEqual([7, 8, 9]);
    expect(buf.length).toBe(3);
  });

  it('computes median for odd count', () => {
    const buf = new CircularBuffer<{ v: number }>(5);
    buf.push({ v: 3 });
    buf.push({ v: 1 });
    buf.push({ v: 5 });
    expect(buf.median((t) => t.v)).toBe(3);
  });

  it('computes median for even count', () => {
    const buf = new CircularBuffer<{ v: number }>(4);
    buf.push({ v: 10 });
    buf.push({ v: 20 });
    buf.push({ v: 30 });
    buf.push({ v: 40 });
    expect(buf.median((t) => t.v)).toBe(25);
  });

  it('computes mean correctly', () => {
    const buf = new CircularBuffer<{ v: number }>(5);
    buf.push({ v: 10 });
    buf.push({ v: 20 });
    buf.push({ v: 30 });
    expect(buf.mean((t) => t.v)).toBeCloseTo(20);
  });

  it('returns 0 for median/mean of empty buffer', () => {
    const buf = new CircularBuffer<{ v: number }>(5);
    expect(buf.median((t) => t.v)).toBe(0);
    expect(buf.mean((t) => t.v)).toBe(0);
  });
});
