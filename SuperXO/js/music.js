/**
 * music.js — Custom BGM player.
 *
 * Lets the user pick a local audio file which is stored in IndexedDB
 * (as an ArrayBuffer) so it persists across sessions without hitting
 * localStorage size limits.
 *
 * Public API
 * ──────────
 * Music.init()            — call once at app boot
 * Music.load(file)        — load a File object picked by the user
 * Music.play()            — start / resume playback
 * Music.pause()           — pause playback
 * Music.toggle()          — play if paused, pause if playing
 * Music.stop()            — pause + reset position
 * Music.setVolume(0–1)    — set volume
 * Music.setEnabled(bool)  — master enable switch (synced with music setting)
 * Music.isPlaying()       — boolean
 * Music.getTrackName()    — stored filename or null
 * Music.remove()          — delete stored track
 * Music.onStateChange(fn) — callback when play/pause/track changes
 */

const DB_NAME    = 'superxo_bgm';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const TRACK_KEY  = 'custom_bgm';
const META_KEY   = 'custom_bgm_meta';

let _audio        = null;   // HTMLAudioElement
let _blobUrl      = null;   // current object URL
let _enabled      = true;   // master switch (Settings → Music toggle)
let _volume       = 0.35;   // default volume
let _trackName    = null;   // filename for display
let _playing      = false;
let _stateListeners = [];

// ── IndexedDB helpers ─────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

async function dbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(key);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function dbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Internal helpers ──────────────────────────────────

function _notifyListeners() {
  _stateListeners.forEach(fn => {
    try { fn(); } catch (_) { /* ignore */ }
  });
}

function _createAudio(url) {
  if (_audio) {
    _audio.pause();
    _audio.src = '';
  }
  _audio = new Audio(url);
  _audio.loop   = true;
  _audio.volume = _volume;
  _audio.addEventListener('ended', () => {
    // loop is set but belt-and-suspenders
    if (_playing && _enabled) _audio.play().catch(() => {});
  });
}

function _revokePrevious() {
  if (_blobUrl) {
    URL.revokeObjectURL(_blobUrl);
    _blobUrl = null;
  }
}

// ── Public API ────────────────────────────────────────

/**
 * Initialise — restore persisted track from IndexedDB (if any).
 * Call once at app boot before any user interaction.
 */
async function init() {
  try {
    const [buf, meta] = await Promise.all([
      dbGet(TRACK_KEY),
      dbGet(META_KEY),
    ]);
    if (buf && buf instanceof ArrayBuffer) {
      const blob  = new Blob([buf], { type: meta?.type || 'audio/mpeg' });
      _blobUrl    = URL.createObjectURL(blob);
      _trackName  = meta?.name || 'Custom Track';
      _createAudio(_blobUrl);
      _notifyListeners();
    }
  } catch (e) {
    console.warn('[Music] Could not restore track:', e);
  }
}

/**
 * Load a File chosen by the user.
 * @param {File} file
 */
async function load(file) {
  try {
    const buf = await file.arrayBuffer();
    // Persist to IndexedDB
    await dbPut(TRACK_KEY, buf);
    await dbPut(META_KEY, { name: file.name, type: file.type });

    _revokePrevious();
    const blob  = new Blob([buf], { type: file.type });
    _blobUrl    = URL.createObjectURL(blob);
    _trackName  = file.name;
    _createAudio(_blobUrl);
    _notifyListeners();

    // Auto-play if music is enabled
    if (_enabled) {
      _playing = true;
      _audio.play().catch(() => {
        _playing = false;
        _notifyListeners();
      });
    }
  } catch (e) {
    console.warn('[Music] Could not load file:', e);
    throw e;
  }
}

/** Start / resume playback. */
function play() {
  if (!_audio || !_enabled) return;
  _playing = true;
  _audio.play().catch(() => {
    _playing = false;
    _notifyListeners();
  });
  _notifyListeners();
}

/** Pause playback. */
function pause() {
  if (!_audio) return;
  _playing = false;
  _audio.pause();
  _notifyListeners();
}

/** Toggle play/pause. */
function toggle() {
  if (_playing) { pause(); } else { play(); }
}

/** Pause and reset to start. */
function stop() {
  if (!_audio) return;
  _playing = false;
  _audio.pause();
  _audio.currentTime = 0;
  _notifyListeners();
}

/**
 * Master enable switch — called by Settings when the Music toggle changes.
 * @param {boolean} bool
 */
function setEnabled(bool) {
  _enabled = bool;
  if (!bool) {
    pause();
  } else if (_audio && !_playing) {
    play();
  }
}

/**
 * Set volume (0 – 1).
 * @param {number} vol
 */
function setVolume(vol) {
  _volume = Math.max(0, Math.min(1, vol));
  if (_audio) _audio.volume = _volume;
}

/** @returns {boolean} */
function isPlaying() { return _playing; }

/** @returns {boolean} */
function hasTrack() { return _audio !== null && _blobUrl !== null; }

/** @returns {string|null} */
function getTrackName() { return _trackName; }

/** @returns {number} 0–1 */
function getVolume() { return _volume; }

/**
 * Delete the stored track and stop playback.
 */
async function remove() {
  stop();
  _revokePrevious();
  _audio     = null;
  _trackName = null;
  try {
    await dbDelete(TRACK_KEY);
    await dbDelete(META_KEY);
  } catch (_) { /* ignore */ }
  _notifyListeners();
}

/**
 * Register a callback that fires whenever play/pause state or track changes.
 * @param {Function} fn
 */
function onStateChange(fn) {
  _stateListeners.push(fn);
}

export const Music = {
  init,
  load,
  play,
  pause,
  toggle,
  stop,
  setEnabled,
  setVolume,
  isPlaying,
  hasTrack,
  getTrackName,
  getVolume,
  remove,
  onStateChange,
};
