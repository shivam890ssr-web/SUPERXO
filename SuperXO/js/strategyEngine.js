/**
 * strategyEngine.js — Enhanced Minimax with Alpha-Beta pruning and tactical awareness.
 * Provides configurable difficulty through multiple parameters, not just randomness.
 */

import { ClassicAdapter, UltimateAdapter } from './gameAdapter.js';

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

/**
 * Difficulty configuration profiles
 * Parameters control AI behavior without using excessive randomness
 */
export const DIFFICULTY_PROFILES = {
  beginner: {
    searchDepth: 1,              // Very shallow search
    explorationRate: 0.30,       // 30% chance to pick non-optimal move
    tacticalAwareness: 0.3,      // 30% chance to see immediate threats
    forkDetection: false,        // Cannot detect forks
    strategicThinking: false,    // No strategic evaluation
    mistakeRate: 0.40,           // 40% chance to miss obvious good moves
    defenseWeight: 0.5,          // Weak defense prioritization
    moveOrdering: false,         // No move ordering optimization
  },
  easy: {
    searchDepth: 2,
    explorationRate: 0.20,
    tacticalAwareness: 0.6,
    forkDetection: false,
    strategicThinking: false,
    mistakeRate: 0.25,
    defenseWeight: 0.7,
    moveOrdering: false,
  },
  medium: {
    searchDepth: 3,
    explorationRate: 0.10,
    tacticalAwareness: 0.85,
    forkDetection: true,
    strategicThinking: true,
    mistakeRate: 0.10,
    defenseWeight: 1.0,
    moveOrdering: true,
  },
  hard: {
    searchDepth: 5,
    explorationRate: 0.05,
    tacticalAwareness: 0.95,
    forkDetection: true,
    strategicThinking: true,
    mistakeRate: 0.03,
    defenseWeight: 1.2,
    moveOrdering: true,
  },
  expert: {
    searchDepth: 7,
    explorationRate: 0.02,
    tacticalAwareness: 1.0,
    forkDetection: true,
    strategicThinking: true,
    mistakeRate: 0.01,
    defenseWeight: 1.5,
    moveOrdering: true,
  },
  impossible: {
    searchDepth: 9,
    explorationRate: 0.0,
    tacticalAwareness: 1.0,
    forkDetection: true,
    strategicThinking: true,
    mistakeRate: 0.0,
    defenseWeight: 2.0,
    moveOrdering: true,
  },
  // Adaptive profile - parameters will be set dynamically
  adaptive: {
    searchDepth: 3,
    explorationRate: 0.10,
    tacticalAwareness: 0.85,
    forkDetection: true,
    strategicThinking: true,
    mistakeRate: 0.10,
    defenseWeight: 1.0,
    moveOrdering: true,
  }
};

/**
 * Enhanced Strategy Engine
 */
export class StrategyEngine {
  constructor(adapter) {
    this.adapter = adapter;
    this.nodesEvaluated = 0;
    this.transpositionTable = new Map();
  }

