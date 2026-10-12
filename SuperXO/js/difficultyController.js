/**
 * difficultyController.js — Adaptive Difficulty Controller
 * Maps player skill rating to AI parameters for dynamic difficulty adjustment.
 */

import { getPlayerModel, SKILL_BANDS } from './playerModel.js';
import { DIFFICULTY_PROFILES } from './strategyEngine.js';

/**
 * Adaptive Difficulty Controller
 * Continuously adjusts AI parameters based on player performance
 */
export class DifficultyController {
  constructor() {
    this.playerModel = getPlayerModel();
    this.lastAdjustmentTime = Date.now();
    this.adjustmentThreshold = 3; // Adjust after this many games
    this.gamessinceAdjustment = 0;
  }

  /**
   * Get adaptive difficulty profile based on current player skill
   * @param {string} mode - 'classic' or 'ultimate'
   * @returns {object} difficulty profile
   */
  getAdaptiveProfile(mode = 'overall') {
    const profile = this.playerModel.getProfile();
    
    // Get appropriate rating
    let rating;
    if (mode === 'classic') rating = profile.classicRating;
    else if (mode === 'ultimate') rating = profile.ultimateRating;
    else rating = profile.overallRating;
    
    // Map rating to difficulty parameters
    // Goal: Keep player in the "flow zone" - challenging but not frustrating
    
    // Base difficulty on rating bands
    const skillBand = this.playerModel.getSkillBand(mode);
    let baseProfile = { ...DIFFICULTY_PROFILES.medium };
    
    if (rating < 800) {
      // Beginner: easier than easy
      baseProfile = {
        searchDepth: 2,
        explorationRate: 0.25,
        tacticalAwareness: 0.50,
        forkDetection: false,
        strategicThinking: false,
        mistakeRate: 0.30,
        defenseWeight: 0.6,
        moveOrdering: false,
      };
    } else if (rating < 1100) {
      // Developing: easy-medium range
      baseProfile = {
        searchDepth: 2,
        explorationRate: 0.18,
        tacticalAwareness: 0.70,
        forkDetection: false,
        strategicThinking: true,
        mistakeRate: 0.20,
        defenseWeight: 0.8,
        moveOrdering: true,
      };
    } else if (rating < 1400) {
      // Intermediate: medium-hard range
      baseProfile = {
        searchDepth: 3,
        explorationRate: 0.12,
        tacticalAwareness: 0.90,
        forkDetection: true,
        strategicThinking: true,
        mistakeRate: 0.08,
        defenseWeight: 1.1,
        moveOrdering: true,
      };
    } else if (rating < 1700) {
      // Advanced: hard-expert range
      baseProfile = {
        searchDepth: 5,
        explorationRate: 0.06,
        tacticalAwareness: 0.96,
        forkDetection: true,
        strategicThinking: true,
        mistakeRate: 0.04,
        defenseWeight: 1.3,
        moveOrdering: true,
      };
    } else if (rating < 2000) {
      // Expert: near-impossible
      baseProfile = {
        searchDepth: 6,
        explorationRate: 0.03,
        tacticalAwareness: 0.98,
        forkDetection: true,
        strategicThinking: true,
        mistakeRate: 0.02,
        defenseWeight: 1.6,
        moveOrdering: true,
      };
    } else {
      // Master: impossible mode
      baseProfile = { ...DIFFICULTY_PROFILES.impossible };
    }
    
    // Apply adjustments based on recent form
    baseProfile = this.adjustForRecentForm(baseProfile, profile);
    
    // Apply adjustments based on specific weaknesses
    baseProfile = this.adjustForWeaknesses(baseProfile, profile);
    
    // Store in player model for transparency
    profile.adaptive.currentLevel = skillBand.key;
    profile.adaptive.searchDepth = baseProfile.searchDepth;
    profile.adaptive.explorationRate = baseProfile.explorationRate;
    profile.adaptive.lastAdjustment = Date.now();
    
    this.playerModel.save();
    
    return baseProfile;
  }

  /**
   * Adjust difficulty based on recent form
   */
  adjustForRecentForm(profile, playerProfile) {
    const form = playerProfile.recentForm;
    const adjustedProfile = { ...profile };
    
    if (form === 'improving') {
      // Player is improving - gradually increase challenge
      adjustedProfile.searchDepth = Math.min(9, profile.searchDepth + 1);
      adjustedProfile.explorationRate = Math.max(0, profile.explorationRate - 0.03);
      adjustedProfile.mistakeRate = Math.max(0, profile.mistakeRate - 0.02);
      
      playerProfile.adaptive.adjustmentReason = 'Increased difficulty due to improving performance';
      
    } else if (form === 'declining') {
      // Player is struggling - reduce challenge slightly
      adjustedProfile.searchDepth = Math.max(1, profile.searchDepth - 1);
      adjustedProfile.explorationRate = Math.min(0.3, profile.explorationRate + 0.03);
      adjustedProfile.mistakeRate = Math.min(0.3, profile.mistakeRate + 0.02);
      
      playerProfile.adaptive.adjustmentReason = 'Decreased difficulty due to recent struggles';
    } else {
      playerProfile.adaptive.adjustmentReason = 'Stable difficulty matching current skill level';
    }
    
    return adjustedProfile;
  }

