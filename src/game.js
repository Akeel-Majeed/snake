/**
 * game.js
 *
 * The Game class is the central orchestrator.  It owns:
 *   - The game loop (requestAnimationFrame + delta-time tick accumulator)
 *   - Instantiation of all subsystems (Snake, Food, GameState, etc.)
 *   - State machine transitions in response to input and game events
 *   - Coordination between subsystems (did snake eat food? did it die?)
 *   - Stretch features: screen shake, food pulse animation
 *
 * The Game does NOT implement any logic — it delegates to the appropriate
 * subsystem and reacts to the result.
 */

import { Snake }        from './snake.js';
import { Food }         from './food.js';
import { GameState }    from './state.js';
import { Renderer }     from './renderer.js';
import { InputHandler } from './input.js';
import { AudioManager } from './audio.js';
import { loadHighScore, saveHighScore, loadMute, saveMute } from './storage.js';
import {
  GRID_SIZE,
  SCREENS,
  BASE_TICK_MS,
  SPEED_INCREMENT_MS,
  MIN_TICK_MS,
} from './constants.js';
import { tickIntervalForLevel } from './utils.js';

// ── Screen shake constants ────────────────────────────────────────────────────

const SHAKE_DURATION_MS  = 300;  // total shake time on death
const SHAKE_AMPLITUDE_PX = 6;    // max offset in any direction

// ── Food pulse constants ──────────────────────────────────────────────────────

