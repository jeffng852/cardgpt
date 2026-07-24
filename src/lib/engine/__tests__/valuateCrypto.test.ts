/**
 * Unit tests for valuateCrypto() — crypto→HKD valuation (CRY-04 / DEC-VAL-A).
 *
 * Covers: valid+fresh, valid+stale (last-known + flag), asset absent from table,
 * hkdPerUnit zero / negative / NaN, unparseable asOf, and no rate table at all.
 * Every bad-rate path must degrade to hkdEquivalent === null (value unavailable),
 * never a fabricated number or a throw (T-07-VAL / T-07-VAL-b).
 */

import { describe, it, expect } from 'vitest';
import { valuateCrypto } from '../valuateCrypto';
import type { CreditCard, HkdRateTable } from '@/types/card';
import type { RewardCalculation } from '@/types/recommendation';

/** Minimal RewardCalculation carrying a crypto reward amount. */
function calc(rewardAmount: number): RewardCalculation {
  return {
    cardId: 'crypto-card',
    rewardAmount,
    rewardUnit: 'crypto',
    effectiveRate: 0.02,
    appliedRules: ['base'],
    ruleBreakdown: [],
    fees: 0,
    cappedOut: false,
  };
}

/** Minimal crypto CreditCard naming its asset via rewardPrograms.crypto. */
function cryptoCard(shortName?: string, name = 'USD Coin'): CreditCard {
  return {
    id: 'crypto-card',
    name: 'Test Crypto Card',
    issuer: 'TestBank',
    cardType: 'crypto',
    rewards: [],
    fees: { annualFee: 0 },
    isActive: true,
    lastUpdated: '2026-07-24',
    rewardPrograms: { crypto: { name, shortName } },
  };
}

const FRESH = new Date().toISOString();
const STALE = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

describe('valuateCrypto', () => {
  it('values a fresh rate: hkdEquivalent = rewardAmount * hkdPerUnit, rateStale false', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: FRESH } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeCloseTo(78, 6); // 10 * 7.8
    expect(res.rateStale).toBe(false);
    expect(res.rateAsOf).toBe(FRESH);
  });

  it('keeps last-known value but flags a stale rate (>24h old)', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: STALE } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeCloseTo(78, 6); // last-known still computed
    expect(res.rateStale).toBe(true);
    expect(res.rateAsOf).toBe(STALE);
  });

  it('resolves the key via name when shortName is absent', () => {
    const table: HkdRateTable = { 'USD Coin': { hkdPerUnit: 7.8, asOf: FRESH } };
    const res = valuateCrypto(calc(2), cryptoCard(undefined, 'USD Coin'), table);
    expect(res.hkdEquivalent).toBeCloseTo(15.6, 6); // 2 * 7.8
  });

  it('returns null when the asset is absent from the table', () => {
    const table: HkdRateTable = { BTC: { hkdPerUnit: 500000, asOf: FRESH } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeNull();
    expect(res.rateStale).toBe(false);
  });

  it('returns null for a zero rate', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: 0, asOf: FRESH } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeNull();
    expect(res.rateStale).toBe(false);
  });

  it('returns null for a negative rate', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: -7.8, asOf: FRESH } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeNull();
    expect(res.rateStale).toBe(false);
  });

  it('returns null for a NaN rate', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: NaN, asOf: FRESH } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeNull();
    expect(res.rateStale).toBe(false);
  });

  it('returns null (unavailable) when no rate table is passed', () => {
    const res = valuateCrypto(calc(10), cryptoCard('USDC'));
    expect(res.hkdEquivalent).toBeNull();
    expect(res.rateStale).toBe(false);
  });

  it('returns null when the card names no crypto asset', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: FRESH } };
    const noAsset = cryptoCard('USDC');
    delete noAsset.rewardPrograms;
    const res = valuateCrypto(calc(10), noAsset, table);
    expect(res.hkdEquivalent).toBeNull();
    expect(res.rateStale).toBe(false);
  });

  it('treats an unparseable asOf as stale but never throws', () => {
    const table: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: 'not-a-date' } };
    const res = valuateCrypto(calc(10), cryptoCard('USDC'), table);
    expect(res.hkdEquivalent).toBeCloseTo(78, 6); // rate is > 0, so value is kept
    expect(res.rateStale).toBe(true); // non-finite age ⇒ stale
  });
});
