/**
 * tests/utils.test.js
 *
 * Comprehensive tests for every exported function in utils.js.
 * We aim for 100 % branch coverage on this file since it's pure logic.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  randomInt,
  coordsEqual,
  coordInList,
  clamp,
  tickIntervalForLevel,
} from '../src/utils.js';

// ── randomInt ─────────────────────────────────────────────────────────────────

describe('randomInt', () => {
  it('returns a value within [min, max] over many calls', () => {
    for (let i = 0; i < 1000; i++) {
      const val = randomInt(0, 9);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(9);
    }
  });

  it('returns an integer (no decimals)', () => {
    for (let i = 0; i < 100; i++) {
      expect(Number.isInteger(randomInt(0, 100))).toBe(true);
    }
  });

  it('handles min === max (always returns that value)', () => {
    expect(randomInt(7, 7)).toBe(7);
  });

  it('handles negative ranges', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(-10, -1);
      expect(val).toBeGreaterThanOrEqual(-10);
      expect(val).toBeLessThanOrEqual(-1);
    }
  });

  it('throws when min > max', () => {
    expect(() => randomInt(5, 3)).toThrow(RangeError);
  });

  it('covers both endpoints statistically (min and max both reachable)', () => {
    // With Math.random mocked to its extremes we verify boundary values.
    const spy = vi.spyOn(Math, 'random');

    spy.mockReturnValue(0);          // → Math.floor(0 * (5-0+1)) + 0 = 0
    expect(randomInt(0, 5)).toBe(0);

    spy.mockReturnValue(0.9999999);  // → Math.floor(5.9999994) + 0 = 5
    expect(randomInt(0, 5)).toBe(5);

    spy.mockRestore();
  });
});

// ── coordsEqual ───────────────────────────────────────────────────────────────

describe('coordsEqual', () => {
  it('returns true for identical coords', () => {
    expect(coordsEqual({ x: 3, y: 7 }, { x: 3, y: 7 })).toBe(true);
  });

  it('returns false when x differs', () => {
    expect(coordsEqual({ x: 1, y: 7 }, { x: 3, y: 7 })).toBe(false);
  });

  it('returns false when y differs', () => {
    expect(coordsEqual({ x: 3, y: 1 }, { x: 3, y: 7 })).toBe(false);
  });

  it('returns false when both differ', () => {
    expect(coordsEqual({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
  });

  it('works with zero coords', () => {
    expect(coordsEqual({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
  });

  it('works with negative coords', () => {
    expect(coordsEqual({ x: -1, y: -2 }, { x: -1, y: -2 })).toBe(true);
    expect(coordsEqual({ x: -1, y: -2 }, { x: -1, y: 0 })).toBe(false);
  });
});

// ── coordInList ───────────────────────────────────────────────────────────────

describe('coordInList', () => {
  const list = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 5, y: 9 },
  ];

  it('returns true when coord is in the list', () => {
    expect(coordInList({ x: 1, y: 1 }, list)).toBe(true);
  });

  it('returns true for the first element', () => {
    expect(coordInList({ x: 0, y: 0 }, list)).toBe(true);
  });

  it('returns true for the last element', () => {
    expect(coordInList({ x: 5, y: 9 }, list)).toBe(true);
  });

  it('returns false when coord is not in the list', () => {
    expect(coordInList({ x: 2, y: 2 }, list)).toBe(false);
  });

  it('returns false for an empty list', () => {
    expect(coordInList({ x: 0, y: 0 }, [])).toBe(false);
  });

  it('returns false when x matches but y does not', () => {
    expect(coordInList({ x: 1, y: 0 }, list)).toBe(false);
  });
});

// ── clamp ─────────────────────────────────────────────────────────────────────

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(10, 0, 20)).toBe(10);
  });

  it('returns min when value is below range', () => {
    expect(clamp(-5, 0, 20)).toBe(0);
  });

  it('returns max when value is above range', () => {
    expect(clamp(25, 0, 20)).toBe(20);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 20)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(20, 0, 20)).toBe(20);
  });

  it('handles min === max', () => {
    expect(clamp(0, 5, 5)).toBe(5);
    expect(clamp(5, 5, 5)).toBe(5);
    expect(clamp(10, 5, 5)).toBe(5);
  });

  it('throws when min > max', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });

  it('works with negative ranges', () => {
    expect(clamp(-15, -10, -5)).toBe(-10);
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(0, -10, -5)).toBe(-5);
  });
});

// ── tickIntervalForLevel ──────────────────────────────────────────────────────

describe('tickIntervalForLevel', () => {
  const BASE = 200;
  const INC  = 20;
  const MIN  = 60;

  it('returns BASE_TICK at level 1', () => {
    expect(tickIntervalForLevel(1, BASE, INC, MIN)).toBe(200);
  });

  it('reduces tick by INCREMENT each level', () => {
    expect(tickIntervalForLevel(2, BASE, INC, MIN)).toBe(180);
    expect(tickIntervalForLevel(3, BASE, INC, MIN)).toBe(160);
    expect(tickIntervalForLevel(5, BASE, INC, MIN)).toBe(120);
  });

  it('clamps at MIN_TICK when level is very high', () => {
    // Level 8 → 200 - 7*20 = 60  (exactly min)
    expect(tickIntervalForLevel(8, BASE, INC, MIN)).toBe(60);
    // Level 9 → 200 - 8*20 = 40  → clamped to 60
    expect(tickIntervalForLevel(9, BASE, INC, MIN)).toBe(60);
    expect(tickIntervalForLevel(20, BASE, INC, MIN)).toBe(60);
  });

  it('returns MIN when BASE equals MIN', () => {
    expect(tickIntervalForLevel(1, 60, 20, 60)).toBe(60);
  });
});
