---
phase: 8
slug: bulk-crypto-seed-affiliate-disclosure
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 08-RESEARCH.md §Validation Architecture. Task IDs filled by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 (already installed, Phase 7) |
| **Config file** | `vitest.config.ts` (repo root) — `environment: 'node'`, `globals: true`, `@`→`src` |
| **Quick run command** | `npx vitest run <specific-file>` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~1s (current suite ~140ms; new tests are unit-level with mocked fetch/Redis) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <the new/changed test file>`
- **After every plan wave:** Run `npm test` — must stay green **including the Phase 7 byte-identical fiat snapshot** (`fiat-regression.test.ts`)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner) | — | — | AFF-02 (loadCards) | — | N/A | unit | `npx vitest run src/lib/data/__tests__/loadCards.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner) | — | — | AFF-01 | T-08-KEY | Apply anchor renders `rel="sponsored nofollow noopener"` only when `applyUrl` present | unit/component | `npx vitest run src/components/__tests__/CardRecommendationList.test.tsx` | ❌ W0 | ⬜ pending |
| TBD (planner) | — | — | AFF-02 (D-07 neutrality) | — | Ranking identical with/without `applyUrl` | unit/structural | `npx vitest run src/lib/engine/__tests__/affiliateNeutrality.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner) | — | — | D-02/D-04 (rate cron) | T-08-CRON / T-08-RATE | Fetch failure preserves last-known rates; 401 before any work without CRON_SECRET; reject non-positive prices | unit (mock fetch + Redis) | `npx vitest run src/app/api/cron/__tests__/refresh-rates.test.ts` | ❌ W0 | ⬜ pending |
| TBD (planner) | — | — | D-09 (merge seed) | T-08-SEED | Skips existing ids, appends new, never touches 11 credit cards; `--dry-run` = no write | unit (extract pure `mergeCards()`) | `npx vitest run scripts/__tests__/seed-crypto-cards.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All five phase-new surfaces are Wave 0 gaps — no existing test covers them:

- [ ] `src/lib/data/__tests__/loadCards.test.ts` — AFF-02 applyUrl-optional validation
- [ ] `src/components/__tests__/CardRecommendationList.test.tsx` — AFF-01 `rel` attr + conditional render. **Note:** no component-test tooling (`@testing-library/react`) is installed. Planner decides: add it as a devDependency, OR test a small extracted render helper as a plain string-template unit test (avoids a new dep — preferred under single-artifact simplicity).
- [ ] `src/lib/engine/__tests__/affiliateNeutrality.test.ts` — D-07 ranking-neutrality (or extend an existing engine test file)
- [ ] `src/app/api/cron/__tests__/refresh-rates.test.ts` — D-02/D-04 cron fetch/merge/failure (mock `global.fetch` + Redis client)
- [ ] `scripts/__tests__/seed-crypto-cards.test.ts` — D-09 merge logic; extract a pure `mergeCards(existing, incoming)` from the script so it's testable without a live Redis

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real CoinMarketCap fetch returns live HKD rates | D-02 | Needs a real `COINMARKETCAP_API_KEY` + network; unit tests mock `fetch` | With the key set locally, hit the cron route with the `CRON_SECRET` bearer and confirm Redis `crypto-rates` key is written with numeric `hkdPerUnit` + fresh `asOf` |
| Vercel Cron actually fires on schedule in prod | D-02 | Vercel platform behavior, not unit-testable | After deploy, confirm the cron appears in the Vercel dashboard and the rate key's `asOf` advances |
| Merge seed against real prod Redis leaves the 11 credit cards intact | D-09 | Mutates live data; unit test covers the pure merge only | `--dry-run` first, then run + independent read-back verify (per `backfill-card-type.mjs` convention) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
