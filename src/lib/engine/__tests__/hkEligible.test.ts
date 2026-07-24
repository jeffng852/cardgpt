/**
 * Fail-closed `hkEligible` gate in recommendCards() (CRY-05, T-07-GATE).
 *
 * The gate lives in the base eligibility filter, BEFORE partition/sort, so an
 * HK-ineligible card reaches NEITHER `recommendations` NOR `cryptoSegment`. It is
 * fail-closed strictly on an explicit `hkEligible === false`: `undefined` (the 11
 * legacy cards) and `true` stay eligible. Gating on falsy would wrongly exclude
 * `undefined` — these tests lock the `=== false` semantics.
 */

import { describe, it, expect } from 'vitest';
import { recommendCards } from '../recommendCards';
import cardsData from '@/data/cards.json';
import type { CreditCard, HkdRateTable } from '@/types/card';
import type { Transaction } from '@/types/transaction';

const corpus = (cardsData as { cards: unknown[] }).cards as unknown as CreditCard[];

const TX: Transaction = { amount: 500, currency: 'HKD', category: 'dining', paymentType: 'offline' };

/** A minimal active fiat (credit) card carrying one base cash rule. */
function fiatCard(id: string, hkEligible?: boolean): CreditCard {
  return {
    id,
    name: `Card ${id}`,
    issuer: 'TestBank',
    cardType: 'credit',
    rewards: [
      {
        id: `${id}-base`,
        categories: ['all'],
        rewardRate: 0.01,
        rewardUnit: 'cash',
        priority: 'base',
        isPromotional: false,
        description: 'Base 1% cashback',
      },
    ],
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-24',
    hkEligible,
  };
}

/** A minimal active crypto card paying a USDC reward (valuable via the rate table below). */
function cryptoCard(id: string, hkEligible?: boolean): CreditCard {
  return {
    id,
    name: `Card ${id}`,
    issuer: 'TestBank',
    cardType: 'crypto',
    rewards: [
      {
        id: `${id}-base`,
        categories: ['all'],
        rewardRate: 0.02,
        rewardUnit: 'crypto',
        priority: 'base',
        isPromotional: false,
        description: 'Base 2% USDC',
      },
    ],
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-24',
    rewardPrograms: { crypto: { name: 'USDC', shortName: 'USDC' } },
    hkEligible,
  };
}

const USDC_RATES: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: '2026-07-24T00:00:00.000Z' } };

describe('hkEligible fail-closed gate (CRY-05)', () => {
  it('excludes a card with hkEligible === false from recommendations', () => {
    const cards = [fiatCard('keep-undef'), fiatCard('drop-false', false)];
    const result = recommendCards(cards, TX);
    const ids = result.recommendations.map(r => r.card.id);
    expect(ids).toContain('keep-undef');
    expect(ids).not.toContain('drop-false');
  });

  it('includes cards with hkEligible === undefined and === true', () => {
    const cards = [fiatCard('undef'), fiatCard('explicit-true', true)];
    const result = recommendCards(cards, TX);
    const ids = result.recommendations.map(r => r.card.id);
    expect(ids).toContain('undef');
    expect(ids).toContain('explicit-true');
    expect(result.recommendations).toHaveLength(2);
  });

  it('gates on === false, not falsy: the 11-card corpus (all undefined) still yields 11', () => {
    const result = recommendCards(corpus, TX);
    expect(result.recommendations).toHaveLength(11);
    expect(result.eligibleCardsCount).toBe(11);
  });

  it('drops every explicit-false card even when mixed into the corpus', () => {
    const cards = [...corpus, fiatCard('ineligible', false)];
    const result = recommendCards(cards, TX);
    const ids = result.recommendations.map(r => r.card.id);
    expect(ids).not.toContain('ineligible');
    expect(result.recommendations).toHaveLength(11);
  });

  // NIT-2 (QA-Karen, PR #8): the gate is fail-closed on the CRYPTO surface too — an
  // hkEligible === false crypto card must not leak into cryptoSegment. Structurally
  // guaranteed (gate runs before partition), locked here so a future refactor can't regress it.
  it('excludes an hkEligible === false crypto card from cryptoSegment (fail-closed on the crypto surface)', () => {
    const cards = [cryptoCard('crypto-keep'), cryptoCard('crypto-drop', false)];
    const result = recommendCards(cards, TX, undefined, USDC_RATES);
    const segIds = (result.cryptoSegment ?? []).map(r => r.card.id);
    expect(segIds).toContain('crypto-keep');
    expect(segIds).not.toContain('crypto-drop');
  });
});
