/**
 * storage.js
 *
 * A thin, safe wrapper around localStorage.
 *
 * Why wrap localStorage?
 * 1. localStorage can throw in private/incognito mode, or when the storage
 *    quota is exceeded — we handle those errors gracefully.
 * 2. All keys are defined in constants.js so there's no key string duplication.
 * 3. The rest of the codebase talks in typed values (numbers/booleans), not
 *    raw strings — this module handles serialisation.
 */

import { STORAGE_KEYS } from './constants.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Safely reads a raw string from localStorage.
 * Returns null on any error (private mode, missing key, etc.).
 *
 * @param {string} key
 * @returns {string | null}
 */
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely writes a string to localStorage.
 * Silently ignores errors (quota exceeded, private mode, etc.).
 *
 * @param {string} key
 * @param {string} value
 */
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently swallow — the game still works without persistence
  }
}

// ── High score ─────────────────────────────────────────────────────────────────

/**
 * Loads the persisted high score.
 * Returns 0 if no score is stored or the stored value is invalid.
 *
 * @returns {number}
 */
export function loadHighScore() {
  const raw = safeGet(STORAGE_KEYS.HIGH_SCORE);
  if (raw === null) return 0;
  const parsed = parseInt(raw, 10);
  // NaN or negative values are treated as 0
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Persists the high score.
 * Only writes if the new score is higher than the stored value, preventing
 * accidental regression from a coding bug.
 *
 * @param {number} score
 */
export function saveHighScore(score) {
  if (!Number.isFinite(score) || score < 0) return;
  const current = loadHighScore();
  if (score > current) {
    safeSet(STORAGE_KEYS.HIGH_SCORE, String(score));
  }
}

// ── Mute preference ───────────────────────────────────────────────────────────

/**
 * Loads the mute preference.
 * Returns false (sound ON) if not set.
 *
 * @returns {boolean}
 */
export function loadMute() {
  const raw = safeGet(STORAGE_KEYS.MUTE);
  // Only 'true' maps to true; everything else (null, 'false', garbage) → false
  return raw === 'true';
}

/**
 * Persists the mute preference.
 *
 * @param {boolean} muted
 */
export function saveMute(muted) {
  safeSet(STORAGE_KEYS.MUTE, String(Boolean(muted)));
}
