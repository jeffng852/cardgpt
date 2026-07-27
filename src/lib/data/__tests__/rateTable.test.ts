/**
 * Rate-table Redis API + engine injection — the Phase 8 tracer (THI-294).
 *
 * Proves the crypto→HKD rate-table consumption path end-to-end (DEC-DATA-002, D-03, D-04):
 *  - readRateTableFromRedis(): clone of readCardsFromRedis against the new 'crypto-rates'
 *    key — returns the stored HkdRateTable, or null (never throws) on an absent key or a
 *    rejected Redis get (08-RESEARCH Pitfall 3 / T-08-RATE-AVAIL).
 *  - writeRateTableToRedis(fresh): read-merge-write — spreads `fresh` OVER the existing
 *    table per-ticker so a partial refresh never nulls a previously-good ticker
 *    (D-04 / 08-RESEARCH Pitfall 2 / T-08-RATE); an empty write leaves the table unchanged.
 *  - Injection: the REAL recommendCards(cards, tx, prefs, rateTable) values a crypto card in
 *    HKD (non-null hkdEquivalent in cryptoSegment); the 3-arg call stays additive (no
 *    cryptoSegment), proving the Phase 7 contract is untouched.
 *
 * Keying is the crypto asset `shortName` ticker in EXACT casing (D-03) — the fixture keys
 * USDC as `USDC`, no normalization at lookup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CreditCard, HkdRateTable } from '@/types/card';
import type { Transaction } from '@/types/transaction';
import { recommendCards } from '@/lib/engine/recommendCards';

// Fake Upstash client: get/set are reconfigurable per test. Hoisted so the vi.mock
// factory (itself hoisted above the imports) can close over them.
const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  // Must be `new`-able (getRedis does `new Redis(...)`), so a class — an arrow
  // function is not a valid constructor.
  Redis: class {
    get = mockGet;
    set = mockSet;
  },
}));

// Imported AFTER the mock is registered so getRedis()'s `new Redis()` is the fake.
import { readRateTableFromRedis, writeRateTableToRedis } from '../redisStorage';

const RATES_KEY = 'crypto-rates';

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockReset();
  mockSet.mockResolvedValue('OK');
});

describe('readRateTableFromRedis — null-safe read (Pitfall 3 / T-08-RATE-AVAIL)', () => {
  it('returns the stored HkdRateTable when the crypto-rates key exists', async () => {
    const stored: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: '2026-07-24T00:00:00.000Z' } };
    mockGet.mockResolvedValue(stored);

    const table = await readRateTableFromRedis();

    expect(mockGet).toHaveBeenCalledWith(RATES_KEY);
    expect(table).toEqual(stored);
  });

  it('returns null when the key is absent (get resolves null) — page degrades, no 500', async () => {
    mockGet.mockResolvedValue(null);
    await expect(readRateTableFromRedis()).resolves.toBeNull();
  });

  it('returns null (never throws) when the Redis get rejects', async () => {
    mockGet.mockRejectedValue(new Error('redis down'));
    await expect(readRateTableFromRedis()).resolves.toBeNull();
  });
});

describe('writeRateTableToRedis — merge-not-overwrite (D-04 / Pitfall 2 / T-08-RATE)', () => {
  it('preserves a pre-existing ticker absent from the partial write (never nulled)', async () => {
    const existing: HkdRateTable = {
      USDC: { hkdPerUnit: 7.8, asOf: '2026-07-24T00:00:00.000Z' },
      ETH: { hkdPerUnit: 30000, asOf: '2026-07-24T00:00:00.000Z' },
    };
    mockGet.mockResolvedValue(existing);

    // A refresh that only carries ETH must not drop USDC.
    const fresh: HkdRateTable = { ETH: { hkdPerUnit: 31000, asOf: '2026-07-25T00:00:00.000Z' } };
    const result = await writeRateTableToRedis(fresh);

    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, written] = mockSet.mock.calls[0];
    expect(key).toBe(RATES_KEY);
    // USDC survives untouched; ETH is updated to the fresh value.
    expect(written).toEqual({
      USDC: { hkdPerUnit: 7.8, asOf: '2026-07-24T00:00:00.000Z' },
      ETH: { hkdPerUnit: 31000, asOf: '2026-07-25T00:00:00.000Z' },
    });
  });

  it('writes a fresh ticker into an empty (absent) table', async () => {
    mockGet.mockResolvedValue(null);
    const fresh: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: '2026-07-24T00:00:00.000Z' } };

    await writeRateTableToRedis(fresh);

    const [, written] = mockSet.mock.calls[0];
    expect(written).toEqual(fresh);
  });

  it('leaves the stored table unchanged when freshRates is empty', async () => {
    const existing: HkdRateTable = { USDC: { hkdPerUnit: 7.8, asOf: '2026-07-24T00:00:00.000Z' } };
    mockGet.mockResolvedValue(existing);

    await writeRateTableToRedis({});

    const [, written] = mockSet.mock.calls[0];
    expect(written).toEqual(existing);
  });

  it('returns { success: false } (never throws) when the Redis get rejects', async () => {
    mockGet.mockRejectedValue(new Error('redis down'));
    await expect(writeRateTableToRedis({ USDC: { hkdPerUnit: 7.8, asOf: 'x' } })).resolves.toEqual({
      success: false,
    });
  });
});

// ===== Integration: an injected rate table drives the REAL engine =====

const TX: Transaction = { amount: 500, currency: 'HKD', category: 'dining', paymentType: 'offline' };

/** A minimal active crypto card paying a USDC reward (valuable via the rate table below). */
function cryptoCard(): CreditCard {
  return {
    id: 'crypto-usdc',
    name: 'Crypto USDC Card',
    issuer: 'TestBank',
    cardType: 'crypto',
    rewards: [
      {
        id: 'crypto-usdc-base',
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
  };
}

describe('engine injection — the rate table makes the crypto path go live (DEC-DATA-002)', () => {
  const RATE_TABLE: HkdRateTable = {
    USDC: { hkdPerUnit: 7.8, asOf: new Date().toISOString() },
  };

  it('values a crypto card in HKD (non-null hkdEquivalent) when a rate table is injected', () => {
    const result = recommendCards([cryptoCard()], TX, undefined, RATE_TABLE);

    expect(result.cryptoSegment).toBeDefined();
    expect(result.cryptoSegment).toHaveLength(1);
    const entry = result.cryptoSegment![0];
    expect(entry.hkdEquivalent).not.toBeNull();
    expect(typeof entry.hkdEquivalent).toBe('number');
    expect(entry.hkdEquivalent!).toBeGreaterThan(0);
  });

  it('omits cryptoSegment on the 3-arg call (additive Phase 7 contract stays byte-identical)', () => {
    const result = recommendCards([cryptoCard()], TX, undefined);
    expect(result.cryptoSegment).toBeUndefined();
  });
});
