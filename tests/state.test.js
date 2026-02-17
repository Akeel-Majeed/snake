/**
 * tests/state.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/state.js';
import { SCREENS, POINTS_PER_FOOD, POINTS_PER_LEVEL, MAX_LEVEL } from '../src/constants.js';

const makeState = (highScore = 0) => new GameState(highScore);

// ── Construction ──────────────────────────────────────────────────────────────

describe('GameState construction', () => {
  it('starts on MENU screen', () => {
    expect(makeState().screen).toBe(SCREENS.MENU);
  });

  it('starts at score 0', () => {
    expect(makeState().score).toBe(0);
  });

  it('starts at level 1', () => {
    expect(makeState().level).toBe(1);
  });

  it('uses provided initialHighScore', () => {
    expect(makeState(500).highScore).toBe(500);
  });

  it('isNewRecord starts false', () => {
    expect(makeState().isNewRecord).toBe(false);
  });
});

// ── startGame() ───────────────────────────────────────────────────────────────

describe('GameState.startGame()', () => {
  it('transitions to PLAYING screen', () => {
    const s = makeState();
    s.startGame();
    expect(s.screen).toBe(SCREENS.PLAYING);
  });

  it('resets score and level', () => {
    const s = makeState();
    s.startGame();
    for (let i = 0; i < 5; i++) s.addScore();
    s.endGame();
    s.startGame(); // restart
    expect(s.score).toBe(0);
    expect(s.level).toBe(1);
  });

  it('clears isNewRecord flag', () => {
    const s = makeState(0);
    s.startGame();
    s.addScore();
    s.endGame(); // sets isNewRecord = true
    s.startGame();
    expect(s.isNewRecord).toBe(false);
  });

  it('is callable from MENU, GAME_OVER, and WIN screens', () => {
    const s = makeState();
    // MENU → PLAYING
    s.startGame();
    expect(s.screen).toBe(SCREENS.PLAYING);

    s.endGame();  // PLAYING → GAME_OVER
    s.startGame();
    expect(s.screen).toBe(SCREENS.PLAYING);

    s.win();      // PLAYING → WIN
    s.startGame();
    expect(s.screen).toBe(SCREENS.PLAYING);
  });
});

// ── pause() and resume() ──────────────────────────────────────────────────────

describe('pause() / resume()', () => {
  it('PLAYING → PAUSED on pause()', () => {
    const s = makeState();
    s.startGame();
    s.pause();
    expect(s.screen).toBe(SCREENS.PAUSED);
  });

  it('PAUSED → PLAYING on resume()', () => {
    const s = makeState();
    s.startGame();
    s.pause();
    s.resume();
    expect(s.screen).toBe(SCREENS.PLAYING);
  });

  it('pause() is a no-op when not PLAYING', () => {
    const s = makeState(); // MENU
    s.pause();
    expect(s.screen).toBe(SCREENS.MENU);
  });

  it('resume() is a no-op when not PAUSED', () => {
    const s = makeState();
    s.startGame(); // PLAYING
    s.resume();    // already playing — should stay PLAYING
    expect(s.screen).toBe(SCREENS.PLAYING);
  });
});

// ── endGame() ────────────────────────────────────────────────────────────────

describe('endGame()', () => {
  it('transitions to GAME_OVER', () => {
    const s = makeState();
    s.startGame();
    s.endGame();
    expect(s.screen).toBe(SCREENS.GAME_OVER);
  });

  it('updates highScore when current score exceeds it', () => {
    const s = makeState(0);
    s.startGame();
    s.addScore(); // score = POINTS_PER_FOOD
    s.endGame();
    expect(s.highScore).toBe(POINTS_PER_FOOD);
  });

  it('does NOT update highScore when score is lower', () => {
    const s = makeState(999);
    s.startGame();
    s.addScore();
    s.endGame();
    expect(s.highScore).toBe(999);
  });

  it('sets isNewRecord when high score is broken', () => {
    const s = makeState(0);
    s.startGame();
    s.addScore();
    s.endGame();
    expect(s.isNewRecord).toBe(true);
  });

  it('does NOT set isNewRecord when high score is not broken', () => {
    const s = makeState(999);
    s.startGame();
    s.addScore();
    s.endGame();
    expect(s.isNewRecord).toBe(false);
  });
});

// ── win() ─────────────────────────────────────────────────────────────────────

describe('win()', () => {
  it('transitions to WIN screen', () => {
    const s = makeState();
    s.startGame();
    s.win();
    expect(s.screen).toBe(SCREENS.WIN);
  });

  it('updates highScore on win', () => {
    const s = makeState(0);
    s.startGame();
    s.addScore();
    s.win();
    expect(s.highScore).toBe(POINTS_PER_FOOD);
  });
});

// ── returnToMenu() ────────────────────────────────────────────────────────────

describe('returnToMenu()', () => {
  it('transitions GAME_OVER → MENU', () => {
    const s = makeState();
    s.startGame();
    s.endGame();
    s.returnToMenu();
    expect(s.screen).toBe(SCREENS.MENU);
  });

  it('transitions WIN → MENU', () => {
    const s = makeState();
    s.startGame();
    s.win();
    s.returnToMenu();
    expect(s.screen).toBe(SCREENS.MENU);
  });
});

// ── addScore() ────────────────────────────────────────────────────────────────

describe('addScore()', () => {
  it('increases score by POINTS_PER_FOOD each call', () => {
    const s = makeState();
    s.startGame();
    s.addScore();
    expect(s.score).toBe(POINTS_PER_FOOD);
    s.addScore();
    expect(s.score).toBe(POINTS_PER_FOOD * 2);
  });

  it('returns leveledUp=false and newLevel=1 when not levelling up', () => {
    const s = makeState();
    s.startGame();
    const result = s.addScore();
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });

  it('returns leveledUp=true when crossing a level threshold', () => {
    const s = makeState();
    s.startGame();
    // Level-up happens at POINTS_PER_LEVEL points
    const callsNeeded = POINTS_PER_LEVEL / POINTS_PER_FOOD;
    let result;
    for (let i = 0; i < callsNeeded; i++) {
      result = s.addScore();
    }
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  it('caps level at MAX_LEVEL', () => {
    const s = makeState();
    s.startGame();
    // Score enough to exceed MAX_LEVEL
    const scoreBeyondMax = (MAX_LEVEL + 5) * POINTS_PER_LEVEL;
    const calls = scoreBeyondMax / POINTS_PER_FOOD;
    for (let i = 0; i < calls; i++) s.addScore();
    expect(s.level).toBe(MAX_LEVEL);
  });

  it('does not return leveledUp when already at MAX_LEVEL', () => {
    const s = makeState();
    s.startGame();
    // Get to MAX_LEVEL
    const scoreBeyondMax = MAX_LEVEL * POINTS_PER_LEVEL;
    const calls = scoreBeyondMax / POINTS_PER_FOOD;
    for (let i = 0; i < calls; i++) s.addScore();
    // One more food — should NOT report level-up
    const result = s.addScore();
    expect(result.leveledUp).toBe(false);
  });
});
