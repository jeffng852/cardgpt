/**
 * Recommendation engine types
 */

import type { CreditCard, RewardUnit } from './card';

/**
 * Calculated reward for a specific card and transaction
 */
export interface RewardCalculation {
  /** The credit card */
  card: CreditCard;

  /** Estimated reward amount */
  estimatedReward: number;

  /** Reward unit */
  rewardUnit: RewardUnit;

  /** Transaction fees for this transaction */
  fees: number;

  /** Net benefit (reward minus fees) */
  netBenefit: number;

  /** Whether reward cap would be hit */
  rewardCapHit: boolean;

  /** Matching reward rule that was applied */
  appliedRule?: {
    merchantTypes: string[];
    rewardRate: number;
    description?: string;
  };
}

/**
 * Ranked recommendation result
 */
export interface RecommendationResult {
  /** The credit card */
  card: CreditCard;

  /** Estimated reward amount */
  estimatedReward: number;

  /** Reward unit (formatted for display) */
  rewardUnit: RewardUnit;

  /** Transaction fees */
  fees: number;

  /** Rank (1 = best) */
  rank: number;

  /** Whether this is the top recommendation */
  isRecommended: boolean;

  /** Net benefit (reward - fees) */
  netBenefit: number;

  /** Explanation of why this card was recommended */
  explanation?: string;
}

/**
 * Full recommendation response
 */
export interface RecommendationResponse {
  /** Ranked list of recommended cards */
  recommendations: RecommendationResult[];

  /** The transaction that was analyzed */
  transaction: {
    amount: number;
    currency: string;
    merchantType?: string;
  };

  /** Timestamp of recommendation */
  timestamp: string;

  /** Any warnings or notes */
  warnings?: string[];
}
