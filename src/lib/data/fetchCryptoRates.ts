/**
 * CoinMarketCap crypto→HKD price client (D-02, D-03, T-08-RATE, T-08-KEY).
 *
 * A single native-fetch call against CMC's v2 quotes endpoint, queried by numeric `id`
 * (NEVER by `symbol`): the v2 `symbol=` response returns an ARRAY per ticker because
 * multiple coins can share a ticker, so `data[SYMBOL][0]` risks silently picking the
 * wrong asset (08-RESEARCH Pitfall 1). Querying by id returns one unambiguous object per
 * requested asset, which we then map back to the locked `shortName` ticker via an explicit
 * allowlist.
 *
 * Security (T-08-KEY): COINMARKETCAP_API_KEY is read ONLY from process.env here, inside a
 * server-only module — never inlined, never imported by client code. No new npm package:
 * one native `fetch` (Don't Hand-Roll — the Basic tier is one batched call per refresh).
 *
 * Boundary (T-08-RATE, ASVS V5): a price is accepted only when it is a finite number
 * greater than zero; a zero/negative/non-numeric/absent price is dropped rather than
 * fabricated as a rate. A non-2xx CMC response THROWS so the caller degrades and the
 * merge-write from 08-03 leaves the last-known table untouched (D-04).
 */

/**
 * Locked CMC numeric id → `shortName` ticker allowlist. The ticker string must match the
 * EXACT casing keyed by HkdRateTable / rewardPrograms.crypto.shortName (src/types/card.ts).
 * Covers the 08-02 fixture's mapped tickers (USDC, ETH); "NULLX" is intentionally NOT
 * mapped, so it stays null-rate. Every id here is a well-known CMC UCID (verified against
 * CoinMarketCap's own reference per Assumption A1): 1027 = Ethereum, 3408 = USD Coin.
 * Extend deliberately as real assets are added; a ticker absent from this map is simply
 * not fetched (it keeps its last-known Redis rate, never nulled).
 */
export const CMC_ID_TO_TICKER: Record<number, string> = {
  1027: 'ETH',
  3408: 'USDC',
};

const CMC_QUOTES_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';

/**
 * Fetch HKD prices for the given CMC numeric ids in ONE batched call (credit-budget aware,
 * D-02a). Returns a partial map of resolved rates keyed by ticker — only assets whose price
 * cleared the boundary check appear; nothing is ever fabricated or nulled.
 *
 * @throws on a non-2xx CMC response (treat ANY non-2xx as a soft failure — Assumption A2,
 *   do not special-case 429) so the caller can degrade without touching Redis (D-04).
 */
export async function fetchCryptoRates(ids: number[]): Promise<Record<string, number>> {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) {
    // Callers must gate on the key before invoking; guard here so a misuse can't leak an
    // `undefined` header value to the network.
    throw new Error('[fetchCryptoRates] COINMARKETCAP_API_KEY is not set');
  }

  const url = `${CMC_QUOTES_URL}?id=${ids.join(',')}&convert=HKD`;
  const res = await fetch(url, {
    headers: { 'X-CMC_PRO_API_KEY': apiKey },
  });

  if (!res.ok) {
    // Any non-2xx (rate limit, credit exhaustion, outage) is a soft failure → throw.
    throw new Error(`[fetchCryptoRates] CoinMarketCap responded ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: Record<string, { quote?: { HKD?: { price?: unknown } } }>;
  };

  const out: Record<string, number> = {};
  for (const id of ids) {
    const ticker = CMC_ID_TO_TICKER[id];
    if (!ticker) continue; // id not in the allowlist — skip (never guess a ticker)

    const price = json.data?.[String(id)]?.quote?.HKD?.price;
    // Boundary check: accept only a finite number greater than zero (T-08-RATE).
    if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
      out[ticker] = price;
    }
    // else: drop this asset for THIS run — the merge-write preserves its last-known rate.
  }

  return out;
}
