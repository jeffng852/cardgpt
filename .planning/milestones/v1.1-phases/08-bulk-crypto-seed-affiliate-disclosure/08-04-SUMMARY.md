---
phase: 08-bulk-crypto-seed-affiliate-disclosure
plan: 04
subsystem: backend
tags: [vercel-cron, coinmarketcap, crypto, rate-table, cron-secret, upstash-redis, vitest, tdd, security]

# Dependency graph
requires:
  - phase: 08-bulk-crypto-seed-affiliate-disclosure
    provides: "08-03 writeRateTableToRedis() — per-ticker merge-not-overwrite write of the 'crypto-rates' key"
  - phase: 08-bulk-crypto-seed-affiliate-disclosure
    provides: "08-02 crypto fixture with mapped tickers USDC + ETH (NULLX intentionally unmapped)"
  - phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
    provides: "HkdRate { hkdPerUnit, asOf } / HkdRateTable types; asOf drives 24h staleness"
provides:
  - "GET /api/cron/refresh-rates — CRON_SECRET-gated daily cron that fetches HKD prices and merge-writes them"
  - "fetchCryptoRates(ids) + CMC_ID_TO_TICKER allowlist — id-based, boundary-validated CoinMarketCap client"
  - "vercel.json crons entry — daily '0 3 * * *' schedule that drives the route"
  - "The 'crypto-rates' Redis key now has a producer (08-03 was the consumer/API only)"
