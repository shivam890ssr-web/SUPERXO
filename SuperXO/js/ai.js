/**
 * ai.js — AI with minimax for Classic and Ultimate Tic-Tac-Toe.
 * Enhanced with Strategy Engine for adaptive difficulty
 */

import { createStrategyEngine, DIFFICULTY_PROFILES } from './strategyEngine.js';

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

// Create strategy engines (reused across calls for performance)
let classicEngine = null;
let ultimateEngine = null;

try {
  classicEngine = createStrategyEngine('classic');
  ultimateEngine = createStrategyEngine('ultimate');
  console.log('[AI] Strategy engines initialized successfully');
} catch (error) {
  console.error('[AI] Failed to initialize strategy engines:', error);
}

/**
 * Check if a player has won.
 * @param {Array} board
 * @param {string} player — 'X' or 'O'
 * @returns {boolean}
 */
function hasWon(board, player) {
  return WIN_PATTERNS.some(([a, b, c]) =>
    board[a] === player && board[b] === player && board[c] === player
  );
}

/** @returns {boolean} board is fully filled */
function isFull(board) {
  return board.every(cell => cell !== null);
}

/**
 * Classic Minimax with alpha-beta pruning
 */
function minimax(board, player, isMaximizing, alpha, beta, depth, maxDepth) {
  const opponent = player === 'X' ? 'O' : 'X';
  
  if (hasWon(board, player)) return 10 - depth;
  if (hasWon(board, opponent)) return depth - 10;
  if (isFull(board) || depth >= maxDepth) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = player;
        const score = minimax(board, player, false, alpha, beta, depth + 1, maxDepth);
        board[i] = null;
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = opponent;
        const score = minimax(board, player, true, alpha, beta, depth + 1, maxDepth);
        board[i] = null;
        best = Math.min(best, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

/**
 * Get best move for Classic Tic-Tac-Toe
 * @param {Array} board
 * @param {string} difficulty — 'beginner'|'easy'|'medium'|'hard'|'expert'|'impossible'|'adaptive'
 * @param {string} player — 'X' or 'O'
 * @param {Object} adaptiveProfile — optional custom profile for adaptive difficulty
 * @returns {number|null} best move index
 */
function getBestMove(board, difficulty, player, adaptiveProfile = null) {
  // Try to use strategy engine if available
  if (classicEngine) {
    try {
      const profile = adaptiveProfile || difficulty;
      const result = classicEngine.getBestMove(board, player, profile);
      return result.move;
    } catch (error) {
      console.warn('[AI] Strategy engine error, falling back to basic AI:', error);
    }
  }

  // Fallback to basic AI if strategy engine unavailable
  const available = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) available.push(i);
  }
  if (available.length === 0) return null;

  // Difficulty settings for fallback
  let randomChance = 0;
  let searchDepth = 9;
  
  switch (difficulty) {
    case 'beginner':
      randomChance = 0.9;
      searchDepth = 1;
      break;
    case 'easy':
      randomChance = 0.7;
      searchDepth = 2;
      break;
    case 'medium':
      randomChance = 0.4;
      searchDepth = 4;
      break;
    case 'hard':
      randomChance = 0.2;
      searchDepth = 6;
      break;
    case 'expert':
      randomChance = 0.05;
      searchDepth = 8;
      break;
    case 'impossible':
    case 'adaptive':
      randomChance = 0;
      searchDepth = 9;
      break;
    default:
      randomChance = 0.4;
      searchDepth = 4;
  }

  // Random move chance
  if (Math.random() < randomChance) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Find best move using minimax
  let bestScore = -Infinity;
  let bestMove = available[0];

  for (const move of available) {
    board[move] = player;
    const score = minimax(board, player, false, -Infinity, Infinity, 0, searchDepth);
    board[move] = null;
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Get best move for Ultimate Tic-Tac-Toe
 * @param {Object} state — { boards, boardWinners, globalBoard, activeBoard }
 * @param {string} player
 * @param {string} difficulty
 * @param {Object} adaptiveProfile — optional custom profile for adaptive difficulty
 * @returns {{ boardIndex: number, cellIndex: number }|null}
 */
function getUltimateBestMove(state, player, difficulty = 'medium', adaptiveProfile = null) {
  // Try to use strategy engine if available
  if (ultimateEngine) {
    try {
      const profile = adaptiveProfile || difficulty;
      const result = ultimateEngine.getBestMove(state, player, profile);
      if (result.move) {
        return { boardIndex: result.move.b, cellIndex: result.move.c };
      }
    } catch (error) {
      console.warn('[AI] Ultimate strategy engine error, falling back to basic AI:', error);
    }
  }

  // Fallback to basic AI
  const { boards, boardWinners, activeBoard } = state;
  
  // Determine which boards are playable
  let playableBoards = [];
  if (activeBoard !== null && boardWinners[activeBoard] === null) {
    playableBoards = [activeBoard];
  } else {
    playableBoards = boardWinners
      .map((winner, idx) => (winner === null ? idx : null))
      .filter(idx => idx !== null);
  }

  if (playableBoards.length === 0) return null;

  // Collect all available moves
  const availableMoves = [];
  for (const boardIdx of playableBoards) {
    for (let cellIdx = 0; cellIdx < 9; cellIdx++) {
      if (boards[boardIdx][cellIdx] === null) {
        availableMoves.push({ boardIndex: boardIdx, cellIndex: cellIdx });
      }
    }
  }

  if (availableMoves.length === 0) return null;

  // Difficulty-based strategy
  let randomChance = 0;
  switch (difficulty) {
    case 'beginner':
      randomChance = 0.9;
      break;
    case 'easy':
      randomChance = 0.7;
      break;
    case 'medium':
      randomChance = 0.4;
      break;
    case 'hard':
      randomChance = 0.2;
      break;
    case 'expert':
      randomChance = 0.05;
      break;
    case 'impossible':
    case 'adaptive':
      randomChance = 0;
      break;
    default:
      randomChance = 0.4;
  }

  if (Math.random() < randomChance) {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // Strategic move selection
  // Priority 1: Win a small board
  for (const move of availableMoves) {
    const testBoard = [...boards[move.boardIndex]];
    testBoard[move.cellIndex] = player;
    if (hasWon(testBoard, player)) {
      return move;
    }
  }

  // Priority 2: Block opponent from winning a small board
  const opponent = player === 'X' ? 'O' : 'X';
  for (const move of availableMoves) {
    const testBoard = [...boards[move.boardIndex]];
    testBoard[move.cellIndex] = opponent;
    if (hasWon(testBoard, opponent)) {
      return move;
    }
  }

  // Priority 3: Center moves on playable boards
  const centerMoves = availableMoves.filter(m => m.cellIndex === 4);
  if (centerMoves.length > 0 && Math.random() < 0.7) {
    return centerMoves[Math.floor(Math.random() * centerMoves.length)];
  }

  // Priority 4: Corner moves
  const corners = [0, 2, 6, 8];
  const cornerMoves = availableMoves.filter(m => corners.includes(m.cellIndex));
  if (cornerMoves.length > 0 && Math.random() < 0.6) {
    return cornerMoves[Math.floor(Math.random() * cornerMoves.length)];
  }

  // Fallback: random available move
  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

export const AI = {
  getBestMove,
  getUltimateBestMove,
  hasWon,
  isFull,
  WIN_PATTERNS,
  DIFFICULTY_PROFILES,
  classicEngine,
  ultimateEngine,
};
