/**
 * Card Ranking and Recommendation Engine
 *
 * Ranks credit cards based on reward calculations and applies
 * tie-breaking logic as defined in the PRD
 */

import type { CreditCard, RewardUnit, HkdRateTable } from '@/types/card';
import type { Transaction } from '@/types/transaction';
import type {
  CardRecommendation,
  CryptoRecommendation,
  RecommendationResult,
} from '@/types/recommendation';
import { calculateReward, calculateNetValue } from './calculateReward';
import { valuateCrypto } from './valuateCrypto';

/**
 * User preferences for card recommendations
 */
export interface RecommendationPreferences {
  /** Preferred reward units (cash, miles, points, crypto) */
  preferredRewardUnits?: Array<RewardUnit>;

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
  preferences?: RecommendationPreferences,
  rateTable?: HkdRateTable
): RecommendationResult {
  // Filter out inactive cards and user-excluded cards
  const baseEligibleCards = cards.filter(card => {
    if (!card.isActive) return false;
    if (preferences?.excludedCardIds?.includes(card.id)) return false;
    // Fail-closed HK-eligibility gate (CRY-05, T-07-GATE): exclude a card only on
    // an EXPLICIT hkEligible === false, so it reaches neither `recommendations`
    // nor `cryptoSegment`. Keyed on `=== false` (not falsy) so `undefined` — the
    // 11 legacy cards — stays eligible. The directory (elsewhere) still lists
    // ineligible cards; this gate governs recommendations only.
    if (card.hkEligible === false) return false;
    return true;
  });

  // Partition-before-sort (DEC-VAL-B / TECH-01). Split the eligible set BEFORE
  // the sort so crypto/non-fiat cards NEVER enter the fiat comparator — this is
  // the structural guarantee behind the byte-identical fiat ranking (Plan 01
  // snapshot). Fiat = `cardType === 'credit'` (locks the 11 legacy `credit`
  // cards into the unchanged pipeline). Everything else (`crypto`, `prepaid`)
  // is non-fiat and valued separately below; prepaid may get its own section in
  // Phase 9. The segment boundary is `cardType === 'credit'` (RESEARCH Open
  // Question 1, decided here).
  const fiatCards = baseEligibleCards.filter(card => card.cardType === 'credit');
  const cryptoCards = baseEligibleCards.filter(card => card.cardType !== 'credit');

  // ===== FIAT PIPELINE — runs VERBATIM on the fiat set only =====
  let eligibleCards = fiatCards;

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

  // ===== CRYPTO SEGMENT — a SEPARATE fresh array, never aliasing the fiat one =====
  // Built only when a rateTable is injected AND at least one non-fiat card is
  // eligible; otherwise omitted so current 3-arg callers see the unchanged shape
  // (RESEARCH Pattern 1 + Pitfall 6). Crypto is valued via `valuateCrypto`, ranked
  // among itself by `hkdEquivalent` desc; value-unavailable (null) entries are
  // appended unranked (DEC-VAL-A — cannot rank on a missing number). rank/
  // isRecommended are assigned over the ranked (non-null) entries only.
  let cryptoSegment: CryptoRecommendation[] | undefined;
  if (rateTable && cryptoCards.length > 0) {
    const valued = cryptoCards.map(card => {
      const calculation = calculateReward(card, transaction, {
        monthlySpending: preferences?.monthlySpending
      });
      const valuation = valuateCrypto(calculation, card, rateTable);
      return {
        card,
        calculation,
        netValue: calculateNetValue(calculation),
        hkdEquivalent: valuation.hkdEquivalent,
        rateStale: valuation.rateStale,
        rateAsOf: valuation.rateAsOf
      };
    });

    const ranked = valued
      .filter(entry => entry.hkdEquivalent !== null)
      .sort((a, b) => b.hkdEquivalent! - a.hkdEquivalent!);
    const unranked = valued.filter(entry => entry.hkdEquivalent === null);

    cryptoSegment = [
      ...ranked.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        isRecommended: index === 0
      })),
      // Value-unavailable entries: rank 0 = unranked (appended after all ranked).
      ...unranked.map(entry => ({
        ...entry,
        rank: 0,
        isRecommended: false
      }))
    ];
  }

  return {
    recommendations: rankedCards,
    ...(cryptoSegment ? { cryptoSegment } : {}),
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
  rewardUnit: RewardUnit
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
): Record<RewardUnit, CardRecommendation[]> {
  const grouped: Record<RewardUnit, CardRecommendation[]> = {
    cash: [],
    miles: [],
    points: [],
    crypto: []
  };

  for (const rec of result.recommendations) {
    const unit = rec.calculation.rewardUnit;
    // Defensive backstop: if a future reward unit is added to the RewardUnit
    // type but not to the literal above, initialize its bucket rather than
    // calling .push on undefined (which would throw at runtime).
    if (!grouped[unit]) {
      grouped[unit] = [];
    }
    grouped[unit].push(rec);
  }

  return grouped;
}

/**
 * Find best card for a specific reward unit
 */
export function getBestCardForRewardUnit(
  result: RecommendationResult,
  rewardUnit: RewardUnit
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
