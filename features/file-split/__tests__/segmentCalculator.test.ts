import { describe, it, expect } from 'vitest';
import { computeSegments } from '../utils/segmentCalculator';

describe('computeSegments', () => {
  it('returns 1 segment when duration equals chunk size', () => {
    const result = computeSegments(1800, 30);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 0, end: 1800 });
  });

  it('returns 3 segments for 90min file with 30min chunks', () => {
    const result = computeSegments(5400, 30);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ start: 0, end: 1800 });
    expect(result[1]).toEqual({ start: 1800, end: 3600 });
    expect(result[2]).toEqual({ start: 3600, end: 5400 });
  });

  it('handles non-even split correctly', () => {
    const result = computeSegments(2000, 30);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ start: 0, end: 1800 });
    expect(result[1]).toEqual({ start: 1800, end: 2000 });
  });

  it('does not create segment beyond duration', () => {
    const result = computeSegments(100, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 0, end: 100 });
  });

  it('works with 1-minute chunks', () => {
    const result = computeSegments(130, 1);
    expect(result).toHaveLength(3);
    expect(result[2].end).toBe(130);
  });
});
