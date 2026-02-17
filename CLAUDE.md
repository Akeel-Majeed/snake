# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
- Retro snake game for web portfolio
- **Tech stack: Vite + Vanilla JavaScript + HTML5 Canvas + Vitest**

## Developer Profile
- College student, actively learning frameworks and tech
- Explain all code and best practices thoroughly when shipping

## Engineering Preferences
- DRY: flag repetition aggressively
- Testing: comprehensive — too many tests > too few
- Engineered enough: not hacky, not over-abstracted
- Handle more edge cases, not fewer
- Explicit over clever

## Code Quality Checklist
When reviewing code, evaluate:
- Module organization and structure
- DRY violations
- Error handling patterns and missing edge cases
- Technical debt hotspots
- Over/under-engineering relative to preferences above

## Commands
- `npm run dev` — start Vite dev server (hot reload)
- `npm test` — run all tests once (Vitest)
- `npm run test:watch` — run tests in watch mode
- `npm run coverage` — run tests + generate coverage report
- `npm run build` — production build → `dist/`
- `npm run preview` — preview the production build locally

## Architecture

```
src/
├── constants.js  — all magic numbers (grid size, speeds, colors, keys)
├── utils.js      — pure helpers: randomInt, coordsEqual, coordInList, clamp, tickIntervalForLevel
├── snake.js      — Snake class: body array, move, grow, collision detection, direction queue
├── food.js       — Food class: spawn on unoccupied cell, isEatenBy
├── state.js      — GameState: score, level, screen (MENU/PLAYING/PAUSED/GAME_OVER/WIN)
├── storage.js    — localStorage wrapper: loadHighScore, saveHighScore, loadMute, saveMute
├── input.js      — InputHandler: keyboard (arrows+WASD+Esc/P/M/Enter) + touch/swipe
├── renderer.js   — Renderer: all canvas drawing (grid, snake, food, HUD, overlays)
├── audio.js      — AudioManager: Web Audio API, preloads sounds, mute toggle
├── game.js       — Game orchestrator: RAF loop, tick accumulator, state transitions
└── main.js       — Entry point: canvas sizing, Game instantiation, resize + mute button
```

**Data flow:** `main.js` → `Game` → tick each `N ms` → `Snake.move()` → collision checks → `GameState.addScore()` → `Renderer.render()`

**Coverage:** Logic modules (constants, utils, snake, food, state, storage, input) all sit at 100% coverage. Orchestrators (game, renderer, audio, main) are excluded from the threshold requirement since they depend on browser APIs.

**Sound files** go in `public/sounds/` (eat.wav, die.wav, turn.wav, levelup.wav). The font goes in `public/fonts/PressStart2P.woff2`. These are served statically by Vite.
