/**
 * Byte-identical fiat-ranking regression guard (TECH-01 / THI-279).
 *
 * Ports the deterministic serializer + fixed scenario set from
 * `scripts/capture-ranking.mts` into a committed vitest snapshot. Unlike that
 * one-shot script (which filtered to 3 target ids), this captures the FULL
 * 11-card ranking for every scenario so ANY perturbation anywhere in the fiat
 * sort turns the suite red.
 *
 * The snapshot is generated on the CURRENT (pre-crypto) engine and committed as
 * the baseline. Phase 7 Waves 1-2 add crypto valuation/segmentation behind an
 * optional rate table; this test passes NO rate table, exercising only the fiat
 * path, so the committed baseline must stay byte-identical through those changes.
 */

import { describe, it, expect } from 'vitest';
import { recommendCards } from '../recommendCards';
import cardsData from '@/data/cards.json';
import type { CreditCard } from '@/types/card';
import type { Transaction } from '@/types/transaction';

const corpus = (cardsData as { cards: unknown[] }).cards as unknown as CreditCard[];

/**
 * The fixed scenario set, ported verbatim from scripts/capture-ranking.mts
 * (labels + tx + monthlySpending unchanged). Exercises dining, tiered
 * designated-merchant spend around sc-smart's caps, foreign spend, and travel.
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

/** Serialize one ranked entry with the exact stable field ordering from capture-ranking.mts. */
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

describe('fiat ranking is byte-identical (TECH-01)', () => {
  it('matches the committed baseline snapshot for the full 11-card corpus', () => {
    const lines: string[] = [];
    for (const { label, tx, monthlySpending } of scenarios) {
      // NO rate table → fiat path only. Serialize EVERY recommendation (full
      // ranking), not just target ids, so any reorder anywhere fails the test.
      const result = recommendCards(
        corpus,
        tx,
        monthlySpending !== undefined ? { monthlySpending } : undefined,
      );
      for (const entry of result.recommendations) {
        lines.push(serializeEntry(label, entry));
      }
    }
    expect(lines.join('\n')).toMatchSnapshot();
  });
});
