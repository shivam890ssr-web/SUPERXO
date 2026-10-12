/**
 * achievements.js — achievement definitions, unlock logic, and coin rewards.
 */
import { Storage } from './storage.js';

const DEFINITIONS = [
  {
    id: 'first_win',
    name: 'First Win',
    description: 'Win your first game',
    coinReward: 50,
    icon: '🥇',
    condition: (stats) => stats.wins >= 1,
    progress: (stats) => Math.min(stats.wins / 1, 1),
  },
  {
    id: 'wins_5',
    name: '5 Wins',
    description: 'Win 5 games',
    coinReward: 100,
    icon: '⭐',
    condition: (stats) => stats.wins >= 5,
    progress: (stats) => Math.min(stats.wins / 5, 1),
  },
  {
    id: 'wins_10',
    name: '10 Wins',
    description: 'Win 10 games',
    coinReward: 150,
    icon: '🌟',
    condition: (stats) => stats.wins >= 10,
    progress: (stats) => Math.min(stats.wins / 10, 1),
  },
  {
    id: 'wins_25',
    name: '25 Wins',
    description: 'Win 25 games',
    coinReward: 200,
    icon: '💫',
    condition: (stats) => stats.wins >= 25,
    progress: (stats) => Math.min(stats.wins / 25, 1),
  },
  {
    id: 'wins_50',
    name: '50 Wins',
    description: 'Win 50 games',
    coinReward: 300,
    icon: '🏅',
    condition: (stats) => stats.wins >= 50,
    progress: (stats) => Math.min(stats.wins / 50, 1),
  },
  {
    id: 'wins_100',
    name: '100 Wins',
    description: 'Win 100 games',
    coinReward: 500,
    icon: '🏆',
    condition: (stats) => stats.wins >= 100,
    progress: (stats) => Math.min(stats.wins / 100, 1),
  },
  {
    id: 'perfect_game',
    name: 'Perfect Game',
    description: 'Win without the opponent scoring in a multi-round match',
    coinReward: 200,
    icon: '💎',
    condition: (stats) => (stats.perfectGames || 0) >= 1,
    progress: (stats) => Math.min((stats.perfectGames || 0), 1),
  },
  {
    id: 'beat_impossible',
    name: 'Beat Impossible AI',
    description: 'Win against the AI on Impossible difficulty',
    coinReward: 500,
    icon: '🤖',
    condition: (stats) => stats.aiWins >= 1 && (stats.beatImpossible || false),
    progress: (stats) => Math.min((stats.beatImpossible ? 1 : 0), 1),
  },
  {
    id: 'marathon',
    name: 'Marathon Player',
    description: 'Play 50 games',
    coinReward: 250,
    icon: '🏃',
    condition: (stats) => stats.played >= 50,
    progress: (stats) => Math.min(stats.played / 50, 1),
  },
  // NEW ACHIEVEMENTS - Adaptive AI & Skill Progression
  {
    id: 'skill_climber',
    name: 'Skill Climber',
    description: 'Reach Intermediate skill level (1100+ rating)',
    coinReward: 150,
    icon: '📈',
    condition: (stats) => (stats.adaptiveRating || 0) >= 1100,
    progress: (stats) => Math.min((stats.adaptiveRating || 1000) / 1100, 1),
  },
  {
    id: 'advanced_player',
    name: 'Advanced Player',
    description: 'Reach Advanced skill level (1400+ rating)',
    coinReward: 300,
    icon: '🎯',
    condition: (stats) => (stats.adaptiveRating || 0) >= 1400,
    progress: (stats) => Math.min((stats.adaptiveRating || 1000) / 1400, 1),
  },
  {
    id: 'expert_status',
    name: 'Expert Status',
    description: 'Reach Expert skill level (1700+ rating)',
    coinReward: 500,
    icon: '🔥',
    condition: (stats) => (stats.adaptiveRating || 0) >= 1700,
    progress: (stats) => Math.min((stats.adaptiveRating || 1000) / 1700, 1),
  },
  {
    id: 'master_mind',
    name: 'Master Mind',
    description: 'Reach Master skill level (2000+ rating)',
    coinReward: 1000,
    icon: '👑',
    condition: (stats) => (stats.adaptiveRating || 0) >= 2000,
    progress: (stats) => Math.min((stats.adaptiveRating || 1000) / 2000, 1),
  },
  {
    id: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 games in a row',
    coinReward: 200,
    icon: '🔥',
    condition: (stats) => stats.bestStreak >= 5,
    progress: (stats) => Math.min(stats.bestStreak / 5, 1),
  },
  {
    id: 'ultimate_master',
    name: 'Ultimate Master',
    description: 'Win 10 Ultimate Tic-Tac-Toe games',
    coinReward: 250,
    icon: '👑',
    condition: (stats) => {
      const ultimateWins = (stats.modeCounts?.ultimate_ai || 0) + (stats.modeCounts?.ultimate_hvh || 0);
      return ultimateWins >= 10;
    },
    progress: (stats) => {
      const ultimateWins = (stats.modeCounts?.ultimate_ai || 0) + (stats.modeCounts?.ultimate_hvh || 0);
      return Math.min(ultimateWins / 10, 1);
    },
  },
  {
    id: 'adaptive_veteran',
    name: 'Adaptive Veteran',
    description: 'Play 20 games with Adaptive AI',
    coinReward: 300,
    icon: '🧠',
    condition: (stats) => (stats.adaptiveGamesPlayed || 0) >= 20,
    progress: (stats) => Math.min((stats.adaptiveGamesPlayed || 0) / 20, 1),
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win after losing 2 games in a best-of-5 match',
    coinReward: 250,
    icon: '💪',
    condition: (stats) => (stats.comebackWins || 0) >= 1,
    progress: (stats) => Math.min((stats.comebackWins || 0), 1),
  },
];

