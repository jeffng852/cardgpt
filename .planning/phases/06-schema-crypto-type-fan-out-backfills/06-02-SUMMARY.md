---
phase: 06-schema-crypto-type-fan-out-backfills
plan: 02
subsystem: engine
tags: [typescript, reward-unit, crypto, fan-out, validation, ai-extraction]

# Dependency graph
requires:
  - phase: 06
    plan: 01
    provides: Widened RewardUnit ('cash'|'miles'|'points'|'crypto'), required CreditCard.cardType, RewardPrograms.crypto, groupByRewardUnit crypto bucket
provides:
  - filterByRewardUnit / getBestCardForRewardUnit widened from the closed cash|miles|points union to RewardUnit
  - groupByRewardUnit defensive backstop guard (unknown unit self-initializes its bucket instead of throwing)
  - UserPreferences.preferredRewardTypes typed as RewardUnit[] (adds crypto)
  - formatReward / getRewardUnitName render a crypto reward by its named asset (rewardPrograms.crypto), never falling through the default branch
  - validateRewardRule accepts crypto as a valid reward unit
  - validateCard requires cardType in {credit,crypto,prepaid} on create/update (CRY-01 SC1)
  - getCardsByRewardUnit accepts the full RewardUnit union
  - AI extraction (validateRewardUnit + prompt strings) preserves an extracted crypto unit instead of coercing to cash
affects: [06-03, phase-07-valuation, reward-unit-fan-out]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reference the RewardUnit type instead of re-listing cash|miles|points literals so future unit additions cannot desync a closed union"
    - "Crash-proof over closed-set assumptions: grouped-record push guarded so a new unit initializes its bucket rather than indexing undefined"
    - "Validation stays on create/update flows only; read paths (loadCards) are never gated, so legacy pre-backfill Redis cards still load"

key-files:
  created:
    - .planning/phases/06-schema-crypto-type-fan-out-backfills/06-02-SUMMARY.md
  modified:
    - src/lib/engine/recommendCards.ts
    - src/types/transaction.ts
    - src/lib/engine/calculateReward.ts
    - src/lib/data/cardRepository.ts
    - src/lib/data/loadCards.ts
    - src/lib/ai/extractRewards.ts

key-decisions:
  - "Resolved the 06-01 carry-forward NIT: filterByRewardUnit + getBestCardForRewardUnit widened to RewardUnit (they were left narrow-typed while groupByRewardUnit/preferredRewardUnits were widened)"
  - "Added a runtime backstop guard in groupByRewardUnit on top of the RewardUnit-keyed Record so an out-of-band unit cannot throw (defense in depth for T-06-02-01)"
  - "validateCard requires cardType on create/update only — read paths stay ungated so legacy Redis cards read before the 06-05 backfill are not rejected"
  - "crypto reads its asset name from rewardPrograms.crypto, mirroring miles/points; no crypto->HKD valuation added (that is Phase 7)"
  - "extractRewards.ts constructs only Partial<RewardRule>, never a full CreditCard, so no cardType default was needed there"

patterns-established:
  - "Reward-unit fan-out completeness: every engine/data/AI closed-set site that assumed cash|miles|points now tolerates crypto"

requirements-completed: [CRY-01, CRY-02]

# Metrics
duration: ~10min
completed: 2026-07-21
status: complete
---

# Phase 6 Plan 02: Engine/Data/AI Reward-Unit Fan-Out (crypto) Summary

**Fanned the widened `RewardUnit` out across the recommendation engine, data-layer validators, and AI extraction so a `crypto` reward crashes nothing — the `groupByRewardUnit` undefined-key `.push` is now guarded, the two carried-forward narrow helpers are widened to `RewardUnit`, formatters render crypto by its named asset, `validateCard` requires a valid `cardType`, and `npx tsc --noEmit` + `npm run build` are both green.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-21
- **Completed:** 2026-07-21
- **Tasks:** 3 (all committed atomically)
- **Files modified:** 6

