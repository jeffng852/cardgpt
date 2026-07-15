# Archived source documents

These 15 docs lived at the repo root until 2026-07-15, when CardGPT was migrated onto
the GSD workflow (THI-233). They were the raw input to `/gsd-ingest-docs`; their content
now lives in `.planning/intel/` and the four planning docs one level up.

**They are kept for provenance, not for reference. Do not treat anything here as current.**
Much of it is six-plus months stale and several claims are known-wrong. Where these docs
disagree with the code, the code wins — see `.planning/INGEST-CONFLICTS.md` for the
adjudicated list.

Moved with `git mv`, so `git log --follow` still works on each file.

## What was ingested, and how it was ranked

Precedence came from `.planning/ingest-manifest.yaml` (lower = higher authority). The
default `ADR > SPEC > PRD > DOC` order was deliberately overridden: CardGPT has **zero
ADRs**, and the PRD was the only real statement of product intent, so it was pinned to 0.

| Doc | Type | Prec | Status |
|---|---|---|---|
| `CardGPT PRD.md` | PRD | 0 | Canonical **but incomplete** — silent on the entire admin surface. Needs a v2. |
| `SCHEMA_REFACTOR_NOTES.md` | SPEC | 1 | Supersedes `SCHEMA_DESIGN.md`'s merchant model. Code agrees with it. |
| `SCHEMA_DESIGN.md` | SPEC | 2 | Superseded in part. Its `premium` rule tier does not exist in code. |
| `LANDING_PAGE_REDESIGN.md` | SPEC | 4 | Retrospective despite the SPEC label. Its NFRs are **claimed, never verified** — the testing checklist is entirely unchecked under a sign-off. |
| `COLOR_SYSTEM.md` | SPEC | 5 | Missed the dark-mode toggle that shipped. |
| `ENGINE_DOCUMENTATION.md` | DOC | 6 | Engine API accurate; references a nonexistent `/api/recommend` route. |
| `PARSER_DOCUMENTATION.md` | DOC | 7 | |
| `CARD_RESEARCH_SUMMARY.md` | DOC | 8 | Its proposed `monthlySpendingCap` shipped — on `RewardRule`, not inside `RewardCap` as proposed. |
| `CARD_IMAGE_AUTOMATION.md` | DOC | 9 | |
| `DARK_MODE_IMPLEMENTATION.md` | DOC | 10 | Accurate. |
| `DEVELOPMENT.md` | DOC | 11 | |
| `DEPLOYMENT.md` | DOC | 12 | Predates the Redis migration. |
| `DEPLOYMENT_READY.md` | DOC | 14 | Historical. Commands rooted at a dead path (`~/Desktop/CODE STUDIO/CardGPT`). |
| `PROGRESS_SUMMARY.md` | DOC | 15 | Historical (2026-01-21). Its 5 "Technical Decisions" are recorded as unlocked candidates — **2 of 5 no longer hold**, including "No Backend for MVP", which 12 API routes contradict. |
| `SESSION_SUMMARY.md` | DOC | 16 | Historical (2026-01-22). |

`README.md` and `docs/ARCHITECTURE.md` were **not** archived. The README is the public
repo's front page. `ARCHITECTURE.md` stays in `docs/` as a living document — but note it
still describes Vercel Blob as the data layer, which commits `6fb4d19` / `d43be5e` replaced
with Upstash Redis. Rewriting it is real outstanding work (OPEN-011).

## The big caveat

The most recent doc here is dated 2026-01-30; the last code activity is 2026-02-24. **The
final stretch of work is recorded nowhere but git** — the Blob→Redis migration and the run
of CDN-caching fixes that preceded it. Read `git log` before touching the data layer;
`.planning/ROADMAP.md` Phase 5 reconstructs that story.
