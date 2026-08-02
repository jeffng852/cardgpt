---
phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
plan: 02
subsystem: api
tags: [typescript, recommendation-engine, crypto, valuation, vitest]

# Dependency graph
requires:
  - phase: 07-01
    provides: vitest runner + config + committed fiat-regression baseline snapshot
provides:
  - "HkdRateTable / HkdRate / AssetSymbol injectable rate-table types (keyed by shortName ticker)"
  - "CryptoRecommendation type + optional additive cryptoSegment on RecommendationResult"
  - "valuateCrypto() helper: HKD-equivalent valuation + 24h staleness + fail-safe on bad rates (DEC-VAL-A)"
  - "minStaking not-met-by-default guard in matchesRule (base un-staked tier, DEC-VAL-C)"
affects: [07-03, phase-08-crypto-seed, crypto-segmentation, recommendCards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable rate table (no fetch inside engine); staleness via timestamped asOf"
    - "Fail-safe valuation: bad/missing rate ⇒ hkdEquivalent null (value unavailable), never fabricated/thrown"
    - "Additive return/param shape — optional cryptoSegment leaves fiat consumers untouched"
    - "Fail-closed rule gating: minStaking is a real barrier, not an assumed-met condition"

key-files:
  created:
    - src/lib/engine/valuateCrypto.ts
    - src/lib/engine/__tests__/valuateCrypto.test.ts
    - src/lib/engine/__tests__/minStaking.test.ts
  modified:
    - src/types/card.ts
    - src/types/recommendation.ts
    - src/lib/engine/calculateReward.ts
    - src/lib/engine/index.ts

key-decisions:
  - "Rate-table key convention LOCKED to the crypto asset shortName ticker (exact casing, resolved shortName ?? name); Phase 8 seed data MUST align — no normalization at lookup"
  - "Staleness threshold = 24h (Claude's discretion per DEC-VAL-A; shifts only WHEN the marker shows, never correctness)"
  - "Rate validity guard `!(hkdPerUnit > 0)` rejects 0, negatives, NaN, and non-number in one check"
  - "Unparseable asOf (non-finite age) treated as stale rather than thrown (T-07-VAL-b)"

patterns-established:
  - "valuateCrypto(calc, card, rateTable?) pure helper — engine consumes an injected table, caller supplies it"
  - "minStaking guard placed right after the minMonthlySpending 'assume met' note, returning false"

requirements-completed: [CRY-04, TECH-01]

# Metrics
duration: 3min
completed: 2026-07-24
status: complete
---

# Phase 7 Plan 02: Crypto Valuation Core Summary

**Injectable HKD rate-table + `valuateCrypto()` (24h staleness, fail-safe null on bad rates) + a `minStaking` not-met-by-default guard so crypto rewards value at the base un-staked tier — additive, with the fiat baseline byte-identical.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-24T21:26:09Z
- **Completed:** 2026-07-24T21:29:12Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Added the injectable `HkdRateTable` / `HkdRate` / `AssetSymbol` types, keyed by the crypto asset `shortName` ticker (convention locked + documented for Phase 8 alignment).
- Implemented `valuateCrypto()`: values a crypto reward as `rewardAmount * hkdPerUnit`; keeps last-known value + `rateStale` flag when >24h old (DEC-VAL-A); degrades to `hkdEquivalent: null` on missing/absent/zero/negative/NaN/unparseable rate — never a fabricated number or a throw.
- Added the additive `CryptoRecommendation` type + optional `cryptoSegment?` on `RecommendationResult` for Plan 03 to populate (existing `.recommendations` consumers untouched).
- Added the `minStaking` not-met-by-default guard in `matchesRule` so staking-gated tiers are excluded from the default valuation (base un-staked tier, DEC-VAL-C) — placed after `minMonthlySpending`, does NOT inherit its "assume met" no-op.
- 13 new unit tests (10 valuation + 3 staking); full suite green; **fiat-regression snapshot byte-identical** (no `-u`, snapshot file unchanged in git).

## Task Commits

Each task committed atomically (all reference THI-280):

1. **Task 1: Add valuation types (HkdRateTable, CryptoRecommendation, cryptoSegment)** — `c0738f5` (feat)
2. **Task 2: Implement valuateCrypto() with staleness + fail-safe (TDD RED→GREEN)** — `62a12ac` (feat)
3. **Task 3: minStaking not-met-by-default in matchesRule (TDD RED→GREEN)** — `8897963` (feat)

_Note: Tasks 2 and 3 followed TDD (test written failing first, then implementation); each is a single squashed feat commit carrying its test + code._

## Files Created/Modified
- `src/types/card.ts` — added `AssetSymbol`, `HkdRate { hkdPerUnit, asOf }`, `HkdRateTable` (keyed by `shortName` ticker, with Phase 8 alignment doc comment).
- `src/types/recommendation.ts` — added `CryptoRecommendation` (`hkdEquivalent: number | null`, `rateStale`, `rateAsOf?`) + optional additive `cryptoSegment?` on `RecommendationResult`.
- `src/lib/engine/valuateCrypto.ts` — NEW: `valuateCrypto()` + `CryptoValuation` type + 24h staleness + rate validation.
- `src/lib/engine/calculateReward.ts` — `matchesRule` returns false when `conditions.minStaking` is present.
- `src/lib/engine/index.ts` — re-exports `valuateCrypto`, `CryptoValuation`, and the new types.
- `src/lib/engine/__tests__/valuateCrypto.test.ts` — NEW: 10 tests (fresh/stale/name-key/absent/zero/negative/NaN/no-table/no-asset/bad-asOf).
- `src/lib/engine/__tests__/minStaking.test.ts` — NEW: 3 tests (gated tier excluded, un-gated bonus still applies, base parity).

## Decisions Made
- **Rate-table key = `shortName` ticker** (resolved `shortName ?? name`, exact casing, no coercion) — a hard alignment constraint for Phase 8 seed data, documented in a `HkdRateTable` doc comment.
- **Staleness threshold = 24h** — Claude's discretion per DEC-VAL-A; a wrong value only shifts when the "stale" marker shows, never correctness.
- **Single validity guard `!(rate.hkdPerUnit > 0)`** rejects 0, negatives, NaN, and non-number values in one expression.
- **Unparseable `asOf` ⇒ stale (not thrown)** — `Number.isFinite(ageMs)` false path marks stale, honoring T-07-VAL-b (no unbounded work, no crash).

## Deviations from Plan

None - plan executed exactly as written. All three tasks implemented per DEC-VAL-A/C and RESEARCH Patterns 1/3/4; no auto-fixes, no architectural changes, no missing critical functionality discovered.

## Issues Encountered
None. The fiat path was provably unperturbed (no fiat rule carries `minStaking`; crypto valuation is not wired into `recommendCards` in this plan), so the byte-identical baseline held on the first run.

## Verification Results
- `npm test` (full `vitest run`): **5 files passed, 64 passed | 7 skipped** — up from the 51-passed baseline (+13 new tests); the 7 skipped are the Plan 01 quarantined dormant tests.
- **Fiat-regression snapshot byte-identical:** `git status` shows the `__snapshots__/` directory unchanged; the snapshot was never regenerated (no `-u`).
- `npx tsc --noEmit`: exit 0.
- `npm run build`: `✓ Compiled successfully`, 20/20 static pages generated.

## Scope Notes (for Plan 03 / Wave 2)
- This plan built the valuation CORE only. `recommendCards()` is **untouched** — the `hkEligible` fail-closed gate, the fiat/crypto partition, and populating `cryptoSegment` are Plan 07-03 (Wave 2).
- `valuateCrypto` assumes one reward unit per crypto card (RESEARCH Pitfall 4) — Phase 8 fixtures must keep a single reward unit per crypto card, or valuation must key off the applied rule's unit.

## Next Phase Readiness
- Valuation core + additive return-shape types are in place for Plan 03 to consume (`valuateCrypto`, `HkdRateTable`, `CryptoRecommendation`, `cryptoSegment`) — all exported from `@/lib/engine`.
- Phase 8 crypto seed data must key the injected rate table by the asset `shortName` ticker (documented constraint).

## Self-Check: PASSED

All created files present on disk (`valuateCrypto.ts`, `valuateCrypto.test.ts`, `minStaking.test.ts`, `07-02-SUMMARY.md`); all three task commits (`c0738f5`, `62a12ac`, `8897963`) present in git log.

---
*Phase: 07-crypto-hkd-valuation-engine-hkeligible-gate*
*Completed: 2026-07-24*
