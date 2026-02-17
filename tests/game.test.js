/**
 * tests/game.test.js
 *
 * Integration tests for the Game class.
 *
 * We test the observable behaviour: score changes, screen transitions, high
 * score persistence, and mute toggling.  We do NOT test rendering internals
 * (canvas draw calls) since the renderer is excluded from coverage.
 *
 * Approach:
 * - Stub requestAnimationFrame and cancelAnimationFrame so the game loop
 *   doesn't run autonomously.
 * - Expose internal state via the _state / _snake / _food properties in tests.
 * - Drive game steps manually via _tick() or _startNewGame().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '../src/game.js';
import { SCREENS, GRID_SIZE } from '../src/constants.js';

// ── Shared mocks ──────────────────────────────────────────────────────────────

/** Minimal canvas mock that satisfies Renderer's requirements. */
function makeCanvas() {
  const canvas = document.createElement('canvas');
  return canvas;
}

// Stub out requestAnimationFrame so the loop doesn't fire autonomously
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Construction ──────────────────────────────────────────────────────────────

describe('Game construction', () => {
  it('starts on MENU screen', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    expect(g._state.screen).toBe(SCREENS.MENU);
  });

  it('starts with score 0', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    expect(g._state.score).toBe(0);
  });

  it('loads high score from localStorage', () => {
    localStorage.setItem('snake_high_score', '500');
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    expect(g._state.highScore).toBe(500);
  });
});

// ── _startNewGame() ───────────────────────────────────────────────────────────

describe('Game._startNewGame()', () => {
  it('transitions to PLAYING', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    expect(g._state.screen).toBe(SCREENS.PLAYING);
  });

  it('initialises a Snake', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    expect(g._snake).not.toBeNull();
    expect(g._snake.length).toBeGreaterThan(0);
  });

  it('initialises active Food', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    expect(g._food.isActive).toBe(true);
  });

  it('resets score to 0 on second start', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    g._state.addScore();
    g._startNewGame();
    expect(g._state.score).toBe(0);
  });
});

// ── _tick() — normal movement ─────────────────────────────────────────────────

describe('Game._tick() movement', () => {
  it('moves the snake without changing score when no food eaten', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    const scoreBefore = g._state.score;

    // Move snake away from food to avoid accidental eat
    const oldHead = { ...g._snake.head };
    g._tick();
    expect(g._state.score).toBe(scoreBefore);
    expect(g._snake.head).not.toEqual(oldHead);
  });
});

// ── _tick() — food eating ─────────────────────────────────────────────────────

describe('Game._tick() eating food', () => {
  it('increases score when snake head reaches food', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    // Manually position food directly in front of snake's head
    const head = g._snake.head;
    const dir  = g._snake.direction;
    g._food._position = { x: head.x + dir.dx, y: head.y + dir.dy };

    const scoreBefore = g._state.score;
    g._tick();
    expect(g._state.score).toBeGreaterThan(scoreBefore);
  });

  it('grows the snake when food is eaten', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    const lenBefore = g._snake.length;

    // Place food one cell ahead so it's eaten on the next tick.
    const head = g._snake.head;
    const dir  = g._snake.direction;
    g._food._position = { x: head.x + dir.dx, y: head.y + dir.dy };

    // Tick 1: snake eats food, pendingGrowth is set to true.
    g._tick();

    // Tick 2: snake moves with pendingGrowth=true → tail is NOT removed → length +1.
    // (We must keep food away so the snake doesn't eat again.)
    g._food._position = null; // temporarily deactivate food
    g._tick();

    expect(g._snake.length).toBe(lenBefore + 1);
  });

  it('spawns new food after eating', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    const head = g._snake.head;
    const dir  = g._snake.direction;
    const foodPos = { x: head.x + dir.dx, y: head.y + dir.dy };
    g._food._position = { ...foodPos };

    g._tick();
    // New food should be spawned (active) and at a different position
    expect(g._food.isActive).toBe(true);
  });
});

// ── _tick() — death ───────────────────────────────────────────────────────────

