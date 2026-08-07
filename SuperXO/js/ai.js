/**
 * ai.js — Minimax AI engine with Alpha-Beta pruning.
 * Board: array[9] of 'X' | 'O' | null (index 0-8).
 */

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

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
  return board.every(c => c !== null);
}

/**
 * Score from maximizer's perspective.
 * @param {Array} board
 * @param {string} maximizer — 'X' or 'O'
 * @returns {number}
 */
function score(board, maximizer) {
  const minimizer = maximizer === 'X' ? 'O' : 'X';
  if (hasWon(board, maximizer)) return 10;
  if (hasWon(board, minimizer)) return -10;
  return 0;
}

/**
 * Minimax with Alpha-Beta pruning.
 * @param {Array} board
 * @param {boolean} isMaximizing
 * @param {string} maximizer
 * @param {number} alpha
 * @param {number} beta
 * @param {number} depth
 * @param {number} maxDepth
 * @returns {number}
 */
function minimax(board, isMaximizing, maximizer, alpha, beta, depth, maxDepth) {
  const s = score(board, maximizer);
  if (s !== 0) return s - (depth * (s > 0 ? 1 : -1)); // prefer faster wins
  if (isFull(board) || depth >= maxDepth) return 0;

  const minimizer = maximizer === 'X' ? 'O' : 'X';
  const current = isMaximizing ? maximizer : minimizer;
  const empties = board.reduce((acc, v, i) => { if (v === null) acc.push(i); return acc; }, []);

  if (isMaximizing) {
    let best = -Infinity;
    for (const idx of empties) {
      board[idx] = current;
      best = Math.max(best, minimax(board, false, maximizer, alpha, beta, depth + 1, maxDepth));
      board[idx] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of empties) {
      board[idx] = current;
      best = Math.min(best, minimax(board, true, maximizer, alpha, beta, depth + 1, maxDepth));
      board[idx] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Get the best move for the given board and difficulty.
 * @param {Array} board — array[9] of 'X'|'O'|null
 * @param {'beginner'|'easy'|'medium'|'hard'|'impossible'} difficulty
 * @param {string} [player='O'] — the AI player symbol
 * @returns {number|null} index 0-8, or null if board is terminal
 */
function getBestMove(board, difficulty, player = 'O') {
  const empties = board.reduce((acc, v, i) => { if (v === null) acc.push(i); return acc; }, []);
  if (empties.length === 0) return null;
  if (hasWon(board, 'X') || hasWon(board, 'O')) return null;

  // Random move helper
  const randomMove = () => empties[Math.floor(Math.random() * empties.length)];

  // Difficulty settings: { randomChance, maxDepth }
  const config = {
    beginner:   { randomChance: 0.80, maxDepth: 1 },
    easy:       { randomChance: 0.50, maxDepth: 2 },
    medium:     { randomChance: 0.30, maxDepth: 4 },
    hard:       { randomChance: 0.10, maxDepth: 9 },
    impossible: { randomChance: 0.00, maxDepth: 9 },
  }[difficulty] || { randomChance: 0, maxDepth: 9 };

  if (Math.random() < config.randomChance) return randomMove();

  // Minimax
  let bestScore = -Infinity;
  let bestMove = empties[0];
  const boardCopy = [...board];

  for (const idx of empties) {
    boardCopy[idx] = player;
    const s = minimax(boardCopy, false, player, -Infinity, Infinity, 0, config.maxDepth);
    boardCopy[idx] = null;
    if (s > bestScore) {
      bestScore = s;
      bestMove = idx;
    }
  }

  return bestMove;
}

/** Expose win patterns for use by other modules. */
export const AI = { getBestMove, minimax, score, hasWon, isFull, WIN_PATTERNS };
