/**
 * replay.js — Step-by-step replay of completed games.
 * Reconstructs board state without mutating live game state.
 */

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

let _moveHistory = [];
let _mode = 'classic'; // 'classic' | 'ultimate'
let _currentStep = 0;

/**
 * Load a move history for replay.
 * @param {Array} moveHistory
 * @param {'classic'|'ultimate'} mode
 */
function load(moveHistory, mode) {
  _moveHistory = moveHistory || [];
  _mode = mode || 'classic';
  _currentStep = 0;
}

/** @returns {number} current step index */
function getCurrentStepIndex() { return _currentStep; }

/** @returns {number} total moves */
function getTotalSteps() { return _moveHistory.length; }

/** Step forward one move. */
function stepForward() {
  if (_currentStep < _moveHistory.length) _currentStep++;
}

/** Step back one move. */
function stepBack() {
  if (_currentStep > 0) _currentStep--;
}

/** Reset to start. */
function reset() {
  _currentStep = 0;
}

/**
 * Reconstruct Classic board state at the current step.
 * @returns {{ board: Array, player: string|null, moveIdx: number, step: number, total: number }}
 */
function getCurrentStep() {
  const board = Array(9).fill(null);
  for (let i = 0; i < _currentStep; i++) {
    const move = _moveHistory[i];
    if (_mode === 'classic') {
      board[move.index] = move.player;
    }
  }

  // Determine winner at this step
  let winner = null;
  let winPattern = null;
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      winner = board[a];
      winPattern = [a, b, c];
      break;
    }
  }

  const lastMove = _currentStep > 0 ? _moveHistory[_currentStep - 1] : null;

  return {
    step: _currentStep,
    total: _moveHistory.length,
    board,
    player: lastMove ? lastMove.player : null,
    moveIdx: _currentStep - 1,
    winner,
    winPattern,
  };
}

/**
 * Reconstruct Ultimate game state at the current step.
 * @returns {{ boards: Array, boardWinners: Array, step: number, total: number, player: string|null }}
 */
function getCurrentUltimateStep() {
  const boards = Array(9).fill(null).map(() => Array(9).fill(null));
  const boardWinners = Array(9).fill(null);

  for (let i = 0; i < _currentStep; i++) {
    const move = _moveHistory[i];
    boards[move.localBoard][move.cell] = move.player;
    // Check local winner
    if (!boardWinners[move.localBoard]) {
      const lb = boards[move.localBoard];
      for (const [a, b, c] of WIN_PATTERNS) {
        if (lb[a] && lb[a] === lb[b] && lb[b] === lb[c]) {
          boardWinners[move.localBoard] = lb[a];
          break;
        }
      }
      if (!boardWinners[move.localBoard] && lb.every(v => v !== null)) {
        boardWinners[move.localBoard] = 'draw';
      }
    }
  }

  const lastMove = _currentStep > 0 ? _moveHistory[_currentStep - 1] : null;
  return {
    step: _currentStep,
    total: _moveHistory.length,
    boards,
    boardWinners,
    player: lastMove ? lastMove.player : null,
  };
}

export const Replay = { load, stepForward, stepBack, reset, getCurrentStep, getCurrentUltimateStep, getTotalSteps, getCurrentStepIndex };
