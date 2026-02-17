/**
 * main.js
 *
 * Entry point.  Responsibilities:
 *   1. Grab the canvas from the DOM.
 *   2. Calculate the initial canvas size to fit the viewport.
 *   3. Instantiate the Game and start the loop.
 *   4. Wire up the window resize handler.
 *   5. Wire up the mute button.
 *
 * Everything else (game logic, rendering, input) is handled by the imported
 * classes.  main.js should be as thin as possible.
 */

import { Game } from './game.js';
import { GRID_SIZE } from './constants.js';

// ── DOM references ────────────────────────────────────────────────────────────

const canvas  = document.getElementById('game-canvas');
const wrapper = document.getElementById('game-wrapper');
const muteBtn = document.getElementById('mute-btn');

// ── Canvas sizing ─────────────────────────────────────────────────────────────

/**
 * Returns the largest square that fits in the current viewport,
 * with a small margin so the canvas never touches the screen edges.
 */
function calcCanvasSize() {
  const margin = 16; // px on each side
  const available = Math.min(window.innerWidth, window.innerHeight) - margin * 2;
  // Round down to nearest multiple of GRID_SIZE for pixel-perfect alignment
  return Math.floor(available / GRID_SIZE) * GRID_SIZE;
}

function applyCanvasSize(size) {
  wrapper.style.width  = `${size}px`;
  wrapper.style.height = `${size}px`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const initialSize = calcCanvasSize();
applyCanvasSize(initialSize);

const game = new Game(canvas, initialSize);
game.start();

// ── Resize handler ────────────────────────────────────────────────────────────

/**
 * Debounce resize so we don't hammer the renderer while the user is dragging.
 */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const newSize = calcCanvasSize();
    applyCanvasSize(newSize);
    game.resize(newSize);
  }, 100);
});

// ── Mute button ───────────────────────────────────────────────────────────────

muteBtn.addEventListener('click', () => {
  game.toggleMute();
});

// Keep the mute button label in sync
document.addEventListener('mutechange', (e) => {
  muteBtn.textContent = e.detail.muted ? '🔇' : '🔊';
});
