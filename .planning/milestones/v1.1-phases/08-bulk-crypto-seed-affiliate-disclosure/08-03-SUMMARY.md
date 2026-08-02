---
phase: 08-bulk-crypto-seed-affiliate-disclosure
plan: 03
subsystem: database
tags: [upstash-redis, crypto, rate-table, ssr, next-app-router, vitest, tdd]

# Dependency graph
requires:
  - phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
    provides: "recommendCards optional 4th `rateTable` arg, valuateCrypto, HkdRate/HkdRateTable types, cryptoSegment"
  - phase: 08-bulk-crypto-seed-affiliate-disclosure
    provides: "08-02 crypto fixture + merge-aware seed machinery (USDC/ETH tickers)"
provides:
  - "readRateTableFromRedis() — null-safe read of the 'crypto-rates' Redis key"
  - "writeRateTableToRedis() — per-ticker merge-not-overwrite write (the API 08-04's cron writes into)"
  - "Server→client rateTable injection: page.tsx → HomeClient prop → recommendCards 4th arg"
  - "The Phase 7 crypto engine is now LIVE (previously inert without a rate table)"
affects: [08-04-cmc-fetch-cron, crypto-ui-rendering-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "readRateTableFromRedis mirrors readCardsFromRedis against a distinct key, reusing the getRedis() singleton"
    - "read-merge-write for a partial refresh (spread fresh OVER existing) so a partial write never nulls a good ticker"
    - "server-side Redis read threaded as an optional prop into a client component and forwarded as an engine arg"

key-files:
  created:
    - src/lib/data/__tests__/rateTable.test.ts
  modified:
    - src/lib/data/redisStorage.ts
    - src/app/[locale]/page.tsx
    - src/components/HomeClient.tsx

key-decisions:
  - "writeRateTableToRedis merges per-ticker (spread fresh OVER existing) — never a blanket set of only freshRates (D-04)"
  - "page.tsx coalesces the null read to `undefined` at the prop boundary so rateTable stays optional at every hop"
  - "No cryptoSegment rendering added — data path only; UI deferred to a later phase"

patterns-established:
  - "Pattern 1: rate-table key = 'crypto-rates'; value keyed by asset shortName ticker in EXACT casing (D-03, no lookup normalization)"
  - "Pattern 2: null-safe Redis read → optional prop → optional engine arg keeps the 3-arg fiat contract byte-identical"

requirements-completed: [DEC-DATA-002, D-03, D-04]

coverage:
  - id: D1
    description: "readRateTableFromRedis returns the stored table, or null (never throws) on an absent key / rejected Redis get"
    requirement: "D-04"
    verification:
      - kind: unit
        ref: "src/lib/data/__tests__/rateTable.test.ts#readRateTableFromRedis — null-safe read"
        status: pass
    human_judgment: false
  - id: D2
    description: "writeRateTableToRedis merges per-ticker — a pre-existing ticker survives a partial write; empty write leaves table unchanged"
    requirement: "D-04"
    verification:
      - kind: unit
        ref: "src/lib/data/__tests__/rateTable.test.ts#writeRateTableToRedis — merge-not-overwrite"
        status: pass
    human_judgment: false
  - id: D3
    description: "An injected rate table drives the REAL recommendCards to value a crypto card in HKD (non-null hkdEquivalent); the 3-arg call omits cryptoSegment"
    requirement: "DEC-DATA-002"
    verification:
      - kind: integration
        ref: "src/lib/data/__tests__/rateTable.test.ts#engine injection — the rate table makes the crypto path go live"
        status: pass
    human_judgment: false
  - id: D4
    description: "page.tsx server-reads the rate table and threads it (optional) to HomeClient → recommendCards; app typechecks + builds"
    requirement: "DEC-DATA-002"
    verification:
      - kind: automated
        ref: "npx tsc --noEmit && npm run build"
        status: pass
    human_judgment: false
  - id: D5
    description: "With a real rate table in Redis, a crypto card renders an HKD value in the browser"
    verification: []
    human_judgment: true
    rationale: "Rendering is deferred to a later UI phase (08-VALIDATION Manual-Only); no cryptoSegment UI exists yet to observe visually"

# Metrics
duration: 12min
completed: 2026-07-27
status: complete
---

# Phase 8 Plan 03: Rate-Table Redis API + Engine Injection (Tracer) Summary

**A crypto→HKD rate table in the 'crypto-rates' Redis key is now read server-side (null-safe), threaded through HomeClient as an optional prop, and injected as recommendCards' 4th arg — taking Phase 7's inert crypto engine live end-to-end, with a merge-not-overwrite write API for 08-04's cron.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-27T00:22Z
- **Completed:** 2026-07-27T00:31Z
- **Tasks:** 2 (Task 1 TDD tracer = test→feat)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `readRateTableFromRedis()` — clone of `readCardsFromRedis` against the new `crypto-rates` key; returns `null` (never throws) on an absent key or a rejected Redis get, so the home page degrades to crypto-valued-null instead of 500ing (Pitfall 3 / T-08-RATE-AVAIL).
- `writeRateTableToRedis(fresh)` — read-merge-write: spreads `fresh` OVER the existing table per-ticker so a partial refresh never nulls a previously-good ticker; an empty write leaves the table unchanged (D-04 / Pitfall 2 / T-08-RATE). This is the storage API the 08-04 cron writes into.
- Server→client injection wired: `page.tsx` reads the table and passes `rateTable` to `HomeClient`, which forwards it as the optional 4th arg to the existing `recommendCards` call — the crypto valuation path is live (rendering deferred).
- Proven end-to-end: an integration test calls the REAL `recommendCards` with an injected table and asserts a non-null `hkdEquivalent` in `cryptoSegment`; the 3-arg call omits `cryptoSegment` (additive Phase 7 contract intact).

## Task Commits

1. **Task 1 (tracer, TDD RED): failing spec** - `c506bcb` (test)
2. **Task 1 (tracer, TDD GREEN): rate-table Redis API** - `2b1c9eb` (feat)
3. **Task 2: thread server-read rateTable into recommendCards** - `03248b4` (feat)

## Files Created/Modified
- `src/lib/data/__tests__/rateTable.test.ts` - NEW; 9 tests: null-safe read (absent/rejected), merge-not-overwrite write, real-engine injection vs additive 3-arg call.
- `src/lib/data/redisStorage.ts` - Added `RATES_KEY`, `readRateTableFromRedis()`, `writeRateTableToRedis()` (merge); imports `HkdRateTable` from `@/types/card`.
- `src/app/[locale]/page.tsx` - Server-reads the rate table via `readRateTableFromRedis()`; passes `rateTable={rateTable ?? undefined}` to `HomeClient`.
- `src/components/HomeClient.tsx` - Optional `rateTable?: HkdRateTable` prop, forwarded as the 4th positional arg to `recommendCards`; no other logic changed.

## Decisions Made
- **Merge semantics:** `{ ...existing, ...freshRates }` then `set` — the D-04 tampering backstop against a partial cron wipe. Never a blanket set of only `freshRates`.
- **Null coalescing at the prop boundary:** `readRateTableFromRedis()` returns `HkdRateTable | null`; the page passes `rateTable ?? undefined` so the prop and the engine arg stay strictly optional (matches `recommendCards`' own optional param), keeping the 3-arg fiat path byte-identical.
- **No cryptoSegment UI:** this plan makes the data non-inert only; rendering is deferred (per plan / 08-VALIDATION Manual-Only).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@upstash/redis` test mock must be a `new`-able constructor**
- **Found during:** Task 1 (GREEN — first run of the storage tests)
- **Issue:** The initial mock used `Redis: vi.fn(() => ({...}))`; `getRedis()` calls `new Redis(...)`, and an arrow function is not a valid constructor, so every storage call threw a `TypeError` and hit the catch (write returned `success:false`, read returned `null` for the wrong reason).
- **Fix:** Changed the mock to a `class { get = mockGet; set = mockSet }` so `new Redis()` yields the fake client.
- **Files modified:** src/lib/data/__tests__/rateTable.test.ts
- **Verification:** `npx vitest run src/lib/data/__tests__/rateTable.test.ts` → 9/9 pass.
- **Committed in:** `2b1c9eb` (folded into the GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, test-infra only)
**Impact on plan:** Test-harness correction only; no production-code or scope change. All plan behaviors implemented as written.

## Issues Encountered
- The repo `CLAUDE.md` still records "there is no test runner" (OPEN-008), but vitest is now installed and `npm test` (`vitest run`) is wired — the 08-02 work resolved this. Full suite is green.

## Verification Results
- `npx vitest run src/lib/data/__tests__/rateTable.test.ts` → **9 passed**.
- `npx tsc --noEmit` → **exit 0**.
- `npm run build` → **Compiled successfully** (page.tsx server-reads the table; HomeClient threads it; SSR build clean).
- `npm test` (full suite, wave gate) → **12 files, 99 passed / 7 skipped** — the Phase 7 fiat-regression snapshot passed, confirming 3-arg callers are byte-identical.
- Note: the 7 skipped tests are pre-existing (unrelated to this plan) and out of scope.

## User Setup Required
None - no external service configuration required. (A live `crypto-rates` key in prod Redis is produced by 08-04's cron; until then the read is null and the crypto path degrades to value-unavailable by design.)

## Next Phase Readiness
- The consumption + storage API is in place. 08-04 (CMC fetch/cron) can now call `writeRateTableToRedis()` to populate the `crypto-rates` key; the home page will pick it up automatically on the next `force-dynamic` render.
- Deferred: crypto valuation UI (rendering `cryptoSegment`) — a later phase.

## Self-Check: PASSED
- FOUND: src/lib/data/__tests__/rateTable.test.ts
- FOUND: src/lib/data/redisStorage.ts (readRateTableFromRedis / writeRateTableToRedis)
- FOUND: commit c506bcb (test), 2b1c9eb (feat storage), 03248b4 (feat threading)

---
*Phase: 08-bulk-crypto-seed-affiliate-disclosure*
*Completed: 2026-07-27*
