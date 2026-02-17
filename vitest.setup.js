/**
 * vitest.setup.js
 *
 * Runs once before each test file.
 * `vitest-canvas-mock` patches the HTMLCanvasElement prototype so that
 * calls like `canvas.getContext('2d')` work in jsdom (which has no real
 * canvas implementation).  Without this, renderer.js and any test that
 * touches canvas would throw.
 */
import 'vitest-canvas-mock';
