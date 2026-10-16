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

/**
 * Analyze move quality for Classic Tic-Tac-Toe
 * @param {Array} boardState - board before move
 * @param {number} move - cell index of the move
 * @param {string} player - 'X' or 'O'
 * @returns {Object} analysis with quality, evalLoss, tactics, etc.
 */
function analyzeMoveQuality(boardState, move, player) {
  const board = [...boardState];
  const opponent = player === 'X' ? 'O' : 'X';
  
  // Get score of the played move
  board[move] = player;
  const moveScore = minimax(board, player, false, -Infinity, Infinity, 0, 9);
  board[move] = null;
  
  // Find the best possible move
  let bestScore = -Infinity;
  let bestMove = null;
  const available = [];
  
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      available.push(i);
      board[i] = player;
      const score = minimax(board, player, false, -Infinity, Infinity, 0, 9);
      board[i] = null;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  
  // Calculate evaluation loss
  const evalLoss = bestScore - moveScore;
  const wasBest = move === bestMove;
  
  // Determine move quality based on eval loss
  let quality;
  if (wasBest || evalLoss === 0) {
    quality = 'excellent';
  } else if (evalLoss <= 1) {
    quality = 'good';
  } else if (evalLoss <= 3) {
    quality = 'acceptable';
  } else if (evalLoss <= 5) {
    quality = 'inaccurate';
  } else if (evalLoss <= 8) {
    quality = 'mistake';
  } else {
    quality = 'blunder';
  }
  
  // Tactical analysis
  const tactics = analyzeTactics(board, move, player);
  
  // Adjust quality based on tactics
  if (tactics.winningMove !== null && wasBest) {
    quality = 'excellent';
  } else if (tactics.winningMove !== null && !wasBest) {
    quality = 'blunder'; // Missed winning move
  }
  
  if (tactics.blockingMove !== null && wasBest) {
    quality = Math.max(quality, 'good');
  } else if (tactics.blockingMove !== null && !wasBest) {
    quality = 'mistake'; // Missed blocking move
  }
  
  return {
    quality,
    evalLoss,
    moveScore,
    bestScore,
    bestMove,
    wasBest,
    tactics,
  };
}

/**
 * Analyze tactical patterns in Classic Tic-Tac-Toe
 * @param {Array} board - current board state
 * @param {number} move - cell index (optional, for move-specific analysis)
 * @param {string} player - 'X' or 'O'
 * @returns {Object} tactical information
 */
function analyzeTactics(board, move, player) {
  const opponent = player === 'X' ? 'O' : 'X';
  const tactics = {
    winningMove: null,
    blockingMove: null,
    forkMoves: [],
    forkBlockMoves: [],
  };
  
  // Check for winning move
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = player;
      if (hasWon(board, player)) {
        tactics.winningMove = i;
      }
      board[i] = null;
      if (tactics.winningMove !== null) break;
    }
  }
  
  // Check for blocking move (opponent's winning move)
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = opponent;
      if (hasWon(board, opponent)) {
        tactics.blockingMove = i;
      }
      board[i] = null;
      if (tactics.blockingMove !== null) break;
    }
  }
  
  // Check for fork moves (creating multiple win threats)
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = player;
      const winThreats = countWinThreats(board, player);
      board[i] = null;
      
      if (winThreats >= 2) {
        tactics.forkMoves.push(i);
      }
    }
  }
  
  // Check for fork blocking moves
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = opponent;
      const winThreats = countWinThreats(board, opponent);
      board[i] = null;
      
      if (winThreats >= 2) {
        tactics.forkBlockMoves.push(i);
      }
    }
  }
  
  return tactics;
}

/**
 * Count how many winning threats (two-in-a-row) a player has
 * @param {Array} board
 * @param {string} player
 * @returns {number}
 */
function countWinThreats(board, player) {
  let threats = 0;
  
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    const cells = [board[a], board[b], board[c]];
    const playerCount = cells.filter(cell => cell === player).length;
    const emptyCount = cells.filter(cell => cell === null).length;
    
    // Two of this player's marks and one empty = threat
    if (playerCount === 2 && emptyCount === 1) {
      threats++;
    }
  }
  
  return threats;
}