## Accomplishments
- **Task 1 (crash path + engine unions):** Widened `filterByRewardUnit` and `getBestCardForRewardUnit` params from the closed `'cash'|'miles'|'points'` union to `RewardUnit` — resolving the asymmetric half-fan-out NIT flagged in QA-Karen's 06-01 review (these two were left narrow while `groupByRewardUnit`/`preferredRewardUnits` were widened). Added a defensive backstop in `groupByRewardUnit` so an unknown/future unit initializes its bucket instead of calling `.push` on `undefined`. Typed `UserPreferences.preferredRewardTypes` as `RewardUnit[]`.
- **Task 2 (formatters + validators + loader):** `getRewardUnitName`/`formatReward` now resolve a crypto reward to its named asset via `rewardPrograms.crypto` (e.g. `12.34 USDC`) rather than falling through the generic default branch. `validateRewardRule` accepts crypto (message updated). `validateCard` requires `cardType ∈ {credit,crypto,prepaid}` on create/update (CRY-01 SC1). `getCardsByRewardUnit` accepts the full `RewardUnit` union.
- **Task 3 (AI extraction):** `validateRewardUnit` preserves an extracted `crypto` unit instead of silently coercing it to `cash`; both prompt enumeration strings now list crypto. Confirmed the file only builds `Partial<RewardRule>` (no full `CreditCard`), so no `cardType` default was needed.
- **Behavior preservation:** No crypto card data exists yet (all 11 cards are `credit` with cash/miles/points), so every crypto path is inert — ranking/formatting output for the existing corpus is unchanged. No crypto→HKD valuation math added (Phase 7 owns that).

## Task Commits

Each task committed atomically (all reference THI-253):

1. **Task 1: Widen engine unions + crash-guard groupByRewardUnit** — `cff25f7` (feat)
2. **Task 2: Render crypto in formatters; accept it in validators; require cardType** — `2fb64fb` (feat)
3. **Task 3: Widen AI extraction reward-unit enumeration** — `b824274` (feat)

_Note: this plan marks Task 1 `tdd="true"`, but the project has NO test runner (binding CLAUDE.md constraint — `npm test` errors with `Missing script: "test"`). Per the same convention 06-01 followed, verification used grep acceptance criteria + `npx tsc --noEmit` + `npm run build` rather than a RED/GREEN test cycle._

## Files Created/Modified
- `src/lib/engine/recommendCards.ts` — widened `filterByRewardUnit`/`getBestCardForRewardUnit` to `RewardUnit`; added the unknown-unit backstop guard in `groupByRewardUnit`
- `src/types/transaction.ts` — imported `RewardUnit`; typed `preferredRewardTypes` as `RewardUnit[]`
- `src/lib/engine/calculateReward.ts` — crypto branch in `getRewardUnitName` (reads `rewardPrograms.crypto`); `case 'crypto'` in `formatReward`
- `src/lib/data/cardRepository.ts` — `validateRewardRule` accepts crypto; `validateCard` requires a valid `cardType`
- `src/lib/data/loadCards.ts` — imported `RewardUnit`; widened `getCardsByRewardUnit` param
- `src/lib/ai/extractRewards.ts` — `validateRewardUnit` accepts crypto; both prompt strings list crypto

## Reward-unit fan-out sites changed (file:symbol)
1. `src/lib/engine/recommendCards.ts:filterByRewardUnit` — param `'cash'|'miles'|'points'` → `RewardUnit`
2. `src/lib/engine/recommendCards.ts:getBestCardForRewardUnit` — param `'cash'|'miles'|'points'` → `RewardUnit`
3. `src/lib/engine/recommendCards.ts:groupByRewardUnit` — added unknown-unit backstop guard (crypto bucket already present from 06-01)
4. `src/types/transaction.ts:UserPreferences.preferredRewardTypes` — `('cash'|'miles'|'points')[]` → `RewardUnit[]`
5. `src/lib/engine/calculateReward.ts:getRewardUnitName` — program lookup cast widened to include `'crypto'`
6. `src/lib/engine/calculateReward.ts:formatReward` — added `case 'crypto'`
7. `src/lib/data/cardRepository.ts:validateRewardRule` — allowed-units check + message include crypto
8. `src/lib/data/cardRepository.ts:validateCard` — new required-`cardType` check (CRY-01 SC1)
9. `src/lib/data/loadCards.ts:getCardsByRewardUnit` — param `'cash'|'miles'|'points'` → `RewardUnit`
10. `src/lib/ai/extractRewards.ts:validateRewardUnit` + two prompt strings — accept/enumerate crypto

