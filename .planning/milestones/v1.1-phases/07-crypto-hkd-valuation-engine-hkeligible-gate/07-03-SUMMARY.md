---
phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
plan: 03
subsystem: engine
tags: [recommendCards, hkEligible, partition-before-sort, cryptoSegment, valuateCrypto, vitest, DEC-VAL-B, CRY-05, TECH-01]

# Dependency graph
requires:
  - phase: 07-02
    provides: valuateCrypto, HkdRateTable, HkdRate, CryptoRecommendation, minStaking base-tier default
  - phase: 07-01
    provides: vitest runner + committed byte-identical fiat-regression baseline snapshot
provides:
  - Fail-closed hkEligible gate in recommendCards() (excludes cardType-agnostic hkEligible === false from both recommendations and cryptoSegment)
  - Partition-before-sort — fiat (cardType === 'credit') runs the existing pipeline verbatim; non-fiat (crypto|prepaid) segmented out
  - Additive optional 4th param rateTable?: HkdRateTable on recommendCards()
  - New optional cryptoSegment on RecommendationResult, ranked by hkdEquivalent desc with null appended unranked
affects: [phase-08-crypto-seed-fixtures, phase-09-prepaid, crypto-ui-rendering, any-recommendCards-consumer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Partition-before-sort: split the eligible set by cardType BEFORE the comparator so a foreign unit (crypto) can never perturb the fiat ranking — structural, not test-enforced"
    - "Additive positional optional param (rateTable 4th) + additive optional result field (cryptoSegment) to extend an engine signature without touching existing call sites"
    - "Fail-closed gate keyed on strict === false (not falsy) so an absent field defaults to permitted"

key-files:
  created:
    - src/lib/engine/__tests__/hkEligible.test.ts
    - src/lib/engine/__tests__/segmentation.test.ts
  modified:
    - src/lib/engine/recommendCards.ts
    - src/lib/engine/__tests__/engine.test.ts

key-decisions:
  - "Segment boundary is cardType === 'credit' (RESEARCH Open Question 1): guarantees the 11 legacy credit cards stay in the byte-identical fiat pipeline; both crypto and prepaid fall into the non-fiat cryptoSegment (prepaid may get its own section in Phase 9)"
  - "Partition is unconditional; cryptoSegment population is gated on a rateTable being supplied AND at least one non-fiat card existing — so crypto is never mixed into recommendations even when no rateTable is passed, and the result shape is unchanged for 3-arg callers"
  - "null (value-unavailable) crypto entries are appended after all ranked entries with rank 0 (unranked) and isRecommended false — cannot rank on a missing number (DEC-VAL-A)"

patterns-established:
  - "Partition-before-sort as the structural guarantee for byte-identical fiat ranking under multi-unit expansion"
  - "Crypto ranking built on a SEPARATE fresh array, never aliasing the fiat .sort() target (RESEARCH Pitfall 6)"

requirements-completed: [CRY-04, CRY-05, TECH-01]

# Metrics
duration: ~20min
completed: 2026-07-24
status: complete
---

# Phase 7 Plan 03: hkEligible Gate + Partition-Before-Sort Segmentation Summary

**Fail-closed `hkEligible` gate plus partition-before-sort in `recommendCards()`: crypto/non-fiat cards are valued via `valuateCrypto` into a new optional `cryptoSegment` while the 11-card fiat ranking stays byte-identical to the Plan 01 baseline.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-24T22:31:00Z
- **Completed:** 2026-07-24T22:38:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Fail-closed HK-eligibility gate: a card with `hkEligible === false` is excluded from the eligibility set (so it reaches NEITHER `recommendations` NOR `cryptoSegment`); `undefined`/`true` stay eligible — the 11 legacy cards (all undefined) still return 11 recommendations (CRY-05, T-07-GATE).
- Partition-before-sort: eligible cards are split into fiat (`cardType === 'credit'`) and non-fiat (`crypto`|`prepaid`) BEFORE the sort; the existing preference-filter → calculateReward → minRewardRate → sort/tie-break → rank pipeline runs verbatim on the fiat set only → `recommendations` byte-identical (DEC-VAL-B / TECH-01).
- Non-fiat cards are valued on a separate fresh array through `valuateCrypto` into the new optional `cryptoSegment`, ranked by `hkdEquivalent` descending with `null` (value-unavailable) entries appended unranked (DEC-VAL-A).
- Additive optional 4th param `rateTable?: HkdRateTable`; `cryptoSegment` is populated only when a rateTable is supplied and ≥1 non-fiat card exists — so the 3-arg callers (`HomeClient`, examples) are unaffected and the result shape is unchanged.

## Task Commits

Each task was committed atomically (TDD: test → feat):

1. **Task 1 (RED): hkEligible gate tests** — `bfbb1b4` (test)
2. **Task 1 (GREEN): fail-closed hkEligible gate** — `fd07af7` (feat)
3. **Task 2 (RED): partition/cryptoSegment tests** — `4bccb9a` (test)
4. **Task 2 (GREEN): partition-before-sort + cryptoSegment + rateTable** — `a8fdcdc` (feat)

**Plan metadata:** committed with this SUMMARY.

## Files Created/Modified
- `src/lib/engine/recommendCards.ts` — added the fail-closed `hkEligible === false` gate in the base eligibility filter; partition-before-sort (`fiatCards` vs `cryptoCards`); crypto segment assembly via `valuateCrypto` on a separate array; additive optional `rateTable` 4th param; conditional `cryptoSegment` on the result.
- `src/lib/engine/__tests__/hkEligible.test.ts` — gate coverage: false ⇒ excluded, undefined/true ⇒ included, 11-card corpus intact, explicit-false dropped when mixed into corpus.
- `src/lib/engine/__tests__/segmentation.test.ts` — partition correctness (credit-only in recommendations, non-fiat in cryptoSegment), cryptoSegment ranking with null appended unranked, no-rateTable backward-compat, rateTable does not perturb the 11-card corpus.
- `src/lib/engine/__tests__/engine.test.ts` — added `cardType: 'credit'` to two legacy mock fixtures (deviation, see below).

## Decisions Made
- **Segment boundary = `cardType === 'credit'`** (RESEARCH Open Question 1, decided here). Locks the 11 legacy credit cards into the unchanged fiat pipeline; both `crypto` and `prepaid` fall into the non-fiat segment. Prepaid may get its own section in Phase 9.
- **Partition is unconditional; `cryptoSegment` population is conditional.** Crypto is partitioned out of `recommendations` even when no rateTable is passed (DEC-VAL-B is structural), but `cryptoSegment` is only attached when a rateTable is injected AND ≥1 non-fiat card exists — otherwise the field is omitted so 3-arg callers see the identical shape.
- **null crypto entries appended unranked (rank 0, isRecommended false)** after all ranked entries — cannot rank on a missing number (DEC-VAL-A).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `cardType: 'credit'` to two legacy fixtures in `engine.test.ts`**
- **Found during:** Task 2 (partition-before-sort)
- **Issue:** The two pre-existing mock cards (`mockCitiCashBack`, `basic-card`) were cast as `CreditCard` but omitted the now-required `cardType` field. Once the partition began reading `cardType === 'credit'`, these `undefined`-typed cards fell into the non-fiat bucket, so `recommendCards` returned empty `recommendations` and 3 legacy tests failed. Directly caused by this task's change surfacing an invalid legacy fixture (CRY-01 requires `cardType`).
- **Fix:** Added `cardType: 'credit'` to both fixtures — they are legacy fiat cards, so `credit` is the correct value.
- **Files modified:** `src/lib/engine/__tests__/engine.test.ts`
- **Verification:** Full vitest suite green (72 passed, 7 pre-existing skips); committed in `a8fdcdc`.
- **Committed in:** `a8fdcdc` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — invalid legacy test fixture surfaced by the partition).
**Impact on plan:** Necessary to keep the pre-existing engine tests green; no runtime/source change, no scope creep. The fiat-regression baseline snapshot remained byte-identical throughout.

