/**
 * state.js
 *
 * GameState is a pure data container — no side effects, no DOM, no canvas.
 * It tracks:
 *   - Current screen (MENU, PLAYING, PAUSED, GAME_OVER, WIN)
 *   - Score and high score
 *   - Level
 *   - Whether this session produced a new high score
 *
 * Transitions between screens are expressed as explicit methods so callers
 * don't need to know about the internals.
 */

import {
  SCREENS,
  POINTS_PER_FOOD,
  POINTS_PER_LEVEL,
  MAX_LEVEL,
} from './constants.js';

export class GameState {
  /**
   * @param {number} [initialHighScore=0] - Loaded from storage before the game starts.
   */
  constructor(initialHighScore = 0) {
    this._screen      = SCREENS.MENU;
    this._score       = 0;
    this._highScore   = initialHighScore;
    this._level       = 1;
    this._isNewRecord = false;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get screen()      { return this._screen; }
  get score()       { return this._score; }
  get highScore()   { return this._highScore; }
  get level()       { return this._level; }
  get isNewRecord() { return this._isNewRecord; }

  // ── Screen transition methods ─────────────────────────────────────────────

  /**
   * Transition: any screen → PLAYING.
   * Also resets score/level for a fresh game.
   */
  startGame() {
    this._score       = 0;
    this._level       = 1;
    this._isNewRecord = false;
    this._screen      = SCREENS.PLAYING;
  }

  /**
   * Transition: PLAYING → PAUSED.
   * No-op if not currently playing.
   */
  pause() {
    if (this._screen === SCREENS.PLAYING) {
      this._screen = SCREENS.PAUSED;
    }
  }

  /**
   * Transition: PAUSED → PLAYING.
   * No-op if not currently paused.
   */
  resume() {
    if (this._screen === SCREENS.PAUSED) {
      this._screen = SCREENS.PLAYING;
    }
  }

  /**
   * Transition: PLAYING → GAME_OVER.
   * Updates high score if needed.
   */
  endGame() {
    this._updateHighScore();
    this._screen = SCREENS.GAME_OVER;
  }

  /**
   * Transition: PLAYING → WIN (board full).
   * Updates high score if needed.
   */
  win() {
    this._updateHighScore();
    this._screen = SCREENS.WIN;
  }

  /**
   * Transition: GAME_OVER or WIN → MENU.
   */
  returnToMenu() {
    this._screen = SCREENS.MENU;
  }

  // ── Score + level logic ───────────────────────────────────────────────────

  /**
   * Called when the snake eats a food item.
   * Increments score and recalculates level.
   *
   * @returns {{ leveledUp: boolean, newLevel: number }}
   *   Whether this food pickup caused a level-up, and what the new level is.
   */
  addScore() {
    const oldLevel = this._level;
    this._score += POINTS_PER_FOOD;

    // Level = floor(score / POINTS_PER_LEVEL) + 1, capped at MAX_LEVEL
    this._level = Math.min(
      Math.floor(this._score / POINTS_PER_LEVEL) + 1,
      MAX_LEVEL,
    );

    const leveledUp = this._level > oldLevel;
    return { leveledUp, newLevel: this._level };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  _updateHighScore() {
    if (this._score > this._highScore) {
      this._highScore   = this._score;
      this._isNewRecord = true;
    }
  }
}