  /**
   * Get best move for given board state and difficulty
   * @param {*} state - board state (format depends on adapter)
   * @param {string} player - 'X' or 'O'
   * @param {string|object} difficulty - difficulty name or custom profile
   * @returns {{move: *, score: number, analysis: object}}
   */
  getBestMove(state, player, difficulty = 'medium') {
    this.nodesEvaluated = 0;
    this.transpositionTable.clear();

    const profile = typeof difficulty === 'string' 
      ? DIFFICULTY_PROFILES[difficulty] 
      : difficulty;

    if (!profile) {
      throw new Error(`Unknown difficulty: ${difficulty}`);
    }

    const validMoves = this.adapter.validMoves(state);
    if (validMoves.length === 0) return { move: null, score: 0, analysis: {} };

    // TACTICAL PHASE: Check for immediate tactical opportunities
    const tactics = this.analyzeTactics(state, player, profile);
    
    // If tactical awareness allows and we found something critical, use it
    if (Math.random() < profile.tacticalAwareness) {
      // Priority 1: Winning move
      if (tactics.winningMove) {
        return {
          move: tactics.winningMove,
          score: 1000,
          analysis: {
            type: 'winning_move',
            nodesEvaluated: this.nodesEvaluated,
            tactics,
          }
        };
      }

      // Priority 2: Block opponent's winning move
      if (tactics.blockingMove && Math.random() > profile.mistakeRate) {
        return {
          move: tactics.blockingMove,
          score: 0,
          analysis: {
            type: 'blocking_move',
            nodesEvaluated: this.nodesEvaluated,
            tactics,
          }
        };
      }

      // Priority 3: Create fork (if detection enabled)
      if (profile.forkDetection && tactics.forkMoves.length > 0 && Math.random() > profile.mistakeRate) {
        const forkMove = tactics.forkMoves[Math.floor(Math.random() * tactics.forkMoves.length)];
        return {
          move: forkMove,
          score: 500,
          analysis: {
            type: 'fork_creation',
            nodesEvaluated: this.nodesEvaluated,
            tactics,
          }
        };
      }

      // Priority 4: Block opponent's fork
      if (profile.forkDetection && tactics.forkBlockMoves.length > 0 && Math.random() > profile.mistakeRate * 2) {
        const blockMove = tactics.forkBlockMoves[Math.floor(Math.random() * tactics.forkBlockMoves.length)];
        return {
          move: blockMove,
          score: 0,
          analysis: {
            type: 'fork_blocking',
            nodesEvaluated: this.nodesEvaluated,
            tactics,
          }
        };
      }
    }

    // STRATEGIC PHASE: Use minimax with configured depth
    const moves = this.orderMoves(state, validMoves, player, profile);
    let bestMove = moves[0];
    let bestScore = -Infinity;
    const moveEvaluations = [];

    for (const move of moves) {
      const newState = this.adapter.applyMove(state, move, player);
      const score = this.minimax(
        newState,
        profile.searchDepth - 1,
        -Infinity,
        Infinity,
        false,
        player,
        profile
      );

      moveEvaluations.push({ move, score });

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // Apply exploration rate - sometimes pick a non-optimal move
    if (profile.explorationRate > 0 && Math.random() < profile.explorationRate) {
      // Pick from top 3 moves or all moves if fewer
      const topMoves = moveEvaluations
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(3, moveEvaluations.length));
      
      const exploredMove = topMoves[Math.floor(Math.random() * topMoves.length)];
      bestMove = exploredMove.move;
      bestScore = exploredMove.score;
    }

    // Apply mistake rate - occasionally pick a worse move
    if (profile.mistakeRate > 0 && Math.random() < profile.mistakeRate) {
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      return {
        move: randomMove,
        score: bestScore,
        analysis: {
          type: 'mistake',
          nodesEvaluated: this.nodesEvaluated,
          tactics,
          moveEvaluations,
        }
      };
    }

    return {
      move: bestMove,
      score: bestScore,
      analysis: {
        type: 'strategic',
        nodesEvaluated: this.nodesEvaluated,
        tactics,
        moveEvaluations,
      }
    };
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  minimax(state, depth, alpha, beta, isMaximizing, maximizer, profile) {
    this.nodesEvaluated++;

    if (this.adapter.isTerminal(state) || depth <= 0) {
      let score = this.adapter.evaluate(state, maximizer);
      
      // Apply defense weight to opponent threats
      if (!isMaximizing && profile.defenseWeight > 1.0) {
        if (score < 0) score *= profile.defenseWeight;
      }
      
      return score;
    }

    const minimizer = maximizer === 'X' ? 'O' : 'X';
    const currentPlayer = isMaximizing ? maximizer : minimizer;
    const moves = this.adapter.validMoves(state);

    if (moves.length === 0) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newState = this.adapter.applyMove(state, move, currentPlayer);
        const score = this.minimax(newState, depth - 1, alpha, beta, false, maximizer, profile);
        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newState = this.adapter.applyMove(state, move, currentPlayer);
        const score = this.minimax(newState, depth - 1, alpha, beta, true, maximizer, profile);
        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }

  /**
   * Analyze tactical opportunities
   */
  analyzeTactics(state, player, profile) {
    const tactics = {
      winningMove: null,
      blockingMove: null,
      forkMoves: [],
      forkBlockMoves: [],
    };

    if (this.adapter.findWinningMove) {
      tactics.winningMove = this.adapter.findWinningMove(state, player);
    }

    if (this.adapter.findBlockingMove) {
      tactics.blockingMove = this.adapter.findBlockingMove(state, player);
    }

    if (profile.forkDetection && this.adapter.findForkMoves) {
      tactics.forkMoves = this.adapter.findForkMoves(state, player);
    }

    if (profile.forkDetection && this.adapter.findForkBlockMoves) {
      tactics.forkBlockMoves = this.adapter.findForkBlockMoves(state, player);
    }

    return tactics;
  }

  /**
   * Order moves for better alpha-beta pruning
   */
  orderMoves(state, moves, player, profile) {
    if (!profile.moveOrdering) return moves;

    // Quick heuristic scoring for move ordering
    const scored = moves.map(move => {
      const newState = this.adapter.applyMove(state, move, player);
      const score = this.adapter.evaluate(newState, player);
      return { move, score: score };
    });

    // Sort descending (best moves first for better pruning)
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.move);
  }

  /**
   * Get the best move with full analysis (for move quality evaluation)
   * Always uses impossible difficulty for objective analysis
   */
  analyzePosition(state, player) {
    return this.getBestMove(state, player, 'impossible');
  }
}

/**
 * Factory function to create strategy engine for game type
 */
export function createStrategyEngine(gameType) {
  if (gameType === 'classic') {
    return new StrategyEngine(new ClassicAdapter());
  } else if (gameType === 'ultimate') {
    return new StrategyEngine(new UltimateAdapter());
  }
  throw new Error(`Unknown game type: ${gameType}`);
}

export { StrategyEngine as default };