## Issues Encountered
- None beyond the fixture deviation above. The fiat-regression snapshot (`__snapshots__/`) was never modified — its last commit remains the Wave 0 baseline (`e718dbe`), confirming byte-identical fiat ranking. `vitest -u` was NOT run.

## Verification Results
- `npx vitest run` — **7 test files passed, 72 passed | 7 skipped** (the 7 skips are pre-existing `it.skip` in `transactionParser.test.ts`).
- **Fiat-regression snapshot UNCHANGED** — byte-identical; snapshot file untouched (git status clean, last commit `e718dbe`).
- `npx tsc --noEmit` — passes (additive 4th param + optional field; 3 existing call sites unchanged).
- `npm run build` — `✓ Compiled successfully`; static pages generated; `HomeClient.tsx` compiles/works unchanged.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The recommender now surfaces crypto/non-fiat cards in `cryptoSegment` when a rateTable is injected; Phase 8 must seed crypto fixtures keyed by the `rewardPrograms.crypto.shortName` ticker (the locked rate-table key convention) with a single reward unit per crypto card.
- The engine is HK-eligibility fail-closed; card data can now set `hkEligible: false` to hide a card from recommendations while keeping it in the directory.
- Wiring `cryptoSegment` into the UI (a crypto section beside the fiat list) is downstream UI work; the engine contract is ready.

## Self-Check: PASSED

- Files verified present: `hkEligible.test.ts`, `segmentation.test.ts`, `07-03-SUMMARY.md`.
- Commits verified in git log: `bfbb1b4`, `fd07af7`, `4bccb9a`, `a8fdcdc`.

---
*Phase: 07-crypto-hkd-valuation-engine-hkeligible-gate*
*Completed: 2026-07-24*
