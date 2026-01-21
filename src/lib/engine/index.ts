/**
 * CardGPT Recommendation Engine
 *
 * Main exports for reward calculation and card ranking
 */

export {
  calculateReward,
  calculateNetValue,
  formatReward,
  formatEffectiveRate
} from './calculateReward';

export {
  recommendCards,
  getTopRecommendations,
  filterByRewardUnit,
  groupByRewardUnit,
  getBestCardForRewardUnit,
  compareTwoCards,
  type RecommendationPreferences
} from './recommendCards';
