# Synthesis Summary

Entry point for downstream consumers (`gsd-roadmapper`). Generated 2026-07-15 by
gsd-doc-synthesizer. Mode: `new`. Tracking issue: THI-233.

**Read this first, then `INGEST-CONFLICTS.md`, then the per-type intel files.
Do not plan off the source docs directly — most are ~6 months stale.**

---

## Doc counts by type

- Total classified: **17** — all `high` confidence, all `manifest_override: true`
- PRD: **1** — CardGPT PRD.md (precedence 0, pinned canonical)
- SPEC: **4** — SCHEMA_DESIGN (1), SCHEMA_REFACTOR_NOTES (2), docs/ARCHITECTURE (3),
  LANDING_PAGE_REDESIGN (4), COLOR_SYSTEM (5)
- DOC: **12** — ENGINE_DOCUMENTATION (6), PARSER_DOCUMENTATION (7), CARD_RESEARCH_SUMMARY (8),
  CARD_IMAGE_AUTOMATION (9), DARK_MODE_IMPLEMENTATION (10), DEVELOPMENT (11), DEPLOYMENT (12),
  README (13), DEPLOYMENT_READY (14), PROGRESS_SUMMARY (15), SESSION_SUMMARY (16)
- ADR: **0**

## Decisions

- **Locked: 0.** No ADRs exist; no doc carries `locked: true`; no doc has an ADR status field.
  No LOCKED-vs-LOCKED contradiction was possible — the primary reason this ingest has no blockers.
- Candidate decisions (UNLOCKED, not promoted): **7**
  - CAND-001…CAND-005 — the 5 ADR-shaped entries in PROGRESS_SUMMARY.md's "Technical
    Decisions" section. Deliberately NOT auto-promoted per the ingest brief. **2 of the 5 no
    longer hold against code** (CAND-001 priority taxonomy drifted; CAND-003 "no backend for
    MVP" is contradicted by 12 API routes).
  - CAND-006 — Upstash Redis storage (evidenced only by `git log`, in no doc)
  - CAND-007 — Admin panel with AI-assisted card ingestion (in no doc; the PRD is silent)
- → `.planning/intel/decisions.md`

## Requirements

- Extracted: **15**, all from the single PRD. **No competing acceptance variants** — with one
  PRD there is nothing to compete, and nothing was merged or discarded.
- IDs: REQ-manual-card-curation, REQ-reward-parameters, REQ-card-corpus-under-100,
  REQ-category-optimization, REQ-multi-card-split, REQ-tie-breaking,
  REQ-assume-user-owns-all-cards, REQ-no-login-desktop-web, REQ-category-and-merchant-tags,
  REQ-nlp-transaction-input, REQ-bilingual-with-switch, REQ-ranked-results-display,
  REQ-free-v1-monetization-later, REQ-light-dark-mode, REQ-chatgpt-color-tone,
  REQ-typing-animation
- Status against code: **9 MET · 4 PARTIAL/UNCONFIRMED · 1 NOT IMPLEMENTED
  (REQ-multi-card-split) · 1 MET-by-design-deferral (REQ-free-v1-monetization-later)**
- → `.planning/intel/requirements.md`

## Constraints

- Extracted: **24**
- By type: schema **7** · protocol **5** · api-contract **3** · nfr **4** · design tokens **5**
- By status: **VERIFIED 9** · **CLAIMED (unverified) 12** · **STALE (code wins) 3**
  - STALE: CON-rule-priority (`premium` → `specific`), CON-data-layer (Blob → Redis),
    CON-dark-mode-mechanism (system-only → manual toggle shipped)
  - All 7 LANDING_PAGE_REDESIGN constraints are CLAIMED per the ingest brief — that doc's
    testing checklist is entirely unchecked despite its sign-off. Sole exception:
    CON-brand-palette, VERIFIED at `globals.css:20-25`.
- → `.planning/intel/constraints.md`

## Context

- Topics: **11** — ground truth from code, product framing, recommendation engine, card
  research, parser, dark mode & typing animation, card image automation, development
  workflow, deployment, historical snapshots (quarantined), known documentation gaps
- 3 docs quarantined as HISTORICAL SNAPSHOTS: PROGRESS_SUMMARY (2026-01-21),
  SESSION_SUMMARY (2026-01-22), DEPLOYMENT_READY (2026-01-25)
- → `.planning/intel/context.md`

## Conflicts

**0 blockers · 4 competing/ambiguous (WARNING) · 14 auto-resolved or informational (INFO)**

- → `.planning/INGEST-CONFLICTS.md` for full detail

The 4 WARNINGs, in rough order of leverage:
1. **WARNING-004** — the canonical PRD (prec 0) doesn't describe ~half the built system
   (admin panel, AI extraction, Redis, 12 API routes). Highest-leverage: it's a question
   about what CardGPT *is* now.
2. **WARNING-002** — the reward-cap model is specified three ways and populated zero ways;
   `RewardCap` is dead schema, and REQ-multi-card-split depends on it.
3. **WARNING-001** — rule-priority taxonomy: docs say `premium`, code says `specific`,
   with a semantic shift, not just a rename.
4. **WARNING-003** — manifest precedence is inverted; SCHEMA_DESIGN (1) outranks the
   SCHEMA_REFACTOR_NOTES (2) that supersedes it. Fixable in `--manifest`.

## Status

**AWAITING USER — 4 competing variants need resolution before routing.**

No blockers: nothing is unsafe. But WARNING-004 and WARNING-002 both change what a roadmap
would contain, so routing before they're answered would bake in wrong scope.

## Method notes for the roadmapper

- **Code was read directly** (`git log`, `package.json`, `src/types/`, `src/lib/`,
  `src/data/cards.json`, `src/app/api/`) to adjudicate every doc-vs-state claim, per the
  brief's "GitHub main is ground truth" rule. Verdicts are recorded inline as `verified:` /
  `status:` fields — provenance is traceable on every entry.
- **Precedence was overridden by ground truth in 3 places** (CON-rule-priority,
  CON-data-layer, CON-dark-mode-mechanism) and in 1 structural case (WARNING-003, where the
  manifest ranks a superseded doc above its successor). Each override is logged rather than
  applied silently. Notably, precedence tracks *intended authority, not freshness* — a
  prec-10 DOC (DARK_MODE_IMPLEMENTATION) proved more accurate than a prec-5 SPEC (COLOR_SYSTEM).
- **Three self-referencing cross-refs** (ARCHITECTURE, LANDING_PAGE_REDESIGN,
  PROGRESS_SUMMARY each citing their own filename) were treated as degenerate and
  non-blocking rather than as cycle BLOCKERs. See INFO-010 for the reasoning — a strict
  reading would have blocked the whole ingest on three cosmetic self-citations.
- **The dominant signal is staleness, not contradiction.** The docs mostly don't fight each
  other; they fight the last six months of git history. The most recent doc is dated
  2026-01-30; code ran to 2026-02-24 / 87 commits. The Blob→Redis migration, the CDN-caching
  fixes, and the entire admin subsystem exist only in commits. See INFO-014 and the
  "Known documentation gaps" section of context.md.
