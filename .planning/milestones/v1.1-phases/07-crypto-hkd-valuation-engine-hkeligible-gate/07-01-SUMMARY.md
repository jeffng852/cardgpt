---
phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
plan: 01
subsystem: testing
tags: [vitest, snapshot, regression, recommendation-engine, esm, typescript]

# Dependency graph
requires:
  - phase: 06-schema-foundation
    provides: "cardType field on the 11-card corpus (all 'credit') that this plan partitions on and snapshots"
provides:
  - "First real test runner in the repo: vitest ^4.1.10 (dev-only) with node env, globals, and @->./src alias"
  - "npm test / npm run test:watch scripts (npm test was previously Missing script)"
  - "Byte-identical fiat-ranking baseline snapshot for the full 11-card corpus (TECH-01 regression anchor), captured on the pre-crypto engine"
  - "Two pre-existing dormant test files triaged to green (2 fixed, 7 quarantined with .skip)"
affects: [07-02, 07-03, crypto-valuation, hkEligible-gate, minStaking, any-wave-that-touches-recommendCards]

# Tech tracking
tech-stack:
  added: [vitest@^4.1.10 (devDependency)]
  patterns:
    - "vitest snapshot regression: serialize the FULL ranking with a stable field order so any reorder fails"
    - "globals:true + inline resolve.alias @->./src (no vite-tsconfig-paths dep)"
    - "dormant-test triage: fix stale fixtures OR .skip with an inline note; never touch production code to pass a test"

key-files:
  created:
    - vitest.config.ts
    - src/lib/engine/__tests__/fiat-regression.test.ts
    - src/lib/engine/__tests__/__snapshots__/fiat-regression.test.ts.snap
  modified:
    - package.json
    - package-lock.json
    - src/lib/engine/__tests__/engine.test.ts
    - src/lib/parser/__tests__/transactionParser.test.ts

key-decisions:
  - "Node env + single @ alias only — no jsdom/coverage/plugins (single-artifact simplicity)"
  - "Snapshot the FULL 11-card corpus (55 lines) not the 3 target ids from capture-ranking.mts, so any perturbation anywhere in the fiat sort fails"
  - "Regression test calls recommendCards with NO rate table (the current engine is 3-arg; fiat path only)"
  - "Fixed 2 engine fixtures that used the deprecated merchantType where the new schema matches on category/merchantId; quarantined 7 parser assertions that encode never-validated parser output rather than blessing possibly-wrong behavior"

patterns-established:
  - "Full-corpus stable-serialize snapshot as a byte-identical regression guard"
  - "it.skip + one-line note to quarantine pre-runner dormant tests, keeping the suite green and trustworthy"

requirements-completed: [TECH-01]

# Metrics
duration: 3min
completed: 2026-07-24
status: complete
---

# Phase 7 Plan 01: Vitest Setup & Fiat-Ranking Baseline Summary

**Stood up the repo's first test runner (vitest ^4.1.10, node env + @ alias) and committed a byte-identical full-corpus fiat-ranking snapshot on the current engine as the TECH-01 regression anchor — with `npm test` green (50 passed, 7 quarantined).**

## Performance

- **Duration:** ~3 min (commit span 22:06:30 → 22:09:30 +01:00)
- **Started:** 2026-07-24T22:05:00+01:00 (approx; work began at plan load)
- **Completed:** 2026-07-24T22:09:30+01:00
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- vitest ^4.1.10 installed dev-only — the only new dependency this phase; `npm test` is a real command for the first time (was `Missing script: "test"`).
- `vitest.config.ts`: `environment: 'node'`, `globals: true`, `resolve.alias` `@`→`./src`. `npx vitest list` collects both pre-existing files with no `Cannot find module '@/...'` error.
- Committed baseline snapshot captures the FULL 11-card ranking across all 5 scenarios (55 lines) on the CURRENT engine — the TECH-01 byte-identical guard is now live.
- Two dormant test files (never executed before a runner existed) triaged to green: 2 stale engine fixtures fixed, 7 parser assertions quarantined with `.skip` + notes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vitest + config + npm scripts** - `da39955` (test)
2. **Task 2: Triage the two dormant test files to green** - `fede82b` (test)
3. **Task 3: Capture byte-identical fiat-ranking baseline snapshot** - `0e95705` (test)

