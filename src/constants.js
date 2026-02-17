/**
 * constants.js
 *
 * All magic numbers and configuration values live here.
 * If you want to tweak gameplay, this is the only file you need to touch.
 *
 * Design principle: nothing in the rest of the codebase should contain
 * a raw number or string that describes a game rule.
 */

// ── Grid ─────────────────────────────────────────────────────────────────────

/** Number of columns (and rows — the grid is always square). */
export const GRID_SIZE = 20;

/** Logical width/height of one cell in pixels BEFORE DPI scaling. */
export const CELL_SIZE = 24;

// ── Timing ───────────────────────────────────────────────────────────────────

/**
 * Base tick interval in milliseconds (level 1 speed).
 * One "tick" = one step the snake takes.
 */
export const BASE_TICK_MS = 200;

/**
 * How many milliseconds faster each level is compared to the previous.
 * At level N the tick interval is: BASE_TICK_MS - (N - 1) * SPEED_INCREMENT_MS
 */
export const SPEED_INCREMENT_MS = 20;

/**
 * The fastest the snake can ever move, regardless of level.
 * Without this cap the game would become unplayable at high levels.
 */
export const MIN_TICK_MS = 60;

// ── Levelling ────────────────────────────────────────────────────────────────

/** Points scored per food item eaten. */
export const POINTS_PER_FOOD = 10;

/**
 * How many points the player needs to collect before advancing to the next
 * level.  e.g. at 50 pts → level 2, 100 pts → level 3, …
 */
export const POINTS_PER_LEVEL = 50;

/** Maximum level.  Speed is capped at MIN_TICK_MS beyond this. */
export const MAX_LEVEL = 10;

// ── Directions ───────────────────────────────────────────────────────────────

/**
 * Direction constants used throughout the codebase.
 * Stored as objects so we can do equality comparisons by reference later,
 * but the dx/dy values make arithmetic easy.
 */
export const DIRECTIONS = Object.freeze({
  UP:    Object.freeze({ dx:  0, dy: -1, name: 'UP' }),
  DOWN:  Object.freeze({ dx:  0, dy:  1, name: 'DOWN' }),
  LEFT:  Object.freeze({ dx: -1, dy:  0, name: 'LEFT' }),
  RIGHT: Object.freeze({ dx:  1, dy:  0, name: 'RIGHT' }),
});

/**
 * Pairs of directions that are direct opposites.
 * The snake cannot reverse into itself.
 */
export const OPPOSITE_DIRECTIONS = Object.freeze({
  UP:    'DOWN',
  DOWN:  'UP',
  LEFT:  'RIGHT',
  RIGHT: 'LEFT',
});

// ── Screen states ─────────────────────────────────────────────────────────────

/**
 * All possible "screens" the game can be in.
 * The renderer and game loop both switch on these values.
 */
export const SCREENS = Object.freeze({
  MENU:      'MENU',
  PLAYING:   'PLAYING',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
  WIN:       'WIN',
});

// ── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = Object.freeze({
  BACKGROUND:    '#0a0a0a',   // Near-black canvas background
  GRID:          '#111111',   // Subtle grid lines
  SNAKE_HEAD:    '#00ff41',   // Bright neon green — classic terminal green
  SNAKE_BODY:    '#00cc33',   // Slightly darker green for body
  SNAKE_TAIL:    '#006622',   // Darkest — fades toward tail
  FOOD:          '#ff4500',   // Orange-red — high contrast against green snake
  FOOD_GLOW:     '#ff6a00',   // Lighter orange for glow/pulse effect
  HUD_TEXT:      '#00ff41',   // Same neon green for HUD consistency
  OVERLAY:       'rgba(0, 0, 0, 0.75)',  // Semi-transparent overlay for menus
  TITLE:         '#00ff41',   // Title text
  SUBTITLE:      '#ffffff',   // Secondary text (instructions)
  HIGHLIGHT:     '#ffff00',   // "NEW RECORD!" indicator
  BORDER:        '#00ff41',   // Canvas border glow
});

// ── Storage keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = Object.freeze({
  HIGH_SCORE: 'snake_high_score',
  MUTE:       'snake_mute',
});

// ── Input ────────────────────────────────────────────────────────────────────

/**
 * Maximum number of buffered direction changes.
 * Allows the player to queue turns while a tick is in progress.
 */
export const MAX_DIRECTION_QUEUE = 2;

/**
 * Minimum swipe distance in pixels before a touch gesture is recognised.
 * Prevents accidental direction changes from taps.
 */
export const MIN_SWIPE_PX = 30;
