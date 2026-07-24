---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Card Directory & Crypto Expansion
status: executing
last_updated: "2026-07-24T00:00:00.000Z"
last_activity: 2026-07-24
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# CardGPT — State

**Updated:** 2026-07-17
**Tracking issue:** THI-233 · Linear project "CardGPT" (team THI) · issues THI-176 (revamp), THI-51 (crypto)

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-16)

**Core value:** Answer "which of my cards should I use for this purchase?" — for HK cards,
in the user's language, without login, in under a second.

**Current focus:** Milestone **v1.1 — Card Directory & Crypto Expansion**. Roadmap written
(Phases 6–11 appended; Phases 1–5 are as-built/COMPLETE). **Phase 6 planned** — 5 plans across 4 waves, ready to execute.

## Current Position

Phase: 7 of 11 — Crypto→HKD Valuation Engine & `hkEligible` Gate — ✅ **COMPLETE** (3/3 plans). Next: Phase 8 (Bulk Crypto Seed & Affiliate/Disclosure) — and it must ALSO build the crypto HKD rate source (DEC-DATA-002, cron-refreshed table) or the crypto cards it seeds can't be valued.
Plan: 07-01 (PR #7 `e718dbe`, vitest+baseline) · 07-02/03 (PR #8 `43d33a7`, valuation+gate+segmentation) — all merged + deployed.
Status: Phase 7 complete. Crypto valuation engine SHIPPED but dormant — no crypto data + no caller passes a rate table yet, so `cryptoSegment` is empty and the live recommender behaves exactly as before (fiat ranking byte-identical, structurally guaranteed). 73 tests green (vitest is now the repo's runner).
Linear: Phase 7 milestone `3678a78f` · THI-279 **Done** (PR #7) · THI-280 **Done** (PR #8, auto-closed) · Phase 6 THI-252/253/254 all Done.
Deferred follow-ups (issue-first when picked up): (1) 7 quarantined `transactionParser` tests → parser-taxonomy reconciliation; (2) NIT-1 `eligibleCardsCount` is fiat-only post-partition → fix/clarify in Phase 8 when crypto data exists; (3) crypto segment skips preference filters → Phase 9 UI decision.
Infra: Vercel on Thirdvisor Pro; prod Redis `cardgpt-prod` (env `KV_*`). Blob deferred (unused).
Last activity: 2026-07-24 — Phase 7 executed issue-by-issue (07-01 PR #7, 07-02/03 PR #8), qa-karen APPROVED both, fiat byte-identical verified; DEC-DATA-002 recorded (crypto rate source = cron table, Phase 8); Phase 7 COMPLETE

Progress: [██████████] Phase 7 100% (3/3) · Milestone v1.1: **2 of 6 phases complete** (Phases 6, 7)

## Accumulated Context

### Decisions

- **DEC-DATA-001 (2026-07-16):** Crypto/neobank cards are **bulk-seeded from ranked.plus's
  public listings** (facts only; their referral links excluded). The **full global set** is
  imported for the directory; the recommender ranks only `hkEligible` cards, insulating it
  from the accepted lower-accuracy bulk data. Directory data must be provenance-labeled.
- **DEC-SCOPE-001 (2026-07-15):** the admin/ingestion subsystem is core and in scope.
- **DEC-VAL-B (2026-07-24, Phase 7):** crypto ranking is **unit-segmented** (own `cryptoSegment`, partition-before-sort → fiat ranking byte-identical), NOT normalize-to-HKD. (Resolves the old Phase-7 fork below.) See `07-CONTEXT.md` for DEC-VAL-A/B/C.
- **DEC-DATA-002 (2026-07-24):** the crypto→HKD **rate source is a cron-refreshed static rate table** — a scheduled job writes `{ [assetTicker]: { hkdPerUnit, asOf } }` (seeded with stablecoin rates) into the data layer (Redis), which is then **injected** into `recommendCards()` (the engine never fetches — DEC-VAL-B). This is what Phase 7's `stale → last-known + staleness warning` logic (DEC-VAL-A) was built to consume. **To be built in Phase 8** (the crypto cards seeded there are inert until a rate table feeds them). Rate-table key = asset `shortName` ticker, exact casing (hard constraint from Phase 7). Live price-feed APIs remain deferred to a later milestone.
- Full decision log in PROJECT.md. Zero ADRs locked.

### Pending Todos

None scheduled for v1.1. As-built open items (OPEN-001…011) live in ROADMAP.md → Backlog / Open.

### Blockers/Concerns

- 🔴 **Admin-auth release gate (THI-236, Urgent).** The **first v1.1 prod deploy** is held on
  admin-auth hardening — it is a **release gate, not a phase**. Phases 6–10 all build and test
  **locally** without it. Specifics live in Linear (public repo).
- **Compliance release gate.** Affiliate + HK crypto-promo disclosure is a pre-deploy
  operator/legal review: bilingual, conspicuous, before the CTA; ranking never reordered by
  commission. Generic here, detailed in Linear.
- **Phase 8 upstream block (RQ-001).** Bulk crypto seed is blocked on primary-source crypto
  card data (which HK-available crypto cards exist + real reward structures).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature | Side-by-side compare, `fundingOptions` display, weekly-cap handling, live price feeds, full miles↔cash normalization | Deferred to v1.x/v2 | v1.1 scoping |
| Monetization | Pro / subscription tier (THI-41) | Out of scope | v1.1 scoping |

## Session Continuity

Last session: 2026-07-17
Stopped at: v1.1 roadmap created — appended Phases 6–11 to ROADMAP.md, filled v1.1
traceability in REQUIREMENTS.md, updated this STATE.md. All 14 v1.1 requirements mapped.
Resume file: None

**Next:** `/gsd-plan-phase 6` (Schema + type fan-out + backfills — the foundation everything
compiles against). Phase 7 (valuation engine) is the highest-risk, critical-path phase and is
flagged for `--research-phase` at plan time.