affects: [crypto-ui-rendering-phase, operator-deploy-cmc-key-setup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel Cron reject-first CRON_SECRET Bearer gate: 401 before any external call or Redis write; unset secret = reject-all"
    - "Graceful degradation: a valid Bearer but unset COINMARKETCAP_API_KEY returns 200 skipped (no fetch, no write) so local build/dev never breaks"
    - "id-based CMC v2 lookup (never symbol=) via an explicit id->shortName allowlist, avoiding the symbol-collision array"
    - "fetch-boundary price validation (finite number > 0) — a bad/absent price is dropped, never fabricated"
    - "fetch/write wrapped in try/catch so a CMC failure leaves the last-known table untouched via the 08-03 merge-write"

key-files:
  created:
    - src/lib/data/fetchCryptoRates.ts
    - src/app/api/cron/refresh-rates/route.ts
    - src/app/api/cron/__tests__/refresh-rates.test.ts
  modified:
    - vercel.json

key-decisions:
  - "CMC_ID_TO_TICKER covers exactly the fixture's mapped tickers (ETH 1027, USDC 3408); NULLX stays unmapped (null-rate) and no speculative extra ids are fetched (credit-budget)"
  - "A CMC non-2xx returns 502 (not 500, not 200) — signals the schedule to retry while guaranteeing NO Redis write; the try/catch means the last-known table is never nulled (D-04)"
  - "The route derives its fetch ids from the allowlist keys, so extending coverage is a one-line allowlist edit"
  - "COINMARKETCAP_API_KEY / CRON_SECRET are read only via process.env inside the server-only route + fetch client; never inlined in vercel.json, never imported by client code (T-08-KEY)"

patterns-established:
  - "Pattern 1: official Vercel CRON_SECRET Bearer gate, reject-first (401 before work); an unset secret is reject-all"
  - "Pattern 2: external price client throws on non-2xx so the caller degrades without a partial/nulling write"
  - "Pattern 3: cron stamps a single fresh ISO asOf on each resolved ticker so Phase 7's 24h staleness works"

requirements-completed: [D-02, D-02a, D-04]

coverage:
  - id: C1
    description: "Route rejects missing/wrong Bearer and an unset CRON_SECRET with 401 BEFORE any fetch or Redis write"
    requirement: "D-02 / T-08-CRON"
    verification:
      - kind: unit
        ref: "src/app/api/cron/__tests__/refresh-rates.test.ts#CRON_SECRET reject-first gate (3 cases)"
        status: pass
    human_judgment: false
  - id: C2
    description: "Valid Bearer but unset COINMARKETCAP_API_KEY returns 200 skipped no-op (no fetch, no write)"
    requirement: "D-02a"
    verification:
      - kind: unit
        ref: "src/app/api/cron/__tests__/refresh-rates.test.ts#graceful no-op when the CMC key is unset"
        status: pass
    human_judgment: false
  - id: C3
    description: "Happy path fetches by numeric id (convert=HKD, no symbol=), stamps asOf, and merge-writes resolved rates"
    requirement: "D-02 / D-03"
    verification:
      - kind: unit
        ref: "src/app/api/cron/__tests__/refresh-rates.test.ts#happy path fetches id-based prices and merge-writes"
        status: pass
    human_judgment: false
  - id: C4
    description: "Zero/negative/non-numeric prices are dropped at the fetch boundary; only valid tickers are written"
    requirement: "T-08-RATE"
    verification:
      - kind: unit
        ref: "src/app/api/cron/__tests__/refresh-rates.test.ts#price boundary rejection (2 cases)"
        status: pass
    human_judgment: false
  - id: C5
    description: "A CMC non-2xx / network error results in NO Redis write; the last-known table is untouched"
    requirement: "D-04"
    verification:
      - kind: unit
        ref: "src/app/api/cron/__tests__/refresh-rates.test.ts#a CMC failure leaves the table untouched (2 cases)"
        status: pass
    human_judgment: false
  - id: C6
    description: "vercel.json registers a daily cron for /api/cron/refresh-rates without removing any existing top-level key"
    requirement: "D-02"
    verification:
      - kind: automated
        ref: "node -e parse vercel.json: crons entry present AND headers/regions/env/buildCommand/framework intact"
        status: pass
    human_judgment: false
  - id: C7
    description: "COINMARKETCAP_API_KEY / CRON_SECRET never reach the client bundle"
    requirement: "T-08-KEY"
    verification:
      - kind: automated
        ref: "grep: no COINMARKETCAP_API_KEY/CRON_SECRET refs in src/components or src/app/[locale]; key confined to server route + fetch client + test"
        status: pass
    human_judgment: false

status: complete
metrics:
  duration_minutes: 6
  completed: 2026-07-27
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 8 Plan 04: Bulk Crypto Seed & Affiliate — CMC Rate-Refresh Cron Summary

A CRON_SECRET-gated daily Vercel Cron (`GET /api/cron/refresh-rates`) that batch-fetches HKD crypto prices from CoinMarketCap by numeric id, boundary-validates each price, and merge-writes them into the `crypto-rates` Redis key from 08-03 — reject-first on auth, gracefully degrading to a no-op when secrets are absent, and never nulling last-known rates on failure. This is the **producer** for the rate table that 08-03 taught the engine to consume.

## What was built

**Task 1 (tracer, TDD) — the auth-gated cron + CMC client**
- `src/lib/data/fetchCryptoRates.ts` — native-`fetch` CoinMarketCap client. Queries `/v2/cryptocurrency/quotes/latest?id=<ids>&convert=HKD` by numeric **id** (never `symbol=`, avoiding the v2 symbol-collision array — 08-RESEARCH Pitfall 1) with the `X-CMC_PRO_API_KEY` header read from `process.env`. Exports `CMC_ID_TO_TICKER` (`1027 → ETH`, `3408 → USDC`; covers the fixture's mapped tickers, NULLX intentionally absent). Accepts a price only when it is a finite number `> 0` (T-08-RATE); throws on any non-2xx so the caller degrades (Assumption A2 — no 429 special-casing).
- `src/app/api/cron/refresh-rates/route.ts` — App Router `GET` with `export const dynamic = 'force-dynamic'`. Reject-first CRON_SECRET Bearer gate (401 before any fetch/write; unset secret = reject-all — T-08-CRON); graceful 200 `{ skipped: true }` when `COINMARKETCAP_API_KEY` is unset (D-02a); otherwise fetches by allowlist ids, stamps one fresh ISO `asOf` per resolved ticker, and calls the 08-03 `writeRateTableToRedis(fresh)` (merge). The fetch+write are wrapped in try/catch → a CMC failure logs and returns **502 with no Redis write** (D-04).
- `src/app/api/cron/__tests__/refresh-rates.test.ts` — 9 cases mocking `global.fetch` (`vi.stubGlobal`) and `writeRateTableToRedis` (`vi.mock`): 401 on missing/wrong Bearer, 401 on unset CRON_SECRET, 200 skipped on unset CMC key, id-based happy-path merge-write with fresh `asOf`, zero/negative + non-numeric boundary rejection, and non-2xx/network failure → no write.

**Task 2 — the schedule**
- `vercel.json` — added a top-level `crons` array with `{ "path": "/api/cron/refresh-rates", "schedule": "0 3 * * *" }` (daily ~11am HKT, inside the free 15k-credit budget). Every pre-existing key (`buildCommand`, `devCommand`, `installCommand`, `framework`, `regions`, `env`, `headers`) left byte-identical.

## Verification

- `npx vitest run src/app/api/cron/__tests__/refresh-rates.test.ts` — **9 passed**.
- `npm test` (full suite) — **108 passed, 7 skipped** (the 7 skips are pre-existing engine/parser tests, unrelated to this plan). Phase 7 fiat regression snapshot still green.
- `npx tsc --noEmit` — exit 0.
- `npm run build` — exit 0; `/api/cron/refresh-rates` compiled as a dynamic (ƒ) route.
- Key-leak grep — no `COINMARKETCAP_API_KEY`/`CRON_SECRET` references in `src/components` or `src/app/[locale]`; the key is confined to the server route, the fetch client, and the test (T-08-KEY).

## Deviations from Plan

None — plan executed exactly as written. No Rule 1–4 deviations, no auth gates hit (no live secrets are used; fetch + Redis are mocked, as required).

## Deferred (operator / manual — 08-VALIDATION Manual-Only, not blocking)

- Add `COINMARKETCAP_API_KEY` and `CRON_SECRET` in Vercel (`vercel env add ... production`) before the cron does real work. Until then the route no-ops gracefully (D-02a) and the cron burns no CMC credits.
- Post-deploy: with both secrets set, hit the route with the Bearer token and confirm `crypto-rates` gains numeric `hkdPerUnit` + fresh `asOf`; confirm the cron appears in the Vercel dashboard and `asOf` advances on schedule.

## Known Stubs

None. No hardcoded/placeholder rate values are written — the route only writes prices that clear the boundary check, and it no-ops (never stubs) when the CMC key is absent.

## Self-Check: PASSED

- FOUND: src/lib/data/fetchCryptoRates.ts
- FOUND: src/app/api/cron/refresh-rates/route.ts
- FOUND: src/app/api/cron/__tests__/refresh-rates.test.ts
- FOUND: vercel.json (crons entry, prior keys intact)
- Commits verified: 017f001 (test/RED), 66373ff (feat client+route/GREEN), ba6ef4b (feat vercel.json)
