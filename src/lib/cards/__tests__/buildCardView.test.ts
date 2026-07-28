/**
 * buildCardView — pure view-builder for the shared brutalist card (contract §5).
 *
 * Node-env vitest, mirroring applyCtaProps.test.ts (single-artifact simplicity —
 * no component-render devDependency). Locks the derived-field + CTA-state contract
 * that CreditCardCard (Task 2) and the Phase 9 directory (D-05) both consume.
 */

import { describe, it, expect } from 'vitest';
import { buildCardView } from '../buildCardView';
import { applyCtaProps } from '@/lib/affiliate/applyCtaProps';
import { formatReward } from '@/lib/engine/calculateReward';
import type { CreditCard, CardType } from '@/types/card';
import type { CardRecommendation, RewardCalculation } from '@/types/recommendation';

function makeCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'test-card',
    name: 'Test Rewards Card',
    issuer: 'Test Bank',
    cardType: 'credit',
    applyUrl: 'https://issuer.example.com/apply',
    rewards: [
      {
        id: 'base',
        rewardRate: 0.01,
        rewardUnit: 'cash',
        priority: 'base',
        isPromotional: false,
        description: 'Base 1%',
        categories: ['all'],
      },
      {
        id: 'dining',
        rewardRate: 0.05,
        rewardUnit: 'cash',
        priority: 'bonus',
        isPromotional: false,
        description: 'Dining 5%',
        categories: ['dining'],
      },
    ],
    fees: { annualFee: 1800, foreignTransactionFeeRate: 0.0195 },
    isActive: true,
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCalculation(overrides: Partial<RewardCalculation> = {}): RewardCalculation {
  return {
    cardId: 'test-card',
    rewardAmount: 60,
    rewardUnit: 'cash',
    effectiveRate: 0.06,
    appliedRules: ['base', 'dining'],
    ruleBreakdown: [
      { ruleId: 'base', rate: 0.01, amount: 10, description: 'Base 1%', priority: 'base', isPromotional: false, contributionType: 'base' },
      { ruleId: 'dining', rate: 0.05, amount: 50, description: 'Dining 5%', priority: 'bonus', isPromotional: false, contributionType: 'stacked' },
    ],
    fees: 0,
    cappedOut: false,
    ...overrides,
  };
}

function makeRec(card: CreditCard, calculation: RewardCalculation): CardRecommendation {
  return { card, calculation, rank: 1, isRecommended: true, netValue: calculation.rewardAmount };
}

describe('buildCardView — type badge (contract §1)', () => {
  it.each<[CardType, string]>([
    ['credit', 'CREDIT'],
    ['crypto', 'CRYPTO'],
    ['prepaid', 'PREPAID'],
  ])('maps cardType %s -> badge %s', (cardType, badge) => {
    const view = buildCardView(makeCard({ cardType }), { mode: 'browse' });
    expect(view.typeBadge).toBe(badge);
  });
});

describe('buildCardView — alignment rule (D-06)', () => {
  it('always reserves 2 name lines', () => {
    expect(buildCardView(makeCard(), { mode: 'browse' }).reserveNameLines).toBe(2);
    const card = makeCard();
    expect(
      buildCardView(card, { mode: 'ranked', calculation: makeCalculation() }).reserveNameLines
    ).toBe(2);
  });
});

describe('buildCardView — footer CTA state (AFF-01 / D-05)', () => {
  it('delegates to applyCtaProps and labels APPLY in ranked mode when a link exists', () => {
    const card = makeCard();
    const view = buildCardView(card, { mode: 'ranked', calculation: makeCalculation() });
    expect(view.cta.props).toEqual(applyCtaProps(card.applyUrl));
    expect(view.cta.props?.rel).toBe('sponsored nofollow noopener');
    expect(view.cta.label).toBe('APPLY');
    expect(view.cta.noApplyLink).toBe(false);
  });

  it('labels VIEW CARD in browse mode when a link exists', () => {
    const view = buildCardView(makeCard(), { mode: 'browse' });
    expect(view.cta.label).toBe('VIEW CARD');
    expect(view.cta.noApplyLink).toBe(false);
  });

  it('returns null cta props + noApplyLink when applyUrl is absent', () => {
    const view = buildCardView(makeCard({ applyUrl: undefined }), { mode: 'ranked', calculation: makeCalculation() });
    expect(view.cta.props).toBeNull();
    expect(view.cta.noApplyLink).toBe(true);
  });
});

describe('buildCardView — data grid', () => {
  it('populates reward + topReward + rewardType + fees in ranked mode', () => {
    const card = makeCard();
    const calculation = makeCalculation();
    const view = buildCardView(card, { mode: 'ranked', calculation });
    const rows = Object.fromEntries(view.dataGrid.map((r) => [r.id, r]));

    expect(rows.reward.value).toBe(formatReward(calculation, card));
    expect(rows.reward.accent).toBe(true);
    // top reward = max contribution rate across the breakdown -> 5.0%
    expect(rows.topReward.value).toBe('5.0%');
    expect(rows.rewardType).toBeDefined();
    expect(rows.annualFee.value).toBe('$1,800');
    expect(rows.annualFee.free).toBe(false);
    expect(rows.fxFee.value).toBe('2.0%');
  });

  it('marks annual fee + fx fee Free when 0/undefined', () => {
    const card = makeCard({ fees: { annualFee: 0 } });
    const view = buildCardView(card, { mode: 'ranked', calculation: makeCalculation() });
    const rows = Object.fromEntries(view.dataGrid.map((r) => [r.id, r]));
    expect(rows.annualFee.free).toBe(true);
    expect(rows.fxFee.free).toBe(true);
  });

  it('omits reward + topReward rows in browse mode (not zeroed)', () => {
    const view = buildCardView(makeCard(), { mode: 'browse' });
    const ids = view.dataGrid.map((r) => r.id);
    expect(ids).not.toContain('reward');
    expect(ids).not.toContain('topReward');
    expect(ids).toContain('rewardType');
    expect(ids).toContain('annualFee');
  });
});

describe('buildCardView — best-for chips', () => {
  it('derives a bounded, non-empty list from existing rule categories', () => {
    const view = buildCardView(makeCard(), { mode: 'browse' });
    expect(view.bestFor.length).toBeGreaterThan(0);
    expect(view.bestFor.length).toBeLessThanOrEqual(3);
    // derived from the dining bonus rule, never fabricated
    expect(view.bestFor).toContain('dining');
    // the universal 'all' category is never surfaced as a chip
    expect(view.bestFor).not.toContain('all');
  });
});

describe('buildCardView — top pick', () => {
  it('passes through isTopPick from opts', () => {
    expect(buildCardView(makeCard(), { mode: 'ranked', calculation: makeCalculation(), isTopPick: true }).isTopPick).toBe(true);
    expect(buildCardView(makeCard(), { mode: 'browse' }).isTopPick).toBe(false);
  });
});

// makeRec kept for parity with the recommendation shape the list passes in.
void makeRec;
