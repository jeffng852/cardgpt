---
phase: 08-bulk-crypto-seed-affiliate-disclosure
plan: 02
subsystem: infra
tags: [redis, upstash, seed-script, vitest, crypto, fixture, esm]

# Dependency graph
requires:
  - phase: 06-schema-foundation
    provides: "cardType:'crypto' schema, rewardPrograms.crypto, hkEligible on CreditCard; merge-aware backfill-card-type.mjs precedent"
  - phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
    provides: "valuateCrypto/recommendCards contract keyed by shortName ticker; vitest 4.1.10 runner"
provides:
  - "Pure, unit-tested mergeCards(existing, incoming) → { cards, added } (append-by-new-id, never clobber)"
  - "Merge-aware crypto seed script (scripts/seed-crypto-cards.mjs) — read → merge → write-back → independent read-back verify → --dry-run"
  - "5-card crypto fixture (src/data/crypto-cards.fixture.json) driving all Phase 8 machinery testing"
  - "vitest now collects scripts/**/*.test.{ts,mts,mjs} — script logic runs under npm test"
affects: [08-03-rate-cron, 08-04-cmc-ticker-map, rq-001-real-crypto-load]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract safety-critical script logic into a pure helper so it is unit-testable without a live/mocked Redis"
    - "Merge-aware append-by-id seed (clone backfill-card-type.mjs, never seed-redis.mjs)"

key-files:
  created:
    - scripts/lib/mergeCards.mjs
    - scripts/seed-crypto-cards.mjs
    - scripts/__tests__/seed-crypto-cards.test.ts
    - src/data/crypto-cards.fixture.json
  modified:
    - vitest.config.ts

key-decisions:
  - "mergeCards de-duplicates repeated new ids WITHIN one incoming batch (first-seen wins) — beyond the plan's minimum, prevents a malformed fixture double-appending"
  - "Fixture read via fs.readFileSync + JSON.parse (path resolved from import.meta.url) rather than JSON import attributes — robust across Node versions, no syntax-version risk"
  - "Fixture cards use obviously-synthetic issuers ('Fixture Labs (SYNTHETIC — not a real issuer)') so they can never read as authoritative; provenance/DEC-DATA-001 labeling is the deferred real-load concern"

patterns-established:
  - "Pattern: pure value-in/value-out merge helper as the testable core of a Redis-mutating operator script (D-09 / T-08-SEED)"
  - "Pattern: seed script refuses on an empty key (merge, not fresh seed) and read-back-verifies both original AND appended ids survive"

requirements-completed: [D-01, D-09, D-10]

coverage:
  - id: D1
    description: "Pure mergeCards(existing, incoming) helper: append-by-new-id, skip existing (original object preserved), never mutate inputs, idempotent, intra-batch de-dup"
    requirement: "D-09"
    verification:
      - kind: unit
        ref: "scripts/__tests__/seed-crypto-cards.test.ts (6 specs)"
        status: pass
    human_judgment: false
  - id: D2
    description: "5-card crypto fixture covering stablecoin(USDC)+volatile(ETH,no-link)+staking-gated(minStaking ETH)+hkEligible:false+null-rate(NULLX), one asset per card"
    requirement: "D-01"
    verification:
      - kind: unit
        ref: "node -e fixture shape assertions (count=5, all crypto, hkEligible true&false, minStaking, NULLX, single-asset, no-applyUrl card)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Merge-aware seed script machinery: read → mergeCards → write-back → independent read-back verify → --dry-run; creds from env only (public repo)"
    requirement: "D-09"
    verification:
      - kind: unit
        ref: "node --check scripts/seed-crypto-cards.mjs (valid ESM, imports mergeCards, no secret literals) + mergeCards unit suite"
        status: pass
    human_judgment: false
  - id: D4
    description: "Running the seed against REAL production Redis (the actual crypto load)"
    verification: []
    human_judgment: true
    rationale: "Deferred to RQ-001 (D-01/D-10) — a live-data operator step (vercel env pull → --dry-run → apply → read-back), out of scope for this machinery-only plan. Not exercised here."

# Metrics
duration: 6min
completed: 2026-07-27
status: complete
---

# Phase 8 Plan 02: Merge-Aware Crypto Seed Machinery Summary

**A pure, unit-tested `mergeCards` helper plus a merge-aware `seed-crypto-cards.mjs` (append-by-id, read-back-verified, --dry-run) and a 5-card crypto fixture — the safety-critical seed logic proven without a live Redis, real data deferred to RQ-001.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-27T00:13:00Z
- **Completed:** 2026-07-27T00:19:00Z
- **Tasks:** 2 (Task 1 was TDD: RED + GREEN)
- **Files modified:** 5 (4 created, 1 edited)

