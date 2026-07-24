/**
 * Partition-before-sort unit segmentation (DEC-VAL-B / CRY-04 / TECH-01).
 *
 * After the eligibility filter, `recommendCards` splits cards into fiat
 * (`cardType === 'credit'`) and non-fiat (`crypto` | `prepaid`). The EXISTING
 * fiat pipeline runs verbatim on the fiat set → `recommendations` (byte-identical,
 * guarded structurally here + by fiat-regression.test.ts). Non-fiat cards are
 * valued via `valuateCrypto` on a SEPARATE array into the additive optional
 * `cryptoSegment`, ranked by `hkdEquivalent` desc with null (value-unavailable)
 * entries appended unranked. Crypto NEVER enters the fiat comparator.
 *
 * The optional 4th `rateTable` param is additive: passing none leaves
 * `cryptoSegment` absent and `recommendations` unchanged (backward-compatible).
 */

import { describe, it, expect } from 'vitest';
import { recommendCards } from '../recommendCards';
import cardsData from '@/data/cards.json';
import type { CreditCard, HkdRateTable, RewardUnit, CardType } from '@/types/card';
import type { Transaction } from '@/types/transaction';

const corpus = (cardsData as { cards: unknown[] }).cards as unknown as CreditCard[];

const TX: Transaction = { amount: 500, currency: 'HKD', category: 'dining', paymentType: 'offline' };
const FRESH = new Date().toISOString();

/** A minimal active card with one base rule, of the given type + reward unit. */
function card(
  id: string,
  cardType: CardType,
  rewardUnit: RewardUnit = 'cash',
  cryptoShortName?: string,
): CreditCard {
  return {
    id,
    name: `Card ${id}`,
    issuer: 'TestBank',
    cardType,
    rewards: [
      {
        id: `${id}-base`,
        categories: ['all'],
        rewardRate: 0.02,
        rewardUnit,
        priority: 'base',
        isPromotional: false,
        description: 'Base 2%',
      },
    ],
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-24',
    ...(cryptoShortName
      ? { rewardPrograms: { crypto: { name: cryptoShortName, shortName: cryptoShortName } } }
      : {}),
  };
}

describe('partition-before-sort segmentation (DEC-VAL-B)', () => {
  it('returns only credit cards in recommendations; non-fiat go to cryptoSegment', () => {
    const cards = [
      card('fiat-a', 'credit'),
      card('fiat-b', 'credit'),
      card('crypto-usdc', 'crypto', 'crypto', 'USDC'),
      card('prepaid-x', 'prepaid'),
    ];
    const rateTable: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: FRESH } };
    const result = recommendCards(cards, TX, undefined, rateTable);

    const recIds = result.recommendations.map(r => r.card.id);
    expect(recIds).toEqual(expect.arrayContaining(['fiat-a', 'fiat-b']));
    expect(recIds).not.toContain('crypto-usdc');
    expect(recIds).not.toContain('prepaid-x');
    expect(result.recommendations).toHaveLength(2);

    const segIds = result.cryptoSegment?.map(r => r.card.id) ?? [];
    expect(segIds).toContain('crypto-usdc');
    expect(segIds).toContain('prepaid-x');
  });

  it('ranks cryptoSegment by hkdEquivalent desc; null-rate entries appended unranked', () => {
    const cards = [
      card('c-usdc', 'crypto', 'crypto', 'USDC'), // 500*0.02=10 * 7.8 = 78
      card('c-eth', 'crypto', 'crypto', 'ETH'),   // 10 * 5.0 = 50
      card('c-doge', 'crypto', 'crypto', 'DOGE'), // absent from table → null
    ];
    const rateTable: HkdRateTable = {
      USDC: { hkdPerUnit: 7.8, asOf: FRESH },
      ETH: { hkdPerUnit: 5.0, asOf: FRESH },
    };
    const seg = recommendCards(cards, TX, undefined, rateTable).cryptoSegment!;
    expect(seg).toHaveLength(3);

    // Ranked, non-null first, descending by hkdEquivalent.
    expect(seg[0].card.id).toBe('c-usdc');
    expect(seg[0].hkdEquivalent).toBeCloseTo(78, 6);
    expect(seg[0].rank).toBe(1);
    expect(seg[0].isRecommended).toBe(true);

    expect(seg[1].card.id).toBe('c-eth');
    expect(seg[1].hkdEquivalent).toBeCloseTo(50, 6);
    expect(seg[1].rank).toBe(2);
    expect(seg[1].isRecommended).toBe(false);

    // null (value-unavailable) appended last, unranked.
    expect(seg[2].card.id).toBe('c-doge');
    expect(seg[2].hkdEquivalent).toBeNull();
    expect(seg[2].isRecommended).toBe(false);
    // A null entry must never outrank a valued one.
    expect(seg.findIndex(e => e.hkdEquivalent === null)).toBe(2);
  });

  it('no rateTable ⇒ cryptoSegment absent and recommendations unchanged (backward-compatible)', () => {
    const fiatOnly = [card('fiat-a', 'credit'), card('fiat-b', 'credit')];
    const mixed = [...fiatOnly, card('crypto-usdc', 'crypto', 'crypto', 'USDC')];

    const baseline = recommendCards(fiatOnly, TX);
    const noTable = recommendCards(mixed, TX); // crypto present but no rateTable

    expect(noTable.cryptoSegment).toBeUndefined();
    expect(noTable.recommendations.map(r => r.card.id)).toEqual(
      baseline.recommendations.map(r => r.card.id),
    );
    // Crypto is partitioned out of recommendations even without a rateTable.
    expect(noTable.recommendations.map(r => r.card.id)).not.toContain('crypto-usdc');
  });

  it('a rateTable does not perturb the fiat-only 11-card corpus or add a cryptoSegment', () => {
    const rateTable: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: FRESH } };
    const withTable = recommendCards(corpus, TX, undefined, rateTable);
    const withoutTable = recommendCards(corpus, TX);

    expect(withTable.recommendations.map(r => r.card.id)).toEqual(
      withoutTable.recommendations.map(r => r.card.id),
    );
    expect(withTable.recommendations).toHaveLength(11);
    // No non-fiat cards ⇒ no cryptoSegment even with a rate table.
    expect(withTable.cryptoSegment).toBeUndefined();
  });
});
