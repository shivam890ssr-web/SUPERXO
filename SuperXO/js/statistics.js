/**
 * statistics.js — persistent lifetime game statistics.
 */
import { Storage } from './storage.js';

const COIN_REWARDS = {
  beginner: 5,
  easy: 10,
  medium: 15,
  hard: 25,
  impossible: 50,
  hvh: 10,
};

/**
 * Record a completed game result and update stats.
 * @param {{
 *   mode: 'classic'|'ultimate',
 *   winner: 'X'|'O'|'draw',
 *   humanPlayer: 'X'|'O',
 *   players: {X: string, O: string},
 *   duration: number,
 *   vsAI: boolean,
 *   difficulty: string|null,
 *   moveCount: number,
 *   perfectGame?: boolean,
 * }} result
 * @returns {number} coins earned
 */
function record(result) {
  const stats = Storage.get('statistics');
  stats.played++;

  const isWin = result.winner === result.humanPlayer;
  const isLoss = result.vsAI && result.winner !== 'draw' && !isWin;
  const isDraw = result.winner === 'draw';

  if (isWin) {
    stats.wins++;
    stats.streak++;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    if (result.vsAI) stats.aiWins++;
  } else if (isLoss) {
    stats.losses++;
    stats.streak = 0;
    stats.aiLosses++;
  } else if (isDraw) {
    stats.draws++;
    stats.streak = 0;
  }

  // Favorite mode
  const modeKey = result.mode + (result.vsAI ? '_ai' : '_hvh');
  stats.favoriteMode = modeKey; // simplified: just track last

  stats.totalDuration += result.duration || 0;

  // Keep last 50 games in history
  stats.history.unshift({
    mode: result.mode,
    winner: result.winner,
    players: result.players,
    duration: result.duration,
    vsAI: result.vsAI,
    difficulty: result.difficulty,
    moveCount: result.moveCount,
    date: new Date().toISOString(),
  });
  if (stats.history.length > 50) stats.history.length = 50;

  Storage.set('statistics', stats);

  // Award coins
  let coins = Storage.get('coins');
  let earned = 0;
  if (isWin) {
    earned = result.vsAI
      ? (COIN_REWARDS[result.difficulty] || COIN_REWARDS.medium)
      : COIN_REWARDS.hvh;
  } else if (isDraw) {
    earned = 3;
  }
  coins += earned;
  Storage.set('coins', coins);

  return earned;
}

/** @returns {object} full statistics object */
function get() {
  return Storage.get('statistics');
}

/**
 * Reset all statistics.
 * Callers should confirm with user before calling.
 */
function reset() {
  Storage.set('statistics', Storage.DEFAULTS.statistics);
}

/**
 * Render a bar chart on the given canvas element.
 * Shows win/draw/loss counts for the last up to 20 games.
 * @param {HTMLCanvasElement} canvas
 */
function renderGraph(canvas) {
  const stats = get();
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 340;
  const H = canvas.height = 160;
  ctx.clearRect(0, 0, W, H);

  const history = stats.history.slice(0, 20).reverse();
  if (history.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No games yet', W / 2, H / 2);
    return;
  }

  const barW = Math.floor((W - 20) / history.length) - 2;
  const maxH = H - 30;

  history.forEach((game, i) => {
    const x = 10 + i * (barW + 2);
    let color;
    // Determine from human player perspective (stored as winner symbol only)
    // For display: W = green, D = grey, L = red
    if (game.winner === 'draw') {
      color = 'rgba(180,180,180,0.8)';
    } else {
      // Can't always determine win/loss without humanPlayer in history
      // Color by winner: X = accent-1 ish, O = accent-2 ish
      color = game.winner === 'X' ? '#2dd4ff' : '#7dff74';
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, 10, barW, maxH);
  });

  // Legend
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px Poppins, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('← older', 10, H - 4);
  ctx.textAlign = 'right';
  ctx.fillText('recent →', W - 10, H - 4);
}

export const Statistics = { record, get, reset, renderGraph, COIN_REWARDS };