## Accomplishments
- Extracted the seed's safety-critical logic into a pure `mergeCards(existing, incoming)` helper that provably never clobbers existing cards (append-by-new-id, skip existing with the original object kept, idempotent, no input mutation) — 6 passing specs.
- Broadened the vitest `include` glob to collect `scripts/**/*.test.{ts,mts,mjs}` so script logic now runs under `npm test`, with the `src/**` glob left intact (Phase 7 fiat snapshot unaffected).
- Built `scripts/seed-crypto-cards.mjs` cloned from `backfill-card-type.mjs`: read live `cards` → `mergeCards` → write-back → independent read-back verify of both original and fixture ids → `--dry-run`; refuses on an empty key (merge, not fresh seed); credentials from env only.
- Authored a 5-card synthetic crypto fixture covering every machinery case (stablecoin, volatile-no-link, staking-gated bonus, hkEligible:false, unmapped-ticker null-rate).

## Task Commits

1. **Task 1 (tracer/TDD) RED: failing mergeCards spec + scripts glob** - `c4ffa36` (test)
2. **Task 1 (tracer/TDD) GREEN: pure mergeCards helper** - `345e4b3` (feat)
3. **Task 2: crypto fixture + merge-aware seed script** - `4a935fa` (feat)

_Note: Task 1 is a TDD tracer (test → feat). Task 2 was committed atomically._

## Files Created/Modified
- `scripts/lib/mergeCards.mjs` - Pure, Redis-free `mergeCards(existing, incoming) → { cards, added }`; append-by-new-id, skip existing (original kept), intra-batch de-dup, no input mutation.
- `scripts/__tests__/seed-crypto-cards.test.ts` - 6 specs proving the D-09 non-clobber contract (new-id append, skip-existing with original preserved, 11-credit-id survival, idempotent re-run, empty incoming, intra-batch de-dup).
- `scripts/seed-crypto-cards.mjs` - Merge-aware operator seed script; reads fixture via fs, merges by id, writes back, independent read-back verify, `--dry-run`, env-only creds.
- `src/data/crypto-cards.fixture.json` - 5 synthetic crypto cards (CardDatabase shape) driving Phase 8 machinery testing.
- `vitest.config.ts` - `include` broadened with `scripts/**/*.{test,spec}.{ts,mts,mjs}` (src glob intact).

## Decisions Made
- **Intra-batch de-dup in mergeCards** (beyond plan minimum): if an incoming batch itself repeats a new id, only the first is appended. Cheap defensive property against a malformed fixture/real-load; asserted by a dedicated spec.
- **Fixture loaded via `fs.readFileSync` + `JSON.parse`** (path from `import.meta.url`) rather than JSON import attributes — avoids Node-version syntax-support risk and matches the "load the fixture cards" intent robustly.
- **Synthetic-labeled fixture issuers** so fixture cards can never be mistaken for authoritative data; full provenance labeling (DEC-DATA-001) travels with the deferred real load.

## Deviations from Plan
None - plan executed exactly as written. (The one addition, intra-batch de-dup, is a strengthening of the D-09 non-clobber contract, covered by its own test — not a scope change.)

## Issues Encountered
None. Baseline suite was already green (vitest 4.1.10 present from Phase 7, despite the stale "no test runner" note in CLAUDE.md); RED failed for the correct reason (missing helper, file collected), GREEN passed, full suite and `tsc --noEmit` both green after.

## Verification Results
- `npx vitest run scripts/__tests__/seed-crypto-cards.test.ts` → 6 passed.
- `node --check scripts/seed-crypto-cards.mjs` and `node --check scripts/lib/mergeCards.mjs` → exit 0.
- Fixture shape assertions (count=5, all crypto, hkEligible true & false, minStaking present, NULLX present, single-asset per card, a no-applyUrl card) → all true.
- Full suite `npx vitest run` → 11 files, 90 passed / 7 skipped (was 10 files / 84 before; +1 file, +6 tests; Phase 7 fiat snapshot still green).
- `npx tsc --noEmit` → exit 0.
- Secret scan on the seed script → no secret literals (env-only credential resolution).

## Deferred (out of scope, per plan)
- Running the seed against **real production Redis** and the **real bulk crypto data load** are deferred to RQ-001 (D-01/D-10). Operator procedure when unblocked: `vercel env pull` a fresh env (KV_* precedence), `node scripts/seed-crypto-cards.mjs --dry-run`, inspect, then run without the flag and confirm the read-back.

## Next Phase Readiness
- The mapped tickers this fixture relies on are **USDC** and **ETH** — this is the ticker contract 08-04's CMC id→ticker map must cover; **NULLX** is intentionally left unmapped to exercise the null-rate path.
- `mergeCards` is available for reuse by any future Redis merge-write path (e.g. the rate-table cron's per-ticker merge in 08-03).

---
*Phase: 08-bulk-crypto-seed-affiliate-disclosure*
*Completed: 2026-07-27*
