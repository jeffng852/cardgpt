/**
 * Card Ranking and Recommendation Engine
 *
 * Ranks credit cards based on reward calculations and applies
 * tie-breaking logic as defined in the PRD
 */

import type { CreditCard } from '@/types/card';
import type { Transaction } from '@/types/transaction';
import type { CardRecommendation, RecommendationResult } from '@/types/recommendation';
import { calculateReward, calculateNetValue } from './calculateReward';

/**
 * User preferences for card recommendations
 */
export interface RecommendationPreferences {
  /** Preferred reward units (cash, miles, points) */
  preferredRewardUnits?: Array<'cash' | 'miles' | 'points'>;

  /** Minimum acceptable reward rate (as decimal, e.g., 0.01 = 1%) */
  minRewardRate?: number;

  /** Maximum acceptable annual fee */
  maxAnnualFee?: number;

  /** User's current monthly spending (for cap tracking) */
  monthlySpending?: number;

  /** Preferred issuers */
  preferredIssuers?: string[];

  /** Exclude specific cards */
  excludedCardIds?: string[];
}

/**
 * Recommend best credit cards for a transaction
 *
 * Algorithm:
 * 1. Calculate rewards for all cards
 * 2. Apply user preference filters
 * 3. Sort by net value (reward - fees)
 * 4. Apply tie-breaking logic:
 *    - Higher reward amount wins
 *    - If tied, lower annual fee wins
 *    - If still tied, preferred issuer wins
 *    - If still tied, alphabetical order
 * 5. Mark top card as "Recommended"
 */
export function recommendCards(
  cards: CreditCard[],
  transaction: Transaction,
  preferences?: RecommendationPreferences
): RecommendationResult {
  // Filter out inactive cards and user-excluded cards
  let eligibleCards = cards.filter(card => {
    if (!card.isActive) return false;
    if (preferences?.excludedCardIds?.includes(card.id)) return false;
    return true;
  });

  // Apply preference filters
  if (preferences) {
    // Filter by preferred reward units
    if (preferences.preferredRewardUnits && preferences.preferredRewardUnits.length > 0) {
      eligibleCards = eligibleCards.filter(card => {
        // Check if any reward rule matches preferred units
        return card.rewards.some(rule =>
          preferences.preferredRewardUnits!.includes(rule.rewardUnit)
        );
      });
    }

    // Filter by maximum annual fee
    if (preferences.maxAnnualFee !== undefined) {
      eligibleCards = eligibleCards.filter(
        card => card.fees.annualFee <= preferences.maxAnnualFee!
      );
    }
  }

  // Calculate rewards for all eligible cards
  const calculations = eligibleCards.map(card => ({
    card,
    calculation: calculateReward(card, transaction, {
      monthlySpending: preferences?.monthlySpending
    })
  }));

  // Filter by minimum reward rate if specified
  let recommendations = calculations;
  if (preferences?.minRewardRate !== undefined) {
    recommendations = recommendations.filter(
      rec => rec.calculation.effectiveRate >= preferences.minRewardRate!
    );
  }

  // Sort by net value, then apply tie-breaking
  recommendations.sort((a, b) => {
    const netValueA = calculateNetValue(a.calculation);
    const netValueB = calculateNetValue(b.calculation);

    // 1. Higher net value wins
    if (netValueB !== netValueA) {
      return netValueB - netValueA;
    }

    // 2. If tied on net value, higher reward amount wins
    if (b.calculation.rewardAmount !== a.calculation.rewardAmount) {
      return b.calculation.rewardAmount - a.calculation.rewardAmount;
    }

    // 3. If still tied, lower annual fee wins
    if (a.card.fees.annualFee !== b.card.fees.annualFee) {
      return a.card.fees.annualFee - b.card.fees.annualFee;
    }

    // 4. Preferred issuer wins
    if (preferences?.preferredIssuers) {
      const aPreferred = preferences.preferredIssuers.includes(a.card.issuer);
      const bPreferred = preferences.preferredIssuers.includes(b.card.issuer);
      if (aPreferred && !bPreferred) return -1;
      if (bPreferred && !aPreferred) return 1;
    }

    // 5. Alphabetical order by card name
    return a.card.name.localeCompare(b.card.name);
  });

  // Build ranked results
  const rankedCards: CardRecommendation[] = recommendations.map((rec, index) => ({
    card: rec.card,
    calculation: rec.calculation,
    rank: index + 1,
    isRecommended: index === 0, // Top card is recommended
    netValue: calculateNetValue(rec.calculation)
  }));

  return {
    recommendations: rankedCards,
    transaction,
    totalCardsEvaluated: cards.length,
    eligibleCardsCount: eligibleCards.length,
    hasRecommendation: rankedCards.length > 0
  };
}

/**
 * Get top N recommendations
 */
export function getTopRecommendations(
  result: RecommendationResult,
  count: number = 3
): CardRecommendation[] {
  return result.recommendations.slice(0, count);
}

/**
 * Filter recommendations by reward unit
 */
export function filterByRewardUnit(
  result: RecommendationResult,
  rewardUnit: 'cash' | 'miles' | 'points'
): CardRecommendation[] {
  return result.recommendations.filter(
    rec => rec.calculation.rewardUnit === rewardUnit
  );
}

/**
 * Group recommendations by reward unit
 */
export function groupByRewardUnit(
  result: RecommendationResult
): Record<'cash' | 'miles' | 'points', CardRecommendation[]> {
  const grouped: Record<'cash' | 'miles' | 'points', CardRecommendation[]> = {
    cash: [],
    miles: [],
    points: []
  };

  for (const rec of result.recommendations) {
    grouped[rec.calculation.rewardUnit].push(rec);
  }

  return grouped;
}

/**
 * Find best card for a specific reward unit
 */
export function getBestCardForRewardUnit(
  result: RecommendationResult,
  rewardUnit: 'cash' | 'miles' | 'points'
): CardRecommendation | null {
  const filtered = filterByRewardUnit(result, rewardUnit);
  return filtered.length > 0 ? filtered[0] : null;
}

/**
 * Calculate potential savings compared to a specific card
 * (useful for showing "You could save $X by using Card Y instead of Card Z")
 */
export function compareTwoCards(
  currentCard: CardRecommendation,
  alternativeCard: CardRecommendation
): {
  savingsAmount: number;
  savingsPercentage: number;
  isBetter: boolean;
} {
  const currentNet = currentCard.netValue;
  const alternativeNet = alternativeCard.netValue;
  const savingsAmount = alternativeNet - currentNet;
  const savingsPercentage = currentNet > 0 ? (savingsAmount / currentNet) * 100 : 0;

  return {
    savingsAmount,
    savingsPercentage,
    isBetter: savingsAmount > 0
  };
}
