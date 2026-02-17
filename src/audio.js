/**
 * audio.js
 *
 * Sound loader and player using the Web Audio API.
 *
 * Why Web Audio API instead of <audio> elements?
 * - Multiple simultaneous plays of the same sound (can't do with one <audio>)
 * - Lower latency (pre-decoded buffers, no seek needed)
 * - Clean mute without stopping/pausing — we just set gain to 0
 *
 * Graceful degradation:
 * - If AudioContext creation fails (old browser, strict privacy mode), all
 *   audio calls become no-ops.
 * - Failed sound loads are silently skipped so the game still runs.
 */

export class AudioManager {
  constructor() {
    this._ctx     = null; // AudioContext
    this._buffers = {};   // soundName → AudioBuffer
    this._muted   = false;

    // Try to create AudioContext — may fail in restricted environments
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      // Audio unavailable — all methods will be no-ops
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  /**
   * Preloads all sound files.
   * Returns a Promise that resolves when all files have been fetched and
   * decoded (or if any fail, that file is simply omitted).
   *
   * Call this once before starting the game loop.
   */
  async loadAll() {
    if (!this._ctx) return;

    const sounds = {
      eat:     '/sounds/eat.wav',
      die:     '/sounds/die.wav',
      turn:    '/sounds/turn.wav',
      levelup: '/sounds/levelup.wav',
    };

    await Promise.all(
      Object.entries(sounds).map(([name, url]) => this._load(name, url)),
    );
  }

  /**
   * Fetches and decodes a single sound file.
   * Silently ignores network or decode errors.
   *
   * @param {string} name
   * @param {string} url
   */
  async _load(name, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      this._buffers[name] = await this._ctx.decodeAudioData(arrayBuffer);
    } catch {
      // File missing or corrupt — skip silently
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  /**
   * Plays a named sound immediately.
   * Safe to call when muted, when audio is unavailable, or when the buffer
   * hasn't loaded — all those cases are handled gracefully.
   *
   * @param {string} name - One of 'eat', 'die', 'turn', 'levelup'
   */
  play(name) {
    if (this._muted) return;
    if (!this._ctx || !this._buffers[name]) return;

    const doPlay = () => {
      const source = this._ctx.createBufferSource();
      source.buffer = this._buffers[name];
      source.connect(this._ctx.destination);
      source.start(0);
    };

    // Browsers suspend AudioContext until the first user gesture.
    // We must wait for resume() to fully resolve before calling start(),
    // otherwise the sound is silently dropped while the context is suspended.
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().then(doPlay).catch(() => {});
    } else {
      doPlay();
    }
  }

  /**
   * Call this from any user-gesture handler (keydown, touchstart, click).
   * Browsers only allow AudioContext.resume() inside a genuine user gesture,
   * so we unlock it eagerly the moment the player first interacts — well before
   * the RAF loop tries to play a sound.
   */
  unlock() {
    if (this._ctx?.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  // ── Mute ──────────────────────────────────────────────────────────────────

  /** @returns {boolean} */
  get muted() {
    return this._muted;
  }

  /** @param {boolean} value */
  set muted(value) {
    this._muted = Boolean(value);
  }

  /** Flips the mute state and returns the new state. */
  toggleMute() {
    this._muted = !this._muted;
    return this._muted;
  }
}
