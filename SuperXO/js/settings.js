/**
 * settings.js — persistent user preferences.
 */
import { Storage } from './storage.js';
import { Sound } from './sound.js';

/**
 * Get a single setting value.
 * @param {string} key
 * @returns {*}
 */
function get(key) {
  const settings = Storage.get('settings');
  return settings[key];
}

/**
 * Set a single setting value and persist.
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {
  const settings = Storage.get('settings');
  settings[key] = value;
  Storage.set('settings', settings);
}

/**
 * Apply all settings to the DOM (dark mode class, animation class, sound state).
 */
function applyAll() {
  const s = Storage.get('settings');

  // Dark/light mode
  document.body.classList.toggle('dark-mode', s.darkMode !== false);
  document.body.classList.toggle('light-mode', s.darkMode === false);

  // Animations
  document.body.classList.toggle('no-animations', !s.animations);

  // Sound
  Sound.setEnabled(s.sound !== false);
}

export const Settings = { get, set, applyAll };
