/**
 * Crypto→HKD valuation helper (Phase 7, CRY-04 / DEC-VAL-A).
 *
 * Values a crypto reward in HKD-equivalent using an INJECTED static rate table
 * (no fetch inside the engine). Fail-safe by design:
 *  - stale rate (asOf older than STALENESS_MS) ⇒ keep the last-known value and
 *    flag `rateStale: true` (DEC-VAL-A — do NOT drop a card for mere staleness);
 *  - missing asset / absent from table / hkdPerUnit <= 0 / NaN / non-number /
 *    unparseable rate ⇒ `hkdEquivalent: null` ("value unavailable", not ranked) —
 *    never fabricate a number, never throw (T-07-VAL / T-07-VAL-b).
 *
 * The HKD-equivalent is used only for intra-crypto ordering + display; it is
 * NEVER folded into the fiat net-value sort (DEC-VAL-B).
 *
 * UNIT SEMANTICS: `calc.rewardAmount` is denominated in the named asset's units
 * (e.g. USDC) and `hkdPerUnit` is HKD per that unit, so
 * `hkdEquivalent = rewardAmount * hkdPerUnit`. This assumes one reward unit per
 * crypto card — Phase 8 seed fixtures must keep a single reward unit per crypto
 * card (RESEARCH Pitfall 4).
 */

import type { CreditCard, HkdRateTable } from '@/types/card';
import type { RewardCalculation } from '@/types/recommendation';

/** Staleness threshold: 24h. Claude's discretion per DEC-VAL-A — a wrong value
 * only shifts WHEN the "stale" marker shows, never correctness of the number. */
const STALENESS_MS = 24 * 60 * 60 * 1000;

export interface CryptoValuation {
  /** HKD-equivalent value, or null when no usable rate exists (value unavailable). */
  hkdEquivalent: number | null;
  /** True when the rate used is older than STALENESS_MS (last-known value kept). */
  rateStale: boolean;
  /** ISO 8601 timestamp of the rate used (for the "rate as of <time>" marker). */
  rateAsOf?: string;
}

/**
 * Value a crypto reward in HKD-equivalent from an injectable rate table.
 *
 * The rate-table key is resolved as
 * `card.rewardPrograms.crypto.shortName ?? card.rewardPrograms.crypto.name`
 * (the locked ticker convention — Phase 8 seed data must align).
 */
export function valuateCrypto(
  calc: RewardCalculation,
  card: CreditCard,
  rateTable?: HkdRateTable,
): CryptoValuation {
  // Resolve the named crypto asset → rate-table key (exact casing, no coercion).
  const asset = card.rewardPrograms?.crypto?.shortName ?? card.rewardPrograms?.crypto?.name;
  const rate = asset ? rateTable?.[asset] : undefined;

  // Fail-safe: unresolved asset, absent from table, or a non-positive/NaN/
  // non-number rate ⇒ value unavailable (DEC-VAL-A, RESEARCH Security V5).
  // `!(rate.hkdPerUnit > 0)` rejects 0, negatives, NaN, and non-number values.
  if (!rate || !(rate.hkdPerUnit > 0)) {
    return { hkdEquivalent: null, rateStale: false };
  }

  // Staleness: a non-finite age (unparseable asOf) is treated as stale, never a throw.
  const ageMs = Date.now() - Date.parse(rate.asOf);
  const rateStale = Number.isFinite(ageMs) ? ageMs > STALENESS_MS : true;

  return {
    hkdEquivalent: calc.rewardAmount * rate.hkdPerUnit, // last-known even when stale
    rateStale,
    rateAsOf: rate.asOf,
  };
}
