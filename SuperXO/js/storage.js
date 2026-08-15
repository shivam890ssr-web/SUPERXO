/**
 * storage.js — sole module that reads/writes localStorage.
 * All other modules use Storage.get / Storage.set.
 */

const PREFIX = 'superxo_';

const DEFAULTS = {
  splashSeen: false,
  settings: {
    darkMode: true,
    animations: true,
    sound: true,
    music: true,
    timerDefault: false,
    timerDuration: 30,
  },
  theme: 'classic',
  boardCustom: {
    gridStyle: 'solid',
    borderStyle: 'rounded',
    cornerRadius: 16,
    glowIntensity: 'medium',
    winLineStyle: 'glow',
    // Classic grid lines
    classicGridLines: true,
    classicGridWidth: 2,
    classicGridOpacity: 0.18,
    // Ultimate grid lines
    outerGridLines: true,
    outerGridWidth: 3,
    outerGridOpacity: 0.28,
    innerGridLines: true,
    innerGridWidth: 1,
    innerGridOpacity: 0.12,
  },
  pieceColors: { x: '#2dd4ff', o: '#7dff74' },
  unlockedThemes: ['classic', 'neon'],
  unlockedColorPacks: [],
  coins: 0,
  statistics: {
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    aiWins: 0,
    aiLosses: 0,
    favoriteMode: null,
    totalDuration: 0,
    history: [],
  },
  achievements: {},
};

/**
 * Read a value from localStorage.
 * Falls back to DEFAULTS[key] if key is missing or JSON is corrupt.
 * @param {string} key
 * @returns {*}
 */
function get(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return structuredClone(DEFAULTS[key]);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULTS[key]);
  }
}

/**
 * Write a value to localStorage.
 * Silently swallows storage errors (quota exceeded, private mode, etc.).
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] Could not persist key:', key, e);
  }
}

/**
 * Remove a single key from localStorage.
 * @param {string} key
 */
function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {/* swallow */}
}

/**
 * Clear all SuperXO keys from localStorage.
 */
function clear() {
  try {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[Storage] Could not clear storage:', e);
  }
}

export const Storage = { DEFAULTS, get, set, remove, clear };