  /**
   * Adjust difficulty based on detected weaknesses
   */
  adjustForWeaknesses(profile, playerProfile) {
    const adjustedProfile = { ...profile };
    const weaknesses = playerProfile.weaknesses || [];
    
    // If player struggles with tactical defense, AI should make threats more obvious
    const hasTacticalDefenseWeakness = weaknesses.some(w => w.type === 'tactical_defense');
    if (hasTacticalDefenseWeakness) {
      adjustedProfile.tacticalAwareness = Math.max(0.7, adjustedProfile.tacticalAwareness - 0.1);
      adjustedProfile.defenseWeight = Math.max(0.5, adjustedProfile.defenseWeight - 0.2);
    }
    
    // If player makes many blunders, reduce punishment
    const hasMoveQualityWeakness = weaknesses.some(w => w.type === 'move_quality');
    if (hasMoveQualityWeakness) {
      adjustedProfile.explorationRate = Math.min(0.25, adjustedProfile.explorationRate + 0.05);
    }
    
    return adjustedProfile;
  }

  /**
   * Dynamically adjust difficulty during a match based on performance
   * @param {object} gameAnalysis - current game analysis
   * @returns {object|null} adjusted profile or null if no adjustment needed
   */
  adjustDuringMatch(gameAnalysis) {
    if (!gameAnalysis || gameAnalysis.moves.length < 5) {
      return null; // Need enough data
    }
    
    const humanPlayer = gameAnalysis.vsAI ? 
      (gameAnalysis.getAIPlayer() === 'O' ? 'X' : 'O') : 'X';
    
    const recentHumanMoves = gameAnalysis.moves
      .filter(m => m.player === humanPlayer)
      .slice(-5); // Last 5 moves
    
    if (recentHumanMoves.length < 3) return null;
    
    // Calculate recent performance
    const recentQuality = recentHumanMoves.filter(m => 
      m.quality === 'excellent' || m.quality === 'good'
    ).length / recentHumanMoves.length;
    
    const recentBlunders = recentHumanMoves.filter(m => 
      m.quality === 'blunder'
    ).length;
    
    // Get current profile
    const currentProfile = this.getAdaptiveProfile(gameAnalysis.mode);
    
    // If player is doing very well, increase difficulty slightly
    if (recentQuality > 0.80 && this.gamessinceAdjustment > this.adjustmentThreshold) {
      const adjusted = { ...currentProfile };
      adjusted.searchDepth = Math.min(9, adjusted.searchDepth + 1);
      adjusted.mistakeRate = Math.max(0, adjusted.mistakeRate - 0.02);
      this.gamessinceAdjustment = 0;
      return adjusted;
    }
    
    // If player is making many blunders, decrease difficulty
    if (recentBlunders >= 2 && this.gamessinceAdjustment > this.adjustmentThreshold) {
      const adjusted = { ...currentProfile };
      adjusted.searchDepth = Math.max(1, adjusted.searchDepth - 1);
      adjusted.explorationRate = Math.min(0.3, adjusted.explorationRate + 0.05);
      this.gamessinceAdjustment = 0;
      return adjusted;
    }
    
    return null;
  }

  /**
   * Record that a game was completed (for adjustment throttling)
   */
  recordGameComplete() {
    this.gamessinceAdjustment++;
  }

  /**
   * Get difficulty estimation for a given rating
   * @param {number} rating
   * @returns {string} difficulty name
   */
  estimateDifficulty(rating) {
    if (rating < 800) return 'beginner';
    if (rating < 1100) return 'easy';
    if (rating < 1400) return 'medium';
    if (rating < 1700) return 'hard';
    if (rating < 2000) return 'expert';
    return 'impossible';
  }

  /**
   * Get explanation of current adaptive settings
   */
  getAdaptiveExplanation(mode = 'overall') {
    const profile = this.playerModel.getProfile();
    const skillBand = this.playerModel.getSkillBand(mode);
    
    let rating;
    if (mode === 'classic') rating = profile.classicRating;
    else if (mode === 'ultimate') rating = profile.ultimateRating;
    else rating = profile.overallRating;
    
    const adaptiveProfile = this.getAdaptiveProfile(mode);
    
    return {
      skillBand: skillBand.label,
      rating: Math.round(rating),
      searchDepth: adaptiveProfile.searchDepth,
      recentForm: profile.recentForm,
      adjustmentReason: profile.adaptive.adjustmentReason || 'Initial calibration',
      gamesPlayed: mode === 'classic' ? profile.classicGames : 
                   mode === 'ultimate' ? profile.ultimateGames : 
                   profile.totalGames,
      confidence: (profile.ratingConfidence * 100).toFixed(0) + '%',
    };
  }

  /**
   * Reset adaptive difficulty (for testing or new player)
   */
  reset() {
    this.gamessinceAdjustment = 0;
    this.lastAdjustmentTime = Date.now();
    this.playerModel.resetAdaptive();
  }
}

// Singleton instance
let difficultyControllerInstance = null;

/**
 * Get the difficulty controller singleton
 */
export function getDifficultyController() {
  if (!difficultyControllerInstance) {
    difficultyControllerInstance = new DifficultyController();
  }
  return difficultyControllerInstance;
}

export default DifficultyController;
