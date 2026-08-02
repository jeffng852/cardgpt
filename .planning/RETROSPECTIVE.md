# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Card Directory & Crypto Expansion

**Shipped:** 2026-07-31 (archived 2026-08-02)
**Phases:** 6 (Phases 6–11) | **Plans:** 21 | **Tasks:** 30

### What Was Built
- Crypto card category end-to-end: schema (`cardType`, crypto reward unit + asset, `minStaking`, `hkEligible`) → unit-segmented crypto→HKD valuation engine (fiat ranking byte-identical) → fail-closed `hkEligible` gate.
- Public browse + explainer surfaces: `/cards` directory + `/cards/[id]` detail (search/sort, provenance banner) and a bilingual, engine-accurate `/research` methodology page — both of which rank nothing, keeping the `hkEligible` gate sole-sited in `recommendCards.ts`.
- Affiliate monetization rail (`applyUrl` CTA, `rel="sponsored nofollow noopener"`, ranking-neutral) + CoinMarketCap `CRON_SECRET`-gated daily rate cron (live, degrades safely).
- Whole-app re-skin into CardGPT's own v2 brutalist-editorial design system with a shared `CreditCardCard` and a pure `buildCardView` builder.
- The repo's first test runner (vitest), closing the long-standing OPEN-008 no-runner gap — 15 test files by close.

### What Worked
- **Builder-not-component split** (`buildCardView`, `directoryControls`) made display + search/sort logic node-env unit-testable and kept the React components thin — a pattern worth keeping.
- **Byte-identical regression anchoring**: committing a full-corpus fiat-ranking snapshot before touching the engine let every crypto change prove "fiat ranking unchanged" mechanically, not by inspection.
- **Re-sequencing Phase 11 (redesign) ahead of 9 & 10** so the new surfaces were built *into* the v2 system rather than re-skinned later — avoided rework.
- Full per-phase gate (issue-first → plan-checker → verifier → qa-karen → Ops-Grace) held on every phase; the product shipped live + HEALTHY.

### What Was Inefficient
- **Verification hygiene lagged shipping.** Phases 6 & 11 shipped without a canonical VERIFICATION.md; 7 needed a retroactive one; 9 & 10 sat at `human_needed` until a dedicated close-out session did the browser sign-offs. The audit surfaced this as `gaps_found` even though the product was live.
- **The milestone close ran in two disjoint sessions**: a prior session recorded MILESTONES.md + set STATE to `milestone-complete` but stopped before the archival mechanics, so this session had to reconcile a half-closed state (deduping a CLI-regenerated MILESTONES entry, collapsing a still-full ROADMAP).
- **`cryptoSegment` was built but never wired to UI** — real engine work whose output has no user-facing render (CRY-04), an inconsistency that should have been caught as a seam at plan time.

### Patterns Established
- **Pure builder/helper + thin component**, tested in node-env vitest (`buildCardView`, `directoryControls`).
- **Regression snapshot before engine change** as the standard guard for "additive, ranking-preserving" work.
- **Sole-siting a cross-cutting gate** (`hkEligible` in `recommendCards.ts` only) so browse surfaces bypass it by construction — documented as a keep-it-this-way invariant in CLAUDE.md.
- **Public-repo discipline**: security specifics (THI-236) stay in Linear, never in `.planning/`.

### Key Lessons
1. **Canonicalize verification at phase close, not milestone close.** Deferring human UAT sign-offs and skipping VERIFICATION.md turns milestone close into a debt-collection exercise. Run `/gsd-verify-work` the same session a phase's human-judgment items are flagged.
2. **Close a milestone in one pass.** A half-completed close (MILESTONES written, archive skipped) leaves an ambiguous state that costs more to reconcile than it saved.
3. **Wire, don't just build.** An engine output with no consumer (`cryptoSegment`) is a broken seam even when every unit test passes — treat "built but unrendered" as a plan-time smell.

### Cost Observations
- Model mix: orchestration on Opus (1M); GSD executors pinned to Opus 4.7 per `~/.gsd/defaults.json`.
- Sessions: milestone spanned ~2 weeks of intermittent sessions (Phase 6 start ~2026-07-16 → close 2026-08-02); close-out itself took one focused session after a paused prior attempt.
- Notable: the builder-not-component pattern kept test cost low (node-env, no live Redis / no browser needed for the pure helpers).

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 (as-built) | 1–5 | Pre-GSD; captured retrospectively 2026-07-15 |
| v1.1 | 6–11 | First GSD-native milestone; first test runner (vitest); v2 design system; per-phase qa-karen + Ops-Grace gate held throughout |

### Cumulative Quality

| Milestone | Tests | Notable |
|-----------|-------|---------|
| v1.0 | 0 | No test runner (OPEN-008 open) |
| v1.1 | 15 files | vitest installed (OPEN-008 closed); byte-identical fiat-ranking regression anchor |

### Top Lessons (Verified Across Milestones)

1. GitHub `main` is ground truth; `.planning/` drifts if not refreshed at phase/milestone boundaries — the v1.0 as-built capture existed only in `git log`.
2. Verification and archival hygiene must happen *at the boundary they belong to*, not deferred — the v1.1 close is the first data point; watch whether v1.2 repeats it.
