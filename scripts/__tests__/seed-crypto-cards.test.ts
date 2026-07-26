/**
 * Unit tests for the pure mergeCards(existing, incoming) helper (D-09 / T-08-SEED).
 *
 * WHY THIS EXISTS: the crypto seed script (scripts/seed-crypto-cards.mjs) mutates the
 * LIVE production Redis `cards` key. The single most safety-critical property is that a
 * seed run NEVER clobbers the 11 credit cards or any live admin edit — it may only APPEND
 * crypto cards by a brand-new id. That property is extracted into a pure, Redis-free
 * function so it can be proven in isolation (RESEARCH Wave-0 gap; backfill-card-type.mjs's
 * own inline merge logic was never unit-tested). These tests are the proof.
 *
 * mergeCards(existing, incoming) → { cards, added }:
 *   - appends an incoming card whose id is NOT already present (added++)
 *   - skips an incoming card whose id already exists — the pre-existing object is
 *     returned untouched (never overwritten from the incoming duplicate)
 *   - never removes or mutates any existing card (all 11 credit ids survive intact)
 *   - re-running on its own output adds 0 (idempotent re-run safety)
 *   - empty incoming returns existing unchanged, added 0
 */

import { describe, it, expect } from 'vitest';
import { mergeCards } from '../lib/mergeCards.mjs';
import type { CreditCard } from '@/types/card';

/** Minimal valid credit card (mirrors the 11 live cards: cardType 'credit', has applyUrl). */
function creditCard(id: string, name = id): CreditCard {
  return {
    id,
    name,
    issuer: 'TestBank',
    cardType: 'credit',
    rewards: [],
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-27',
    applyUrl: `https://example.com/${id}`,
  };
}

/** Minimal valid crypto card (cardType 'crypto', names its asset via rewardPrograms.crypto). */
function cryptoCard(id: string, shortName = 'USDC'): CreditCard {
  return {
    id,
    name: id,
    issuer: 'FixtureBank',
    cardType: 'crypto',
    rewards: [],
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-27',
    rewardPrograms: { crypto: { name: shortName, shortName } },
    hkEligible: true,
  };
}

/** The 11-credit-card baseline the seed must never disturb. */
function elevenCreditCards(): CreditCard[] {
  return Array.from({ length: 11 }, (_, i) => creditCard(`credit-${i + 1}`));
}

describe('mergeCards', () => {
  it('appends an incoming card whose id is new and counts it', () => {
    const existing = [creditCard('a')];
    const { cards, added } = mergeCards(existing, [cryptoCard('crypto-1')]);
    expect(added).toBe(1);
    expect(cards).toHaveLength(2);
    expect(cards.map((c: CreditCard) => c.id)).toEqual(['a', 'crypto-1']);
  });

  it('skips an incoming card whose id already exists and preserves the ORIGINAL object', () => {
    const original = creditCard('dup', 'Original Name');
    const incomingDuplicate = { ...creditCard('dup', 'Changed Name'), issuer: 'Attacker' };
    const { cards, added } = mergeCards([original], [incomingDuplicate]);
    expect(added).toBe(0);
    expect(cards).toHaveLength(1);
    // The pre-existing object wins — never overwritten from the incoming duplicate.
    expect(cards[0]).toBe(original);
    expect(cards[0].name).toBe('Original Name');
    expect(cards[0].issuer).toBe('TestBank');
  });

  it('never mutates or removes existing cards — all 11 credit ids survive a crypto merge', () => {
    const existing = elevenCreditCards();
    const snapshotIds = existing.map((c) => c.id);
    const { cards, added } = mergeCards(existing, [cryptoCard('crypto-usdc', 'USDC')]);
    expect(added).toBe(1);
    // every original credit id is still present...
    for (const id of snapshotIds) {
      expect(cards.map((c: CreditCard) => c.id)).toContain(id);
    }
    // ...as the SAME object reference (untouched), plus the one new crypto card.
    for (let i = 0; i < existing.length; i++) {
      expect(cards[i]).toBe(existing[i]);
    }
    expect(cards).toHaveLength(12);
    expect(cards[11].id).toBe('crypto-usdc');
    // the input array itself was not mutated
    expect(existing).toHaveLength(11);
  });

  it('is idempotent — re-running on its own output adds 0', () => {
    const existing = elevenCreditCards();
    const incoming = [cryptoCard('crypto-eth', 'ETH'), cryptoCard('crypto-usdc', 'USDC')];
    const first = mergeCards(existing, incoming);
    expect(first.added).toBe(2);
    const second = mergeCards(first.cards, incoming);
    expect(second.added).toBe(0);
    expect(second.cards).toHaveLength(first.cards.length);
  });

  it('returns existing unchanged with added 0 for empty incoming', () => {
    const existing = elevenCreditCards();
    const { cards, added } = mergeCards(existing, []);
    expect(added).toBe(0);
    expect(cards.map((c: CreditCard) => c.id)).toEqual(existing.map((c) => c.id));
  });

  it('de-duplicates repeated new ids within the same incoming batch', () => {
    const { cards, added } = mergeCards([], [cryptoCard('same'), cryptoCard('same')]);
    expect(added).toBe(1);
    expect(cards).toHaveLength(1);
  });
});
