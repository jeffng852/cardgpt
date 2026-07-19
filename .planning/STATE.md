---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Card Directory & Crypto Expansion
status: executing
last_updated: "2026-07-19T00:00:00.000Z"
last_activity: 2026-07-19
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 0
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

Phase: 6 of 11 (first of 6 in milestone v1.1) — Schema, Crypto Type Fan-out & Backfills
Plan: 5 plans (06-01…06-05) across 4 waves — verified (plan-checker: PASSED, 0 blockers/warnings)
Status: Ready to execute Phase 6
Linear: milestone "Phase 6: Schema, Crypto Type Fan-out & Backfills" (first mapped v1.1 milestone) · issues THI-252 (06-01 schema), THI-253 (06-02/03/04 fan-out+RewardCap), THI-254 (06-05 prod Redis, High, human-gated) — all Todo, blocking chain 252→253→254
Last activity: 2026-07-19 — Phase 6 planned (research + discuss skipped; CRY-01/02/03 + TECH-02 covered) + Linear milestone/issues wired

Progress: [░░░░░░░░░░] 0% (0 of 6 v1.1 phases planned+executed; Phase 6 plans ready)

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
