# Decisions Intel

Synthesized from `.planning/intel/classifications/` on 2026-07-15. Mode: `new`.

## Status: ZERO LOCKED DECISIONS

**No ADR-typed documents exist in the CardGPT ingest set.** All 17 classified docs are
PRD (1), SPEC (4), or DOC (12). No document carries `locked: true`. No document has an
ADR status field (Accepted / Proposed / Superseded).

Consequence: there are **no locked decisions to protect** and no possible LOCKED-vs-LOCKED
contradiction. Every entry below is a **candidate decision** — de-facto, unlocked, and
subordinate to code. None of these may be treated as binding by downstream consumers.

---

## Candidate decisions (UNLOCKED — require promotion to real ADRs)

These are decision-shaped statements mined from retrospective logs and SPECs. Per the
ingest brief they are **deliberately NOT auto-promoted** to locked decisions: they are
retrospective log entries with no standalone authority, written ~6 months ago, and several
no longer match the code.

Each carries a `verified:` field established by reading the code on 2026-07-15
(GitHub main = ground truth).

---

### CAND-001 — Priority + cumulative reward model
- source: /Users/jeffreyng/cardgpt/PROGRESS_SUMMARY.md (DOC, prec 15)
- corroborated by: /Users/jeffreyng/cardgpt/SCHEMA_DESIGN.md (SPEC, prec 1)
- decision: Model overlapping reward rules via priority levels + an `isCumulative` flag,
  rather than flat per-category rates. Base applies first; cumulative bonuses add to base;
  non-cumulative bonuses take max.
- rationale: Citi Cash Back advertises "2% dining" but it is 1% base + 1% bonus. A flat
  model cannot represent this without duplication.
- verified: **PARTIAL — taxonomy drifted.** The base/bonus split and cumulative semantics
  hold in `src/lib/engine/calculateReward.ts`. The documented third tier `premium` does
  **not exist** in code. `src/types/card.ts:65` declares
  `RulePriority = 'base' | 'bonus' | 'specific'`. See WARNING-001.
- scope: reward engine, card schema

### CAND-002 — Monthly spending caps via per-rule cap + fallback rate
- source: /Users/jeffreyng/cardgpt/PROGRESS_SUMMARY.md (DOC, prec 15)
- decision: Represent tiered rates ("HSBC Red: 4% on first $10K, then 0.4%") as a per-rule
  `monthlySpendingCap` plus a `fallbackRate`, not as a separate tier rule.
- verified: **YES — implemented, but on a different type than proposed.** `monthlySpendingCap`
  and `fallbackRate` live on `RewardRule` (`src/types/card.ts:126`), surfaced through
  `src/types/recommendation.ts:45`, the admin rule form, and the recommendation UI.
  CARD_RESEARCH_SUMMARY proposed it *inside* the `RewardCap` interface; it shipped on
  `RewardRule` instead. See WARNING-002 and INFO-004.
- scope: reward engine, card schema

### CAND-003 — No backend for MVP (client-side engine)
- source: /Users/jeffreyng/cardgpt/PROGRESS_SUMMARY.md (DOC, prec 15)
- decision: Run the recommendation engine client-side; no backend.
- rationale (as written): 10 cards is a small dataset; calculation <10ms; no user data to
  persist; simpler deployment.
- verified: **NO — CONTRADICTED BY CODE.** The recommendation engine does still run
  client-side (per `docs/ARCHITECTURE.md` server/client split, `HomeClient.tsx`), but the
  system now has **12 server API routes** including admin auth, admin card CRUD, PDF
  extraction, AI activity parsing, a pending-approval workflow, and Redis-backed storage.
  The "no backend" premise is obsolete. See WARNING-004.
- scope: architecture

### CAND-004 — TypeScript strict mode from day 1
- source: /Users/jeffreyng/cardgpt/PROGRESS_SUMMARY.md (DOC, prec 15)
- decision: Enable TS strict mode from project start.
- corroborated by: /Users/jeffreyng/cardgpt/docs/ARCHITECTURE.md ("All components are fully
  typed with TypeScript strict mode")
- verified: NOT INDEPENDENTLY CHECKED during this synthesis (tsconfig.json not read).
  Low-risk, uncontradicted.
- scope: tooling

### CAND-005 — Tailwind CSS v4 with `@theme inline`
- source: /Users/jeffreyng/cardgpt/PROGRESS_SUMMARY.md (DOC, prec 15)
- corroborated by: /Users/jeffreyng/cardgpt/COLOR_SYSTEM.md (SPEC, prec 5)
- decision: Use Tailwind v4 with `@theme inline`, no config file, CSS custom properties.
- verified: **YES.** `package.json` pins `tailwindcss: ^4` and `@tailwindcss/postcss: ^4`.
  Tokens confirmed as CSS custom properties in `src/app/globals.css`.
- scope: styling

---

## De-facto decisions evidenced by code, absent from all docs

These are real, load-bearing decisions visible in `git log` that **no ingested document
records**. They are the largest documentation gap in the set.

### CAND-006 — Card storage: Upstash Redis (replaced Vercel Blob)
- source: code — commits `6fb4d19` "Migrate from Vercel Blob to Upstash Redis",
  `d43be5e` "Fix Redis env var mismatch and remove dead blob code"
- decision: Persist the card database in Upstash Redis, not Vercel Blob.
- contradicts: /Users/jeffreyng/cardgpt/docs/ARCHITECTURE.md (SPEC, prec 3), which
  documents Vercel Blob as the production data layer throughout.
- verified: **YES.** `src/lib/data/redisStorage.ts` exists; `blobStorage.ts` does not.
  `@upstash/redis 1.36.1` is a dependency. `@vercel/blob 2.0.1` remains but is used only
  by `src/app/api/admin/upload/route.ts` (image upload), not card data.
- note: No ADR records this migration. Strong ADR candidate.
- scope: architecture, data layer

### CAND-007 — Admin panel with AI-assisted card ingestion
- source: code — `src/app/api/admin/**` (12 routes), `src/app/admin/**`
- decision: Build an authenticated admin surface for card CRUD, PDF-based card extraction
  (`pdf-parse` + `@anthropic-ai/sdk`), and a pending-review/approval workflow.
- contradicts: the PRD (prec 0, pinned canonical) is silent on all of it, and CAND-003
  ("no backend") denies it.
- verified: **YES.** Routes, admin UI components, and `PendingReviewView.tsx` all present.
- note: No ADR, no PRD coverage. See WARNING-004.
- scope: architecture, admin, product scope
