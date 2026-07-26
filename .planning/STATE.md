---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Card Directory & Crypto Expansion
current_phase: 08
current_phase_name: Planned — 4 plans, 2 waves
status: ready-to-execute
stopped_at: Phase 8 planned (4 plans, plan-checker PASSED) — ready to execute
last_updated: "2026-07-26T00:00:00.000Z"
last_activity: 2026-07-26
last_activity_desc: Phase 8 planned — 4 plans across 2 waves; RESEARCH+VALIDATION+PATTERNS done; plan-checker PASSED
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 33
---

# CardGPT — State

**Updated:** 2026-07-25
**Tracking issue:** THI-233 · Linear project "CardGPT" (team THI) · issues THI-176 (revamp), THI-51 (crypto)

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-16)

**Core value:** Answer "which of my cards should I use for this purchase?" — for HK cards,
in the user's language, without login, in under a second.

**Current focus:** Milestone **v1.1 — Card Directory & Crypto Expansion**. Phases 6 & 7 complete
(2 of 6). **Next: Phase 8 — Bulk Crypto Seed & Affiliate / Disclosure** (not yet discussed/planned;
upstream-blocked on RQ-001 crypto-card source data; also owns the DEC-DATA-002 rate table).

## Current Position

Phase: 08 of 11 — planned, ready to execute (Phases 6 & 7 complete)
Plan: 4 plans across 2 waves (08-01/02/03 wave 1, 08-04 wave 2 depends on 08-03)
Status: Ready to EXECUTE Phase 8 — plan-checker PASSED (research + Nyquist validation + pattern map done)
Linear: Phase 7 milestone `3678a78f` · THI-279 **Done** (PR #7) · THI-280 **Done** (PR #8, auto-closed) · Phase 6 THI-252/253/254 all Done.
Deferred follow-ups (issue-first when picked up): (1) 7 quarantined `transactionParser` tests → parser-taxonomy reconciliation; (2) NIT-1 `eligibleCardsCount` is fiat-only post-partition → fix/clarify in Phase 8 when crypto data exists; (3) crypto segment skips preference filters → Phase 9 UI decision.
Infra: Vercel on Thirdvisor Pro; prod Redis `cardgpt-prod` (env `KV_*`). Blob deferred (unused).
Last activity: 2026-07-25 — Phase 07 complete

Progress: [██████████] Phase 7 100% (3/3) · Milestone v1.1: **2 of 6 phases complete** (Phases 6, 7)

## Accumulated Context

### Decisions

- **DEC-DATA-001 (2026-07-16):** Crypto/neobank cards are **bulk-seeded from ranked.plus's
  public listings** (facts only; their referral links excluded). The **full global set** is
  imported for the directory; the recommender ranks only `hkEligible` cards, insulating it
  from the accepted lower-accuracy bulk data. Directory data must be provenance-labeled.

- **DEC-SCOPE-001 (2026-07-15):** the admin/ingestion subsystem is core and in scope.
- **DEC-VAL-B (2026-07-24, Phase 7):** crypto ranking is **unit-segmented** (own `cryptoSegment`, partition-before-sort → fiat ranking byte-identical), NOT normalize-to-HKD. (Resolves the old Phase-7 fork below.) See `07-CONTEXT.md` for DEC-VAL-A/B/C.
- **DEC-DATA-002 (2026-07-24, UPDATED 2026-07-25 Phase 8 discuss):** the crypto→HKD rate source is a **cron-refreshed rate table injected into `recommendCards()`** (engine never fetches — DEC-VAL-B), consumed by Phase 7's `stale → last-known + warning` logic (DEC-VAL-A). Rate-table key = asset `shortName` ticker, exact casing (Phase 7 hard constraint). **Change (D-02, `08-CONTEXT.md`):** the source is now a **scheduled job that fetches real rates from CoinMarketCap** (`/v2/cryptocurrency/quotes/latest`, convert=HKD) — Jeff advanced the live-price-feed deferral, so it's no longer a manually-seeded static stablecoin table. ⚠ CMC needs an **API key** (Vercel env secret, never committed — public repo) and its free tier is credit-metered → batched+cached, ≥daily cadence. Adds Vercel Cron + `CRON_SECRET` + `COINMARKETCAP_API_KEY` (greenfield). Built in Phase 8 against a small fixture; real bulk data deferred to RQ-001.
- **DEC-AFF-DROP (2026-07-25, D-08 Phase 8):** the bilingual affiliate disclosure is **dropped** (product-owner risk-accepted); AFF-02 rewritten to keep only ranking-neutrality + recommendable-without-`applyUrl`. Removes the disclosure compliance gate (see Blockers below).
- Full decision log in PROJECT.md. Zero ADRs locked.

### Pending Todos

None scheduled for v1.1. As-built open items (OPEN-001…011) live in ROADMAP.md → Backlog / Open.

### Blockers/Concerns

- 🔴 **Admin-auth release gate (THI-236, Urgent).** The **first v1.1 prod deploy** is held on
  admin-auth hardening — it is a **release gate, not a phase**. Phases 6–10 all build and test
  **locally** without it. Specifics live in Linear (public repo).

- **Compliance release gate — affiliate disclosure portion REMOVED (2026-07-25, DEC-AFF-DROP).**
  The bilingual affiliate-disclosure gate is dropped by product-owner decision (risk accepted;
  see D-08 in `08-CONTEXT.md`). ⚠ Shipping affiliate CTAs without a disclosure is a
  deliberately-accepted legal/advertising-standards risk. Ranking-neutrality (no reorder by
  commission) is retained as a hard invariant. Any HK crypto-**promo** disclosure that is
  separately legally required remains a pre-deploy operator/legal call.

- **Phase 8 upstream block (RQ-001).** Bulk crypto seed is blocked on primary-source crypto
  card data (which HK-available crypto cards exist + real reward structures).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature | Side-by-side compare, `fundingOptions` display, weekly-cap handling, live price feeds, full miles↔cash normalization | Deferred to v1.x/v2 | v1.1 scoping |
| Monetization | Pro / subscription tier (THI-41) | Out of scope | v1.1 scoping |

## Session Continuity

Last session: 2026-07-26
Stopped at: Phase 8 planned — 4 plans across 2 waves, plan-checker PASSED; ready to execute
Resume file: .planning/phases/08-bulk-crypto-seed-affiliate-disclosure/08-01-PLAN.md

**Next:** `/gsd-execute-phase 8` — 4 plans ready (plan-checker PASSED). Wave 1: 08-01 (affiliate CTA +
loadCards fix), 08-02 (crypto fixture + merge-seed), 08-03 (rate-table Redis API + engine injection [tracer]).
Wave 2: 08-04 (CoinMarketCap CRON_SECRET cron) depends on 08-03. Machinery tested against a fixture;
real bulk data load deferred to RQ-001. ⚠ Needs COINMARKETCAP_API_KEY + CRON_SECRET as Vercel env secrets before prod.
