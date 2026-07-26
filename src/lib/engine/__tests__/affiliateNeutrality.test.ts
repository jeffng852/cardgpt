/**
 * Ranking is NEVER reordered by affiliate presence (D-07 / AFF-02).
 *
 * A card carrying an `applyUrl` gets no ranking advantage over one without. This is a
 * STRUCTURAL property: `recommendCards()`'s comparator (net value → reward amount →
 * annual fee → preferred issuer → name alphabetical, PUB-006) contains no `applyUrl`
 * term. These tests lock that in against the real engine — two otherwise-identical
 * cards differing ONLY in `applyUrl` presence produce byte-identical recommendation
 * order, tie-broken by name (not by link), regardless of input order or which card
 * holds the link.
 */

import { describe, it, expect } from 'vitest';
import { recommendCards } from '../recommendCards';
import type { CreditCard } from '@/types/card';
import type { Transaction } from '@/types/transaction';

const TX: Transaction = { amount: 500, currency: 'HKD', category: 'dining', paymentType: 'offline' };

/**
 * Two structurally-identical fiat cards (same rewards/fees/eligibility), distinguished
 * only by id+name. `applyUrl` is supplied per-case so we can move the affiliate link
 * between them without changing anything else that the comparator reads.
 */
function neutralCard(id: string, name: string, applyUrl?: string): CreditCard {
  return {
    id,
    name,
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
    applyUrl,
  };
}

/** Recommendation order (card ids) produced by the real engine for the given card list. */
function order(cards: CreditCard[]): string[] {
  return recommendCards(cards, TX).recommendations.map((r) => r.card.id);
}

describe('affiliate neutrality — applyUrl never reorders ranking (D-07)', () => {
  it('orders by the sort chain (name alphabetical tie-break), not by which card has a link', () => {
    // Alpha sorts before Beta by name; net value / reward / fee are all tied.
    const alphaWithLink = neutralCard('alpha', 'Alpha Card', 'https://example.com/apply');
    const betaNoLink = neutralCard('beta', 'Beta Card', undefined);

    // Same order regardless of INPUT order.
    expect(order([alphaWithLink, betaNoLink])).toEqual(['alpha', 'beta']);
    expect(order([betaNoLink, alphaWithLink])).toEqual(['alpha', 'beta']);
  });

  it('moving the affiliate link to the other card does not change the order', () => {
    // Now Beta holds the link and Alpha does not — order must be identical.
    const alphaNoLink = neutralCard('alpha', 'Alpha Card', undefined);
    const betaWithLink = neutralCard('beta', 'Beta Card', 'https://example.com/apply');

    expect(order([alphaNoLink, betaWithLink])).toEqual(['alpha', 'beta']);
    expect(order([betaWithLink, alphaNoLink])).toEqual(['alpha', 'beta']);
  });

  it('order is byte-identical whether the link is on Alpha, on Beta, or on neither', () => {
    const withOnAlpha = order([
      neutralCard('alpha', 'Alpha Card', 'https://example.com/apply'),
      neutralCard('beta', 'Beta Card', undefined),
    ]);
    const withOnBeta = order([
      neutralCard('alpha', 'Alpha Card', undefined),
      neutralCard('beta', 'Beta Card', 'https://example.com/apply'),
    ]);
    const withOnNeither = order([
      neutralCard('alpha', 'Alpha Card', undefined),
      neutralCard('beta', 'Beta Card', undefined),
    ]);

    expect(withOnAlpha).toEqual(withOnNeither);
    expect(withOnBeta).toEqual(withOnNeither);
  });
});