## Files Created/Modified
- `vitest.config.ts` - node-env vitest config; `globals: true`; inline `@`→`./src` alias.
- `package.json` - added `test` (`vitest run`) and `test:watch` (`vitest`) scripts; `vitest@^4.1.10` devDependency.
- `package-lock.json` - vitest + its dependency tree locked.
- `src/lib/engine/__tests__/fiat-regression.test.ts` - full-corpus byte-identical fiat-ranking snapshot test (TECH-01); ports the 5 scenarios + stable serializer from `scripts/capture-ranking.mts`, calls `recommendCards` with no rate table.
- `src/lib/engine/__tests__/__snapshots__/fiat-regression.test.ts.snap` - committed baseline of the current fiat ranking (55 entries).
- `src/lib/engine/__tests__/engine.test.ts` - fixed 2 stale fixtures (deprecated `merchantType` → `category`/`merchantId`); a third (foreign-currency) fixture given a matching `category` so it truly tests currency gating.
- `src/lib/parser/__tests__/transactionParser.test.ts` - quarantined 7 assertions with `it.skip` + inline notes.

## Decisions Made
- **Node env + single alias only.** No jsdom/happy-dom, coverage, or plugins — the engine is pure TS and the phase honors single-artifact simplicity.
- **Full corpus, not 3 ids.** `capture-ranking.mts` filtered to 3 target cards; the snapshot instead serializes all 11 cards per scenario so any reorder anywhere fails.
- **No rate table.** The current `recommendCards` is 3-arg; the test exercises only the fiat path, which Waves 1–2 keep byte-identical by partitioning crypto out before the sort.
- **Fix vs quarantine split.** The 2 engine failures were genuine stale-fixture bugs (matched the new `category`/`merchantId` schema) → fixed. The 7 parser failures assert parser output never validated by a runner (mcdonalds→`dining` not `fast-food`, netflix→`entertainment` not `streaming`, a defaulted-HKD confidence, a `港元` amount-parse edge) → quarantined rather than encode possibly-wrong behavior as canonical.

## Deviations from Plan

None — plan executed exactly as written. The two engine-fixture fixes and seven parser quarantines are the Task 2 triage the plan explicitly scoped (RESEARCH Pitfall 1 / DEC to "fix or .skip"), not unplanned deviations. No production (non-test) source was modified.

## Issues Encountered
- First-ever run of the two dormant files surfaced 9 failures (2 engine, 7 parser), exactly as RESEARCH Pitfall 1 predicted. Resolved via the planned triage: fixture corrections for the engine (matching the post-Phase-6 schema) and `.skip`-quarantine for the parser assertions. Production engine/parser code was left untouched, so the fiat snapshot remains a faithful baseline of current behavior.

## Deferred Issues
- **Parser taxonomy/parsing reconciliation (7 quarantined tests).** `transactionParser.test.ts` asserts a category taxonomy (`fast-food`, `streaming`) and a defaulted-HKD confidence and a `500港元` amount-parse that the current production parser does not produce. These need a spec decision on the correct taxonomy before the tests are re-activated or the parser is changed. Out of scope for Wave 0 (infra-only); recommend a follow-up Linear issue under the parser surface. No security detail (public repo).

## User Setup Required
None - no external service configuration required. vitest is a dev-only dependency installed via `npm install`.

## Next Phase Readiness
- The runner exists and `npm test` is green (50 passed / 7 skipped / 0 failed), so Waves 1–2 can add `valuateCrypto`, the `hkEligible` gate, and `minStaking` handling with their own test files.
- The TECH-01 baseline is committed on the pre-crypto engine — the invariant "fiat rankings are byte-identical" is now enforceable. Any drift in the fiat sort during later waves turns `fiat-regression.test.ts` red.
- `npx tsc --noEmit` is green; `tsconfig.json` excludes `**/__tests__/**`, so test type-safety relies on vitest's esbuild pipeline (noted in RESEARCH Pitfall 2) — acceptable for now.

## Self-Check: PASSED

- Files verified present: `vitest.config.ts`, `fiat-regression.test.ts`, `__snapshots__/fiat-regression.test.ts.snap`, `07-01-SUMMARY.md`.
- Commits verified in git: `da39955`, `fede82b`, `0e95705`.
- `npm test` → 50 passed / 7 skipped / 0 failed; `npx tsc --noEmit` → exit 0.
- `git diff --name-only origin/main..HEAD` → only test/config/package files; no production engine/app source modified.

---
*Phase: 07-crypto-hkd-valuation-engine-hkeligible-gate*
*Completed: 2026-07-24*