const PULSE_PERIOD_MS = 800;     // full oscillation period

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} canvasSize - Logical width/height in px (square canvas)
   */
  constructor(canvas, canvasSize) {
    // Derive cell size from canvas size and grid size
    const cellSize = Math.floor(canvasSize / GRID_SIZE);

    // Subsystems
    this._state    = new GameState(loadHighScore());
    this._renderer = new Renderer(canvas, GRID_SIZE, cellSize);
    this._input    = new InputHandler(window);
    this._audio    = new AudioManager();
    this._audio.muted = loadMute();

    // Game objects (initialised fresh each startGame())
    this._snake = null;
    this._food  = null;

    // Game loop state
    this._rafId         = null;   // requestAnimationFrame handle
    this._lastTimestamp = null;   // previous frame's timestamp
    this._tickAccum     = 0;      // accumulated ms waiting for next tick

    // Animation state
    this._shakeTimeLeft = 0;
    this._shakeOffset   = { x: 0, y: 0 };
    this._pulseT        = 0;      // 0..1 food pulse phase

    // Tab-visibility pause
    this._wasPlayingBeforeHide = false;

    this._wireInput();
    this._wireVisibility();

    // Pre-load audio (non-blocking — game can start before sounds are ready)
    this._audio.loadAll();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  /** Called by main.js after construction. Starts the render/input loop. */
  start() {
    this._scheduleFrame();
  }

  // ── Input wiring ──────────────────────────────────────────────────────────

  _wireInput() {
    // Unlock AudioContext on the very first user gesture (keydown / touch).
    // RAF callbacks are not user gestures, so resume() called from _tick()
    // would silently fail — we must do it here while we're inside a real event.
    this._input.onAnyInput(() => this._audio.unlock());

    this._input.onDirection((dir) => {
      if (this._state.screen === SCREENS.PLAYING && this._snake) {
        this._snake.enqueueDirection(dir);
      }
    });

    this._input.onPause(() => {
      if (this._state.screen === SCREENS.PLAYING) {
        this._state.pause();
      } else if (this._state.screen === SCREENS.PAUSED) {
        this._state.resume();
      } else if (
        this._state.screen === SCREENS.GAME_OVER ||
        this._state.screen === SCREENS.WIN
      ) {
        // ESC from game over / win → back to main menu
        this._state.returnToMenu();
      }
    });

    this._input.onConfirm(() => {
      switch (this._state.screen) {
        case SCREENS.MENU:
        case SCREENS.GAME_OVER:
        case SCREENS.WIN:
          this._startNewGame();
          break;
        case SCREENS.PAUSED:
          this._state.resume();
          break;
      }
    });

    this._input.onMute(() => {
      this.toggleMute();
    });
  }

  _wireVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this._state.screen === SCREENS.PLAYING) {
          this._wasPlayingBeforeHide = true;
          this._state.pause();
        }
      } else {
        // Tab became visible again — only auto-resume if we auto-paused
        if (this._wasPlayingBeforeHide) {
          this._wasPlayingBeforeHide = false;
          this._state.resume();
        }
      }
    });
  }

  // ── New game initialisation ───────────────────────────────────────────────

  _startNewGame() {
    this._snake    = new Snake(GRID_SIZE);
    this._food     = new Food(GRID_SIZE);
    this._food.spawn(this._snake.body);

    this._tickAccum     = 0;
    this._shakeTimeLeft = 0;
    this._shakeOffset   = { x: 0, y: 0 };
    this._pulseT        = 0;

    this._state.startGame();
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  _scheduleFrame() {
    this._rafId = requestAnimationFrame((ts) => this._frame(ts));
  }

  _frame(timestamp) {
    // First frame: initialise timestamp
    if (this._lastTimestamp === null) {
      this._lastTimestamp = timestamp;
    }

    const deltaMs = Math.min(timestamp - this._lastTimestamp, 200);
    // Cap delta at 200 ms to prevent a huge catch-up burst after the tab was
    // in the background (browsers throttle RAF to ~1 fps when hidden)
    this._lastTimestamp = timestamp;

    this._update(deltaMs, timestamp);
    this._draw();

    this._scheduleFrame();
  }

  _update(deltaMs, timestamp) {
    if (this._state.screen !== SCREENS.PLAYING) {
      // Still update animations even when paused/on menu (food keeps pulsing)
      this._updatePulse(deltaMs);
      return;
    }

    // ── Tick accumulator ────────────────────────────────────────────────────
    this._tickAccum += deltaMs;
    const tickInterval = tickIntervalForLevel(
      this._state.level,
      BASE_TICK_MS,
      SPEED_INCREMENT_MS,
      MIN_TICK_MS,
    );

    // Process all the ticks that fit in the accumulated time.
    // Usually this is 0 or 1; on a slow frame it might be 2.
    while (this._tickAccum >= tickInterval) {
      this._tickAccum -= tickInterval;
      this._tick();

      // If the snake just died or won, stop processing further ticks
      if (this._state.screen !== SCREENS.PLAYING) break;
    }

    // ── Shake update ────────────────────────────────────────────────────────
    if (this._shakeTimeLeft > 0) {
      this._shakeTimeLeft -= deltaMs;
      const t = this._shakeTimeLeft / SHAKE_DURATION_MS;
      const amp = SHAKE_AMPLITUDE_PX * t; // amplitude fades over time
      this._shakeOffset = {
        x: (Math.random() * 2 - 1) * amp,
        y: (Math.random() * 2 - 1) * amp,
      };
    } else {
      this._shakeOffset = { x: 0, y: 0 };
    }

    // ── Pulse update ────────────────────────────────────────────────────────
    this._updatePulse(deltaMs);
  }

  _updatePulse(deltaMs) {
    // Pulse is a triangle wave between 0 and 1 with period PULSE_PERIOD_MS
    this._pulseT = (this._pulseT + deltaMs / PULSE_PERIOD_MS) % 1;
  }

  /** One logical game step. */
  _tick() {
    if (!this._snake || !this._food) return;

    this._snake.move();

    // ── Collision: walls or self ─────────────────────────────────────────────
    if (this._snake.isDead()) {
      this._audio.play('die');
      this._shakeTimeLeft = SHAKE_DURATION_MS;
      this._state.endGame();
      saveHighScore(this._state.highScore);
      return;
    }

    // ── Collision: food ──────────────────────────────────────────────────────
    if (this._food.isEatenBy(this._snake.head)) {
      this._snake.grow();
      const { leveledUp } = this._state.addScore();

      if (leveledUp) {
        this._audio.play('levelup');
      } else {
        this._audio.play('eat');
      }

      // Respawn food — if no free cells exist, the player wins
      this._food.spawn(this._snake.body);
      if (!this._food.isActive) {
        this._state.win();
        saveHighScore(this._state.highScore);
      }
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _draw() {
    // On MENU before a game starts, snake/food don't exist yet.
    // Render a placeholder empty state.
    const snake = this._snake ?? _emptySnakePlaceholder();
    const food  = this._food  ?? _emptyFoodPlaceholder();

    // Convert pulse (0..1 linear) to a sine wave for smooth oscillation
    const pulseSin = (Math.sin(this._pulseT * Math.PI * 2) + 1) / 2;

    this._renderer.render({
      screen:      this._state.screen,
      snake,
      food,
      score:       this._state.score,
      highScore:   this._state.highScore,
      level:       this._state.level,
      isNewRecord: this._state.isNewRecord,
      foodPulse:   pulseSin,
      shakeOffset: this._shakeOffset,
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Recalculates cell size when the window resizes.
   * Called by main.js.
   *
   * @param {number} newCanvasSize
   */
  resize(newCanvasSize) {
    this._renderer.resize(newCanvasSize);
  }

  /**
   * Toggles mute and persists the preference.
   * Also fires a custom DOM event so the mute button icon can update.
   */
  toggleMute() {
    const muted = this._audio.toggleMute();
    saveMute(muted);
    document.dispatchEvent(new CustomEvent('mutechange', { detail: { muted } }));
  }
}

// ── Placeholder objects for pre-game rendering ────────────────────────────────

/**
 * A minimal object that satisfies the renderer's duck-typing expectations
 * when no actual Snake has been created yet (i.e., on the MENU screen before
 * the first game).
 */
function _emptySnakePlaceholder() {
  return { body: [], head: null, length: 0 };
}

function _emptyFoodPlaceholder() {
  return { position: null, isActive: false };
}
