/**
 * utils.js
 *
 * Pure utility functions — no side effects, no imports from the rest of
 * the game.  Each function does exactly one thing and is fully testable
 * in isolation.
 */

// ── Random integer ────────────────────────────────────────────────────────────

/**
 * Returns a random integer in the range [min, max] (both inclusive).
 *
 * @param {number} min - Lower bound (inclusive).
 * @param {number} max - Upper bound (inclusive).
 * @returns {number}
 *
 * @example
 * randomInt(0, 19); // → some integer 0..19
 */
export function randomInt(min, max) {
  if (min > max) {
    throw new RangeError(`randomInt: min (${min}) must be ≤ max (${max})`);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

/**
 * Returns true when two grid coordinates point to the same cell.
 *
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {boolean}
 */
export function coordsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

/**
 * Returns true when the given coordinate exists somewhere in the list.
 * Used to check whether a cell is occupied by the snake body.
 *
 * @param {{ x: number, y: number }} coord
 * @param {Array<{ x: number, y: number }>} list
 * @returns {boolean}
 */
export function coordInList(coord, list) {
  return list.some(cell => coordsEqual(cell, coord));
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/**
 * Clamps a value between min and max (both inclusive).
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 *
 * @example
 * clamp(25, 0, 19); // → 19
 * clamp(-1, 0, 19); // → 0
 * clamp(10, 0, 19); // → 10
 */
export function clamp(value, min, max) {
  if (min > max) {
    throw new RangeError(`clamp: min (${min}) must be ≤ max (${max})`);
  }
  return Math.min(Math.max(value, min), max);
}

// ── Tick speed helper ─────────────────────────────────────────────────────────

/**
 * Calculates the tick interval (ms) for a given level.
 * Speed increases with level but is capped at MIN_TICK_MS.
 *
 * Kept here (not in constants) because it's a computation, not a value.
 *
 * @param {number} level - Current game level (1-based).
 * @param {number} baseTick - Base tick interval in ms.
 * @param {number} increment - Ms to subtract per level.
 * @param {number} minTick - Minimum tick interval in ms.
 * @returns {number}
 */
export function tickIntervalForLevel(level, baseTick, increment, minTick) {
  const raw = baseTick - (level - 1) * increment;
  return Math.max(raw, minTick);
}
