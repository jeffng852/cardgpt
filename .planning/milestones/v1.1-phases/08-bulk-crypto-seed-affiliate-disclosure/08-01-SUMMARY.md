---
phase: 08-bulk-crypto-seed-affiliate-disclosure
plan: 01
subsystem: ui
tags: [affiliate, seo, rel-sponsored, loadCards, recommendation-engine, vitest, next]

# Dependency graph
requires:
  - phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
    provides: recommendCards() partition-before-sort comparator (net value → reward → fee → preferred issuer → name), used to prove affiliate ranking-neutrality
provides:
  - loadCards no longer drops a card for lacking an applyUrl (D-06) — recommendable is decoupled from having an affiliate link
  - Apply CTA renders rel="sponsored nofollow noopener" only when a link exists (AFF-01 / D-05)
  - pure applyCtaProps() helper — affiliate anchor decision testable in node-env vitest with no new devDependency
  - test proof that recommendation ranking is never reordered by affiliate presence (D-07)
affects: [affiliate-url-population, crypto-card-seed, card-directory-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract render-free decision into a pure helper so component behaviour is unit-testable without @testing-library/react (single-artifact simplicity)"
    - "Affiliate links carry rel='sponsored nofollow noopener' (sponsored+nofollow = paid-link signal; noopener = tab-nabbing mitigation; noreferrer dropped)"

key-files:
  created:
    - src/lib/affiliate/applyCtaProps.ts
    - src/lib/affiliate/__tests__/applyCtaProps.test.ts
    - src/lib/data/__tests__/loadCards.test.ts
    - src/lib/engine/__tests__/affiliateNeutrality.test.ts
  modified:
    - src/lib/data/loadCards.ts
    - src/components/CardRecommendationList.tsx

key-decisions:
  - "Removed the applyUrl-presence branch from loadCards.validateCard (D-06); every other validation branch untouched"
  - "Exported validateCard for direct unit testing (additive; no behaviour change)"
  - "CTA anchor sources href/target/rel from applyCtaProps(card.applyUrl); existing applyUrl guard, className, icon, copy unchanged"
  - "No disclosure surface added — D-08 dropped it (product-owner risk-accepted); ranking-neutrality is the compensating invariant"

patterns-established:
  - "Pure helper + node-env vitest as the substitute for a component-render test when no DOM tooling is installed"
  - "Structural neutrality proven by asserting recommendCards() output order is identical as the affiliate link moves between otherwise-identical cards"

requirements-completed: [AFF-01, AFF-02]

coverage:
  - id: D1
    description: "A structurally-valid card WITHOUT an applyUrl passes validation and is loaded/recommendable (D-06); the live 11-card corpus still loads to 11"
    requirement: "AFF-02"
    verification:
      - kind: unit
        ref: "src/lib/data/__tests__/loadCards.test.ts#validateCard — applyUrl is no longer required"
        status: pass
      - kind: unit
        ref: "src/lib/data/__tests__/loadCards.test.ts#loadCardsSync still loads the 11-card corpus to 11 active cards"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recommendation ranking is never reordered by affiliate presence (D-07) — order is name-alphabetical, not link-driven"
    requirement: "AFF-02"
    verification:
      - kind: unit
        ref: "src/lib/engine/__tests__/affiliateNeutrality.test.ts#applyUrl never reorders ranking"
        status: pass
    human_judgment: false
  - id: D3
    description: "Apply CTA carries rel='sponsored nofollow noopener' and renders only when applyUrl exists (AFF-01 / D-05)"
    requirement: "AFF-01"
    verification:
      - kind: unit
        ref: "src/lib/affiliate/__tests__/applyCtaProps.test.ts#returns the D-05 rel triplet / null when no link"
        status: pass
      - kind: integration
        ref: "npx tsc --noEmit (CardRecommendationList spreads applyCtaProps(card.applyUrl)! inside the existing guard)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-07-27
status: complete
---

# Phase 8 Plan 01: Bulk Crypto Seed & Affiliate — loadCards Fix + Affiliate CTA Summary

**Decoupled "recommendable" from "has an affiliate link" (restoring a silently-dropped live card) and turned the Apply CTA into an affiliate-signalled `rel="sponsored nofollow noopener"` link, with ranking-neutrality proven by test — no disclosure surface added (D-08).**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-27
- **Tasks:** 2 (1 tracer + 1 auto, both TDD)
- **Files modified:** 6 (2 modified, 4 created)

## Accomplishments
- Removed the `applyUrl` hard-drop in `loadCards.validateCard` (D-06 / AFF-02). This surfaced and fixed a live latent bug: `sim-card` (active) has no `applyUrl` and was being silently dropped — the corpus recommended **10** cards instead of 11. It now loads and ranks all **11**.
- Turned the Apply CTA into an affiliate-signalled link: `rel="sponsored nofollow noopener"` (D-05), rendered only when a link exists (AFF-01), via a new pure `applyCtaProps()` helper — no new devDependency (single-artifact simplicity).
- Proved by test (D-07) that affiliate presence never reorders `recommendCards()` output — order is determined by the existing sort chain (name-alphabetical tie-break), not by which card holds the link.
- Filled three Wave-0 test gaps: `loadCards.test.ts`, `affiliateNeutrality.test.ts`, `applyCtaProps.test.ts`.

## Task Commits

Each task committed atomically (TDD RED→GREEN folded into one commit per task):

1. **Task 1 (tracer): Link-less card recommendable + ranking affiliate-neutral** — `a44bcf2` (fix)
2. **Task 2: Affiliate-signalled CTA via a pure, testable helper** — `5ff3c75` (feat)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `src/lib/data/loadCards.ts` — removed the `applyUrl`-presence validation branch; exported `validateCard` for testing
- `src/components/CardRecommendationList.tsx` — Apply anchor now spreads `applyCtaProps(card.applyUrl)!` (href/target/rel) inside the unchanged `card.applyUrl &&` guard
- `src/lib/affiliate/applyCtaProps.ts` — NEW pure helper: returns the D-05 anchor triplet or `null`
- `src/lib/affiliate/__tests__/applyCtaProps.test.ts` — NEW (AFF-01 Wave-0 gap)
- `src/lib/data/__tests__/loadCards.test.ts` — NEW (AFF-02 loadCards Wave-0 gap)
- `src/lib/engine/__tests__/affiliateNeutrality.test.ts` — NEW (D-07 Wave-0 gap)

## Decisions Made
- **Exported `validateCard`** from `loadCards.ts` so the D-06 behaviour (link-less card validates, missing-issuer still drops) is unit-testable directly. This is additive and changes no runtime behaviour. The "returned by `loadCardsSync()`" clause is covered end-to-end by the real-corpus 11-count test plus the tracer end-to-end check.
- **CTA wiring via prop spread** (`{...applyCtaProps(card.applyUrl)!}`): the non-null assertion is safe because it sits inside the `card.applyUrl &&` guard. `className`, icon, and copy are untouched; only the `rel` changed (`noopener noreferrer` → the affiliate triplet).
- **No disclosure surface** — D-08 dropped it (product-owner risk-accepted); ranking-neutrality (D-07) is the recorded compensating invariant.

## Deviations from Plan

None that altered scope. Two notes on faithful execution:

1. **[Enabling — testability] Exported `validateCard`.** The plan's `<action>` said "delete the applyUrl branch; make no other change to the validator." Making the stated behaviour ("passes validateCard") directly assertable required exporting the function. This is additive (an export, not a logic change) and keeps every validation branch intact. Committed in `a44bcf2`.
2. **[Rule 1 — latent bug surfaced, not introduced] Corpus was recommending 10, not 11.** The plan assumed all 11 corpus cards have an `applyUrl`; in fact `sim-card` does not, so it was being dropped by the exact branch this plan removes. The "11-card corpus loads to 11" assertion was RED (got 10) before the fix and GREEN after — the fix is precisely what D-06 intended. No extra work was needed; documented here because it means this plan restored a live card to the recommender.

## Issues Encountered
None. Baseline suite was green (73 passed / 7 skipped) before work; final suite is green (84 passed / 7 skipped). The 7 skips are pre-existing (`engine.test.ts` / `transactionParser.test.ts`), untouched by this plan.

## Verification Results
- `npx vitest run src/lib/data/__tests__/loadCards.test.ts src/lib/engine/__tests__/affiliateNeutrality.test.ts src/lib/affiliate/__tests__/applyCtaProps.test.ts` — all green
- `npx tsc --noEmit` — exit 0
- `npm test` (full suite) — **10 files, 84 passed, 7 skipped**; Phase 7 byte-identical fiat snapshot (`fiat-regression.test.ts.snap`) unchanged (git shows no snapshot diff)

## Known Stubs
None. Both features are wired to real data paths (live validator + rendered CTA). Affiliate URLs themselves are populated later as they are obtained — the rail is built and correct now; a link-less card is fully functional (renders no button, still ranks).

## User Setup Required
None — no external service configuration in this plan. (CoinMarketCap key / cron infra belong to later Phase 8 plans, not this one.)

## Next Phase Readiness
- The affiliate rail is ready for real `applyUrl` values; adding them is a data step, no code change.
- `loadCards` now accepts link-less cards — the deferred bulk crypto seed and the fixture cards (which may lack affiliate links) will load and rank without a validator change.
- Remaining Phase 8 machinery (merge-aware crypto seed script, CoinMarketCap rate-table cron, `HomeClient` rateTable wiring) is out of this plan's scope and tracked separately.

## Self-Check: PASSED
- All 4 created source/test files present on disk.
- SUMMARY.md present.
- Task commits `a44bcf2` and `5ff3c75` exist in git history.

---
*Phase: 08-bulk-crypto-seed-affiliate-disclosure*
*Completed: 2026-07-27*
