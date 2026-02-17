/**
 * food.js
 *
 * The Food class manages a single food item on the grid.
 *
 * Responsibilities:
 *   - Spawn at a random cell that is NOT occupied by the snake
 *   - Expose its position for the renderer and collision detection
 *   - Handle the edge case where the board is nearly full (no free cells)
 *
 * The Food does NOT know about the game loop or rendering — it's pure data.
 */

import { GRID_SIZE } from './constants.js';
import { randomInt, coordsEqual } from './utils.js';

export class Food {
  /**
   * @param {number} [gridSize=GRID_SIZE] - Side length of the square grid.
   */
  constructor(gridSize = GRID_SIZE) {
    this._gridSize = gridSize;
    /** @type {{ x: number, y: number } | null} */
    this._position = null;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  /**
   * Current food position, or null if no food is currently active
   * (e.g. the board is completely full).
   *
   * @returns {{ x: number, y: number } | null}
   */
  get position() {
    return this._position;
  }

  /**
   * True when a food item is currently placed on the board.
   *
   * @returns {boolean}
   */
  get isActive() {
    return this._position !== null;
  }

  // ── Spawning ──────────────────────────────────────────────────────────────

  /**
   * Places food at a random unoccupied cell.
   *
   * Algorithm:
   *   1. Collect all cells not in the occupied list.
   *   2. If there are no free cells, set position to null (board full).
   *   3. Otherwise, pick a random free cell.
   *
   * Using a "collect then pick" approach (rather than retry-until-free) means:
   *   - Worst-case O(gridSize²) — but constant time once free cells are listed
   *   - No infinite loop risk even when the board is nearly full
   *   - Perfectly uniform distribution across all free cells
   *
   * @param {Array<{ x: number, y: number }>} occupiedCells
   *   All cells currently occupied (typically the snake's body).
   */
  spawn(occupiedCells) {
    const freeCells = [];

    for (let y = 0; y < this._gridSize; y++) {
      for (let x = 0; x < this._gridSize; x++) {
        const cell = { x, y };
        const isOccupied = occupiedCells.some(c => coordsEqual(c, cell));
        if (!isOccupied) {
          freeCells.push(cell);
        }
      }
    }

    if (freeCells.length === 0) {
      // Board is completely full — no spawn possible (Win condition)
      this._position = null;
      return;
    }

    this._position = freeCells[randomInt(0, freeCells.length - 1)];
  }

  /**
   * Returns true if the given coordinate matches the food's position.
   * Used by game.js to detect when the snake eats the food.
   *
   * @param {{ x: number, y: number }} coord
   * @returns {boolean}
   */
  isEatenBy(coord) {
    if (!this._position) return false;
    return coordsEqual(this._position, coord);
  }
}
