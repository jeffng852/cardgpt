/**
 * Tests for recommendation engine
 *
 * Run with: npm test
 */

import { calculateReward, recommendCards } from '../index';
import type { CreditCard } from '@/types/card';
import type { Transaction } from '@/types/transaction';

// Mock card data for testing
const mockCitiCashBack: CreditCard = {
  id: 'citi-cash-back',
  name: 'Citi Cash Back Card',
  issuer: 'Citibank',
  applyUrl: 'https://example.com',
  rewards: [
    {
      id: 'base-rebate',
      categories: ['all'],
      rewardRate: 0.01,
      rewardUnit: 'cash',
      priority: 'base',
      isPromotional: false,
      description: '1% on all spending',
      excludedMerchants: ['cash-advance', 'casino']
    },
    {
      id: 'local-dining-bonus',
      categories: ['restaurant', 'dining'],
      rewardRate: 0.01,
      rewardUnit: 'cash',
      priority: 'bonus',
      isPromotional: false,
      description: 'Additional 1% on HKD dining',
      conditions: {
        currency: 'HKD'
      }
    }
  ],
  fees: {
    annualFee: 0,
    foreignTransactionFeeRate: 0.0195
  },
  isActive: true,
  lastUpdated: '2026-01-20T00:00:00.000Z'
};

describe('calculateReward', () => {
  it('should calculate 1% base reward for general spending', () => {
    const transaction: Transaction = {
      amount: 1000,
      currency: 'HKD',
      merchantType: 'supermarket',
      paymentType: 'offline'
    };

    const result = calculateReward(mockCitiCashBack, transaction);

    expect(result.rewardAmount).toBe(10); // 1% of 1000
    expect(result.rewardUnit).toBe('cash');
    expect(result.effectiveRate).toBe(0.01);
    expect(result.fees).toBe(0); // No foreign transaction fee for HKD
  });

  it('should calculate 2% for HKD dining (1% base + 1% bonus)', () => {
    const transaction: Transaction = {
      amount: 500,
      currency: 'HKD',
      merchantType: 'restaurant',
      paymentType: 'offline'
    };

    const result = calculateReward(mockCitiCashBack, transaction);

    expect(result.rewardAmount).toBe(10); // 2% of 500
    expect(result.effectiveRate).toBe(0.02);
    expect(result.appliedRules).toContain('base-rebate');
    expect(result.appliedRules).toContain('local-dining-bonus');
  });

  it('should not apply dining bonus for foreign currency', () => {
    const transaction: Transaction = {
      amount: 500,
      currency: 'USD',
      merchantType: 'restaurant',
      paymentType: 'offline'
    };

    const result = calculateReward(mockCitiCashBack, transaction);

    expect(result.effectiveRate).toBe(0.01); // Only base rate
    expect(result.appliedRules).toContain('base-rebate');
    expect(result.appliedRules).not.toContain('local-dining-bonus');
  });

  it('should calculate foreign transaction fees', () => {
    const transaction: Transaction = {
      amount: 1000,
      currency: 'USD',
      merchantType: 'supermarket',
      paymentType: 'online'
    };

    const result = calculateReward(mockCitiCashBack, transaction);

    expect(result.fees).toBe(19.5); // 1.95% of 1000
  });

  it('should exclude excluded merchants', () => {
    const transaction: Transaction = {
      amount: 1000,
      currency: 'HKD',
      merchantType: 'casino',
      paymentType: 'offline'
    };

    const result = calculateReward(mockCitiCashBack, transaction);

    expect(result.rewardAmount).toBe(0);
    expect(result.appliedRules).toHaveLength(0);
  });
});

describe('recommendCards', () => {
  const mockCards: CreditCard[] = [
    mockCitiCashBack,
    {
      id: 'basic-card',
      name: 'Basic Card',
      issuer: 'Basic Bank',
      applyUrl: 'https://example.com',
      rewards: [
        {
          id: 'basic-rate',
          categories: ['all'],
          rewardRate: 0.005, // 0.5%
          rewardUnit: 'cash',
          priority: 'base',
          isPromotional: false,
          description: '0.5% on all spending'
        }
      ],
      fees: {
        annualFee: 0
      },
      isActive: true,
      lastUpdated: '2026-01-20T00:00:00.000Z'
    }
  ];

  it('should rank cards by reward amount', () => {
    const transaction: Transaction = {
      amount: 1000,
      currency: 'HKD',
      merchantType: 'supermarket',
      paymentType: 'offline'
    };

    const result = recommendCards(mockCards, transaction);

    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0].card.id).toBe('citi-cash-back'); // 1% wins
    expect(result.recommendations[0].isRecommended).toBe(true);
    expect(result.recommendations[1].card.id).toBe('basic-card'); // 0.5%
  });

  it('should mark top card as recommended', () => {
    const transaction: Transaction = {
      amount: 500,
      currency: 'HKD',
      merchantType: 'restaurant',
      paymentType: 'offline'
    };

    const result = recommendCards(mockCards, transaction);

    const topCard = result.recommendations[0];
    expect(topCard.isRecommended).toBe(true);
    expect(topCard.rank).toBe(1);
  });

  it('should filter by preferred reward units', () => {
    const transaction: Transaction = {
      amount: 1000,
      currency: 'HKD',
      merchantType: 'supermarket',
      paymentType: 'offline'
    };

    const result = recommendCards(mockCards, transaction, {
      preferredRewardUnits: ['cash']
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
    result.recommendations.forEach(rec => {
      expect(rec.calculation.rewardUnit).toBe('cash');
    });
  });
});
