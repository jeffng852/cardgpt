/**
 * scripts/capture-ranking.mts
 *
 * Byte-identical ranking guard for the RewardCap data retirement (TECH-02, THI-253).
 *
 * Runs the live recommender (`recommendCards`) over the FULL corpus for a fixed
 * set of transactions that exercise the three cards that used to carry a dead
 * `rewardCap` object — citi-cash-back, sc-smart, sc-simply-cash — and prints
 * their ranked output deterministically (stable key ordering, filtered to those
 * three ids). Capture this once BEFORE removing the `rewardCap` data and once
 * AFTER; the two outputs must be byte-identical, proving the removal is
 * output-neutral because no engine code ever read the field.
 *
 * Run:  npx tsx scripts/capture-ranking.mts
 *
 * Note: the engine's `@/`-aliased imports are all `import type` (erased at
 * runtime), so tsx needs no path-alias resolution — only relative + JSON
 * imports below are resolved at runtime.
 */

import { recommendCards } from '../src/lib/engine/recommendCards.ts';
import type { CreditCard } from '../src/types/card.ts';
import type { Transaction } from '../src/types/transaction.ts';
import cardsData from '../src/data/cards.json' with { type: 'json' };

const corpus = (cardsData as { cards: unknown[] }).cards as unknown as CreditCard[];

/** The three cards that carried the retired `rewardCap` data. */
const TARGET_IDS = ['citi-cash-back', 'sc-smart', 'sc-simply-cash'] as const;

/**
 * A fixed, representative set of scenarios chosen to exercise the three target
 * cards across the reward-rule paths that matter (local dining, tiered
 * designated-merchant spend around sc-smart's thresholds, and foreign spend).
 * `monthlySpending` drives sc-smart's tier caps / fallback rates so the cap
 * machinery is genuinely exercised.
 */
const scenarios: Array<{ label: string; tx: Transaction; monthlySpending?: number }> = [
  {
    label: 'local-hkd-dining-500',
    tx: { amount: 500, currency: 'HKD', category: 'dining', paymentType: 'offline' },
  },
  {
    label: 'local-hkd-general-8000-tier1',
    tx: { amount: 8000, currency: 'HKD', category: 'retail', paymentType: 'offline' },
    monthlySpending: 8000,
  },
  {
    label: 'sc-smart-designated-mcdonalds-tier2-capped',
    tx: { amount: 6000, currency: 'HKD', category: 'dining', merchantId: 'mcdonalds', paymentType: 'offline' },
    monthlySpending: 16000,
  },
  {
    label: 'foreign-usd-2000',
    tx: { amount: 2000, currency: 'USD', category: 'retail', paymentType: 'online' },
  },
  {
    label: 'local-hkd-travel-hotel-3000',
    tx: { amount: 3000, currency: 'HKD', category: 'travel', paymentType: 'offline' },
  },
];

/** Serialize one ranked entry with an explicit, stable field ordering. */
function serializeEntry(label: string, entry: {
  card: { id: string };
  rank: number;
  netValue: number;
  calculation: { rewardAmount: number; rewardUnit: string; effectiveRate: number };
  isRecommended: boolean;
}): string {
  return JSON.stringify({
    scenario: label,
    id: entry.card.id,
    rank: entry.rank,
    isRecommended: entry.isRecommended,
    rewardAmount: entry.calculation.rewardAmount,
    rewardUnit: entry.calculation.rewardUnit,
    effectiveRate: entry.calculation.effectiveRate,
    netValue: entry.netValue,
  });
}

const lines: string[] = [];

for (const { label, tx, monthlySpending } of scenarios) {
  const result = recommendCards(corpus, tx, monthlySpending !== undefined ? { monthlySpending } : undefined);
  // Filter to the three target ids, then sort by id so output is order-stable
  // regardless of the recommender's internal ranking permutations.
  const targeted = result.recommendations
    .filter((r) => (TARGET_IDS as readonly string[]).includes(r.card.id))
    .sort((a, b) => a.card.id.localeCompare(b.card.id));

  for (const entry of targeted) {
    lines.push(serializeEntry(label, entry));
  }
}

process.stdout.write(lines.join('\n') + '\n');
