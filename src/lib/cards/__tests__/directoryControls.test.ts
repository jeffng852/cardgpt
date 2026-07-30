/**
 * directoryControls — pure filter/sort logic for the Card Directory (Phase 9, DIR-01).
 *
 * Node-env vitest, mirroring buildCardView.test.ts's `makeCard` fixture pattern
 * (single-artifact simplicity — no component-render devDependency). Locks the
 * search (name OR issuer) + sort (reward rate / annual fee / name) contract that
 * CardDirectoryClient consumes (09-CONTEXT D-03). Filters are deferred (RQ-001).
 */

import { describe, it, expect } from 'vitest';
import {
  filterCards,
  sortCards,
  topRewardRate,
  isSortKey,
  type SortKey,
} from '../directoryControls';
import type { CreditCard, RewardRule } from '@/types/card';

function makeRule(overrides: Partial<RewardRule> = {}): RewardRule {
  return {
    id: 'base',
    rewardRate: 0.01,
    rewardUnit: 'cash',
    priority: 'base',
    isPromotional: false,
    description: 'Base 1%',
    categories: ['all'],
    ...overrides,
  };
}

function makeCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'test-card',
    name: 'Test Rewards Card',
    issuer: 'Test Bank',
    cardType: 'credit',
    applyUrl: 'https://issuer.example.com/apply',
    rewards: [makeRule()],
    fees: { annualFee: 1800, foreignTransactionFeeRate: 0.02 },
    isActive: true,
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// A small, deterministic set spanning distinct names / issuers / fees / rates.
function fixtureCards(): CreditCard[] {
  return [
    makeCard({
      id: 'citi-cashback',
      name: 'Citi Cash Back Card',
      issuer: 'Citibank',
      fees: { annualFee: 0 },
      rewards: [makeRule({ rewardRate: 0.02 }), makeRule({ id: 'dining', rewardRate: 0.05, categories: ['dining'] })],
    }),
    makeCard({
      id: 'hsbc-red',
      name: 'HSBC Red Card',
      issuer: 'HSBC',
      fees: { annualFee: 1800 },
      rewards: [makeRule({ rewardRate: 0.04 })],
    }),
    makeCard({
      id: 'dbs-black',
      name: 'DBS Black World Mastercard',
      issuer: 'DBS Bank',
      fees: { annualFee: 3600 },
      rewards: [makeRule({ rewardRate: 0.01 }), makeRule({ id: 'travel', rewardRate: 0.03, categories: ['travel'] })],
    }),
  ];
}

describe('topRewardRate', () => {
  it('returns the max rewardRate across the card rewards', () => {
    expect(topRewardRate(fixtureCards()[0])).toBe(0.05); // citi: max(0.02, 0.05)
    expect(topRewardRate(fixtureCards()[1])).toBe(0.04); // hsbc: single rule
  });

  it('returns 0 when the card has no rewards', () => {
    expect(topRewardRate(makeCard({ rewards: [] }))).toBe(0);
  });
});

describe('filterCards', () => {
  it('returns all cards unchanged for an empty query', () => {
    const cards = fixtureCards();
    expect(filterCards(cards, '')).toEqual(cards);
  });

  it('returns all cards for a whitespace-only query (trimmed)', () => {
    const cards = fixtureCards();
    expect(filterCards(cards, '   ')).toEqual(cards);
  });

  it('matches on card name, case-insensitively', () => {
    const result = filterCards(fixtureCards(), 'red');
    expect(result.map((c) => c.id)).toEqual(['hsbc-red']);
  });

  it('matches on issuer, case-insensitively', () => {
    const result = filterCards(fixtureCards(), 'citi');
    // "citi" is in both the Citi card NAME and the Citibank ISSUER — one card.
    expect(result.map((c) => c.id)).toEqual(['citi-cashback']);
  });

  it('matches issuer even when the query is absent from the name', () => {
    const result = filterCards(fixtureCards(), 'dbs bank');
    expect(result.map((c) => c.id)).toEqual(['dbs-black']);
  });

  it('trims surrounding whitespace before matching', () => {
    const result = filterCards(fixtureCards(), '  hsbc  ');
    expect(result.map((c) => c.id)).toEqual(['hsbc-red']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterCards(fixtureCards(), 'zzz')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const cards = fixtureCards();
    const snapshot = cards.map((c) => c.id);
    filterCards(cards, 'citi');
    expect(cards.map((c) => c.id)).toEqual(snapshot);
  });
});

describe('sortCards', () => {
  it('sorts by reward rate descending (top reward rate)', () => {
    const result = sortCards(fixtureCards(), 'rewardRate');
    expect(result.map((c) => c.id)).toEqual(['citi-cashback', 'hsbc-red', 'dbs-black']); // 0.05, 0.04, 0.03
  });

  it('sorts by annual fee ascending', () => {
    const result = sortCards(fixtureCards(), 'annualFee');
    expect(result.map((c) => c.id)).toEqual(['citi-cashback', 'hsbc-red', 'dbs-black']); // 0, 1800, 3600
  });

  it('sorts by name ascending (locale-aware)', () => {
    const result = sortCards(fixtureCards(), 'name');
    // Citi Cash Back, DBS Black..., HSBC Red
    expect(result.map((c) => c.id)).toEqual(['citi-cashback', 'dbs-black', 'hsbc-red']);
  });

  it('does not mutate the input array (operates on a copy)', () => {
    const cards = fixtureCards();
    const snapshot = cards.map((c) => c.id);
    sortCards(cards, 'rewardRate');
    expect(cards.map((c) => c.id)).toEqual(snapshot);
  });

  it('returns a stable copy for an unrecognized key (fail-safe, T-09-03-02)', () => {
    const cards = fixtureCards();
    const result = sortCards(cards, 'bogus' as SortKey);
    expect(result.map((c) => c.id)).toEqual(cards.map((c) => c.id));
    expect(result).not.toBe(cards);
  });
});

describe('isSortKey', () => {
  it('accepts the three valid sort keys', () => {
    expect(isSortKey('rewardRate')).toBe(true);
    expect(isSortKey('annualFee')).toBe(true);
    expect(isSortKey('name')).toBe(true);
  });

  it('rejects unknown / null values', () => {
    expect(isSortKey('bogus')).toBe(false);
    expect(isSortKey(null)).toBe(false);
    expect(isSortKey(undefined)).toBe(false);
  });
});
