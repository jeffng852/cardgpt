/**
 * Unit tests for the minStaking "not-met-by-default" rule (CRY-04 / DEC-VAL-C).
 *
 * A staking/holding gate is a REAL barrier, not an assumed-met condition (unlike
 * minMonthlySpending). A rule carrying conditions.minStaking must NOT match by
 * default, so a crypto reward is valued at its BASE un-staked tier and an
 * unstaked user is never valued at a tier they haven't unlocked (T-07-STK,
 * fail-closed). Rules WITHOUT minStaking are unaffected (fiat untouched).
 */

import { describe, it, expect } from 'vitest';
import { calculateReward } from '../calculateReward';
import type { CreditCard, RewardRule } from '@/types/card';
import type { Transaction } from '@/types/transaction';

const baseRule: RewardRule = {
  id: 'base-crypto',
  categories: ['all'],
  rewardRate: 0.01,
  rewardUnit: 'crypto',
  priority: 'base',
  isPromotional: false,
  description: 'Base 1% crypto reward',
};

/** A higher tier gated behind staking — must NOT match by default. */
const stakedTierRule: RewardRule = {
  id: 'staked-tier',
  categories: ['all'],
  rewardRate: 0.05,
  rewardUnit: 'crypto',
  priority: 'bonus',
  isPromotional: false,
  description: 'Up to 5% if you stake 1000 CRO',
  conditions: { minStaking: { amount: 1000, asset: 'CRO' } },
};

/** Same higher tier but WITHOUT a staking gate — a control that MUST apply. */
const unGatedBonusRule: RewardRule = {
  ...stakedTierRule,
  id: 'ungated-tier',
  description: 'Flat 5% bonus, no staking',
  conditions: undefined,
};

function makeCard(rewards: RewardRule[], id = 'crypto-card'): CreditCard {
  return {
    id,
    name: 'Test Crypto Card',
    issuer: 'TestBank',
    cardType: 'crypto',
    rewards,
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-24',
    rewardPrograms: { crypto: { name: 'Crypto.com Coin', shortName: 'CRO' } },
  };
}

const tx: Transaction = { amount: 1000, currency: 'HKD', category: 'retail', paymentType: 'offline' };

describe('minStaking = not-met-by-default (DEC-VAL-C)', () => {
  it('excludes a staking-gated tier: valued at the base un-staked rate', () => {
    const calc = calculateReward(makeCard([baseRule, stakedTierRule]), tx);
    // Only the base rule applies; the gated tier's ruleId is absent.
    expect(calc.appliedRules).toContain('base-crypto');
    expect(calc.appliedRules).not.toContain('staked-tier');
    // Effective rate is the base rate only (0.01), not base+staked (0.06).
    expect(calc.effectiveRate).toBeCloseTo(0.01, 6);
    expect(calc.rewardAmount).toBeCloseTo(10, 6); // 1000 * 0.01
  });

  it('leaves a non-minStaking bonus rule fully matched (fiat/rules unaffected)', () => {
    const calc = calculateReward(makeCard([baseRule, unGatedBonusRule]), tx);
    expect(calc.appliedRules).toContain('base-crypto');
    expect(calc.appliedRules).toContain('ungated-tier');
    // base 0.01 + bonus 0.05 = 0.06 — the guard only fires on minStaking.
    expect(calc.effectiveRate).toBeCloseTo(0.06, 6);
  });

  it('values the base tier identically whether or not a staked tier exists', () => {
    const withGate = calculateReward(makeCard([baseRule, stakedTierRule]), tx);
    const baseOnly = calculateReward(makeCard([baseRule], 'base-only'), tx);
    expect(withGate.effectiveRate).toBeCloseTo(baseOnly.effectiveRate, 6);
    expect(withGate.rewardAmount).toBeCloseTo(baseOnly.rewardAmount, 6);
  });
});
