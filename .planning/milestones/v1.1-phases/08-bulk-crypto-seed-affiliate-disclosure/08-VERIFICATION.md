---
phase: 08-bulk-crypto-seed-affiliate-disclosure
verified: 2026-07-26T23:54:32Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 8: Bulk Crypto Seed & Affiliate / Disclosure Verification Report

**Phase Goal (ROADMAP.md, SC#3 superseded 2026-07-25 / D-08):** Build the machinery for the global crypto/neobank card set + affiliate monetization without disturbing the 11 live credit cards — merge-aware seed script, CoinMarketCap-fed rate-table cron making Phase 7's crypto valuation non-inert, affiliate CTA with `rel="sponsored nofollow noopener"`, and `loadCards` decoupled from `applyUrl` presence with ranking-neutrality proven. The bilingual disclosure is intentionally DROPPED (D-08) — its absence is correct, not a gap.

**Verified:** 2026-07-26T23:54:32Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A card without `applyUrl` is recommendable (AFF-02/D-06) | ✓ VERIFIED | `loadCards.ts:37-73` — the `applyUrl` branch is gone from `validateCard`; `loadCards.test.ts` proves link-less card passes and the 11-card corpus loads to 11. Live-data check: `sim-card` in `src/data/cards.json` has no `applyUrl` and was the latent bug this fix restores (confirmed by direct node inspection — corpus is 11/11 active). |
| 2 | Ranking is never reordered by affiliate presence (AFF-02/D-07) | ✓ VERIFIED | `affiliateNeutrality.test.ts` — 3 tests calling the real `recommendCards()`, proving identical order regardless of which of two otherwise-identical cards holds `applyUrl`, in both input orders. Comparator in `recommendCards.ts` (untouched by this branch) has no `applyUrl` term. |
| 3 | Apply CTA renders `rel="sponsored nofollow noopener"` only when a link exists (AFF-01/D-05) | ✓ VERIFIED | `applyCtaProps.ts` returns the exact triplet or `null`; `applyCtaProps.test.ts` (4 cases) locks it; `CardRecommendationList.tsx:461-463` spreads `applyCtaProps(card.applyUrl)!` inside the pre-existing `card.applyUrl &&` guard — CTA never renders for a link-less card. |
| 4 | No disclosure surface exists anywhere (D-08, SC#3 superseded) | ✓ VERIFIED | `grep -rn -i "disclosure\|advertiser" src/` (excluding tests) returns zero matches. Absence confirmed correct per D-08/ROADMAP SC#3 supersession. |
| 5 | Merge-aware seed never clobbers the 11 credit cards (D-09) | ✓ VERIFIED | `mergeCards.mjs` — pure append-by-id, skip-existing (original object preserved), no input mutation, intra-batch de-dup; `seed-crypto-cards.test.ts` (6 specs) proves all 11 credit ids survive a crypto merge, idempotent re-run, empty-incoming no-op. `seed-crypto-cards.mjs` clones `backfill-card-type.mjs`'s read→merge→write-back→independent-read-back-verify shape, refuses on an empty `cards` key, `--dry-run` supported, env-only credentials. |
| 6 | Rate table is read null-safe and injected as `recommendCards()`'s 4th arg (DEC-DATA-002/D-03) | ✓ VERIFIED | `redisStorage.ts` — `readRateTableFromRedis()` returns `null` on absent key/rejected get (never throws); `page.tsx` → `rateTable ?? undefined` → `HomeClient` prop → 4th positional arg to `recommendCards`. `rateTable.test.ts` integration case calls the REAL engine and asserts a non-null numeric `hkdEquivalent`; the 3-arg call omits `cryptoSegment` (additive contract intact, and `recommendCards.ts`/`valuateCrypto.ts` are byte-unmodified by this branch per `git log main..HEAD`). |
| 7 | `writeRateTableToRedis` merge-safe — partial write never nulls a good ticker (D-04) | ✓ VERIFIED | `redisStorage.ts:151-165` — `{ ...existing, ...freshRates}` then set; `rateTable.test.ts` proves a pre-existing ticker survives a partial write, an empty write leaves the table unchanged, and a rejected get degrades to `{success:false}` without throwing. |
| 8 | CMC cron: reject-first 401, graceful no-op, id-based lookup, boundary-validated prices, failure never writes (D-02/D-02a/D-04) | ✓ VERIFIED | `route.ts` — 401 before any fetch/write on missing/wrong Bearer or unset `CRON_SECRET`; 200 skipped no-op when `COINMARKETCAP_API_KEY` unset; `fetchCryptoRates.ts` queries by numeric `id` (never `symbol=`) via `CMC_ID_TO_TICKER` allowlist, accepts only finite `price > 0`; CMC non-2xx/network failure → catch block → no `writeRateTableToRedis` call → 502 (not 500). `refresh-rates.test.ts` (9 cases) covers every branch, including a spy proving zero fetch/write calls on the 401 paths. |
| 9 | Secrets never reach client code / vercel.json (T-08-KEY) | ✓ VERIFIED | `grep -rn "COINMARKETCAP_API_KEY\|CRON_SECRET" src/components src/app/[locale]` — zero matches. `vercel.json` `crons` entry carries only `path`/`schedule`, no secret literal; keys read only via `process.env` inside the server-only route + `fetchCryptoRates.ts`. |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/data/loadCards.ts` | `applyUrl` hard-drop removed, `validateCard` exported | ✓ VERIFIED | Branch removed (lines 33-73 confirmed); exported for testing |
| `src/lib/affiliate/applyCtaProps.ts` | Pure helper returning D-05 triplet or null | ✓ VERIFIED | Matches exactly |
| `src/components/CardRecommendationList.tsx` | CTA sources rel from helper | ✓ VERIFIED | `applyCtaProps` imported + spread inside existing guard |
| `scripts/lib/mergeCards.mjs` | Pure append-by-id merge, `{cards, added}` | ✓ VERIFIED | Matches exactly, plus intra-batch de-dup (strengthening) |
| `scripts/seed-crypto-cards.mjs` | Merge-aware operator script, `--dry-run`, read-back-verify | ✓ VERIFIED | Full read→merge→write→verify cycle; env-only creds; refuses on empty key |
| `src/data/crypto-cards.fixture.json` | 5-card fixture covering all machinery cases | ✓ VERIFIED | stablecoin(USDC,link), volatile(ETH,no-link), staking-gated, hkEligible:false, unmapped(NULLX) — all present |
| `vitest.config.ts` | Broadened include glob for `scripts/**` | ✓ VERIFIED | `scripts/**/*.{test,spec}.{ts,mts,mjs}` added, `src/**` glob intact |
| `src/lib/data/redisStorage.ts` | `readRateTableFromRedis`/`writeRateTableToRedis` (merge, null-safe) | ✓ VERIFIED | Matches exactly |
| `src/app/[locale]/page.tsx` | Server reads rate table, passes to HomeClient | ✓ VERIFIED | `await readRateTableFromRedis()` → `rateTable ?? undefined` prop |
| `src/components/HomeClient.tsx` | Optional `rateTable` prop, 4th `recommendCards` arg | ✓ VERIFIED | Matches exactly |
| `src/lib/data/fetchCryptoRates.ts` | Id-based CMC client, boundary validation | ✓ VERIFIED | `CMC_ID_TO_TICKER` allowlist (ETH 1027, USDC 3408), `price > 0 && Number.isFinite` check |
| `src/app/api/cron/refresh-rates/route.ts` | CRON_SECRET-gated GET, graceful degrade, merge-write | ✓ VERIFIED | Matches exactly; compiled as dynamic route in `npm run build` output |
| `vercel.json` | Daily `crons` entry, prior keys intact | ✓ VERIFIED | `crons: [{path:"/api/cron/refresh-rates", schedule:"0 3 * * *"}]`; `headers`/`regions`/`env`/`buildCommand`/`framework` all present |

All 6 new test files (`loadCards.test.ts`, `affiliateNeutrality.test.ts`, `applyCtaProps.test.ts`, `seed-crypto-cards.test.ts`, `rateTable.test.ts`, `refresh-rates.test.ts`) exist, are substantive (asserting the specific named behaviors, not trivial placeholders), and pass.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `loadCards.validateCard` | `recommendCards()` | link-less card no longer rejected | ✓ WIRED | Proven by `loadCards.test.ts` + live corpus 11/11 |
| `CardRecommendationList` | `applyCtaProps` | anchor props spread inside `applyUrl &&` guard | ✓ WIRED | `CardRecommendationList.tsx:461-463` |
| `seed-crypto-cards.mjs` | `mergeCards()` | append-by-id, never blanket `redis.set` of fixture | ✓ WIRED | `seed-crypto-cards.mjs:106` calls `mergeCards(cards, fixtureCards)` |
| `page.tsx` | `readRateTableFromRedis()` → `HomeClient` → `recommendCards` 4th arg | server read → optional prop → optional engine arg | ✓ WIRED | Traced end-to-end; `rateTable.test.ts` integration case proves the real engine values a card when injected |
| `route.ts` (cron) | `CMC_ID_TO_TICKER` / `fetchCryptoRates` → `writeRateTableToRedis` | auth gate → fetch → merge-write | ✓ WIRED | Traced end-to-end; `refresh-rates.test.ts` proves the route calls the 08-03 merge-write, never re-implementing it |

### Gates Re-Run (not trusted from SUMMARY — executed directly)

| Gate | Command | Result |
|------|---------|--------|
| Full test suite | `npx vitest run` | **13 files, 108 passed / 7 skipped** (7 skips are pre-existing, unrelated engine/parser tests) |
| Fiat regression snapshot | `git status`/`git diff` on `fiat-regression.test.ts.snap` | No diff — byte-identical since Phase 7; suite includes and passes this file |
| Typecheck | `npx tsc --noEmit` | Exit 0 |
| Production build | `npm run build` | Compiled successfully; `/api/cron/refresh-rates` present as a dynamic (ƒ) route in route manifest |

### Anti-Patterns Found

`grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` across all 12 phase-modified/created production files (`loadCards.ts`, `applyCtaProps.ts`, `CardRecommendationList.tsx`, `mergeCards.mjs`, `seed-crypto-cards.mjs`, `redisStorage.ts`, `page.tsx`, `HomeClient.tsx`, `fetchCryptoRates.ts`, `route.ts`, `vercel.json`, `crypto-cards.fixture.json`) — **zero matches**. No debt markers, no placeholders, no empty implementations. Secret-leak grep against client-bundled directories — zero matches.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| AFF-01 | 08-01 | Apply CTA affiliate link, `rel="sponsored nofollow noopener"` | ✓ SATISFIED | `applyCtaProps.ts` + `applyCtaProps.test.ts` |
| AFF-02 (revised) | 08-01 | Ranking-neutrality + recommendable-without-applyUrl (disclosure clause dropped per D-08) | ✓ SATISFIED | `loadCards.ts` fix + `affiliateNeutrality.test.ts` |
| D-01/D-09/D-10 | 08-02 | Merge-aware seed machinery + fixture | ✓ SATISFIED | `mergeCards.mjs`/`seed-crypto-cards.mjs`/fixture |
| DEC-DATA-002/D-03/D-04 | 08-03 | Rate-table Redis API + engine injection | ✓ SATISFIED | `redisStorage.ts` rate functions + wiring |
| D-02/D-02a/D-04 | 08-04 | CMC cron, credit-budget-aware, fail-safe | ✓ SATISFIED | `fetchCryptoRates.ts` + `route.ts` |

No orphaned requirements — REQUIREMENTS.md maps only AFF-01/AFF-02 to Phase 8 and both plans declare and satisfy them. (Note: REQUIREMENTS.md's traceability table still shows both as "Pending" — this is a pre-existing, not-yet-automated status field; Phase 6/7 rows show the same stale "Pending" despite being shipped and merged, so this is a documentation-hygiene item, not a phase gap.)

### D-08 Disclosure Drop — Explicitly Confirmed Correct

ROADMAP.md SC#3 is marked SUPERSEDED with the exact D-08 rationale; REQUIREMENTS.md AFF-02 is rewritten to drop the disclosure clause; STATE.md records `DEC-AFF-DROP` and the removed compliance release gate with the risk explicitly accepted by the product owner. Codebase grep confirms no disclosure surface was silently added or left half-built. This phase's SC#3 status is intentionally NOT a gap.

### Gaps Summary

None. All 9 derived observable truths verified against the codebase (not SUMMARY claims). All 4 plans' must-haves (truths/artifacts/key_links) hold. Gates re-run clean. No anti-patterns. No secret leakage. The Phase 7 engine contract (`recommendCards.ts`, `valuateCrypto.ts`) is untouched by this branch, confirming Phase 8 is additive wiring only, as designed.

### Human Verification Required

None required to pass this phase — all must-haves are structurally/programmatically verifiable. The following are correctly **deferred manual/operator items** per 08-VALIDATION.md's own Manual-Only section and the plans' `<verification>` blocks (not blockers to this phase's goal, since the goal is the *machinery*, not the live data/secrets):
- Setting real `COINMARKETCAP_API_KEY` / `CRON_SECRET` in Vercel and confirming the `crypto-rates` key populates with live data post-deploy.
- Confirming the Vercel Cron fires on schedule in production.
- Running `seed-crypto-cards.mjs` against real prod Redis (RQ-001-gated real bulk load — explicitly out of this phase's scope).

---

*Verified: 2026-07-26T23:54:32Z*
*Verifier: Claude (gsd-verifier)*
