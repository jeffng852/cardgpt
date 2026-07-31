---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Card Directory & Crypto Expansion
current_phase: 10
current_phase_name: Milestone v1.1 COMPLETE (6/6), recorded in MILESTONES.md
status: milestone-complete
stopped_at: v1.1 complete + recorded (MILESTONES.md). Phase-dir archive + PROJECT.md evolution can run with /gsd-new-milestone (archives outgoing phases) in a fresh window.
last_updated: "2026-07-31T12:00:00.000Z"
last_activity: 2026-07-31
last_activity_desc: Milestone v1.1 COMPLETE — all 6 phases live + Ops-Grace HEALTHY; recorded in MILESTONES.md
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# CardGPT — State

**Updated:** 2026-07-25
**Tracking issue:** THI-233 · Linear project "CardGPT" (team THI) · issues THI-176 (revamp), THI-51 (crypto)

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-16)

**Core value:** Answer "which of my cards should I use for this purchase?" — for HK cards,
in the user's language, without login, in under a second.

**Current focus:** Milestone **v1.1 — Card Directory & Crypto Expansion**. Phases 6, 7 & 8 complete
(3 of 6). **Next: Phase 9 — Data Page (Card Directory)** (not yet discussed/planned). Phase 8's crypto
engine + rate cron are live-but-dormant until `COINMARKETCAP_API_KEY`/`CRON_SECRET` are set and RQ-001
real crypto-card data lands; disclosure revisit tracked as THI-297.

## Current Position

Phase: 09 of 11 — next (Phases 6, 7 & 8 complete)
Plan: Not started
Status: Ready to plan Phase 9 (Data Page). Phase 8 merged to main (PR #9, THI-294 Done); crypto engine live-dormant.
Linear: Phase 8 milestone `d8cb2a69` · THI-294 **Done** (PR #9, auto-closed) · THI-297 disclosure follow-up (Todo, RQ-001-gated) · Phase 7 THI-279/280 Done · Phase 6 THI-252/253/254 Done.
Deferred follow-ups (issue-first when picked up): (1) 7 quarantined `transactionParser` tests → parser-taxonomy reconciliation; (2) NIT-1 `eligibleCardsCount` is fiat-only post-partition → fix/clarify in Phase 8 when crypto data exists; (3) crypto segment skips preference filters → Phase 9 UI decision.
Infra: Vercel on Thirdvisor Pro; prod Redis `cardgpt-prod` (env `KV_*`). Blob deferred (unused).
Last activity: 2026-07-25 — Phase 07 complete

Progress: [██████████] Phase 7 [░░░░░░░░░░] 0% (3/3) · Milestone v1.1: **2 of 6 phases complete** (Phases 6, 7)

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

Last session: 2026-07-31T11:04:01.704Z
Stopped at: context exhaustion at 77% (2026-07-31)
Resume file: None

**Milestone v1.1: 6 of 6 phases COMPLETE (100%) + all live.** Phases 6, 7, 8, 9, 10, 11 done + deployed.

**Next: milestone close-out.** Run the GSD milestone lifecycle for v1.1: audit (/gsd-audit-milestone) then complete/archive
(/gsd-complete-milestone v1.1) then define v1.2 if desired. Not yet done this session (paused at the milestone boundary for a
deliberate beat + context limits).

**Tracked follow-ups (non-blocking):**

- GH #12 (OpenRouter key dead in prod, AI free-text parser degraded; Jeff to rotate a fresh key). HIGHEST user-impact open item.
- Ingestion strategy: scraping evaluated, recommendation = hybrid manual-first, NOT per-issuer scrapers (see memory [[cardgpt-tc-ingestion-not-scalable]]).
- THI-297 (affiliate disclosure revisit before live monetized links), RQ-001 (real crypto card + rate data), GH #11 (Phase 11 redesign nits), Phase 9 qa-karen nit (zh-HK empty-count cosmetic).
- Em-dash rule now standing for all product copy (memory [[jeff-prefers-hyphens-not-emdash]]); swept clean this session.

**Re-sequencing (2026-07-27, DONE):** Phase 11 redesign was pulled ahead of Phases 9 & 10 — restyle the app first, then
build Data/Research into it. Phase 11 is now **complete + merged + live** (v2 design system, `.planning/design/ui-contract-v2.md`).
The parked Phase 9 plans (09-01/02/03) were authored for the OLD design — **do NOT execute them as-is**; re-plan into the v2
system reusing `CreditCardCard` (browse mode). See the NEXT block above.
Then rebuild the Phase 9 directory into the finished system. Reference mockup: scratchpad cardgpt-redesign-mockup.html
(artifact 59c451e4). Real build loads Rethink Sans + Inter via next/font (mockup used system-font approximations).

**Design decisions still valid regardless of the restyle (from 09-CONTEXT.md):** card grid, dedicated /cards/[id] detail
(uses getCardById), search+sort (filters deferred), page-level provenance banner, recommender deep-link, bilingual. Only
the VISUAL system changes (current → ranked.plus).

**Phase 8 operational follow-ups (not blocking Phase 9):**

- Set `COINMARKETCAP_API_KEY` + `CRON_SECRET` as Vercel env secrets to activate the (currently dormant) rate cron.
- RQ-001: source real HK crypto-card data before the merge-seed loads anything real (fixture-only in prod today).
- THI-297: revisit affiliate disclosure before live monetized Apply links ship.

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 11 P03 | 10m | 2 tasks | 2 files |
