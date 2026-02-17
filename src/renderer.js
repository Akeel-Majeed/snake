/**
 * renderer.js
 *
 * All canvas drawing lives here.  The Renderer is a pure side-effect module —
 * it reads game state and writes pixels; it does not modify any state.
 *
 * Key design decisions:
 * - Every `draw*` method is self-contained (takes explicit arguments, not a
 *   reference to global state) so it's easy to test or call in isolation.
 * - DPI scaling is handled once in the constructor via `devicePixelRatio`.
 * - The renderer draws one complete frame per call to `render()` — no partial
 *   updates or dirty-rectangle tracking (unnecessary for a 20×20 grid game).
 */

import {
  GRID_SIZE,
  CELL_SIZE,
  COLORS,
  SCREENS,
} from './constants.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} [gridSize=GRID_SIZE]
   * @param {number} [cellSize=CELL_SIZE]
   */
  constructor(canvas, gridSize = GRID_SIZE, cellSize = CELL_SIZE) {
    this._canvas   = canvas;
    this._ctx      = canvas.getContext('2d');
    this._gridSize = gridSize;
    this._cellSize = cellSize;

    // Scale canvas for high-DPI (Retina) displays.
    // The logical size of the canvas is gridSize * cellSize pixels.
    // The physical size is that multiplied by devicePixelRatio.
    this._dpr = window.devicePixelRatio || 1;
    this._logicalSize = gridSize * cellSize;

    this._applyDpiScaling();
    this._loadFont();
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  _applyDpiScaling() {
    const size = this._logicalSize;
    const dpr  = this._dpr;

    // Physical pixel dimensions
    this._canvas.width  = size * dpr;
    this._canvas.height = size * dpr;

    // CSS size stays at logical pixels so layout doesn't change
    this._canvas.style.width  = `${size}px`;
    this._canvas.style.height = `${size}px`;

    // Scale all drawing calls up by dpr so they're sharp on Retina
    this._ctx.scale(dpr, dpr);
  }

  _loadFont() {
    // Sizes are expressed in logical pixels (before DPI scaling).
    // The canvas is ~480 px wide, so these need to be readable at that size.
    this._fontSmall  = "13px 'PressStart2P', monospace";
    this._fontMedium = "16px 'PressStart2P', monospace";
    this._fontLarge  = "28px 'PressStart2P', monospace";
    this._fontHuge   = "42px 'PressStart2P', monospace";
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Master render method — called every animation frame.
   *
   * @param {{
   *   screen: string,
   *   snake: import('./snake.js').Snake,
   *   food: import('./food.js').Food,
   *   score: number,
   *   highScore: number,
   *   level: number,
   *   isNewRecord: boolean,
   *   foodPulse: number,   // 0..1 animation value for food pulsing
   *   shakeOffset: {x:number,y:number}, // screen shake offset
   * }} state
   */
  render(state) {
    const ctx = this._ctx;

    // Apply screen shake by translating the whole canvas
    const { x: sx, y: sy } = state.shakeOffset ?? { x: 0, y: 0 };
    ctx.save();
    ctx.translate(sx, sy);

    this._clearBackground();
    this._drawGrid();

    if (state.food.isActive) {
      this._drawFood(state.food.position, state.foodPulse ?? 0);
    }

    this._drawSnake(state.snake);
    this._drawHUD(state.score, state.highScore, state.level);

    // Screen overlays (menus etc.) drawn on top of the game
    switch (state.screen) {
      case SCREENS.MENU:      this._drawMenuScreen(); break;
      case SCREENS.PAUSED:    this._drawPausedScreen(); break;
      case SCREENS.GAME_OVER: this._drawGameOverScreen(state.score, state.isNewRecord); break;
      case SCREENS.WIN:       this._drawWinScreen(state.score); break;
      // SCREENS.PLAYING — no overlay needed
    }

    ctx.restore();
  }

  // ── Background & grid ──────────────────────────────────────────────────────

  _clearBackground() {
    const ctx = this._ctx;
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this._logicalSize, this._logicalSize);
  }

  _drawGrid() {
    const ctx  = this._ctx;
    const size = this._logicalSize;
    const cell = this._cellSize;

    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth   = 0.5;
    ctx.globalAlpha = 0.4;

    for (let i = 0; i <= this._gridSize; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  // ── Snake ──────────────────────────────────────────────────────────────────

  /**
   * Draws the snake body with a gradient from bright head to dark tail.
   * @param {import('./snake.js').Snake} snake
   */
  _drawSnake(snake) {
    const ctx    = this._ctx;
    const body   = snake.body;
    const len    = body.length;
    const cell   = this._cellSize;
    const inset  = 1; // 1-px gap between cell edge and segment

    for (let i = 0; i < len; i++) {
      const { x, y } = body[i];
      const t = i / Math.max(len - 1, 1); // 0 at head, 1 at tail

      // Interpolate colour: head=SNAKE_HEAD → mid=SNAKE_BODY → tail=SNAKE_TAIL
      ctx.fillStyle = i === 0
        ? COLORS.SNAKE_HEAD
        : i < len * 0.4
          ? COLORS.SNAKE_BODY
          : COLORS.SNAKE_TAIL;

      // Head gets a glow effect
      if (i === 0) {
        ctx.shadowColor = COLORS.SNAKE_HEAD;
        ctx.shadowBlur  = 8;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(
        x * cell + inset,
        y * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
      );
    }

    ctx.shadowBlur = 0;
  }

  // ── Food ──────────────────────────────────────────────────────────────────

  /**
   * Draws a pulsing food item.
   * @param {{ x: number, y: number }} position
   * @param {number} pulse - 0..1 animation progress value
   */
  _drawFood(position, pulse) {
    const ctx  = this._ctx;
    const cell = this._cellSize;
    const { x, y } = position;

    // Pulse: size oscillates between 60 % and 90 % of the cell
    const scale    = 0.6 + 0.3 * pulse;
    const drawSize = cell * scale;
    const offset   = (cell - drawSize) / 2;

    ctx.shadowColor = COLORS.FOOD_GLOW;
    ctx.shadowBlur  = 10 + 6 * pulse;

    ctx.fillStyle = COLORS.FOOD;
    ctx.fillRect(
      x * cell + offset,
      y * cell + offset,
      drawSize,
      drawSize,
    );

    ctx.shadowBlur = 0;
  }

  // ── HUD (score / level) ────────────────────────────────────────────────────

  /**
   * Draws a minimal HUD bar at the top of the canvas.
   * @param {number} score
   * @param {number} highScore
   * @param {number} level
   */
  _drawHUD(score, highScore, level) {
    const ctx  = this._ctx;
    const pad  = 10;
    const y    = pad + 13; // baseline for 13px font

    ctx.font      = this._fontSmall;
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score}`, pad, y);

    ctx.textAlign = 'center';
    ctx.fillText(`LV ${level}`, this._logicalSize / 2, y);

    ctx.textAlign = 'right';
    ctx.fillText(`HI ${highScore}`, this._logicalSize - pad, y);
  }

  // ── Overlay screens ────────────────────────────────────────────────────────

  _drawOverlay() {
    const ctx  = this._ctx;
    const size = this._logicalSize;
    ctx.fillStyle = COLORS.OVERLAY;
    ctx.fillRect(0, 0, size, size);
  }

  _centreText(text, y, font, color) {
    const ctx = this._ctx;
    ctx.font      = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, this._logicalSize / 2, y);
  }

  _drawMenuScreen() {
    this._drawOverlay();
    // Lay out from the vertical centre, working outward.
    // LINE_H is the gap between instruction lines at the new font size.
    const mid    = this._logicalSize / 2;
    const LINE_H = 28; // px between instruction lines (13px font + generous gap)

    this._ctx.shadowColor = COLORS.SNAKE_HEAD;
    this._ctx.shadowBlur  = 14;
    this._centreText('SNAKE', mid - 80, this._fontHuge, COLORS.TITLE);
    this._ctx.shadowBlur  = 0;

    this._centreText('PRESS ENTER TO PLAY',  mid - 10,           this._fontSmall, COLORS.SUBTITLE);
    this._centreText('ARROWS / WASD  MOVE',  mid - 10 + LINE_H,  this._fontSmall, '#888888');
    this._centreText('P / ESC  PAUSE',       mid - 10 + LINE_H * 2, this._fontSmall, '#888888');
    this._centreText('M  MUTE',              mid - 10 + LINE_H * 3, this._fontSmall, '#888888');
  }

  _drawPausedScreen() {
    this._drawOverlay();
    const mid = this._logicalSize / 2;
    this._centreText('PAUSED',                  mid - 20, this._fontLarge, COLORS.TITLE);
    this._centreText('P / ESC  TO RESUME', mid + 24, this._fontSmall, COLORS.SUBTITLE);
  }

  /**
   * @param {number} score
   * @param {boolean} isNewRecord
   */
  _drawGameOverScreen(score, isNewRecord) {
    this._drawOverlay();
    const mid    = this._logicalSize / 2;
    const LINE_H = 28;

    this._centreText('GAME OVER', mid - 60, this._fontLarge, '#ff4444');

    let y = mid - 10;
    if (isNewRecord) {
      this._centreText('NEW RECORD!', y, this._fontSmall, COLORS.HIGHLIGHT);
      y += LINE_H;
    }
    this._centreText(`SCORE  ${score}`, y,          this._fontSmall, COLORS.SUBTITLE);
    this._centreText('ENTER  PLAY AGAIN', y + LINE_H,     this._fontSmall, COLORS.SUBTITLE);
    this._centreText('ESC  MAIN MENU',   y + LINE_H * 2,  this._fontSmall, '#888888');
  }

  /**
   * @param {number} score
   */
  _drawWinScreen(score) {
    this._drawOverlay();
    const mid    = this._logicalSize / 2;
    const LINE_H = 28;

    this._centreText('YOU WIN!',            mid - 50,        this._fontLarge, COLORS.HIGHLIGHT);
    this._centreText(`SCORE  ${score}`,     mid + 10,        this._fontSmall, COLORS.SUBTITLE);
    this._centreText('ENTER  PLAY AGAIN',   mid + 10 + LINE_H, this._fontSmall, COLORS.SUBTITLE);
    this._centreText('ESC  MAIN MENU',      mid + 10 + LINE_H * 2, this._fontSmall, '#888888');
  }

  // ── Resize support ─────────────────────────────────────────────────────────

  /**
   * Called by main.js when the window resizes.
   * Recalculates cell size to fit the new viewport, then re-applies DPI scaling.
   *
   * @param {number} availableSize - The smaller of window.innerWidth / innerHeight.
   */
  resize(availableSize) {
    // Recalculate logical cell size
    this._cellSize    = Math.floor(availableSize / this._gridSize);
    this._logicalSize = this._gridSize * this._cellSize;

    // Re-apply DPI scaling with new logical size
    this._dpr = window.devicePixelRatio || 1;
    this._applyDpiScaling();
  }
}
