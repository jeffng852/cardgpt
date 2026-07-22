---
phase: 06-schema-crypto-type-fan-out-backfills
plan: 04
subsystem: database
tags: [rewardCap, tech-debt, cards-json, recommender, tsx, byte-identical-guard]

# Dependency graph
requires:
  - phase: 06-01
    provides: RewardCap interface + re-export already removed from src/types (data layer was the last holdout)
  - phase: 06-02
    provides: engine reward-unit fan-out; confirmed engine reads per-rule monthlySpendingCap/fallbackRate, never rewardCap
provides:
  - rewardCap-free corpus (src/data/cards.json), template, example, and src/data README
  - reproducible byte-identical ranking guard (scripts/capture-ranking.mts) for the 3 formerly-rewardCap cards
  - empirical proof (empty before/after diff + zero-match grep) that the retirement is output-neutral (TECH-02)
affects: [07-testing, card-data-corpus, recommender-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Byte-identical capture/diff harness as a stand-in for a test runner (no jest/vitest in repo)"
    - "Guard scripts import the engine via relative paths + extensionless specifiers so both tsx (runtime) and tsc --noEmit typecheck them"

key-files:
  created:
    - scripts/capture-ranking.mts
  modified:
    - src/data/cards.json
    - src/data/card-template.json
    - src/data/examples/citi-cash-back-card.json
    - src/data/README.md

key-decisions:
  - "Dropped (not ported) the dead reward-side values (redemptionThreshold, sc-smart monthlyLimit) — they are unrepresentable in the live per-rule spend-cap model and were read by nothing"
  - "Kept scripts/capture-ranking.mts committed as a cheap regression guard (Phase 7's vitest suite can absorb it later)"
  - "tsx stays transient via npx — NOT added as a devDependency (matches threat T-06-04-SC 'accept' disposition; no package.json change)"

patterns-established:
  - "Prove-then-remove: capture baseline output BEFORE deleting data, diff AFTER — the empty diff is the deliverable, not an assertion"

requirements-completed: [TECH-02]

# Metrics
duration: ~20min
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 04: RewardCap Data Retirement Summary

**Retired the write-only dead `rewardCap` data from 3 cards + template/example/README and PROVED byte-identical recommender output for citi-cash-back, sc-smart, and sc-simply-cash via a before/after capture-diff (empty) plus a zero-match grep backstop.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-22
- **Tasks:** 3
- **Files modified:** 4 data files + 1 script created

## Accomplishments
- Removed all `rewardCap` data: 3 blocks in `cards.json` (citi-cash-back, sc-smart, sc-simply-cash) + template + example + README bullet
- Proved the retirement is output-neutral: `diff /tmp/ranking-before.json /tmp/ranking-after.json` is **empty (byte-identical)** across 5 scenarios exercising local dining, tiered designated-merchant spend (with cap/fallback), and foreign spend
- Grep backstop: **zero** `rewardCap`/`RewardCap` references remain anywhere in `src/lib`, `src/components`, `src/app`, `src/types`
- Left the live per-rule cap model (`monthlySpendingCap`=4 occurrences, `fallbackRate`) fully intact; card count still 11

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture baseline ranked output** - `4174b97` (test)
2. **Task 2: Remove rewardCap data from corpus/template/example/README** - `ac41a13` (refactor)
3. **Task 3: Prove byte-identical output + fix guard for tsc** - `0e9fec3` (fix)

## Verification Results (exact)

**Byte-identical diff (Task 3 deliverable):**
```
$ diff /tmp/ranking-before.json /tmp/ranking-after.json && echo BYTE_IDENTICAL
BYTE_IDENTICAL      # (empty diff, exit 0)
```
Baseline files live in `/tmp` (outside the repo tree) and were NOT committed. All 5 scenarios × 3 cards = 15 ranked lines matched exactly (ranks, rewardAmount, rewardUnit, effectiveRate, netValue). Example (unchanged before & after):
```
{"scenario":"sc-smart-designated-mcdonalds-tier2-capped","id":"sc-smart","rank":8,"isRecommended":false,"rewardAmount":33.6,"rewardUnit":"cash","effectiveRate":0.0056,"netValue":33.6}
```
The sc-smart line shows the per-rule cap/fallback machinery (`effectiveRate` 0.0056 fallback at `monthlySpending`=16000) still runs identically — confirming the removed `rewardCap` never touched it.

**Grep backstop:**
```
$ grep -rn "RewardCap\|rewardCap" src/lib src/components src/app src/types
ZERO MATCHES
```
Per-file rewardCap counts in data: `cards.json` 0, `card-template.json` 0, `examples/citi-cash-back-card.json` 0, `src/data/README.md` 0.

**JSON validity + invariants:** all 3 JSON files `JSON.parse` OK; `monthlySpendingCap` count = 4 (unchanged); card count = 11 (unchanged).

**Typecheck + build:**
```
$ npx tsc --noEmit    → TSC_GREEN
$ npm run build       → ✓ Compiled successfully in 1027.6ms  (BUILD_EXIT=0, 20/20 static pages)
```

## Files Created/Modified
- `scripts/capture-ranking.mts` - Reproducible ranking-capture guard: runs `recommendCards` over the full corpus for 5 fixed transactions and prints deterministic (stable-key, id-sorted) ranked output for the 3 target cards
- `src/data/cards.json` - Removed the 3 dead `rewardCap` blocks (trailing property after `fees` on each card); reward rules, per-rule caps, fees, and cardType untouched
- `src/data/card-template.json` - Removed the `rewardCap` template block
- `src/data/examples/citi-cash-back-card.json` - Removed the trailing `rewardCap` block
- `src/data/README.md` - Deleted the `rewardCap` Optional-Fields bullet; widened the reward-unit doc line to include `crypto`

## Decisions Made
- **Dropped, not ported, the dead reward-side values.** `redemptionThreshold` (redemption floor) and sc-smart's `monthlyLimit` (a reward ceiling, not a spend cap) have no equivalent in the live per-rule spend-cap model and were read by nothing — removing them is safe, porting them would re-introduce a dead contract.
- **Kept the capture script committed** as a cheap regression guard per the plan's guidance / project constraints; Phase 7's vitest suite can later absorb it.
- **tsx kept transient (npx), not a devDependency** — no `package.json` change, matching threat T-06-04-SC's "accept" disposition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dropped `.ts` import extensions in the guard script so `tsc --noEmit` passes**
- **Found during:** Task 3 (typecheck gate)
- **Issue:** The Task-1 script imported with explicit `.ts` specifiers, which `tsc` rejects with TS5097 (`allowImportingTsExtensions` is off in this repo). The runtime (`tsx`) was fine, but the plan requires `npx tsc --noEmit` green.
- **Fix:** Changed the three relative engine/type imports to extensionless specifiers — resolves under both `tsx` (runtime) and `tsc`. JSON import kept its `.json` extension (`resolveJsonModule`).
- **Files modified:** scripts/capture-ranking.mts
- **Verification:** `npx tsc --noEmit` → green; capture re-run → diff still byte-identical.
- **Committed in:** `0e9fec3` (Task 3 commit)

**2. [Rule 2 - Doc accuracy] Widened `src/data/README.md` reward-unit line to include `crypto`**
- **Found during:** Task 2 (README edit)
- **Issue:** The README's reward-rule doc still listed reward units as only `"cash", "miles", or "points"`, implying an outdated contract after Phase 6's crypto fan-out (06-02/06-03) added `crypto` to `RewardUnit`.
- **Fix:** Updated the line to `"cash", "miles", "points", or "crypto"`. In-scope file, low-risk doc alignment.
- **Files modified:** src/data/README.md
- **Verification:** File is doc-only; build + typecheck green.
- **Committed in:** `ac41a13` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 doc accuracy)
**Impact on plan:** Both necessary — the blocking fix was required to pass the plan's own `tsc` gate; the doc alignment keeps the in-scope README honest post-crypto. No scope creep; per-rule cap model untouched.

## Issues Encountered
None beyond the tsc-extension fix documented above. The central risk — that `rewardCap` was silently read somewhere — did NOT materialize: the diff was empty on the first post-removal run and the grep found zero references, exactly as 06-01's review predicted.

## User Setup Required
None - no external service configuration required. (No package installs; `tsx` is fetched transiently by `npx`.)

## Next Phase Readiness
- TECH-02 fully retired at the data layer; the `RewardCap` type/data contract no longer exists anywhere in the tree.
- `scripts/capture-ranking.mts` is available as a reusable ranking-regression guard — a natural seed for Phase 7's test suite.
- No blockers. Baseline `/tmp` capture files are ephemeral and intentionally uncommitted; re-run `npx tsx scripts/capture-ranking.mts` any time to re-verify.

---
*Phase: 06-schema-crypto-type-fan-out-backfills*
*Completed: 2026-07-22*

## Self-Check: PASSED
- scripts/capture-ranking.mts — FOUND
- src/data/cards.json — FOUND (rewardCap removed)
- 06-04-SUMMARY.md — FOUND
- Commits 4174b97, ac41a13, 0e9fec3 — all FOUND
