/**
 * tests/snake.test.js
 *
 * Comprehensive tests for the Snake class.
 * The snake is the most logic-dense module — we test every method and every
 * edge case we can think of.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Snake } from '../src/snake.js';
import { DIRECTIONS, GRID_SIZE } from '../src/constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a snake on a small 10×10 grid (easier to reason about). */
const makeSnake = (gridSize = 10) => new Snake(gridSize);

// ── Construction ──────────────────────────────────────────────────────────────

describe('Snake construction', () => {
  it('spawns in the centre of the grid pointing RIGHT', () => {
    const s = makeSnake(10);
    const mid = Math.floor(10 / 2); // 5
    expect(s.head).toEqual({ x: mid, y: mid });
    expect(s.direction).toBe(DIRECTIONS.RIGHT);
  });

  it('starts with 3 body segments', () => {
    expect(makeSnake().length).toBe(3);
  });

  it('body is head-first (body[0] is the head)', () => {
    const s = makeSnake(10);
    expect(s.body[0]).toEqual(s.head);
  });

  it('body segments are contiguous horizontally going left from head', () => {
    const s = makeSnake(10);
    const [head, seg1, seg2] = s.body;
    expect(seg1).toEqual({ x: head.x - 1, y: head.y });
    expect(seg2).toEqual({ x: head.x - 2, y: head.y });
  });

  it('uses the provided gridSize', () => {
    const s = new Snake(20);
    const mid = Math.floor(20 / 2); // 10
    expect(s.head).toEqual({ x: mid, y: mid });
  });
});

// ── Getters ───────────────────────────────────────────────────────────────────

describe('Snake getters', () => {
  it('head returns body[0]', () => {
    const s = makeSnake();
    expect(s.head).toBe(s.body[0]);
  });

  it('length matches body.length', () => {
    const s = makeSnake();
    expect(s.length).toBe(s.body.length);
  });
});

// ── enqueueDirection ──────────────────────────────────────────────────────────

describe('enqueueDirection', () => {
  it('queues a valid direction change', () => {
    const s = makeSnake();
    s.enqueueDirection(DIRECTIONS.UP);
    // Direction is not applied until move(), but we can verify by moving
    s.move();
    expect(s.direction).toBe(DIRECTIONS.UP);
  });

  it('ignores reversals (snake moving RIGHT cannot go LEFT)', () => {
    const s = makeSnake();
    s.enqueueDirection(DIRECTIONS.LEFT);
    s.move();
    expect(s.direction).toBe(DIRECTIONS.RIGHT);
  });

  it('ignores same direction as current', () => {
    const s = makeSnake();
    s.enqueueDirection(DIRECTIONS.RIGHT); // already moving right
    // Queue should remain empty (duplicate)
    s.enqueueDirection(DIRECTIONS.UP);    // valid change
    s.move();
    expect(s.direction).toBe(DIRECTIONS.UP); // the UP should be applied
  });

  it('respects MAX_DIRECTION_QUEUE cap (default 2)', () => {
    const s = makeSnake();
    // Queue: UP, DOWN would be rejected (reversal), so queue UP, then LEFT
    s.enqueueDirection(DIRECTIONS.UP);
    s.enqueueDirection(DIRECTIONS.LEFT);
    // Third enqueue should be silently dropped
    s.enqueueDirection(DIRECTIONS.DOWN);
    // Move twice, consuming UP and LEFT
    s.move(); // applies UP
    s.move(); // applies LEFT
    expect(s.direction).toBe(DIRECTIONS.LEFT);
  });

  it('ignores null/undefined gracefully', () => {
    const s = makeSnake();
    expect(() => s.enqueueDirection(null)).not.toThrow();
    expect(() => s.enqueueDirection(undefined)).not.toThrow();
  });

  it('uses the last queued direction to validate reversal (not current dir)', () => {
    const s = makeSnake(); // moving RIGHT
    s.enqueueDirection(DIRECTIONS.UP);  // valid: queued=[UP]
    // Now effective is UP, so DOWN is its opposite → should be rejected
    s.enqueueDirection(DIRECTIONS.DOWN); // should be rejected
    s.move(); // applies UP
    s.move(); // nothing queued → still UP
    expect(s.direction).toBe(DIRECTIONS.UP);
  });
});

// ── move() ────────────────────────────────────────────────────────────────────

describe('move()', () => {
  it('advances head one cell in the current direction', () => {
    const s = makeSnake();
    const oldHead = { ...s.head };
    s.move();
    expect(s.head).toEqual({ x: oldHead.x + 1, y: oldHead.y }); // RIGHT → +x
  });

  it('maintains snake length after move (no growth)', () => {
    const s = makeSnake();
    const len = s.length;
    s.move();
    expect(s.length).toBe(len);
  });

  it('returns the new head position', () => {
    const s = makeSnake();
    const oldHead = { ...s.head };
    const returned = s.move();
    expect(returned).toEqual(s.head);
    expect(returned).toEqual({ x: oldHead.x + 1, y: oldHead.y });
  });

  it('tail cell is removed after move', () => {
    const s = makeSnake();
    const oldTail = { ...s.body[s.length - 1] };
    s.move();
    const stillThere = s.body.some(c => c.x === oldTail.x && c.y === oldTail.y);
    // NOTE: The tail MIGHT still exist if it's the same as another body cell,
    // but for a fresh snake that's not the case.
    expect(stillThere).toBe(false);
  });

  it('correctly moves UP', () => {
    const s = makeSnake();
    s.enqueueDirection(DIRECTIONS.UP);
    const oldHead = { ...s.head };
    s.move();
    expect(s.head).toEqual({ x: oldHead.x, y: oldHead.y - 1 });
  });

  it('correctly moves DOWN', () => {
    const s = makeSnake();
    s.enqueueDirection(DIRECTIONS.DOWN);
    const oldHead = { ...s.head };
    s.move();
    expect(s.head).toEqual({ x: oldHead.x, y: oldHead.y + 1 });
  });

  it('correctly moves LEFT (only if not reversing)', () => {
    // To move LEFT we first have to go UP or DOWN
    const s = makeSnake();
    s.enqueueDirection(DIRECTIONS.UP);
    s.move();
    s.enqueueDirection(DIRECTIONS.LEFT);
    const oldHead = { ...s.head };
    s.move();
    expect(s.head).toEqual({ x: oldHead.x - 1, y: oldHead.y });
  });
});

