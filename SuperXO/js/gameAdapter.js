/**
 * gameAdapter.js — Game Adapter architecture for reusable AI framework.
 * Provides standardized interface for any turn-based game.
 */

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

/**
 * Classic Tic-Tac-Toe Game Adapter
 */
export class ClassicAdapter {
  /**
   * Get all valid moves for current board state
   * @param {Array} board - array[9] of 'X'|'O'|null
   * @returns {Array<number>} array of valid cell indices
   */
  validMoves(board) {
    return board.reduce((acc, cell, idx) => {
      if (cell === null) acc.push(idx);
      return acc;
    }, []);
  }

  /**
   * Apply a move to the board (non-mutating)
   * @param {Array} board
   * @param {number} move - cell index
   * @param {string} player - 'X' or 'O'
   * @returns {Array} new board state
   */
  applyMove(board, move, player) {
    const newBoard = [...board];
    newBoard[move] = player;
    return newBoard;
  }

  /**
   * Check if game is terminal (won or drawn)
   * @param {Array} board
   * @returns {boolean}
   */
  isTerminal(board) {
    return this.getWinner(board) !== null || board.every(c => c !== null);
  }

  /**
   * Get winner if any
   * @param {Array} board
   * @returns {'X'|'O'|'draw'|null}
   */
  getWinner(board) {
    for (const [a, b, c] of WIN_PATTERNS) {
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
        return board[a];
      }
    }
    if (board.every(c => c !== null)) return 'draw';
    return null;
  }

  /**
   * Evaluate board from player's perspective
   * @param {Array} board
   * @param {string} player - 'X' or 'O'
   * @returns {number} score (positive = good for player)
   */
  evaluate(board, player) {
    const winner = this.getWinner(board);
    if (winner === player) return 100;
    if (winner && winner !== 'draw') return -100;
    
    // Heuristic evaluation for non-terminal positions
    const opponent = player === 'X' ? 'O' : 'X';
    let score = 0;

    // Center control bonus
    if (board[4] === player) score += 10;
    else if (board[4] === opponent) score -= 10;

    // Corners bonus
    const corners = [0, 2, 6, 8];
    corners.forEach(idx => {
      if (board[idx] === player) score += 5;
      else if (board[idx] === opponent) score -= 5;
    });

    // Threat evaluation (two-in-a-row with empty third)
    for (const [a, b, c] of WIN_PATTERNS) {
      const line = [board[a], board[b], board[c]];
      const playerCount = line.filter(x => x === player).length;
      const opponentCount = line.filter(x => x === opponent).length;
      const emptyCount = line.filter(x => x === null).length;

      if (playerCount === 2 && emptyCount === 1) score += 25; // player threat
      if (opponentCount === 2 && emptyCount === 1) score -= 30; // opponent threat (more urgent)
    }

    return score;
  }

  /**
   * Detect immediate winning moves
   * @param {Array} board
   * @param {string} player
   * @returns {number|null} winning move index or null
   */
  findWinningMove(board, player) {
    for (const move of this.validMoves(board)) {
      const testBoard = this.applyMove(board, move, player);
      if (this.getWinner(testBoard) === player) return move;
    }
    return null;
  }

  /**
   * Detect immediate blocking moves (opponent can win next turn)
   * @param {Array} board
   * @param {string} player
   * @returns {number|null} blocking move index or null
   */
  findBlockingMove(board, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    return this.findWinningMove(board, opponent);
  }

  /**
   * Detect fork opportunities (multiple winning threats)
   * @param {Array} board
   * @param {string} player
   * @returns {Array<number>} moves that create forks
   */
  findForkMoves(board, player) {
    const forks = [];
    for (const move of this.validMoves(board)) {
      const testBoard = this.applyMove(board, move, player);
      // Count how many winning moves exist after this move
      let winningMoves = 0;
      for (const nextMove of this.validMoves(testBoard)) {
        const nextBoard = this.applyMove(testBoard, nextMove, player);
        if (this.getWinner(nextBoard) === player) winningMoves++;
      }
      if (winningMoves >= 2) forks.push(move);
    }
    return forks;
  }

  /**
   * Detect fork blocking opportunities
   * @param {Array} board
   * @param {string} player
   * @returns {Array<number>} moves that block opponent forks
   */
  findForkBlockMoves(board, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    return this.findForkMoves(board, opponent);
  }
}

/**
 * Ultimate Tic-Tac-Toe Game Adapter
 */
export class UltimateAdapter {
  constructor() {
    this.classicAdapter = new ClassicAdapter();
  }

