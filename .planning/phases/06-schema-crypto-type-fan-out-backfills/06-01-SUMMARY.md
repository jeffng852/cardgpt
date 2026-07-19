---
phase: 06-schema-crypto-type-fan-out-backfills
plan: 01
subsystem: database
tags: [typescript, schema, card-model, crypto, staking, hk-eligible]

# Dependency graph
requires:
  - phase: 05
    provides: The 11-card / 40-rule cards.json corpus and the cardsData as CardDatabase cast in cardRepository.ts
provides:
  - CardType union ('credit' | 'crypto' | 'prepaid') and a REQUIRED CreditCard.cardType field
  - RewardUnit widened to include 'crypto'
  - RewardPrograms.crypto?: RewardProgramInfo (name a card's crypto reward asset, e.g. USDC)
  - RewardCondition.minStaking?: { amount: number; asset: string } (schema-only staking gate)
  - CreditCard.hkEligible?: boolean (schema-only HK-eligibility flag)
  - Removal of the dead RewardCap interface + CreditCard.rewardCap field + @/types re-export
  - All 11 cards.json cards backfilled with cardType 'credit'
  - RewardUnit-widening compile fix in recommendCards.ts (empty crypto bucket, behavior-preserving)
affects: [06-02, 06-03, 06-04, 06-05, phase-07-valuation, reward-unit-fan-out, cards-json-backfill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand-rolled TS types in src/types/card.ts ARE the schema (no ORM); required fields backfilled same-wave to keep the cardsData as CardDatabase cast green"
    - "Crypto/staking/HK fields land as SCHEMA ONLY in Phase 6; engine/valuation logic is deferred to Phase 7"

key-files:
  created:
    - .planning/phases/06-schema-crypto-type-fan-out-backfills/06-01-SUMMARY.md
  modified:
    - src/types/card.ts
    - src/types/index.ts
    - src/data/cards.json
    - src/lib/engine/recommendCards.ts

key-decisions:
  - "cardType is REQUIRED (not optional) so a card missing a type is a compile error (CRY-01 SC1)"
  - "Backfilled cardType credit onto all 11 cards in the SAME wave as the required-field change so the cast never sees a red intermediate state"
  - "minStaking / hkEligible added as schema fields only; documented that Phase 7 must NOT treat minStaking as 'assume met' like minMonthlySpending"
  - "Minimal, behavior-preserving RewardUnit-widening fix in recommendCards.ts to keep tsc green; broad reward-unit fan-out stays in 06-02/06-03"

patterns-established:
  - "Schema-first, engine-later: crypto reward modeling exists in types before any runtime consumes it"

requirements-completed: [CRY-01, CRY-02, CRY-03, TECH-02]

# Metrics
duration: ~12min
completed: 2026-07-19
status: complete
---

# Phase 6 Plan 01: Schema Foundation (cardType / crypto / staking) Summary

**Reshaped the hand-rolled card schema to model credit/crypto/prepaid products, crypto reward assets, staking-gated tiers, and HK-eligibility — required cardType field backfilled onto all 11 cards, dead RewardCap interface removed, tsc + build green.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-19 (schema reshape)
- **Completed:** 2026-07-19
- **Tasks:** 3 planned + 1 auto-fix deviation
- **Files modified:** 4 (3 planned + 1 deviation)

## Accomplishments
- Added `CardType` union and a REQUIRED `CreditCard.cardType` field — a card missing a type is now a compile error.
- Widened `RewardUnit` to include `'crypto'`; added `RewardPrograms.crypto` so a card can name its crypto asset (e.g. USDC).
- Added `RewardCondition.minStaking { amount, asset }` and `CreditCard.hkEligible` as schema-only fields (no engine logic — that is Phase 7).
- Removed the dead `RewardCap` interface, its `CreditCard.rewardCap` field, and the `@/types` re-export.
- Backfilled `cardType: "credit"` onto all 11 cards in `cards.json`, keeping the `cardsData as CardDatabase` cast valid.
- `npx tsc --noEmit` → exit 0 (zero errors); `npm run build` → exit 0 ("✓ Compiled successfully in 36.6s").

## Task Commits

Each task was committed atomically (all reference THI-252):

1. **Task 1: Widen card schema + remove RewardCap** - `fa2d946` (feat)
2. **Task 2: Update central type re-exports** - `6fbd895` (feat)
3. **Task 3: Backfill cardType credit onto all 11 cards** - `de64117` (feat)
4. **Deviation: Keep recommend engine compiling after RewardUnit widening** - `576b445` (fix)

_Note: this plan marks Task 1 `tdd="true"`, but the project has NO test runner until Phase 7 (binding constraint in CLAUDE.md / project brief). The plan's own acceptance criteria are grep + typecheck based and defer the typecheck to a plan-level gate after Task 3, so verification followed grep + `npx tsc --noEmit` + `npm run build` rather than a test-runner RED/GREEN cycle._

## Files Created/Modified
- `src/types/card.ts` - CardType union; required cardType field; RewardUnit + 'crypto'; RewardPrograms.crypto; RewardCondition.minStaking; CreditCard.hkEligible; RewardCap interface + field removed
- `src/types/index.ts` - re-export CardType; removed RewardCap re-export
- `src/data/cards.json` - `"cardType": "credit"` added to all 11 top-level cards (no reward/fee/rewardCap values touched)
- `src/lib/engine/recommendCards.ts` - (deviation) widened preferredRewardUnits to RewardUnit[]; added empty crypto bucket to groupByRewardUnit to keep tsc green

## Decisions Made
- **Required, not optional, cardType.** CRY-01 SC1 requires a card missing a type to fail typecheck, so the field is `cardType: CardType` with no `?`.
- **Same-wave backfill.** The required-field type change and the 11-card `cardType` backfill land together so `cardsData as CardDatabase` never has a red intermediate state (mitigates threat T-06-01-01).
- **Schema only for crypto/staking/HK.** `minStaking`, `hkEligible`, and `RewardPrograms.crypto` are types with doc comments; no engine reads them in Phase 6. `minStaking`'s comment explicitly warns Phase 7 not to inherit `minMonthlySpending`'s "assume met" no-op.
- **rewardCap data blocks left intact.** Only the *interface* + field + re-export were removed here; the `rewardCap` data blocks on citi-cash-back / sc-smart / sc-simply-cash are retired in 06-04 per the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Recommend engine failed to compile after RewardUnit widening**
- **Found during:** Plan-level typecheck gate (after Task 3)
- **Issue:** Widening `RewardUnit` to include `'crypto'` surfaced two pre-existing type errors in `src/lib/engine/recommendCards.ts` — `preferredRewardUnits.includes(rule.rewardUnit)` (line 69) and `grouped[rec.calculation.rewardUnit]` indexing a `Record<'cash'|'miles'|'points', ...>` (line 183). These blocked the plan's schema-compiles gate (`npx tsc --noEmit`) and the orchestrator's tsc-green success criterion.
- **Fix:** Applied the minimal, behavior-preserving change: imported `RewardUnit`, widened `preferredRewardUnits` to `Array<RewardUnit>`, and added an empty `crypto: []` bucket to `groupByRewardUnit` (now `Record<RewardUnit, ...>`). No crypto cards exist (all 11 are credit with cash/miles/points), so the crypto bucket is always empty and runtime ranking behavior is unchanged.
- **Files modified:** src/lib/engine/recommendCards.ts
- **Verification:** `npx tsc --noEmit` exit 0; `npm run build` exit 0 (compiled successfully).
- **Committed in:** `576b445`

---

**Total deviations:** 1 auto-fixed (1 blocking / Rule 3)
**Impact on plan:** Necessary to satisfy the plan's own schema-compiles gate and the tsc-green success criterion. Kept deliberately minimal — only the two errors the widening caused were touched, with zero runtime-behavior change. **Scope note for downstream:** the plan earmarks the broader "reward-unit fan-out fixes" for 06-02/06-03 (and the threat model's T-06-01-02 accepts the crypto crash-surface as deferred). The narrow compile fix applied here overlaps that area — 06-02/06-03 should treat `groupByRewardUnit`/`preferredRewardUnits` as already RewardUnit-typed (empty crypto bucket) and build the real crypto fan-out on top, rather than re-deriving these signatures.

## Issues Encountered
- The plan's verification (`tsc must pass with zero errors`) initially conflicted with the widening — resolved via the Rule 3 deviation above without expanding scope into 06-02/06-03 valuation work.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema layer is complete and green — 06-02 through 06-05 can now compile against `CardType`, the widened `RewardUnit`, `RewardPrograms.crypto`, `RewardCondition.minStaking`, and `CreditCard.hkEligible`.
- 06-04 still owns retiring the `rewardCap` data blocks in `cards.json` (only the type layer was cleaned here).
- 06-02/06-03 own the full reward-unit fan-out; see the scope note above so they don't duplicate the minimal compile fix.

---
*Phase: 06-schema-crypto-type-fan-out-backfills*
*Completed: 2026-07-19*
