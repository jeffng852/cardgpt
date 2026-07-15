# CardGPT — State

**Updated:** 2026-07-15
**Tracking issue:** THI-233 · Linear project "CardGPT" (team THI, ~30 issues)

## Project Reference

**Core value:** Answer "which of my cards should I use for this purchase?" — for HK cards,
in the user's language, without login, in under a second.

**Two surfaces, both in scope (DEC-SCOPE-001):** public recommendation tool + admin/
ingestion backend.

**Current focus:** None. GSD adoption on an existing product. As-built capture complete;
milestone framing deliberately deferred to a later session.

## Current Position

**Phase:** None active — Phases 1-5 are retrospective and already shipped
**Plan:** None
**Status:** As-built capture complete. Awaiting decisions on open questions.

```
Phases 1-5 (as-built, shipped)  [##########] 100%
Milestone (undefined)           [----------]  n/a
```

**This is not a greenfield project.** 87 commits on main, live on Vercel (`hkg1`), last code
activity 2026-02-24. Do not plan the building of features that shipped six months ago —
read `ROADMAP.md`'s framing block before planning anything.

## Accumulated Context

### Decisions

- **DEC-SCOPE-001 (2026-07-15, decided):** The admin/card-ingestion subsystem is **core and
  in scope for GSD**. Consequently the PRD is canonical-but-incomplete (needs a v2 covering
  admin + Redis), and **CAND-003 "No Backend for MVP" is retired, not promoted** — 12 API
  routes contradict it.
- **Zero ADRs exist.** CAND-001…CAND-007 are unlocked candidates. Nothing is locked.
  See `PROJECT.md` → Decisions.

### Ground truth (verified 2026-07-15)

Next.js 16.1.4 · React 19.2.3 · Tailwind v4 · TS strict · Upstash Redis (card data) ·
`@vercel/blob` (image upload only) · `@anthropic-ai/sdk` 0.71.2 · `pdf-parse` ·
next-intl (en/zh-HK) · 11 cards / 40 rules · 12 API routes · Vercel `hkg1`.

**The repo's own docs are the least reliable artifact in it** — most are ~6 months stale and
several are actively wrong (ARCHITECTURE says Vercel Blob; it's Redis). GitHub main is
ground truth. See `PROJECT.md` → Known-stale docs.

### Corrections made to the ingest intel

Four intel claims did not survive verification against code. Recorded in
`REQUIREMENTS.md` → Corrections. Most significant:

- **WARNING-002 was factually wrong** — it claimed *zero* cards populate `rewardCap`;
  **3 of 11 do**. The dead-schema conclusion survives and sharpens: `rewardCap` is
  *write-only* — populated and read by nothing.
- **Two "unconfirmed" items resolved to deviations**, not unknowns: the typing cadence is
  10s vs. the PRD's 60s, and the tie-break chain has no reward-unit-class step.

### Blockers

None. Nothing is unsafe and nothing gates progress.

### Todos / open items

Nothing scheduled. Full detail in `ROADMAP.md` → Backlog / Open.

**Decisions needed (5):** OPEN-001 rule-priority taxonomy · OPEN-002 reward-cap contract
(gates PUB-007) · OPEN-005 desktop-vs-PWA + design direction · OPEN-006 tie-break semantics
· OPEN-007 typing cadence.

**Gaps (6):** PUB-007 multi-card split unbuilt · 🔴 OPEN-003 admin auth hardening (THI-236) ·
OPEN-004 zero ADRs + stale ARCHITECTURE + PRD v2 · OPEN-008 tests can't run ·
OPEN-009 landing NFRs unverified · OPEN-010 `dayOfWeek` dead path · OPEN-011 doc debt.

### Highest-leverage next moves (suggestions, not commitments)

1. 🔴 **OPEN-003 — harden admin auth. Start here.** Highest severity, confirmed live against
   production. See [THI-236](https://linear.app/thirdvisor/issue/THI-236) (Urgent) for the
   specifics — deliberately withheld from `.planning/` because this repo is public.
2. **OPEN-004 — promote CAND-006 (Redis) and CAND-007 (admin panel) to real ADRs.** They
   have no doc source at all; they exist only in git. Clearest early GSD win.
3. **OPEN-002 — decide the cap contract.** Unblocks the only unbuilt PRD requirement.

## Session Continuity

**Last session (2026-07-15):** Ingested 17 repo docs → `.planning/intel/`. User decided
DEC-SCOPE-001 (admin is core). Roadmapper verified intel against code, found 4 corrections,
and wrote PROJECT.md / REQUIREMENTS.md / ROADMAP.md / STATE.md as an as-built capture.

**Next session should:** Work the open questions, or define a milestone. **Do not** treat
Phases 1-5 as work to do.

**Per global convention:** this repo has no root `CLAUDE.md` process guide yet — consider
`/scaffold-process` to generate one (issue-first PR flow, source-of-truth model, deployment
runbook). Note the repo's Linear project already exists (~30 issues); confirm the
Linear↔GitHub integration is connected.
