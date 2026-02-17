/**
 * tests/storage.test.js
 *
 * Tests for the localStorage wrapper.
 * jsdom provides a real localStorage implementation, so we can test actual
 * get/set behaviour.  We spy on localStorage methods to test error paths.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadHighScore, saveHighScore, loadMute, saveMute } from '../src/storage.js';

// ── Isolation ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Start each test with a clean storage
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── loadHighScore() ───────────────────────────────────────────────────────────

describe('loadHighScore()', () => {
  it('returns 0 when nothing is stored', () => {
    expect(loadHighScore()).toBe(0);
  });

  it('returns the stored number', () => {
    localStorage.setItem('snake_high_score', '250');
    expect(loadHighScore()).toBe(250);
  });

  it('returns 0 for non-numeric stored value', () => {
    localStorage.setItem('snake_high_score', 'not-a-number');
    expect(loadHighScore()).toBe(0);
  });

  it('returns 0 for a negative stored value', () => {
    localStorage.setItem('snake_high_score', '-50');
    expect(loadHighScore()).toBe(0);
  });

  it('returns 0 when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(loadHighScore()).toBe(0);
  });
});

// ── saveHighScore() ───────────────────────────────────────────────────────────

describe('saveHighScore()', () => {
  it('persists a new high score', () => {
    saveHighScore(300);
    expect(loadHighScore()).toBe(300);
  });

  it('overwrites when new score is higher', () => {
    saveHighScore(100);
    saveHighScore(200);
    expect(loadHighScore()).toBe(200);
  });

  it('does NOT overwrite when new score is lower', () => {
    saveHighScore(500);
    saveHighScore(100);
    expect(loadHighScore()).toBe(500);
  });

  it('does NOT overwrite when new score equals current', () => {
    saveHighScore(500);
    saveHighScore(500);
    expect(loadHighScore()).toBe(500);
  });

  it('ignores NaN', () => {
    saveHighScore(NaN);
    expect(loadHighScore()).toBe(0);
  });

  it('ignores negative values', () => {
    saveHighScore(-10);
    expect(loadHighScore()).toBe(0);
  });

  it('ignores Infinity', () => {
    saveHighScore(Infinity);
    expect(loadHighScore()).toBe(0);
  });

  it('silently handles localStorage.setItem throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveHighScore(100)).not.toThrow();
  });
});

// ── loadMute() ────────────────────────────────────────────────────────────────

describe('loadMute()', () => {
  it('returns false when nothing is stored', () => {
    expect(loadMute()).toBe(false);
  });

  it("returns true when stored value is 'true'", () => {
    localStorage.setItem('snake_mute', 'true');
    expect(loadMute()).toBe(true);
  });

  it("returns false when stored value is 'false'", () => {
    localStorage.setItem('snake_mute', 'false');
    expect(loadMute()).toBe(false);
  });

  it('returns false for garbage stored value', () => {
    localStorage.setItem('snake_mute', 'yes');
    expect(loadMute()).toBe(false);
  });

  it('returns false when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage error');
    });
    expect(loadMute()).toBe(false);
  });
});

// ── saveMute() ────────────────────────────────────────────────────────────────

describe('saveMute()', () => {
  it("persists true as 'true'", () => {
    saveMute(true);
    expect(loadMute()).toBe(true);
  });

  it("persists false as 'false'", () => {
    saveMute(true);
    saveMute(false);
    expect(loadMute()).toBe(false);
  });

  it('coerces truthy values to true', () => {
    saveMute(1);
    expect(loadMute()).toBe(true);
  });

  it('coerces falsy values to false', () => {
    saveMute(0);
    expect(loadMute()).toBe(false);
  });

  it('silently handles localStorage.setItem throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveMute(true)).not.toThrow();
  });
});