// ── grow() ───────────────────────────────────────────────────────────────────

describe('grow()', () => {
  it('increases snake length by 1 on next move', () => {
    const s = makeSnake();
    const len = s.length;
    s.grow();
    s.move();
    expect(s.length).toBe(len + 1);
  });

  it('only increases length once per grow() call', () => {
    const s = makeSnake();
    const len = s.length;
    s.grow();
    s.move();
    s.move(); // second move should NOT grow
    expect(s.length).toBe(len + 1);
  });

  it('can grow multiple times in sequence', () => {
    const s = makeSnake();
    const len = s.length;
    s.grow(); s.move();
    s.grow(); s.move();
    s.grow(); s.move();
    expect(s.length).toBe(len + 3);
  });
});

// ── isOutOfBounds() ───────────────────────────────────────────────────────────

describe('isOutOfBounds()', () => {
  it('returns false for a fresh snake in the centre', () => {
    expect(makeSnake().isOutOfBounds()).toBe(false);
  });

  it('detects going past the right wall', () => {
    // Grid = 5, snake at centre (2,2) moving right → hits wall after 2 moves
    const s = new Snake(5);
    // Head starts at (2,2), moves right each time
    while (!s.isOutOfBounds()) s.move();
    expect(s.isOutOfBounds()).toBe(true);
  });

  it('detects going past the left wall', () => {
    const s = new Snake(5);
    s.enqueueDirection(DIRECTIONS.UP); s.move();
    s.enqueueDirection(DIRECTIONS.LEFT);
    while (!s.isOutOfBounds()) s.move();
    expect(s.isOutOfBounds()).toBe(true);
  });

  it('detects going past the top wall', () => {
    const s = new Snake(5);
    s.enqueueDirection(DIRECTIONS.UP);
    while (!s.isOutOfBounds()) s.move();
    expect(s.isOutOfBounds()).toBe(true);
  });

  it('detects going past the bottom wall', () => {
    const s = new Snake(5);
    s.enqueueDirection(DIRECTIONS.DOWN);
    while (!s.isOutOfBounds()) s.move();
    expect(s.isOutOfBounds()).toBe(true);
  });
});

// ── isSelfColliding() ─────────────────────────────────────────────────────────

describe('isSelfColliding()', () => {
  it('returns false for a fresh snake', () => {
    expect(makeSnake().isSelfColliding()).toBe(false);
  });

  it('detects self-collision after a U-turn sequence', () => {
    // Build a longer snake then curl it back into itself
    const s = new Snake(20);
    // Grow the snake to length 6
    for (let i = 0; i < 5; i++) { s.grow(); s.move(); }
    // Now curl: RIGHT → DOWN → LEFT (head moves back into body)
    s.enqueueDirection(DIRECTIONS.DOWN); s.move();
    s.enqueueDirection(DIRECTIONS.LEFT); s.move();
    s.enqueueDirection(DIRECTIONS.UP);   s.move();
    // After this U-turn the head overlaps a body segment
    expect(s.isSelfColliding()).toBe(true);
  });
});

// ── isDead() ──────────────────────────────────────────────────────────────────

describe('isDead()', () => {
  it('returns false for a fresh snake', () => {
    expect(makeSnake().isDead()).toBe(false);
  });

  it('returns true when out of bounds', () => {
    const s = new Snake(5);
    while (!s.isOutOfBounds()) s.move();
    expect(s.isDead()).toBe(true);
  });
});

// ── occupies() ────────────────────────────────────────────────────────────────

describe('occupies()', () => {
  it('returns true for the head cell', () => {
    const s = makeSnake();
    expect(s.occupies(s.head)).toBe(true);
  });

  it('returns true for a body segment', () => {
    const s = makeSnake();
    expect(s.occupies(s.body[1])).toBe(true);
  });

  it('returns false for a cell not on the snake', () => {
    const s = makeSnake();
    expect(s.occupies({ x: 0, y: 0 })).toBe(false);
  });

  it('returns false for a cell off the grid', () => {
    expect(makeSnake().occupies({ x: -1, y: -1 })).toBe(false);
  });
});

// ── Full movement sequence ────────────────────────────────────────────────────

describe('integration: movement + growth + collision', () => {
  it('a snake that grows does not leave gaps', () => {
    const s = makeSnake(20);
    s.grow();
    s.move();
    // All body segments should be adjacent (diff of 1 in x or y)
    for (let i = 0; i < s.body.length - 1; i++) {
      const a = s.body[i];
      const b = s.body[i + 1];
      const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      expect(dist).toBe(1);
    }
  });

  it('snake fills part of a tiny grid without false self-collision', () => {
    const s = new Snake(10);
    // Move 4 times without growing — length stays 3, no collision
    for (let i = 0; i < 4; i++) {
      s.move();
      expect(s.isSelfColliding()).toBe(false);
    }
  });
});
