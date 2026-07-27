/**
 * loadCards validation: "recommendable" is decoupled from "has an affiliate link" (D-06 / AFF-02).
 *
 * Phase 8 removes the `applyUrl` hard-drop from `validateCard` (was loadCards.ts:49-52).
 * A structurally-valid card without an affiliate link must now pass validation, so it
 * still loads, ranks, and can be recommended. Every OTHER validation branch (id, name,
 * issuer, rewards, fees.annualFee, isActive) is unchanged — a card failing one of those
 * is still dropped. The live 11-card corpus (all of which carry an applyUrl) must be
 * unaffected: it still loads to 11 active cards.
 */

import { describe, it, expect } from 'vitest';
import { validateCard, loadCardsSync } from '../loadCards';
import type { CreditCard } from '@/types/card';

/**
 * A minimal structurally-valid active card. `applyUrl` is controlled per-test so we can
 * assert the D-06 change (link presence no longer gates validation).
 */
function card(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'test-card',
    name: 'Test Card',
    issuer: 'TestBank',
    cardType: 'credit',
    rewards: [
      {
        id: 'test-card-base',
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
    ...overrides,
  };
}

describe('validateCard — applyUrl is no longer required (D-06 / AFF-02)', () => {
  it('accepts a structurally-valid card with NO applyUrl (was dropped before D-06)', () => {
    const linkless = card({ applyUrl: undefined });
    expect(validateCard(linkless)).toBe(true);
  });

  it('still accepts a card WITH an applyUrl (no regression)', () => {
    const withLink = card({ applyUrl: 'https://example.com/apply' });
    expect(validateCard(withLink)).toBe(true);
  });

  it('still drops a card failing another rule (missing issuer) — only the applyUrl branch changed', () => {
    // Cast through unknown: we are deliberately building a structurally-invalid card.
    const noIssuer = card({ issuer: undefined as unknown as string });
    expect(validateCard(noIssuer)).toBe(false);
  });
});

describe('loadCardsSync — the live corpus is unaffected', () => {
  it('still loads the 11-card corpus to 11 active cards', () => {
    const cards = loadCardsSync();
    expect(cards).toHaveLength(11);
  });
});