  /**
   * Get all valid moves for current Ultimate board state
   * @param {Object} state - {boards: Array[9][9], boardWinners: Array[9], activeBoard: number|null}
   * @returns {Array<{b: number, c: number}>} valid moves
   */
  validMoves(state) {
    const moves = [];
    const { boards, boardWinners, activeBoard } = state;

    if (activeBoard !== null) {
      // Must play in active board
      if (boardWinners[activeBoard] === null) {
        for (let c = 0; c < 9; c++) {
          if (boards[activeBoard][c] === null) {
            moves.push({ b: activeBoard, c });
          }
        }
      }
    } else {
      // Free choice - any non-won board
      for (let b = 0; b < 9; b++) {
        if (boardWinners[b] === null) {
          for (let c = 0; c < 9; c++) {
            if (boards[b][c] === null) {
              moves.push({ b, c });
            }
          }
        }
      }
    }

    return moves;
  }

  /**
   * Apply a move to Ultimate board (non-mutating)
   * @param {Object} state
   * @param {{b: number, c: number}} move
   * @param {string} player
   * @returns {Object} new state
   */
  applyMove(state, move, player) {
    const newBoards = state.boards.map(board => [...board]);
    newBoards[move.b][move.c] = player;

    const newBoardWinners = [...state.boardWinners];
    const newGlobalBoard = [...state.globalBoard];

    // Check if local board is won
    const localResult = this.classicAdapter.getWinner(newBoards[move.b]);
    if (localResult && localResult !== 'draw') {
      newBoardWinners[move.b] = localResult;
      newGlobalBoard[move.b] = localResult;
    } else if (localResult === 'draw') {
      newBoardWinners[move.b] = 'draw';
      newGlobalBoard[move.b] = 'draw';
    }

    // Determine next active board
    let newActiveBoard = move.c;
    if (newBoardWinners[newActiveBoard] !== null) {
      newActiveBoard = null; // free choice
    }

    return {
      boards: newBoards,
      boardWinners: newBoardWinners,
      globalBoard: newGlobalBoard,
      activeBoard: newActiveBoard,
    };
  }

  /**
   * Check if Ultimate game is terminal
   * @param {Object} state
   * @returns {boolean}
   */
  isTerminal(state) {
    return this.getWinner(state) !== null;
  }

  /**
   * Get Ultimate game winner
   * @param {Object} state
   * @returns {'X'|'O'|'draw'|null}
   */
  getWinner(state) {
    const { boardWinners, globalBoard } = state;
    
    // Check for global win
    const globalWinner = this.classicAdapter.getWinner(
      globalBoard.map(w => w === 'draw' ? null : w)
    );
    
    if (globalWinner && globalWinner !== 'draw') return globalWinner;
    
    // Check for draw (all boards resolved)
    if (boardWinners.every(w => w !== null)) {
      return 'draw';
    }
    
    return null;
  }

  /**
   * Evaluate Ultimate board from player's perspective
   * @param {Object} state
   * @param {string} player
   * @returns {number}
   */
  evaluate(state, player) {
    const winner = this.getWinner(state);
    if (winner === player) return 10000;
    if (winner && winner !== 'draw') return -10000;

    const opponent = player === 'X' ? 'O' : 'X';
    let score = 0;

    // Evaluate global board position
    const globalEval = this.classicAdapter.evaluate(
      state.globalBoard.map(w => w === 'draw' ? null : w),
      player
    );
    score += globalEval * 10; // Global position is 10x more important

    // Evaluate each active local board
    for (let b = 0; b < 9; b++) {
      if (state.boardWinners[b] === null) {
        const localEval = this.classicAdapter.evaluate(state.boards[b], player);
        score += localEval;
      }
    }

    // Strategic board control (center and corners of global board)
    if (state.boardWinners[4] === player) score += 50;
    else if (state.boardWinners[4] === opponent) score -= 50;

    const cornerBoards = [0, 2, 6, 8];
    cornerBoards.forEach(b => {
      if (state.boardWinners[b] === player) score += 30;
      else if (state.boardWinners[b] === opponent) score -= 30;
    });

    return score;
  }

  /**
   * Find immediate winning move on global board
   * @param {Object} state
   * @param {string} player
   * @returns {{b: number, c: number}|null}
   */
  findWinningMove(state, player) {
    for (const move of this.validMoves(state)) {
      const newState = this.applyMove(state, move, player);
      if (this.getWinner(newState) === player) return move;
    }
    return null;
  }

  /**
   * Find move that blocks opponent's global win
   * @param {Object} state
   * @param {string} player
   * @returns {{b: number, c: number}|null}
   */
  findBlockingMove(state, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    return this.findWinningMove(state, opponent);
  }
}

export const GameAdapter = {
  Classic: ClassicAdapter,
  Ultimate: UltimateAdapter,
};
