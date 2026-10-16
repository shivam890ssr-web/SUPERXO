import { Storage } from './storage.js';
import { AI } from './ai.js';
import { getPlayerModel } from './playerModel.js';

/**
 * Game analysis tracker - tracks moves and evaluations during a game
 */
export class GameAnalysis {
  constructor(mode, players, vsAI = false, difficulty = null) {
    this.mode = mode; // 'classic' or 'ultimate'
    this.players = players;
    this.vsAI = vsAI;
    this.difficulty = difficulty;
    this.moves = [];
    this.startTime = Date.now();
    this.gameId = `${mode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Analyze and record a move
   * @param {*} boardState - board state before move
   * @param {*} move - move made
   * @param {string} player - 'X' or 'O'
   * @param {number} timeSpent - milliseconds taken to make move
   */
  recordMove(boardState, move, player, timeSpent = 0) {
    let analysis;
    
    try {
      // Get move quality analysis
      if (this.mode === 'classic') {
        analysis = AI.analyzeMoveQuality(boardState, move, player);
      } else {
        analysis = AI.analyzeUltimateMoveQuality(boardState, move, player);
      }
      
      console.log(`[MoveAnalysis] Move ${this.moves.length + 1}: ${player} plays ${move}, quality: ${analysis.quality}`);
      
      const moveRecord = {
        moveNumber: this.moves.length + 1,
        player,
        move,
        boardStateBefore: this.mode === 'classic' ? [...boardState] : JSON.parse(JSON.stringify(boardState)),
        timeSpent,
        timestamp: Date.now() - this.startTime,
        
        // Analysis data
        quality: analysis.quality,
        evalLoss: analysis.evalLoss,
        bestMove: analysis.bestMove,
        wasBest: analysis.wasBest,
        moveScore: analysis.moveScore,
        bestScore: analysis.bestScore,
        
        // Tactical information
        tactics: analysis.tactics || {},
      };
      
      this.moves.push(moveRecord);
      
      // Update player model if this is a human move against AI
      if (this.vsAI && player !== this.getAIPlayer()) {
        this.updatePlayerModelForMove(moveRecord);
        console.log(`[MoveAnalysis] Updated player model: quality=${moveRecord.quality}, totalMoves now: ${this.moves.filter(m => m.player !== this.getAIPlayer()).length}`);
      }
      
      return moveRecord;
    } catch (error) {
      console.error('[MoveAnalysis] Error analyzing move:', error);
      console.error('[MoveAnalysis] Board state:', boardState);
      console.error('[MoveAnalysis] Move:', move, 'Player:', player);
      // Record basic move data without analysis
      const basicRecord = {
        moveNumber: this.moves.length + 1,
        player,
        move,
        timeSpent,
        timestamp: Date.now() - this.startTime,
        quality: 'unknown',
        error: error.message,
      };
      this.moves.push(basicRecord);
      return basicRecord;
    }
  }

  /**
   * Get AI player marker
   */
  getAIPlayer() {
    if (!this.vsAI) return null;
    // Assuming AI is always 'O' based on current game logic
    return 'O';
  }

  /**
   * Update player model based on move quality
   */
  updatePlayerModelForMove(moveRecord) {
    const playerModel = getPlayerModel();
    
    // Record move quality with mode
    playerModel.recordMoveQuality(moveRecord.quality, this.mode);
    
    // Record tactical events
    const tactics = moveRecord.tactics;
    
    if (tactics.winningMove !== null && moveRecord.wasBest) {
      // Player found the winning move
    } else if (tactics.winningMove !== null && !moveRecord.wasBest) {
      // Player missed a winning move
      playerModel.recordTactical('winningMovesMissed', this.mode);
    }
    
    if (tactics.blockingMove !== null && moveRecord.wasBest) {
      playerModel.recordTactical('threatsBlocked', this.mode);
    } else if (tactics.blockingMove !== null && !moveRecord.wasBest) {
      playerModel.recordTactical('threatsMissed', this.mode);
    }
    
    if (tactics.forkMoves && tactics.forkMoves.length > 0) {
      if (moveRecord.wasBest || (this.mode === 'classic' && tactics.forkMoves.includes(moveRecord.move))) {
        playerModel.recordTactical('forksCreated', this.mode);
      } else {
        playerModel.recordTactical('forksMissed', this.mode);
      }
    }
    
    if (tactics.forkBlockMoves && tactics.forkBlockMoves.length > 0) {
      const moveMatches = this.mode === 'classic' 
        ? tactics.forkBlockMoves.includes(moveRecord.move)
        : tactics.forkBlockMoves.some(m => JSON.stringify(m) === JSON.stringify(moveRecord.move));
      
      if (moveMatches) {
        playerModel.recordTactical('forksBlocked', this.mode);
      }
    }
  }

  /**
   * Finalize game and update player model with game-level statistics
   * @param {string} winner - 'X' | 'O' | 'draw'
   */
  finalizeGame(winner) {
    const endTime = Date.now();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    this.winner = winner;
    this.duration = duration;
    this.endTime = endTime;
    
    // Calculate game-level statistics
    const humanPlayer = this.vsAI ? (this.getAIPlayer() === 'O' ? 'X' : 'O') : 'X';
    const humanMoves = this.moves.filter(m => m.player === humanPlayer);
    
    const moveQualityScore = this.calculateAverageMoveQuality(humanMoves);
    
    // Update player model rating ONLY if playing Adaptive AI
    if (this.vsAI && this.difficulty === 'adaptive') {
      const playerModel = getPlayerModel();
      
      // Determine result from human player's perspective
      let result;
      if (winner === 'draw') {
        result = 'draw';
      } else if (winner === humanPlayer) {
        result = 'win';
      } else {
        result = 'loss';
      }
      
      // Estimate opponent strength based on difficulty
      const difficultyRatings = {
        beginner: 600,
        easy: 900,
        medium: 1200,
        hard: 1500,
        expert: 1800,
        impossible: 2200,
        adaptive: playerModel.profile.overallRating, // adaptive matches player
      };
      
      const opponentStrength = difficultyRatings[this.difficulty] || 1200;
      
      // Update rating
      const ratingUpdate = playerModel.updateRating(
        this.mode,
        result,
        opponentStrength,
        moveQualityScore
      );
      
      this.ratingUpdate = ratingUpdate;
      
      // Increment game count
      playerModel.incrementGameCount(this.mode);
      
      // Analyze patterns periodically (every 5 games for this mode)
      const modeGames = this.mode === 'classic' ? playerModel.profile.classicGames : playerModel.profile.ultimateGames;
      if (modeGames % 5 === 0) {
        playerModel.analyzePatterns(this.mode);
        playerModel.analyzePatterns('overall');
      }
      
      playerModel.save();
    }
    
    return this.getGameSummary();
  }

  /**
   * Calculate average move quality score (0-1)
   */
  calculateAverageMoveQuality(moves) {
    if (moves.length === 0) return 0.5;
    
    const qualityScores = {
      excellent: 1.0,
      good: 0.85,
      acceptable: 0.7,
      inaccurate: 0.5,
      mistake: 0.3,
      blunder: 0.1,
    };
    
    const totalScore = moves.reduce((sum, move) => {
      return sum + (qualityScores[move.quality] || 0.5);
    }, 0);
    
    return totalScore / moves.length;
  }

  /**
   * Get game summary for display
   */
  getGameSummary() {
    const humanPlayer = this.vsAI ? (this.getAIPlayer() === 'O' ? 'X' : 'O') : 'X';
    const humanMoves = this.moves.filter(m => m.player === humanPlayer);
    
    // Count move qualities
    const qualityCounts = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      inaccurate: 0,
      mistake: 0,
      blunder: 0,
    };
    
    humanMoves.forEach(move => {
      if (qualityCounts[move.quality] !== undefined) {
        qualityCounts[move.quality]++;
      }
    });
    
    // Find best and worst moves
    const sortedMoves = [...humanMoves].sort((a, b) => a.evalLoss - b.evalLoss);
    const bestMove = sortedMoves[0];
    const worstMove = sortedMoves[sortedMoves.length - 1];
    
    // Identify turning points (moves with large eval swings)
    const turningPoints = humanMoves
      .filter(m => m.evalLoss > 50 || (m.wasBest && m.bestScore > 80))
      .slice(0, 3);
    
    return {
      gameId: this.gameId,
      mode: this.mode,
      winner: this.winner,
      duration: this.duration,
      totalMoves: this.moves.length,
      humanMoves: humanMoves.length,
      qualityCounts,
      bestMove,
      worstMove,
      turningPoints,
      ratingUpdate: this.ratingUpdate,
      averageDecisionTime: humanMoves.reduce((sum, m) => sum + m.timeSpent, 0) / humanMoves.length,
    };
  }

  /**
   * Get full game data for storage/replay
   */
  getGameData() {
    return {
      gameId: this.gameId,
      mode: this.mode,
      players: this.players,
      vsAI: this.vsAI,
      difficulty: this.difficulty,
      moves: this.moves,
      winner: this.winner,
      duration: this.duration,
      startTime: this.startTime,
      endTime: this.endTime,
      summary: this.getGameSummary(),
    };
  }

  /**
   * Export game for detailed review
   */
  exportForReview() {
    return JSON.stringify(this.getGameData(), null, 2);
  }
}

/**
 * Match history manager - stores and retrieves past games
 */
export class MatchHistory {
  constructor(maxGames = 50) {
    this.maxGames = maxGames;
  }

  /**
   * Save a game to history
   */
  saveGame(gameData) {
    const storage = this.getHistory();
    storage.unshift(gameData);
    
    // Keep only last N games
    if (storage.length > this.maxGames) {
      storage.length = this.maxGames;
    }
    
    Storage.set('matchHistory', storage);
  }

  /**
   * Get match history
   */
  getHistory() {
    return Storage.get('matchHistory') || [];
  }

  /**
   * Get a specific game by ID
   */
  getGame(gameId) {
    const history = this.getHistory();
    return history.find(game => game.gameId === gameId);
  }

  /**
   * Get recent games
   */
  getRecentGames(count = 10) {
    return this.getHistory().slice(0, count);
  }

  /**
   * Clear all history
   */
  clearHistory() {
    Storage.set('matchHistory', []);
  }
}

// Singleton instances
let currentGameAnalysis = null;
const matchHistory = new MatchHistory();

/**
 * Start tracking a new game
 */
export function startGameAnalysis(mode, players, vsAI = false, difficulty = null) {
  currentGameAnalysis = new GameAnalysis(mode, players, vsAI, difficulty);
  return currentGameAnalysis;
}

/**
 * Get current game analysis
 */
export function getCurrentGameAnalysis() {
  return currentGameAnalysis;
}

/**
 * Clear current game analysis
 */
export function clearCurrentGameAnalysis() {
  currentGameAnalysis = null;
}

/**
 * Get match history manager
 */
export function getMatchHistory() {
  return matchHistory;
}

export default GameAnalysis;
