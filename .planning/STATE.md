---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Card Directory & Crypto Expansion
status: executing
last_updated: "2026-07-24T00:00:00.000Z"
last_activity: 2026-07-24
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
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

Phase: 7 of 11 — Crypto→HKD Valuation Engine & `hkEligible` Gate (the milestone's critical phase) — **EXECUTING** (1/3 plans). (Phase 6 ✅ COMPLETE.)
Plan: 07-01 ✅ merged (PR #7 `e718dbe` — vitest + fiat baseline on main) · 07-02/03 NEXT (THI-280, engine). Decisions locked in 07-CONTEXT.md (DEC-VAL-A/B/C).
Status: Wave 0 done — vitest is the repo's first test runner; fiat baseline snapshot committed. Now building the valuation core + gate + segmentation (unit-segmented, partition-before-sort → fiat byte-identical; last-known+warn; base un-staked tier). Executing issue-by-issue (feature branch → PR → qa-karen).
Linear: Phase 7 milestone `3678a78f` · THI-279 (07-01 vitest+baseline) **Done** (PR #7) · THI-280 (07-02/03 engine, blocked-by 279 cleared) In Progress · Phase 6 THI-252/253/254 all Done.
Deferred follow-up (issue-first when parser next touched): 7 quarantined `transactionParser` tests need a parser-taxonomy reconciliation issue (qa-karen flagged on PR #7).
Infra (from Phase 6): Vercel on Thirdvisor Pro; prod Redis `cardgpt-prod` (env `KV_*`). Blob deferred (unused). Prod Redis is irrelevant to Phase 7 (pure engine work).
Last activity: 2026-07-24 — Phase 7 planned (discuss skipped → decisions captured inline; research done; vitest/partition-before-sort/byte-identical guard); plan-checker PASSED

Progress: [██████████] Phase 6 100% (5/5) · Phase 7 planned (0/3 executed) · Milestone v1.1: 1 of 6 phases complete

## Accumulated Context

### Decisions

- **DEC-DATA-001 (2026-07-16):** Crypto/neobank cards are **bulk-seeded from ranked.plus's
  public listings** (facts only; their referral links excluded). The **full global set** is
  imported for the directory; the recommender ranks only `hkEligible` cards, insulating it
  from the accepted lower-accuracy bulk data. Directory data must be provenance-labeled.
- **DEC-SCOPE-001 (2026-07-15):** the admin/ingestion subsystem is core and in scope.
- **Deferred to Phase 7 planning (design fork):** cross-unit valuation **normalize-to-HKD vs.
  unit-segmented results** — must be decided and recorded before writing the engine.
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
