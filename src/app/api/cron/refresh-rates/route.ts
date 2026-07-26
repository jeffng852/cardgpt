/**
 * Vercel Cron: refresh the crypto→HKD rate table (D-02, D-02a, D-04).
 *
 * Flow: CRON_SECRET Bearer gate (reject-first, T-08-CRON) → graceful no-op when the CMC
 * key is unset (D-02a) → id-based CMC fetch with boundary-validated prices (T-08-RATE,
 * via fetchCryptoRates) → stamp `asOf` → merge-write via writeRateTableToRedis from 08-03
 * (D-04: a failure never nulls last-known rates).
 *
 * Security:
 *  - T-08-CRON (ASVS V2/V4): the Authorization header must equal `Bearer ${CRON_SECRET}`;
 *    an unset CRON_SECRET is reject-all (never allow-all). The 401 is returned BEFORE any
 *    CoinMarketCap call or Redis write — no work happens for an unauthenticated caller.
 *  - T-08-KEY (ASVS V5): COINMARKETCAP_API_KEY / CRON_SECRET are read only from process.env
 *    inside this server-only route; never inlined, never in vercel.json, never client-bound.
 *  - D-04: the CMC fetch + write are wrapped in try/catch — a non-2xx / network / write
 *    failure logs and returns WITHOUT overwriting the 'crypto-rates' key.
 */

import type { NextRequest } from 'next/server';
import type { HkdRateTable } from '@/types/card';
import { CMC_ID_TO_TICKER, fetchCryptoRates } from '@/lib/data/fetchCryptoRates';
import { writeRateTableToRedis } from '@/lib/data/redisStorage';

// Never statically cache — this route mutates external state on every scheduled invocation.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ---- T-08-CRON: reject-first Bearer gate (before ANY fetch or Redis write) ----
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ---- D-02a: graceful no-op when the CMC key isn't configured yet ----
  const cmcKey = process.env.COINMARKETCAP_API_KEY;
  if (!cmcKey) {
    console.warn('[cron/refresh-rates] COINMARKETCAP_API_KEY not set — skipping refresh.');
    return Response.json({ skipped: true });
  }

  // ---- fetch → validate → merge-write (D-04: failure leaves the table untouched) ----
  try {
    const ids = Object.keys(CMC_ID_TO_TICKER).map(Number);
    const rates = await fetchCryptoRates(ids); // throws on non-2xx (soft failure)

    const asOf = new Date().toISOString();
    const fresh: HkdRateTable = {};
    for (const [ticker, hkdPerUnit] of Object.entries(rates)) {
      fresh[ticker] = { hkdPerUnit, asOf };
    }

    // Merge-write from 08-03: tickers absent from `fresh` keep their last-known rate.
    await writeRateTableToRedis(fresh);

    return Response.json({ success: true, updated: Object.keys(fresh) });
  } catch (error) {
    // A CMC failure (non-2xx, credit exhaustion, network) must NOT touch Redis — the
    // last-known 'crypto-rates' table stays intact (D-04). Not a 500: the schedule retries.
    console.error('[cron/refresh-rates] refresh failed — table left untouched:', error);
    return Response.json({ success: false, error: 'refresh_failed' }, { status: 502 });
  }
}
