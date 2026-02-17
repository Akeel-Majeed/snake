/**
 * input.js
 *
 * Centralises all player input handling:
 *   - Keyboard: Arrow keys, WASD (movement), Escape/P (pause), M (mute),
 *               Enter (confirm / start)
 *   - Touch/swipe: touch-start + touch-end to detect swipe direction
 *
 * Design:
 *   - InputHandler fires named "game action" callbacks rather than passing raw
 *     key codes around.  Callers register handlers for logical actions
 *     (e.g. "MOVE_UP", "PAUSE") rather than for physical keys.
 *   - Arrow keys are prevented from scrolling the page (a common annoyance in
 *     browser games).
 *   - Touch handling uses a threshold (MIN_SWIPE_PX) to distinguish swipes
 *     from taps, and picks the dominant axis so diagonal swipes map cleanly
 *     to one direction.
 */

import { DIRECTIONS, MIN_SWIPE_PX } from './constants.js';

// Keys that should be prevented from their default browser action
const SCROLL_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ',
]);

/** Map from key string → direction constant */
const KEY_TO_DIRECTION = {
  ArrowUp:    DIRECTIONS.UP,
  ArrowDown:  DIRECTIONS.DOWN,
  ArrowLeft:  DIRECTIONS.LEFT,
  ArrowRight: DIRECTIONS.RIGHT,
  w: DIRECTIONS.UP,
  W: DIRECTIONS.UP,
  s: DIRECTIONS.DOWN,
  S: DIRECTIONS.DOWN,
  a: DIRECTIONS.LEFT,
  A: DIRECTIONS.LEFT,
  d: DIRECTIONS.RIGHT,
  D: DIRECTIONS.RIGHT,
};

export class InputHandler {
  /**
   * @param {EventTarget} [target=window] - The element that keyboard events
   *   are attached to.  Overrideable in tests.
   */
  constructor(target = window) {
    this._target = target;

    // Callbacks registered by the caller
    this._onAnyInput  = null; // () => void  — fires on every keydown/touchstart
    this._onDirection = null; // (directionConstant) => void
    this._onPause     = null; // () => void
    this._onConfirm   = null; // () => void
    this._onMute      = null; // () => void

    // Touch state
    this._touchStartX = 0;
    this._touchStartY = 0;

    // Bound handler references (needed to cleanly remove listeners later)
    this._handleKeydown   = this._handleKeydown.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchEnd   = this._handleTouchEnd.bind(this);

    this._target.addEventListener('keydown',     this._handleKeydown);
    this._target.addEventListener('touchstart',  this._handleTouchStart, { passive: false });
    this._target.addEventListener('touchend',    this._handleTouchEnd,   { passive: false });
  }

  // ── Callback registration ─────────────────────────────────────────────────

  /** @param {() => void} fn */
  onAnyInput(fn) { this._onAnyInput = fn; }

  /** @param {(dir: object) => void} fn */
  onDirection(fn) { this._onDirection = fn; }

  /** @param {() => void} fn */
  onPause(fn) { this._onPause = fn; }

  /** @param {() => void} fn */
  onConfirm(fn) { this._onConfirm = fn; }

  /** @param {() => void} fn */
  onMute(fn) { this._onMute = fn; }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  _handleKeydown(e) {
    // Fire first — unlocks AudioContext while we're still inside a user gesture
    this._onAnyInput?.();

    // Prevent arrow keys and Space from scrolling the page
    if (SCROLL_KEYS.has(e.key)) {
      e.preventDefault();
    }

    const dir = KEY_TO_DIRECTION[e.key];
    if (dir) {
      this._onDirection?.(dir);
      return;
    }

    switch (e.key) {
      case 'Escape':
      case 'p':
      case 'P':
        this._onPause?.();
        break;

      case 'Enter':
        this._onConfirm?.();
        break;

      case 'm':
      case 'M':
        this._onMute?.();
        break;
    }
  }

  // ── Touch / swipe ─────────────────────────────────────────────────────────

  _handleTouchStart(e) {
    e.preventDefault(); // prevents default scroll / zoom
    this._onAnyInput?.(); // unlock AudioContext from within this user gesture
    const touch = e.changedTouches[0];
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
  }

  _handleTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const dx = touch.clientX - this._touchStartX;
    const dy = touch.clientY - this._touchStartY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Reject taps (too short to be a swipe)
    if (absDx < MIN_SWIPE_PX && absDy < MIN_SWIPE_PX) return;

    // Pick the dominant axis
    let dir;
    if (absDx > absDy) {
      dir = dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
    } else {
      dir = dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
    }

    this._onDirection?.(dir);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Removes all event listeners.  Call this when the game is destroyed
   * (e.g. in tests) to prevent listener leaks.
   */
  destroy() {
    this._target.removeEventListener('keydown',     this._handleKeydown);
    this._target.removeEventListener('touchstart',  this._handleTouchStart);
    this._target.removeEventListener('touchend',    this._handleTouchEnd);
  }
}
