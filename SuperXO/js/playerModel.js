/**
 * playerModel.js — Player profiling, skill tracking, and performance analysis.
 * Implements persistent player modeling for adaptive AI.
 */

import { Storage } from './storage.js';

/**
 * Skill rating bands for display
 */
export const SKILL_BANDS = {
  beginner: { min: 0, max: 800, label: 'Beginner', color: '#888888' },
  developing: { min: 800, max: 1100, label: 'Developing', color: '#4a9eff' },
  intermediate: { min: 1100, max: 1400, label: 'Intermediate', color: '#44dd44' },
  advanced: { min: 1400, max: 1700, label: 'Advanced', color: '#ffa500' },
  expert: { min: 1700, max: 2000, label: 'Expert', color: '#ff4444' },
  master: { min: 2000, max: Infinity, label: 'Master', color: '#a855f7' },
};

/**
 * Default player profile structure
 */
function createDefaultProfile() {
  return {
    version: 1,
    
    // Overall ratings
    overallRating: 1000,
    classicRating: 1000,
    ultimateRating: 1000,
    
    // Confidence in rating (increases with games played)
    ratingConfidence: 0.5, // 0-1, starts at 0.5
    
    // Recent form tracking
    recentGames: [], // last 10 games performance
    recentForm: 'stable', // 'improving' | 'stable' | 'declining'
    
    // Game counts
    totalGames: 0,
    classicGames: 0,
    ultimateGames: 0,
    
    // Move quality tracking
    moveQuality: {
      excellent: 0,
      good: 0,
      acceptable: 0,
      inaccurate: 0,
      mistakes: 0,
      blunders: 0,
      totalMoves: 0,
    },
    
    // Tactical performance
    tactical: {
      threatsCreated: 0,
      threatsBlocked: 0,
      threatsMissed: 0,
      forksCreated: 0,
      forksBlocked: 0,
      forksMissed: 0,
      winningMovesMissed: 0,
      totalTacticalOpportunities: 0,
    },
    
    // Performance metrics
    metrics: {
      averageDecisionTime: 0,
      averageMovesPerGame: 0,
      openingStrength: 0, // 0-1
      midgameStrength: 0,
      endgameStrength: 0,
    },
    
    // Detected strengths (pattern recognition)
    strengths: [],
    
    // Detected weaknesses (pattern recognition)
    weaknesses: [],
    
    // Adaptive AI state
    adaptive: {
      currentLevel: 'developing',
      searchDepth: 3,
      explorationRate: 0.10,
      lastAdjustment: null,
      adjustmentReason: '',
    },
    
    // Timestamps
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };
}

/**
 * Player Model class
 */
export class PlayerModel {
  constructor() {
    this.profile = this.load();
  }

  /**
   * Load player profile from storage
   */
  load() {
    let profile = Storage.get('playerProfile');
    if (!profile || !profile.version) {
      profile = createDefaultProfile();
      this.save(profile);
    }
    return profile;
  }

  /**
   * Save player profile to storage
   */
  save(profile = null) {
    const toSave = profile || this.profile;
    toSave.lastUpdated = Date.now();
    Storage.set('playerProfile', toSave);
    this.profile = toSave;
  }

  /**
   * Get current player profile
   */
  getProfile() {
    return { ...this.profile };
  }