const DEF_MAP = Object.fromEntries(DEFINITIONS.map(d => [d.id, d]));

/**
 * @param {string} id
 * @returns {boolean}
 */
function isUnlocked(id) {
  const unlocked = Storage.get('achievements');
  return !!(unlocked[id]);
}

/**
 * Unlock an achievement: persist, award coins, show toast.
 * @param {string} id
 * @param {Function} [showToast] — optional toast callback(title, message)
 * @returns {number} coins awarded (0 if already unlocked)
 */
function unlock(id, showToast) {
  if (isUnlocked(id)) return 0;
  const def = DEF_MAP[id];
  if (!def) return 0;

  const unlocked = Storage.get('achievements');
  unlocked[id] = { unlockedAt: new Date().toISOString() };
  Storage.set('achievements', unlocked);

  // Award coins
  let coins = Storage.get('coins');
  coins += def.coinReward;
  Storage.set('coins', coins);

  if (typeof showToast === 'function') {
    showToast(`🏆 ${def.icon} ${def.name}`, `+${def.coinReward} 🪙`);
  }

  return def.coinReward;
}

/**
 * Check all achievement conditions against stats; unlock any newly met ones.
 * Idempotent — will not re-unlock already-unlocked achievements.
 * @param {object} stats
 * @param {Function} [showToast]
 * @returns {string[]} array of newly unlocked achievement IDs
 */
function check(stats, showToast) {
  const newlyUnlocked = [];
  for (const def of DEFINITIONS) {
    if (!isUnlocked(def.id) && def.condition(stats)) {
      unlock(def.id, showToast);
      newlyUnlocked.push(def.id);
    }
  }
  return newlyUnlocked;
}

/**
 * Get all achievement definitions with their current unlock status and progress.
 * @returns {Array}
 */
function getAll() {
  const stats = Storage.get('statistics');
  const unlockedMap = Storage.get('achievements');
  return DEFINITIONS.map(def => ({
    ...def,
    unlocked: !!(unlockedMap[def.id]),
    unlockedAt: unlockedMap[def.id]?.unlockedAt || null,
    progressValue: def.progress(stats),
  }));
}

export const Achievements = { check, unlock, isUnlocked, getAll, DEFINITIONS };
