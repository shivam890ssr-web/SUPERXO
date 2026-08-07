/**
 * theme.js — CSS custom-property theming.
 * Applies named themes by setting vars on :root.
 */
import { Storage } from './storage.js';

const REQUIRED_VARS = [
  '--color-bg-1',
  '--color-bg-2',
  '--color-accent-1',
  '--color-accent-2',
  '--color-surface',
  '--color-border',
  '--color-text',
  '--glow-color',
];

const THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    unlockGames: 0,
    vars: {
      '--color-bg-1': '#203050',
      '--color-bg-2': '#05080f',
      '--color-accent-1': '#2dd4ff',
      '--color-accent-2': '#7dff74',
      '--color-surface': 'rgba(255,255,255,0.06)',
      '--color-border': 'rgba(255,255,255,0.10)',
      '--color-text': '#e8f4ff',
      '--glow-color': '#2dd4ff',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    unlockGames: 2,
    vars: {
      '--color-bg-1': '#0d001a',
      '--color-bg-2': '#050010',
      '--color-accent-1': '#ff00ff',
      '--color-accent-2': '#00ffff',
      '--color-surface': 'rgba(255,0,255,0.06)',
      '--color-border': 'rgba(255,0,255,0.15)',
      '--color-text': '#ffddff',
      '--glow-color': '#ff00ff',
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    unlockGames: 5,
    vars: {
      '--color-bg-1': '#1a1030',
      '--color-bg-2': '#0a0818',
      '--color-accent-1': '#c0a060',
      '--color-accent-2': '#8060e0',
      '--color-surface': 'rgba(192,160,96,0.08)',
      '--color-border': 'rgba(192,160,96,0.18)',
      '--color-text': '#f0e8cc',
      '--glow-color': '#c0a060',
    },
  },
  {
    id: 'glass',
    name: 'Glass',
    unlockGames: 10,
    vars: {
      '--color-bg-1': '#1e2a3a',
      '--color-bg-2': '#0a1020',
      '--color-accent-1': '#ffffff',
      '--color-accent-2': '#c0e0ff',
      '--color-surface': 'rgba(255,255,255,0.12)',
      '--color-border': 'rgba(255,255,255,0.25)',
      '--color-text': '#ffffff',
      '--glow-color': '#c0e0ff',
    },
  },
  {
    id: 'cyber',
    name: 'Cyber',
    unlockGames: 15,
    vars: {
      '--color-bg-1': '#1a0a00',
      '--color-bg-2': '#0a0500',
      '--color-accent-1': '#ff6600',
      '--color-accent-2': '#00ffaa',
      '--color-surface': 'rgba(255,102,0,0.06)',
      '--color-border': 'rgba(255,102,0,0.18)',
      '--color-text': '#ffe8cc',
      '--glow-color': '#ff6600',
    },
  },
  {
    id: 'nature',
    name: 'Nature',
    unlockGames: 20,
    vars: {
      '--color-bg-1': '#0a1a06',
      '--color-bg-2': '#050e03',
      '--color-accent-1': '#44cc44',
      '--color-accent-2': '#88dd00',
      '--color-surface': 'rgba(68,204,68,0.07)',
      '--color-border': 'rgba(68,204,68,0.16)',
      '--color-text': '#ddffd0',
      '--glow-color': '#44cc44',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    unlockGames: 25,
    vars: {
      '--color-bg-1': '#1a1a1a',
      '--color-bg-2': '#0a0a0a',
      '--color-accent-1': '#cccccc',
      '--color-accent-2': '#888888',
      '--color-surface': 'rgba(255,255,255,0.05)',
      '--color-border': 'rgba(255,255,255,0.10)',
      '--color-text': '#e8e8e8',
      '--glow-color': '#aaaaaa',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    unlockGames: 50,
    vars: {
      '--color-bg-1': '#000820',
      '--color-bg-2': '#000510',
      '--color-accent-1': '#4466ff',
      '--color-accent-2': '#8844ff',
      '--color-surface': 'rgba(68,102,255,0.07)',
      '--color-border': 'rgba(68,102,255,0.18)',
      '--color-text': '#ccd8ff',
      '--glow-color': '#4466ff',
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    unlockGames: 75,
    vars: {
      '--color-bg-1': '#1a0f00',
      '--color-bg-2': '#0a0700',
      '--color-accent-1': '#ff8800',
      '--color-accent-2': '#ffdd00',
      '--color-surface': 'rgba(255,136,0,0.07)',
      '--color-border': 'rgba(255,136,0,0.18)',
      '--color-text': '#fff0cc',
      '--glow-color': '#ff8800',
    },
  },
  {
    id: 'future',
    name: 'Future',
    unlockGames: 100,
    vars: {
      '--color-bg-1': '#001a1a',
      '--color-bg-2': '#000d0d',
      '--color-accent-1': '#00ffff',
      '--color-accent-2': '#ff00aa',
      '--color-surface': 'rgba(0,255,255,0.06)',
      '--color-border': 'rgba(0,255,255,0.15)',
      '--color-text': '#ccffff',
      '--glow-color': '#00ffff',
    },
  },
];

const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t]));

/**
 * Apply a theme by setting CSS custom properties on :root.
 * Falls back to 'classic' if themeName is unknown.
 * @param {string} themeName
 */
function apply(themeName) {
  const theme = THEME_MAP[themeName] || THEME_MAP['classic'];
  if (!THEME_MAP[themeName]) {
    console.warn('[Theme] Unknown theme, falling back to classic:', themeName);
  }
  const root = document.documentElement;
  for (const [prop, val] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, val);
  }
  // Store current theme
  Storage.set('theme', theme.id);
}

/** @returns {string} current theme id */
function getCurrent() {
  return Storage.get('theme') || 'classic';
}

/** @returns {Array} all theme definitions */
function getAll() {
  return THEMES;
}

/**
 * @param {string} themeName
 * @returns {boolean}
 */
function isUnlocked(themeName) {
  const unlocked = Storage.get('unlockedThemes');
  return Array.isArray(unlocked) && unlocked.includes(themeName);
}

/**
 * Unlock a theme and persist.
 * @param {string} themeName
 */
function unlock(themeName) {
  const unlocked = Storage.get('unlockedThemes');
  if (!unlocked.includes(themeName)) {
    unlocked.push(themeName);
    Storage.set('unlockedThemes', unlocked);
  }
}

/**
 * Check if a theme should be auto-unlocked based on games played.
 * @param {number} gamesPlayed
 */
function checkUnlocks(gamesPlayed) {
  THEMES.forEach(t => {
    if (t.unlockGames <= gamesPlayed && !isUnlocked(t.id)) {
      unlock(t.id);
    }
  });
}

export const Theme = { apply, getCurrent, getAll, isUnlocked, unlock, checkUnlocks, REQUIRED_VARS };