  /**
   * Update rating after a game
   * Uses ELO-like system with K-factor based on confidence
   * @param {string} mode - 'classic' or 'ultimate'
   * @param {string} result - 'win' | 'loss' | 'draw'
   * @param {number} opponentStrength - opponent's rating or AI difficulty estimate
   * @param {number} moveQualityScore - average move quality (0-1)
   */
  updateRating(mode, result, opponentStrength, moveQualityScore = 0.5) {
    const currentRating = mode === 'classic' ? this.profile.classicRating : this.profile.ultimateRating;
    
    // K-factor decreases as confidence increases (more stable ratings for experienced players)
    const baseK = 40;
    const K = baseK * (1.5 - this.profile.ratingConfidence);
    
    // Expected score based on rating difference
    const ratingDiff = opponentStrength - currentRating;
    const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));
    
    // Actual score
    let actualScore;
    if (result === 'win') actualScore = 1.0;
    else if (result === 'draw') actualScore = 0.5;
    else actualScore = 0.0;
    
    // Adjust based on move quality (good moves = better performance)
    const qualityBonus = (moveQualityScore - 0.5) * 0.2; // ±0.1 adjustment
    actualScore = Math.max(0, Math.min(1, actualScore + qualityBonus));
    
    // Calculate rating change
    const ratingChange = Math.round(K * (actualScore - expectedScore));
    
    // Update ratings
    const newRating = Math.max(100, currentRating + ratingChange);
    
    if (mode === 'classic') {
      this.profile.classicRating = newRating;
    } else {
      this.profile.ultimateRating = newRating;
    }
    
    // Update overall rating (weighted average)
    const classicWeight = this.profile.classicGames / (this.profile.classicGames + this.profile.ultimateGames || 1);
    const ultimateWeight = 1 - classicWeight;
    this.profile.overallRating = Math.round(
      this.profile.classicRating * classicWeight + 
      this.profile.ultimateRating * ultimateWeight
    );
    
    // Increase confidence (caps at 1.0)
    this.profile.ratingConfidence = Math.min(1.0, this.profile.ratingConfidence + 0.01);
    
    // Track recent performance
    this.profile.recentGames.unshift({
      mode,
      result,
      ratingBefore: currentRating,
      ratingAfter: newRating,
      ratingChange,
      moveQualityScore,
      timestamp: Date.now(),
    });
    
    // Keep only last 10 games
    if (this.profile.recentGames.length > 10) {
      this.profile.recentGames.length = 10;
    }
    
    // Update recent form
    this.updateRecentForm();
    
    this.save();
    
    return {
      ratingBefore: currentRating,
      ratingAfter: newRating,
      ratingChange,
    };
  }

  /**
   * Analyze recent form trend
   */
  updateRecentForm() {
    if (this.profile.recentGames.length < 3) {
      this.profile.recentForm = 'stable';
      return;
    }
    
    const recentChanges = this.profile.recentGames
      .slice(0, 5)
      .map(g => g.ratingChange);
    
    const avgChange = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
    
    if (avgChange > 10) {
      this.profile.recentForm = 'improving';
    } else if (avgChange < -10) {
      this.profile.recentForm = 'declining';
    } else {
      this.profile.recentForm = 'stable';
    }
  }

  /**
   * Record move quality
   * @param {string} quality - 'excellent' | 'good' | 'acceptable' | 'inaccurate' | 'mistake' | 'blunder'
   */
  recordMoveQuality(quality) {
    if (this.profile.moveQuality[quality] !== undefined) {
      this.profile.moveQuality[quality]++;
      this.profile.moveQuality.totalMoves++;
    }
  }

  /**
   * Record tactical event
   * @param {string} event - tactical event type
   */
  recordTactical(event) {
    if (this.profile.tactical[event] !== undefined) {
      this.profile.tactical[event]++;
      this.profile.tactical.totalTacticalOpportunities++;
    }
  }

  /**
   * Update game counts
   */
  incrementGameCount(mode) {
    this.profile.totalGames++;
    if (mode === 'classic') {
      this.profile.classicGames++;
    } else if (mode === 'ultimate') {
      this.profile.ultimateGames++;
    }
  }

  /**
   * Get current skill band
   * @param {string} mode - 'overall' | 'classic' | 'ultimate'
   */
  getSkillBand(mode = 'overall') {
    let rating;
    if (mode === 'classic') rating = this.profile.classicRating;
    else if (mode === 'ultimate') rating = this.profile.ultimateRating;
    else rating = this.profile.overallRating;
    
    for (const [key, band] of Object.entries(SKILL_BANDS)) {
      if (rating >= band.min && rating < band.max) {
        return { ...band, key };
      }
    }
    return { ...SKILL_BANDS.beginner, key: 'beginner' };
  }

  /**
   * Analyze strengths and weaknesses from performance data
   */
  analyzePatterns() {
    const strengths = [];
    const weaknesses = [];
    
    const mq = this.profile.moveQuality;
    const tact = this.profile.tactical;
    
    // Move quality analysis
    if (mq.totalMoves > 20) {
      const excellentRate = mq.excellent / mq.totalMoves;
      const blunderRate = mq.blunders / mq.totalMoves;
      
      if (excellentRate > 0.30) {
        strengths.push({
          type: 'move_quality',
          description: 'Consistently finds strong moves',
          confidence: Math.min(1.0, mq.totalMoves / 100),
        });
      }
      
      if (blunderRate > 0.15) {
        weaknesses.push({
          type: 'move_quality',
          description: 'Frequently makes serious mistakes',
          confidence: Math.min(1.0, mq.totalMoves / 100),
        });
      }
    }
    
    // Tactical analysis
    if (tact.totalTacticalOpportunities > 10) {
      const threatsBlockedRate = tact.threatsBlocked / (tact.threatsBlocked + tact.threatsMissed || 1);
      const forkCreationRate = tact.forksCreated / (tact.totalTacticalOpportunities || 1);
      
      if (threatsBlockedRate > 0.80) {
        strengths.push({
          type: 'tactical_defense',
          description: 'Strong defensive awareness',
          confidence: Math.min(1.0, tact.totalTacticalOpportunities / 50),
        });
      }
      
      if (threatsBlockedRate < 0.50) {
        weaknesses.push({
          type: 'tactical_defense',
          description: 'Often misses opponent threats',
          confidence: Math.min(1.0, tact.totalTacticalOpportunities / 50),
        });
      }
      
      if (forkCreationRate > 0.10) {
        strengths.push({
          type: 'tactical_offense',
          description: 'Good at creating multiple threats',
          confidence: Math.min(1.0, tact.totalTacticalOpportunities / 50),
        });
      }
      
      if (tact.winningMovesMissed > 5) {
        weaknesses.push({
          type: 'tactical_awareness',
          description: 'Sometimes misses winning opportunities',
          confidence: Math.min(1.0, tact.winningMovesMissed / 20),
        });
      }
    }
    
    // Rating trend analysis
    if (this.profile.recentForm === 'improving') {
      strengths.push({
        type: 'improvement',
        description: 'Showing consistent improvement',
        confidence: 0.8,
      });
    }
    
    this.profile.strengths = strengths;
    this.profile.weaknesses = weaknesses;
    this.save();
    
    return { strengths, weaknesses };
  }

  /**
   * Get move quality statistics
   */
  getMoveQualityStats() {
    const mq = this.profile.moveQuality;
    if (mq.totalMoves === 0) return null;
    
    return {
      excellentRate: (mq.excellent / mq.totalMoves * 100).toFixed(1),
      goodRate: (mq.good / mq.totalMoves * 100).toFixed(1),
      acceptableRate: (mq.acceptable / mq.totalMoves * 100).toFixed(1),
      inaccurateRate: (mq.inaccurate / mq.totalMoves * 100).toFixed(1),
      mistakeRate: (mq.mistakes / mq.totalMoves * 100).toFixed(1),
      blunderRate: (mq.blunders / mq.totalMoves * 100).toFixed(1),
      totalMoves: mq.totalMoves,
    };
  }

  /**
   * Get tactical statistics
   */
  getTacticalStats() {
    const tact = this.profile.tactical;
    if (tact.totalTacticalOpportunities === 0) return null;
    
    const threatAwareness = tact.threatsBlocked / (tact.threatsBlocked + tact.threatsMissed || 1);
    const forkAwareness = tact.forksBlocked / (tact.forksBlocked + tact.forksMissed || 1);
    
    return {
      threatAwareness: (threatAwareness * 100).toFixed(1),
      forkAwareness: (forkAwareness * 100).toFixed(1),
      threatsCreated: tact.threatsCreated,
      forksCreated: tact.forksCreated,
      winningMovesMissed: tact.winningMovesMissed,
      totalOpportunities: tact.totalTacticalOpportunities,
    };
  }

  /**
   * Reset player profile (preserve adaptive AI settings)
   */
  reset() {
    const oldAdaptive = { ...this.profile.adaptive };
    this.profile = createDefaultProfile();
    this.profile.adaptive = oldAdaptive;
    this.save();
  }

  /**
   * Reset only adaptive AI profile (for testing different skill levels)
   */
  resetAdaptive() {
    this.profile.adaptive = {
      currentLevel: 'developing',
      searchDepth: 3,
      explorationRate: 0.10,
      lastAdjustment: null,
      adjustmentReason: '',
    };
    this.save();
  }
}

// Singleton instance
let playerModelInstance = null;

/**
 * Get the player model singleton
 */
export function getPlayerModel() {
  if (!playerModelInstance) {
    playerModelInstance = new PlayerModel();
  }
  return playerModelInstance;
}

export default PlayerModel;
