/**
 * theme.js — CSS custom-property theming.
 * Themes are unlocked by purchasing with coins.
 * Classic and Neon are free by default.
 */
import { Storage } from './storage.js';
import { ThemeMusic } from './themeMusic.js';

const THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    coinCost: 0,       // free
    description: 'The original dark blue design',
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
    coinCost: 0,       // free
    description: 'Electric magenta & cyan glow',
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
    coinCost: 80,
    description: 'Gold & deep purple royalty',
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
    coinCost: 120,
    description: 'Frosted white minimalism',
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
    coinCost: 150,
    description: 'Orange & teal futuristic grid',
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
    coinCost: 150,
    description: 'Forest greens and earthy tones',
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
    coinCost: 200,
    description: 'Clean greyscale — no distractions',
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
    coinCost: 250,
    description: 'Deep indigo & violet night sky',
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
    coinCost: 300,
    description: 'Amber & yellow retro arcade',
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
    coinCost: 400,
    description: 'Cyan & hot pink sci-fi vibes',
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
  {
    id: 'hogwarts',
    name: 'Hogwarts',
    coinCost: 500,
    description: '✨ A magical Wizarding World edition',
    vars: {
      /* Deep castle darkness — stone walls at night */
      '--color-bg-1': '#1a1008',
      '--color-bg-2': '#0a0804',
      /* Antique gold wand glow as primary accent */
      '--color-accent-1': '#c8971a',
      /* Magical crimson/scarlet as secondary (Gryffindor) */
      '--color-accent-2': '#c0392b',
      /* Parchment-tinted surfaces */
      '--color-surface': 'rgba(200,151,26,0.07)',
      '--color-border': 'rgba(200,151,26,0.20)',
      /* Aged parchment text */
      '--color-text': '#f5e6c8',
      /* Golden candlelight glow */
      '--glow-color': '#d4a017',
    },
  },
];

const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t]));

/**
 * Apply a theme by setting CSS custom properties on :root.
 * Also toggles special body classes for themes that need extra CSS,
 * and starts/stops theme-specific music.
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
  // Remove all special theme classes, then add the active one
  document.body.classList.remove('theme-hogwarts');
  if (theme.id === 'hogwarts') {
    document.body.classList.add('theme-hogwarts');
  }
  // Start/stop theme-specific music
  ThemeMusic.playForTheme(theme.id);
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
 * Check if a theme is unlocked (owned).
 * @param {string} themeId
 * @returns {boolean}
 */
function isUnlocked(themeId) {
  const unlocked = Storage.get('unlockedThemes');
  return Array.isArray(unlocked) && unlocked.includes(themeId);
}

/**
 * Mark a theme as unlocked and persist.
 * Does NOT deduct coins — caller handles that.
 * @param {string} themeId
 */
function unlock(themeId) {
  const unlocked = Storage.get('unlockedThemes');
  if (!unlocked.includes(themeId)) {
    unlocked.push(themeId);
    Storage.set('unlockedThemes', unlocked);
  }
}

/**
 * Purchase a theme with coins.
 * @param {string} themeId
 * @returns {{ success: boolean, reason?: string }}
 */
function purchase(themeId) {
  const theme = THEME_MAP[themeId];
  if (!theme) return { success: false, reason: 'Unknown theme' };
  if (isUnlocked(themeId)) return { success: false, reason: 'Already owned' };

  const coins = Storage.get('coins');
  if (coins < theme.coinCost) {
    return { success: false, reason: `Need ${theme.coinCost} 🪙 — you have ${coins}` };
  }

  Storage.set('coins', coins - theme.coinCost);
  unlock(themeId);
  return { success: true };
}

/**
 * Legacy: kept so existing calls to checkUnlocks don't break.
 * Now a no-op since unlocks are purely coin-based.
 */
function checkUnlocks() {
  // Themes are now coin-purchased only.
  // Classic and Neon are free and set in storage defaults.
}

export const Theme = { apply, getCurrent, getAll, isUnlocked, unlock, purchase, checkUnlocks, THEMES, THEME_MAP };
