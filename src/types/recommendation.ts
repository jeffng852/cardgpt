/**
 * Recommendation engine types
 */

import type { CreditCard, RewardUnit, RulePriority } from './card';
import type { Transaction } from './transaction';

/**
 * How a rule contributed to the total reward
 * - 'base': Base rate applied
 * - 'stacked': Cumulative bonus added to base
 * - 'replaced': Non-cumulative bonus that replaced the base rate
 */
export type ContributionType = 'base' | 'stacked' | 'replaced';

/**
 * Detailed breakdown of how a single rule contributed to the reward
 */
export interface RuleContribution {
  /** Rule ID for reference */
  ruleId: string;

  /** The rate this rule contributed (as decimal) */
  rate: number;

  /** The reward amount from this rule */
  amount: number;

  /** Rule description for display */
  description: string;

  /** Chinese (Traditional) translation of description */
  description_zh?: string;

  /** Rule priority level */
  priority: RulePriority;

  /** Whether this is a promotional/time-limited offer */
  isPromotional: boolean;

  /** Expiry date if promotional (ISO date string) */
  validUntil?: string;

  /** Monthly spending cap for this rule */
  monthlySpendingCap?: number;

  /** Action required to activate (e.g., "Register online") */
  actionRequired?: string;

  /** Chinese (Traditional) translation of actionRequired */
  actionRequired_zh?: string;

  /** How this rule contributed to the total */
  contributionType: ContributionType;
}

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

  /** Detailed breakdown of each rule's contribution */
  ruleBreakdown: RuleContribution[];

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
