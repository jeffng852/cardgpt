---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Card Directory & Crypto Expansion
status: executing
last_updated: "2026-07-23T00:00:00.000Z"
last_activity: 2026-07-23
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
  percent: 80
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
Plan: 06-01 ✅ + 06-02/03/04 ✅ merged (PR #3 f233706, PR #4 7cc8411 → main, prod-deployed, healthy) · 06-05 NEXT — human-gated prod Redis backfill (THI-254)
Status: Executing Phase 6 — Waves 1–3 done (4/5 plans). ONLY 06-05 remains: production Redis cardType backfill (autonomous:false, needs human go).
Linear: milestone "Phase 6…" · THI-252 **Done** (PR #3) · THI-253 **Done** (PR #4, auto-transitioned on merge) · THI-254 (06-05 prod Redis, High, human-gated) Todo · chain 252✅→253✅→254⬚
⚠ Open window: prod Redis cards still lack `cardType` (backfill = 06-05/THI-254). Public read-path unaffected (ungated); ADMIN EDIT of an un-typed card fails write-validation until THI-254 runs. QA-Karen's optional 1-line load-time hardening (`cardType: data.card.cardType||'credit'`) would pre-empt it.
Last activity: 2026-07-23 — 06-02/03/04 executed (Opus), QA-Karen APPROVED (byte-identical proof independently reproduced), PR #4 squash-merged + deployed (Ops-Grace: home 200, /en 200, admin gated); THI-253 auto-closed

Progress: [████████░░] 80% of Phase 6 (4 of 5 plans) · Phase 6 in progress (0 of 6 v1.1 phases complete)

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