/**
 * Analyze move quality for Ultimate Tic-Tac-Toe
 * @param {Object} state - { boards, boardWinners, globalBoard, activeBoard }
 * @param {Object} move - { b: boardIndex, c: cellIndex }
 * @param {string} player - 'X' or 'O'
 * @returns {Object} analysis with quality, evalLoss, tactics, etc.
 */
function analyzeUltimateMoveQuality(state, move, player) {
  const { boards, boardWinners, activeBoard } = state;
  const opponent = player === 'X' ? 'O' : 'X';
  
  // Simplified evaluation for Ultimate (more complex than Classic)
  // Focus on tactical patterns rather than full minimax
  
  const tactics = analyzeUltimateTactics(state, move, player);
  
  // Determine quality based on tactical significance
  let quality = 'acceptable';
  let evalLoss = 3; // Default medium loss
  
  // Excellent moves
  if (tactics.winsLocalBoard) {
    quality = 'excellent';
    evalLoss = 0;
  } else if (tactics.blocksLocalWin) {
    quality = 'good';
    evalLoss = 1;
  } else if (tactics.createsLocalFork) {
    quality = 'good';
    evalLoss = 1;
  } else if (tactics.controlsCenter) {
    quality = 'good';
    evalLoss = 2;
  }
  
  // Poor moves
  if (tactics.missedLocalWin) {
    quality = 'blunder';
    evalLoss = 10;
  } else if (tactics.missedBlock) {
    quality = 'mistake';
    evalLoss = 6;
  } else if (tactics.sendsToWonBoard) {
    quality = 'mistake';
    evalLoss = 5;
  }
  
  return {
    quality,
    evalLoss,
    moveScore: -evalLoss, // Approximate
    bestScore: 0,
    bestMove: null, // Too expensive to calculate for Ultimate
    wasBest: quality === 'excellent',
    tactics,
  };
}

/**
 * Analyze tactical patterns in Ultimate Tic-Tac-Toe
 * @param {Object} state
 * @param {Object} move - { b: boardIndex, c: cellIndex }
 * @param {string} player
 * @returns {Object} tactical information
 */
function analyzeUltimateTactics(state, move, player) {
  const { boards, boardWinners } = state;
  const opponent = player === 'X' ? 'O' : 'X';
  const { b: boardIdx, c: cellIdx } = move;
  
  const tactics = {
    winsLocalBoard: false,
    blocksLocalWin: false,
    createsLocalFork: false,
    controlsCenter: false,
    sendsToWonBoard: false,
    missedLocalWin: false,
    missedBlock: false,
  };
  
  // Check if move wins local board
  const testBoard = [...boards[boardIdx]];
  testBoard[cellIdx] = player;
  if (hasWon(testBoard, player)) {
    tactics.winsLocalBoard = true;
  }
  
  // Check if there was a winning move available
  for (let i = 0; i < 9; i++) {
    if (boards[boardIdx][i] === null && i !== cellIdx) {
      const test = [...boards[boardIdx]];
      test[i] = player;
      if (hasWon(test, player)) {
        tactics.missedLocalWin = true;
        break;
      }
    }
  }
  
  // Check if move blocks opponent's local win
  testBoard[cellIdx] = opponent;
  if (hasWon(testBoard, opponent)) {
    tactics.blocksLocalWin = true;
  }
  
  // Check if there was a blocking move available
  for (let i = 0; i < 9; i++) {
    if (boards[boardIdx][i] === null) {
      const test = [...boards[boardIdx]];
      test[i] = opponent;
      if (hasWon(test, opponent) && i !== cellIdx) {
        tactics.missedBlock = true;
        break;
      }
    }
  }
  
  // Check if move controls center
  if (cellIdx === 4) {
    tactics.controlsCenter = true;
  }
  
  // Check if move creates fork in local board
  testBoard[cellIdx] = player;
  const threats = countWinThreats(testBoard, player);
  if (threats >= 2) {
    tactics.createsLocalFork = true;
  }
  
  // Check if move sends opponent to already-won board
  if (boardWinners[cellIdx] !== null) {
    tactics.sendsToWonBoard = true;
  }
  
  return tactics;
}

export const AI = {
  getBestMove,
  getUltimateBestMove,
  analyzeMoveQuality,
  analyzeUltimateMoveQuality,
  hasWon,
  isFull,
  WIN_PATTERNS,
  DIFFICULTY_PROFILES,
  classicEngine,
  ultimateEngine,
};
