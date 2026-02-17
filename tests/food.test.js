/**
 * tests/food.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Food } from '../src/food.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeFood = (gridSize = 5) => new Food(gridSize);

/** Build a list of all cells in an N×N grid. */
const allCells = (n) => {
  const cells = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      cells.push({ x, y });
  return cells;
};

// ── Construction ──────────────────────────────────────────────────────────────

describe('Food construction', () => {
  it('starts with no active position', () => {
    const f = makeFood();
    expect(f.position).toBeNull();
    expect(f.isActive).toBe(false);
  });
});

// ── spawn() ───────────────────────────────────────────────────────────────────

describe('Food.spawn()', () => {
  it('places food at a valid grid cell', () => {
    const f = makeFood(5);
    f.spawn([]);
    expect(f.position).not.toBeNull();
    expect(f.position.x).toBeGreaterThanOrEqual(0);
    expect(f.position.x).toBeLessThan(5);
    expect(f.position.y).toBeGreaterThanOrEqual(0);
    expect(f.position.y).toBeLessThan(5);
  });

  it('isActive becomes true after spawn with free cells', () => {
    const f = makeFood(5);
    f.spawn([]);
    expect(f.isActive).toBe(true);
  });

  it('never places food on an occupied cell', () => {
    const f = makeFood(5);
    // Occupy all cells except (4, 4)
    const occupied = allCells(5).filter(c => !(c.x === 4 && c.y === 4));
    f.spawn(occupied);
    expect(f.position).toEqual({ x: 4, y: 4 });
  });

  it('sets position to null when all cells are occupied (board full)', () => {
    const f = makeFood(3);
    f.spawn(allCells(3)); // all 9 cells occupied
    expect(f.position).toBeNull();
    expect(f.isActive).toBe(false);
  });

  it('can respawn after being cleared', () => {
    const f = makeFood(5);
    f.spawn([]);
    f.spawn([]); // respawn
    expect(f.isActive).toBe(true);
  });

  it('distributes spawn positions across free cells (statistical test)', () => {
    // With a 3×3 grid and no occupied cells, all 9 cells should eventually be chosen.
    const f = makeFood(3);
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      f.spawn([]);
      seen.add(`${f.position.x},${f.position.y}`);
    }
    expect(seen.size).toBe(9); // all cells reachable
  });

  it('spawn is uniformly distributed (each cell ≈ equal frequency)', () => {
    // With 4 free cells, each should appear ~25% of the time over 1000 trials.
    // We use a generous tolerance (12–38%) to avoid flakiness.
    const f = makeFood(2); // 2×2 = 4 cells
    const counts = {};
    const N = 1000;
    for (let i = 0; i < N; i++) {
      f.spawn([]);
      const key = `${f.position.x},${f.position.y}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    for (const count of Object.values(counts)) {
      expect(count / N).toBeGreaterThan(0.12);
      expect(count / N).toBeLessThan(0.38);
    }
  });
});

// ── isEatenBy() ───────────────────────────────────────────────────────────────

describe('Food.isEatenBy()', () => {
  it('returns true when coord matches food position', () => {
    const f = makeFood(5);
    // Mock Math.random to force a known position
    vi.spyOn(Math, 'random').mockReturnValue(0); // → cell index 0 → {x:0,y:0}
    f.spawn([]);
    vi.restoreAllMocks();

    expect(f.isEatenBy(f.position)).toBe(true);
  });

  it('returns false when coord does not match', () => {
    const f = makeFood(5);
    f.spawn([]);
    const nonFood = f.position.x === 0 ? { x: 4, y: 4 } : { x: 0, y: 0 };
    expect(f.isEatenBy(nonFood)).toBe(false);
  });

  it('returns false when food is not active (position is null)', () => {
    const f = makeFood(3);
    f.spawn(allCells(3)); // board full → position = null
    expect(f.isEatenBy({ x: 0, y: 0 })).toBe(false);
  });
});