describe('Game._tick() death', () => {
  it('transitions to GAME_OVER on wall collision', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    // Force snake head out of bounds by placing it at edge then ticking.
    // Snake starts moving RIGHT; put head on the last column so next tick walks off.
    g._snake._body[0] = { x: GRID_SIZE - 1, y: Math.floor(GRID_SIZE / 2) };

    g._tick(); // snake moves into the wall
    expect(g._state.screen).toBe(SCREENS.GAME_OVER);
  });

  it('saves high score on death when score > previous high score', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    // Score some points first
    g._state._score = 100;

    // Force wall collision
    g._snake._body[0] = { x: GRID_SIZE - 1, y: Math.floor(GRID_SIZE / 2) };
    g._tick();

    expect(g._state.screen).toBe(SCREENS.GAME_OVER);
    expect(parseInt(localStorage.getItem('snake_high_score'), 10)).toBe(100);
  });
});

// ── Pause / resume ────────────────────────────────────────────────────────────

describe('Game pause / resume (via input callbacks)', () => {
  it('pauses when playing', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    // Simulate Escape key
    g._state.pause();
    expect(g._state.screen).toBe(SCREENS.PAUSED);
  });

  it('resumes from paused', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    g._state.pause();
    g._state.resume();
    expect(g._state.screen).toBe(SCREENS.PLAYING);
  });
});

// ── Mute ──────────────────────────────────────────────────────────────────────

describe('Game.toggleMute()', () => {
  it('toggles mute state', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    const before = g._audio.muted;
    g.toggleMute();
    expect(g._audio.muted).toBe(!before);
  });

  it('persists mute state to localStorage', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    // Ensure starting unmuted
    g._audio.muted = false;
    g.toggleMute(); // mute
    expect(localStorage.getItem('snake_mute')).toBe('true');
    g.toggleMute(); // unmute
    expect(localStorage.getItem('snake_mute')).toBe('false');
  });

  it('dispatches a mutechange event', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    const handler = vi.fn();
    document.addEventListener('mutechange', handler);
    g.toggleMute();
    expect(handler).toHaveBeenCalledOnce();
    document.removeEventListener('mutechange', handler);
  });
});

// ── resize() ──────────────────────────────────────────────────────────────────

describe('Game.resize()', () => {
  it('does not throw when called with a valid size', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    expect(() => g.resize(GRID_SIZE * 20)).not.toThrow();
  });
});

// ── Win condition ─────────────────────────────────────────────────────────────

describe('Game._tick() win condition', () => {
  it('transitions to WIN when food cannot spawn (board full)', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    // Place food right in front of the snake head
    const head = g._snake.head;
    const dir  = g._snake.direction;
    g._food._position = { x: head.x + dir.dx, y: head.y + dir.dy };

    // After eating, mock Food.spawn so it sets isActive=false (board full)
    const originalSpawn = g._food.spawn.bind(g._food);
    g._food.spawn = () => { g._food._position = null; };

    g._tick(); // eats food → spawn returns null → WIN

    expect(g._state.screen).toBe(SCREENS.WIN);
  });
});

// ── _draw() ───────────────────────────────────────────────────────────────────

describe('Game._draw()', () => {
  it('does not throw when called before startGame (no snake/food)', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    expect(() => g._draw()).not.toThrow();
  });

  it('does not throw when called during PLAYING', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    expect(() => g._draw()).not.toThrow();
  });
});

// ── _update() / _updatePulse() ────────────────────────────────────────────────

describe('Game._update()', () => {
  it('does not throw when not PLAYING (e.g. MENU)', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    expect(() => g._update(16, performance.now())).not.toThrow();
  });

  it('advances pulseT over time', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    const before = g._pulseT;
    g._update(100, performance.now());
    expect(g._pulseT).toBeGreaterThan(before);
  });

  it('does not tick when PAUSED', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();
    g._state.pause();
    const head = { ...g._snake.head };
    // Feed a large delta — if ticking, head would move
    g._update(1000, performance.now());
    expect(g._snake.head).toEqual(head);
  });
});

// ── Tab visibility ────────────────────────────────────────────────────────────

describe('Game visibility handling', () => {
  it('auto-pauses when tab becomes hidden while playing', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    // Simulate tab hide
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(g._state.screen).toBe(SCREENS.PAUSED);

    // Restore
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('auto-resumes when tab becomes visible again (if we auto-paused)', () => {
    const g = new Game(makeCanvas(), GRID_SIZE * 24);
    g._startNewGame();

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(g._state.screen).toBe(SCREENS.PLAYING);
  });
});
