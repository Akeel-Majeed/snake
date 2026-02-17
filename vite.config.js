import { defineConfig } from 'vite';

export default defineConfig({
  // ── Test configuration (Vitest) ──────────────────────────────────────────
  test: {
    // jsdom gives us a browser-like environment so canvas/DOM APIs exist
    environment: 'jsdom',

    // This file runs before every test file — sets up the canvas mock
    setupFiles: ['./vitest.setup.js'],

    // Collect coverage from all src files, not just the ones imported by tests
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/main.js', 'src/renderer.js', 'src/audio.js', 'src/game.js'],
      // renderer, audio, and game are excluded because they are orchestrators /
      // side-effect modules (canvas, Web Audio API, requestAnimationFrame) that
      // are impractical to fully unit-test.  Logic lives in the other modules.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
