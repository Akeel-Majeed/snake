/**
 * snake.js
 *
 * The Snake class owns everything about the snake:
 *   - Its body (an ordered array of {x, y} cells, head-first)
 *   - Its current direction
 *   - A direction buffer so input queued between ticks isn't lost
 *   - Movement (advance one cell per tick)
 *   - Growth (suppress tail removal on the next tick)
 *   - Collision detection (walls and self)
 *
 * The Snake does NOT know about the game loop, the renderer, or food.
 * It is a pure data + logic object.
 */

import { DIRECTIONS, OPPOSITE_DIRECTIONS, GRID_SIZE, MAX_DIRECTION_QUEUE } from './constants.js';
import { coordsEqual, coordInList } from './utils.js';

export class Snake {
  /**
   * @param {number} [gridSize=GRID_SIZE] - Side length of the square grid.
   *   Defaults to the global constant; tests can pass a smaller grid.
   */
  constructor(gridSize = GRID_SIZE) {
    this._gridSize = gridSize;

    // Spawn the snake in the centre of the grid, pointing right.
    // The body is stored head-first: body[0] is the head.
    const midY = Math.floor(gridSize / 2);
    const midX = Math.floor(gridSize / 2);

    // Start with three segments: head + two body cells to the left
    this._body = [
      { x: midX,     y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];

    this._direction = DIRECTIONS.RIGHT;

    /**
     * A queue of pending direction changes.
     * The player can press two keys between ticks; we'll process them in order.
     * Capped at MAX_DIRECTION_QUEUE entries so spam can't cause problems.
     */
    this._directionQueue = [];

    /**
     * If true, the next move() call will NOT remove the tail — simulating growth.
     * Set to true by grow(); reset to false after each move().
     */
    this._pendingGrowth = false;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  /** Read-only snapshot of the snake body.  Do not mutate the returned array. */
  get body() {
    return this._body;
  }

  /** The head cell {x, y}. */
  get head() {
    return this._body[0];
  }

  /** The current logical direction (one of the DIRECTIONS constants). */
  get direction() {
    return this._direction;
  }

  /** Length of the snake in cells. */
  get length() {
    return this._body.length;
  }

  // ── Direction input ───────────────────────────────────────────────────────

  /**
   * Queues a direction change requested by the player.
   *
   * Rules:
   * 1. The queue must not be full (MAX_DIRECTION_QUEUE).
   * 2. The requested direction must not be the opposite of the *effective*
   *    current direction (i.e., we look at the last item in the queue if any,
   *    or the current direction otherwise) — the snake can't reverse.
   * 3. Duplicate consecutive directions are silently ignored.
   *
   * @param {{ dx: number, dy: number, name: string }} newDir
   */
  enqueueDirection(newDir) {
    if (!newDir || !newDir.name) return;

    // The effective "current" direction is the last queued one (or actual dir)
    const effectiveName =
      this._directionQueue.length > 0
        ? this._directionQueue[this._directionQueue.length - 1].name
        : this._direction.name;

    // Silently reject reversal
    if (newDir.name === OPPOSITE_DIRECTIONS[effectiveName]) return;

    // Silently reject duplicate
    if (newDir.name === effectiveName) return;

    // Enforce queue cap
    if (this._directionQueue.length >= MAX_DIRECTION_QUEUE) return;

    this._directionQueue.push(newDir);
  }

  // ── Movement ──────────────────────────────────────────────────────────────

  /**
   * Advances the snake one cell in the current direction.
   *
   * Steps:
   * 1. Consume the next direction from the queue (if any).
   * 2. Compute the new head position.
   * 3. Prepend the new head to the body.
   * 4. Remove the tail — UNLESS pendingGrowth is set.
   *
   * Returns the new head position so callers can check for food.
   *
   * @returns {{ x: number, y: number }} The new head position.
   */
  move() {
    // 1. Apply queued direction
    if (this._directionQueue.length > 0) {
      this._direction = this._directionQueue.shift();
    }

    // 2. New head = old head + direction delta
    const newHead = {
      x: this._body[0].x + this._direction.dx,
      y: this._body[0].y + this._direction.dy,
    };

    // 3. Prepend new head
    this._body.unshift(newHead);

    // 4. Grow or trim
    if (this._pendingGrowth) {
      this._pendingGrowth = false;
    } else {
      this._body.pop();
    }

    return newHead;
  }

  /**
   * Signals that the snake should grow on the next move() call.
   * Call this immediately after detecting a food collision.
   */
  grow() {
    this._pendingGrowth = true;
  }

  // ── Collision detection ───────────────────────────────────────────────────

  /**
   * Returns true if the snake's head is outside the grid boundaries.
   * Should be called after move() to check for a wall collision.
   *
   * @returns {boolean}
   */
  isOutOfBounds() {
    const { x, y } = this.head;
    return x < 0 || x >= this._gridSize || y < 0 || y >= this._gridSize;
  }

  /**
   * Returns true if the snake's head overlaps any body segment (self-collision).
   * The head is body[0], so we check body[1..n].
   *
   * Should be called after move().
   *
   * @returns {boolean}
   */
  isSelfColliding() {
    // Slice skips the head itself (index 0)
    return coordInList(this.head, this._body.slice(1));
  }

  /**
   * Convenience method: returns true if the snake is in any dead state.
   * (Wall OR self collision.)
   *
   * @returns {boolean}
   */
  isDead() {
    return this.isOutOfBounds() || this.isSelfColliding();
  }

  /**
   * Returns true if the given coordinate is occupied by any part of the snake.
   * Useful for food spawning to avoid placing food on the snake.
   *
   * @param {{ x: number, y: number }} coord
   * @returns {boolean}
   */
  occupies(coord) {
    return coordInList(coord, this._body);
  }
}
