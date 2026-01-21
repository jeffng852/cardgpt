/**
 * Recommendation engine types
 */

import type { CreditCard, RewardUnit } from './card';
import type { Transaction } from './transaction';

/**
 * Calculated reward for a specific card and transaction
 */
export interface RewardCalculation {
  /** The card ID this calculation is for */
  cardId: string;

  /** Estimated reward amount */
  rewardAmount: number;

  /** Reward unit */
  rewardUnit: RewardUnit;

  /** Effective reward rate applied (as decimal, e.g., 0.02 = 2%) */
  effectiveRate: number;

  /** IDs of reward rules that were applied */
  appliedRules: string[];

  /** Transaction fees for this transaction */
  fees: number;

  /** Whether monthly spending cap was reached */
  cappedOut: boolean;
}

/**
 * Card recommendation with calculation and ranking
 */
export interface CardRecommendation {
  /** The credit card */
  card: CreditCard;

  /** Reward calculation for this card */
  calculation: RewardCalculation;

  /** Rank (1 = best) */
  rank: number;

  /** Whether this is the top recommendation */
  isRecommended: boolean;

  /** Net value (reward - fees) for comparison */
  netValue: number;
}

/**
 * Full recommendation result
 */
export interface RecommendationResult {
  /** Ranked list of card recommendations */
  recommendations: CardRecommendation[];

  /** The transaction that was analyzed */
  transaction: Transaction;

  /** Total number of cards evaluated */
  totalCardsEvaluated: number;

  /** Number of eligible cards after filtering */
  eligibleCardsCount: number;

  /** Whether any recommendations were found */
  hasRecommendation: boolean;
}
