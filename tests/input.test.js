/**
 * tests/input.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputHandler } from '../src/input.js';
import { DIRECTIONS } from '../src/constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fires a synthetic KeyboardEvent on the given target. */
function fireKey(target, key, opts = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

/**
 * Simulates a swipe by directly calling the handler's internal touch methods
 * with plain mock event objects.  We bypass the real Touch/TouchEvent
 * constructors because jsdom doesn't implement them.
 *
 * This is acceptable — we're testing our own swipe logic, not the browser's
 * event dispatch system.
 */
function fireSwipe(handler, sx, sy, ex, ey) {
  const makeTouchEvent = (x, y) => ({
    preventDefault: () => {},
    changedTouches: [{ clientX: x, clientY: y }],
  });
  handler._handleTouchStart(makeTouchEvent(sx, sy));
  handler._handleTouchEnd(makeTouchEvent(ex, ey));
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let target;
let handler;

beforeEach(() => {
  target  = new EventTarget();
  handler = new InputHandler(target);
});

afterEach(() => {
  handler.destroy();
});

// ── Keyboard — direction keys ─────────────────────────────────────────────────

describe('InputHandler keyboard direction', () => {
  it('fires UP for ArrowUp', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireKey(target, 'ArrowUp');
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.UP);
  });

  it('fires DOWN for ArrowDown', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireKey(target, 'ArrowDown');
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.DOWN);
  });

  it('fires LEFT for ArrowLeft', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireKey(target, 'ArrowLeft');
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.LEFT);
  });

  it('fires RIGHT for ArrowRight', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireKey(target, 'ArrowRight');
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.RIGHT);
  });

  it.each([
    ['w', DIRECTIONS.UP],
    ['W', DIRECTIONS.UP],
    ['s', DIRECTIONS.DOWN],
    ['S', DIRECTIONS.DOWN],
    ['a', DIRECTIONS.LEFT],
    ['A', DIRECTIONS.LEFT],
    ['d', DIRECTIONS.RIGHT],
    ['D', DIRECTIONS.RIGHT],
  ])('WASD: key "%s" fires %s', (key, expectedDir) => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireKey(target, key);
    expect(fn).toHaveBeenCalledWith(expectedDir);
  });
});

// ── Keyboard — action keys ────────────────────────────────────────────────────

describe('InputHandler keyboard actions', () => {
  it('fires onPause for Escape', () => {
    const fn = vi.fn();
    handler.onPause(fn);
    fireKey(target, 'Escape');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires onPause for p', () => {
    const fn = vi.fn();
    handler.onPause(fn);
    fireKey(target, 'p');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires onPause for P', () => {
    const fn = vi.fn();
    handler.onPause(fn);
    fireKey(target, 'P');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires onConfirm for Enter', () => {
    const fn = vi.fn();
    handler.onConfirm(fn);
    fireKey(target, 'Enter');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires onMute for m', () => {
    const fn = vi.fn();
    handler.onMute(fn);
    fireKey(target, 'm');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires onMute for M', () => {
    const fn = vi.fn();
    handler.onMute(fn);
    fireKey(target, 'M');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not fire any callback for an unrecognised key', () => {
    const dir  = vi.fn();
    const pause = vi.fn();
    handler.onDirection(dir);
    handler.onPause(pause);
    fireKey(target, 'z');
    expect(dir).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
  });
});

// ── Keyboard — no crash when callbacks not registered ────────────────────────

describe('InputHandler missing callbacks', () => {
  it('does not throw when no callbacks are registered', () => {
    // No callbacks registered — every key should be a no-op
    expect(() => fireKey(target, 'ArrowUp')).not.toThrow();
    expect(() => fireKey(target, 'Escape')).not.toThrow();
    expect(() => fireKey(target, 'Enter')).not.toThrow();
    expect(() => fireKey(target, 'm')).not.toThrow();
  });
});

// ── Touch / swipe ─────────────────────────────────────────────────────────────

describe('InputHandler touch swipe', () => {
  it('fires RIGHT for a rightward swipe', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireSwipe(handler, 100, 100, 200, 105);
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.RIGHT);
  });

  it('fires LEFT for a leftward swipe', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireSwipe(handler, 200, 100, 100, 105);
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.LEFT);
  });

  it('fires DOWN for a downward swipe', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireSwipe(handler, 100, 100, 105, 200);
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.DOWN);
  });

  it('fires UP for an upward swipe', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    fireSwipe(handler, 100, 200, 105, 100);
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.UP);
  });

  it('does NOT fire for a tap (too short)', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    // Swipe of 5 px is below the MIN_SWIPE_PX threshold (30)
    fireSwipe(handler, 100, 100, 105, 100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('picks horizontal axis when dx > dy', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    // dx=60, dy=20 → horizontal wins
    fireSwipe(handler, 100, 100, 160, 120);
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.RIGHT);
  });

  it('picks vertical axis when dy > dx', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    // dx=20, dy=60 → vertical wins
    fireSwipe(handler, 100, 100, 120, 160);
    expect(fn).toHaveBeenCalledWith(DIRECTIONS.DOWN);
  });
});

// ── destroy() ─────────────────────────────────────────────────────────────────

describe('InputHandler.destroy()', () => {
  it('stops firing callbacks after destroy()', () => {
    const fn = vi.fn();
    handler.onDirection(fn);
    handler.destroy();
    fireKey(target, 'ArrowUp');
    expect(fn).not.toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    expect(() => {
      handler.destroy();
      handler.destroy();
    }).not.toThrow();
  });
});