`preferredRewardUnits` and the `groupByRewardUnit` `crypto: []` literal were already `RewardUnit`-typed by 06-01's compile fix and were built on, not re-derived.

## Threat model mitigations honored
- **T-06-02-01 (DoS, `groupByRewardUnit` undefined-key push):** RewardUnit-keyed Record (06-01) + new runtime backstop guard — a crypto (or any out-of-band) unit self-initializes its bucket rather than throwing.
- **T-06-02-02 (Tampering, missing cardType):** `validateCard` rejects a missing/invalid `cardType` on create/update; read paths deliberately ungated so pre-backfill Redis cards still load.
- **T-06-02-03 (Spoofing, AI coercing crypto→cash):** `validateRewardUnit` preserves an extracted crypto unit for human review.
- **T-06-02-SC (installs):** No new package installs in this plan.

## Verification
- `npx tsc --noEmit` → **exit 0** (zero errors).
- `npm run build` → **exit 0** — `✓ Compiled successfully in 1084.0ms`, `✓ Generating static pages (20/20)`.
- Fan-out sweep: `grep -rn "'cash' | 'miles' | 'points'" src/lib` → **no matches** (every engine/data/AI closed union widened). `grep -rn "cash'\].*miles'\].*points'\]" src/lib` → **no matches** (no un-widened Record maps).
- Acceptance greps: `crypto:\s*\[\]` in recommendCards = 1; `case 'crypto'` in calculateReward = 1; `crypto`+`cardType` present in cardRepository; `crypto` present in loadCards, transaction.ts, extractRewards.ts.
- Did **not** run `npm test`/vitest/jest (no runner exists — binding constraint).

## Deviations from Plan
None — plan executed exactly as written. The 06-01 carry-forward NIT (narrow `filterByRewardUnit`/`getBestCardForRewardUnit`) was an explicit deliverable of this plan, not a deviation.

## Scope boundaries confirmed
- **No 06-03 files touched.** Changes are confined to engine/data/AI/type files (`recommendCards.ts`, `transaction.ts`, `calculateReward.ts`, `cardRepository.ts`, `loadCards.ts`, `extractRewards.ts`). No public UI (`TransactionInput.tsx`, `CardRecommendationList.tsx`, `HomeClient.tsx`) or admin-form (`CardEditForm.tsx`, `RuleForm.tsx`, `UploadExtractor.tsx`) files were modified — those belong to the parallel plan 06-03.
- **`src/lib/auth/` untouched** (THI-236 / public-repo constraint).
- **No crypto valuation** added — Phase 7 owns crypto→HKD math.

## Known Stubs
None. The crypto reward paths are inert only because no crypto card data exists yet (a data-availability state, not a code stub); every code path is fully wired and typechecks.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Engine/data/AI layers now tolerate a crypto reward end-to-end without crashing — 06-03 can widen the UI + admin-form sites on top of a green engine.
- 06-04 still owns retiring the `rewardCap` data blocks in `cards.json`; 06-05 owns the prod Redis `cardType` backfill.
- Phase 7 owns crypto→HKD valuation and the `minStaking` fail-closed gate (explicitly deferred here).

## Self-Check: PASSED
- SUMMARY.md exists on disk.
- All task commits verified in git log: `cff25f7`, `2fb64fb`, `b824274`.
- `npx tsc --noEmit` exit 0; `npm run build` exit 0 (Compiled successfully).
- `grep -c "case 'crypto'" src/lib/engine/calculateReward.ts` = 1; `grep -c "cardType" src/lib/data/cardRepository.ts` = 2; no bare `'cash' | 'miles' | 'points'` unions remain in `src/lib`.

---
*Phase: 06-schema-crypto-type-fan-out-backfills*
*Completed: 2026-07-21*
