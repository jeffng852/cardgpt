/**
 * CRON_SECRET-gated crypto rate-refresh cron — the Phase 8 tracer (THI-294).
 *
 * Proves the full D-02 / D-04 machinery end-to-end with mocked fetch + mocked Redis:
 *  - T-08-CRON (auth): the route rejects any request whose Authorization header is not
 *    `Bearer ${CRON_SECRET}` with 401 BEFORE any CoinMarketCap call or Redis write; an
 *    unset CRON_SECRET is reject-all (never allow-all). ASVS V2/V4.
 *  - D-02a (graceful degradation): a valid Bearer but an unset COINMARKETCAP_API_KEY
 *    returns a 200 skipped no-op — no fetch, no write — so local build/dev never breaks.
 *  - T-08-RATE (boundary): fetchCryptoRates queries CMC by numeric id (never symbol),
 *    maps id → locked shortName ticker via the allowlist, and accepts a price ONLY when it
 *    is a number greater than zero; a zero/negative/non-numeric price is dropped, not
 *    written as a rate.
 *  - D-04 (failure preserves the table): a thrown CMC fetch (non-2xx) results in NO Redis
 *    write, so the last-known 'crypto-rates' table (merged by writeRateTableToRedis from
 *    08-03) is left untouched.
 *  - T-08-KEY: no real key values appear here — global.fetch is mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// Spy on the 08-03 merge-write; the route must call it (never re-implement the merge).
const { mockWrite } = vi.hoisted(() => ({ mockWrite: vi.fn() }));
vi.mock('@/lib/data/redisStorage', () => ({
  writeRateTableToRedis: mockWrite,
}));

// Imported AFTER the mock is registered so the route's writeRateTableToRedis is the spy.
import { GET } from '../refresh-rates/route';

const CMC_ETH_ID = '1027';
const CMC_USDC_ID = '3408';

/** Build a minimal request; NextRequest only .headers.get('authorization') is read. */
function req(authorization?: string): NextRequest {
  const init = authorization ? { headers: { authorization } } : undefined;
  return new Request('http://localhost/api/cron/refresh-rates', init) as unknown as NextRequest;
}

/** A CMC /v2/cryptocurrency/quotes/latest?convert=HKD success body for the given prices. */
function cmcBody(prices: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const [id, price] of Object.entries(prices)) {
    data[id] = { quote: { HKD: { price } } };
  }
  return { data };
}

function okFetch(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

beforeEach(() => {
  mockWrite.mockReset();
  mockWrite.mockResolvedValue({ success: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('cron/refresh-rates — CRON_SECRET reject-first gate (T-08-CRON, ASVS V2/V4)', () => {
  it('401s a request with NO Authorization header — no fetch, no write', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = okFetch(cmcBody({}));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('401s a WRONG Bearer token — no fetch, no write', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = okFetch(cmcBody({}));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer wrong'));

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('401s when CRON_SECRET is UNSET even with a Bearer header (reject-all, never allow-all)', async () => {
    // CRON_SECRET intentionally not stubbed.
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = okFetch(cmcBody({}));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer topsecret'));

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe('cron/refresh-rates — graceful no-op when the CMC key is unset (D-02a)', () => {
  it('200 skipped, no fetch, no write when COINMARKETCAP_API_KEY is unset', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    // COINMARKETCAP_API_KEY intentionally not stubbed.
    const fetchSpy = okFetch(cmcBody({}));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer topsecret'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe('cron/refresh-rates — happy path fetches id-based prices and merge-writes', () => {
  it('maps ids to tickers, stamps asOf, and calls writeRateTableToRedis with resolved rates', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = okFetch(cmcBody({ [CMC_ETH_ID]: 31000, [CMC_USDC_ID]: 7.8 }));
    vi.stubGlobal('fetch', fetchSpy);

    const before = Date.now();
    const res = await GET(req('Bearer topsecret'));
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // id-based lookup: the CMC URL carries numeric ids and convert=HKD, not symbols.
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('convert=HKD');
    expect(url).toContain(CMC_ETH_ID);
    expect(url).toContain(CMC_USDC_ID);
    expect(url).not.toContain('symbol=');

    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0];
    expect(written.ETH.hkdPerUnit).toBe(31000);
    expect(written.USDC.hkdPerUnit).toBe(7.8);
    // asOf is a fresh ISO timestamp captured during the run (drives Phase 7 staleness).
    const asOf = Date.parse(written.ETH.asOf);
    expect(asOf).toBeGreaterThanOrEqual(before - 1000);
    expect(asOf).toBeLessThanOrEqual(after + 1000);
  });
});

describe('cron/refresh-rates — price boundary rejection (T-08-RATE, ASVS V5)', () => {
  it('drops a zero/negative/non-numeric price; only the valid ticker is written', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    // ETH price is zero (bad), USDC is a valid positive number.
    const fetchSpy = okFetch(cmcBody({ [CMC_ETH_ID]: 0, [CMC_USDC_ID]: 7.8 }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer topsecret'));

    expect(res.status).toBe(200);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0];
    expect(written.USDC.hkdPerUnit).toBe(7.8);
    expect(written.ETH).toBeUndefined(); // zero price is not written as a rate
  });

  it('drops a non-numeric (string/null) price at the boundary', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = okFetch(cmcBody({ [CMC_ETH_ID]: 'oops', [CMC_USDC_ID]: null }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer topsecret'));

    expect(res.status).toBe(200);
    // Both prices are invalid → nothing resolved → merge-write called with an empty
    // table (the merge leaves last-known rates untouched — D-04).
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite.mock.calls[0][0]).toEqual({});
  });
});

describe('cron/refresh-rates — a CMC failure leaves the table untouched (D-04)', () => {
  it('does NOT write when the CMC fetch returns a non-2xx (thrown soft failure)', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ status: { error_message: 'rate limited' } }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer topsecret'));

    // Graceful: logged, no throw to a 500, and crucially NO Redis write.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(mockWrite).not.toHaveBeenCalled();
    expect(res.status).not.toBe(500);
  });

  it('does NOT write when the CMC fetch rejects outright (network error)', async () => {
    vi.stubEnv('CRON_SECRET', 'topsecret');
    vi.stubEnv('COINMARKETCAP_API_KEY', 'cmc-key');
    const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await GET(req('Bearer topsecret'));

    expect(mockWrite).not.toHaveBeenCalled();
    expect(res.status).not.toBe(500);
  });
});
