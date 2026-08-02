# CardGPT

**Status:** Deployed, live, in maintenance. **Not greenfield.**
**Created:** 2026-07-15 (GSD adoption on an existing product)
**Tracking issue:** THI-233 · Linear project "CardGPT" (team THI, ~30 issues)

---

## What this is

CardGPT advises Hong Kong consumers **which credit card to use for a given spending
transaction to maximize rewards**. HK reward schemes vary widely and the average HK user
holds more than 3 cards; the tool removes the mental arithmetic at point of purchase.

The user describes an upcoming transaction in natural language (English or Traditional
Chinese); CardGPT parses it, scores every card in the corpus against it, and returns a
ranked list with estimated rewards, estimated fees, and an "Apply Here" CTA.

## Two surfaces, both core

CardGPT is **a public recommendation tool PLUS an admin/ingestion backend**. Both are
governed by GSD. This is an explicit scope decision made 2026-07-15 (see DEC-SCOPE-001).

| Surface | What it is | Auth |
|---------|-----------|------|
| **Public** | Bilingual (en/zh-HK) desktop web tool. Tags → NLP text input → ranked cards → Apply Here. Recommendation engine runs **client-side**. | None (by design) |
| **Admin / ingestion** | Card CRUD UI, AI-assisted PDF card extraction, pending-review/approval queue, Redis-backed persistence, 12 API routes. | Shared password + HTTP-only cookie |

The admin surface is how `REQ-manual-card-curation` is actually delivered — card data is
maintainable without an engineering deploy. It is load-bearing, not incidental.

## Ground truth (verified against code 2026-07-15)

Read directly from the repo at `/Users/jeffreyng/cardgpt`. **GitHub main is ground truth**;
every doc in the repo is ~6 months stale and several are actively wrong.

- **Stack:** Next.js **16.1.4**, React 19.2.3, Tailwind v4, TypeScript 5 (`strict: true`),
  next-intl 4.7, next-themes 0.4.4
- **AI:** `@anthropic-ai/sdk` 0.71.2, `pdf-parse` 1.1.1
- **Storage:** **Upstash Redis** (`@upstash/redis` 1.36.1). `@vercel/blob` 2.0.1 survives
  for **image upload only** (`/api/admin/upload`) — not card data.
- **Deploy:** Vercel, region `hkg1` (`vercel.json`), security headers set
- **Repo:** 87 commits on main. Last code activity **2026-02-24**.
- **Corpus:** **11 cards / 40 reward rules** (`src/data/cards.json`). 11th is `sim-card`.
- **API surface:** 12 routes — `/api/parse-activity` + `/api/admin/{auth, cards, cards/[id],
  export-cards, init-redis, extract, stats, upload, pending, pending/[id],
  pending/[id]/approve}`

## Core value

Answer one question well: **"Which of my cards should I use for this purchase?"** —
for HK cards, in the user's language, without login, in under a second.

## Current State — v1.1 shipped (2026-07-31, archived 2026-08-02)

CardGPT is now a **fiat + crypto recommender with a browsable directory and a research surface**,
wearing its own v2 brutalist-editorial identity. Milestone **v1.1 — Card Directory & Crypto
Expansion** shipped all 6 phases (6–11) to `main` and live on Vercel `hkg1`. Full ledger:
`.planning/MILESTONES.md`; archived roadmap/requirements/audit under `.planning/milestones/`.

**Validated this milestone:**
- ✓ **Crypto card category** — `cardType`, crypto reward unit + asset, `minStaking` gate, `hkEligible` — v1.1 (Phase 6)
- ✓ **Crypto→HKD valuation** — unit-segmented, fail-safe, fiat ranking byte-identical — v1.1 (Phase 7); *reopened the v1 "cross-unit conversion" exclusion in minimal form*
- ✓ **hkEligible directory-vs-recommender switch** — gate lives sole-sited in `recommendCards.ts` — v1.1 (Phases 6–7)
- ✓ **Affiliate monetization rail** — `applyUrl` CTA with `rel="sponsored nofollow noopener"`, ranking-neutral — v1.1 (Phase 8)
- ✓ **Data page** — `/cards` directory + `/cards/[id]` detail, search/sort, provenance banner — v1.1 (Phase 9)
- ✓ **Research page** — bilingual engine-accurate explainers — v1.1 (Phase 10)
- ✓ **v2 design system** — whole-app re-skin, shared `CreditCardCard`, dark mode — v1.1 (Phase 11)

**Carried forward (see ROADMAP Backlog / Open):** recommender-side crypto display (`cryptoSegment`
built, not yet rendered — RQ-001-gated); real crypto-card data (RQ-001); GH #12 OpenRouter key
rotation (highest user-impact); THI-236 admin-auth hardening; THI-297 affiliate disclosure revisit.

## Next Milestone Goals

Not yet defined — start with `/gsd-new-milestone`. The captured direction (commit `993f2b1`,
`.planning/notes/`) points at **v1.2: making the crypto machinery real** — activate the dormant
CoinMarketCap rate cron with a live key, source genuine HK crypto-card data (RQ-001), render the
crypto recommendation segment (CRY-04), and pursue sustainable card-data ingestion (hybrid
manual-first, not per-issuer scrapers — see memory `cardgpt-tc-ingestion-not-scalable`).

<details>
<summary>Archived: v1.1 milestone goal (as originally scoped)</summary>

**Goal:** Grow CardGPT from a single-transaction recommender into a browsable card directory with
crypto-card support and affiliate monetization — without changing the recommender at its core.
Maps to **THI-176** (ranked.plus revamp) and **THI-51** (crypto cards). Full exploration record:
`.planning/notes/ranked-plus-directory-and-crypto-expansion.md`. All target features delivered; see
Current State above.

</details>

## Constraints

- **Desktop web, no login** for the public tool (PRD). A lower-precedence SPEC
  (LANDING_PAGE_REDESIGN) added mobile-first/PWA scope that the canonical PRD never
  ratified — unreconciled. See OPEN-005.
- **Corpus stays under 100 cards** (PRD). Currently 11 — ample headroom.
- **Assume users own all cards.** No ownership model.
- **Free for v1.** Subscription + token limits are explicit future scope.
- **Server-side secrets only.** Anthropic key and Redis token never reach the client.
  Card data (names, rates, fees) is public marketing info and is client-exposed by design.
- **`force-dynamic` on card-reading routes** to bypass Next.js static caching. This guards a
  real, historically painful failure mode (see the CDN-caching commit run).
- **Always use the async `cardRepository` variants** (`getAllCardsAsync`, `getCardByIdAsync`)
  from admin and public pages. Sync variants are build-time only.
- **Health check gates dev and build** (`node scripts/health-check.js && next dev|build`),
  with a `dev:skip-check` escape hatch.

## Decisions

**Zero ADRs exist.** No document in the repo carries `locked: true` or an ADR status field.
Every decision CardGPT has made lives in retrospective prose or only in git history.
This is the project's biggest structural gap and the clearest early win for GSD adoption.

### Locked

**None.** This section is intentionally empty — there is nothing locked to protect.

### Scope decision recorded this session

<decision id="DEC-SCOPE-001" status="decided" date="2026-07-15">
The admin / card-ingestion subsystem — admin panel, admin auth, AI-assisted PDF
extraction, pending-review/approval queue, Upstash Redis persistence, and all 12 API
routes — **IS core and in scope for GSD**. CardGPT is a public recommendation tool PLUS
an admin/ingestion backend.

Consequences:
- The PRD (precedence 0) is **canonical-but-incomplete**. It covers only the public
  surface. Its silence on admin is *not* an exclusion. It needs a v2 covering the admin
  surface and the Redis architecture.
- **CAND-003 ("No Backend for MVP") is retired, not promoted.** 12 API routes contradict
  it. It is dead and recorded as such.
</decision>

<decision id="DEC-DATA-001" status="decided" date="2026-07-16">
Crypto / neobank card attributes for the v1.1 Data page are **bulk-seeded from ranked.plus's
publicly-displayed card listings** — factual card attributes only; referral/affiliate links are
excluded and replaced with CardGPT's own. The **full global set** is imported for the directory;
the recommender considers only cards flagged `hkEligible`.

Operator decision (2026-07-16), tradeoffs on the record: the source is a global, weekly,
secondhand aggregation, so the directory accepts **lower per-card accuracy** in exchange for
being populated without manual entry. The recommender is insulated from this by the `hkEligible`
gate. Data quality on the directory is a known, accepted debt for this milestone.
</decision>

### Candidate decisions (UNLOCKED — pending promotion to real ADRs)

None of these are binding. Each carries a verdict from code read on 2026-07-15.

| ID | Decision | Verdict vs. code |
|----|----------|------------------|
| CAND-001 | Priority + cumulative reward model | **PARTIAL** — taxonomy drifted. Docs say `premium`; code has `specific`. See OPEN-001. |
| CAND-002 | Monthly caps via per-rule `monthlySpendingCap` + `fallbackRate` | **HOLDS** — built, on `RewardRule` not `RewardCap`. |
| CAND-003 | No backend for MVP | **RETIRED** — dead. 12 API routes. See DEC-SCOPE-001. |
| CAND-004 | TypeScript strict mode from day 1 | **VERIFIED** — `tsconfig.json:7` `"strict": true`. |
| CAND-005 | Tailwind v4 with `@theme inline` | **VERIFIED** — `tailwindcss: ^4`, tokens in `globals.css`. |
| CAND-006 | Card storage: Upstash Redis (replaced Vercel Blob) | **VERIFIED** — no doc records it. **Strongest ADR candidate.** |
| CAND-007 | Admin panel with AI-assisted card ingestion | **VERIFIED** — no doc records it. **Strongest ADR candidate.** |

CAND-006 and CAND-007 are de-facto decisions with **no doc source at all** — they exist
only in git history. Promoting them into real ADRs is the clearest early GSD win.

## Known-stale docs — do not trust

The repo's own documentation is the least reliable artifact in it. Specifically:

| Doc | Claim | Reality |
|-----|-------|---------|
| `docs/ARCHITECTURE.md` | Vercel Blob is the data layer | **Wrong.** Redis. Commits `6fb4d19`, `d43be5e`. |
| ARCHITECTURE / README / PROGRESS_SUMMARY | Next.js 14 / 15 | **Wrong.** 16.1.4. |
| All research docs | 10 cards / 36 rules | **Wrong.** 11 cards / 40 rules. |
| `COLOR_SYSTEM.md` | Dark mode is system-preference-only; toggle is "future" | **Wrong.** Toggle shipped (`next-themes`). |
| `ENGINE_DOCUMENTATION.md` | Integrates via `/api/recommend` | **Wrong.** No such route. Engine runs client-side. |
| `LANDING_PAGE_REDESIGN.md` | "All requirements met ✅" | **Unsupported.** Its entire testing checklist is unchecked. Only the brand palette is verified (`globals.css:15-25`). |
| `DEPLOYMENT_READY.md` | Commands rooted at `/Users/jeffreyng/Desktop/CODE STUDIO/CardGPT` | **Wrong path.** Repo is `/Users/jeffreyng/cardgpt`. |

**The dominant signal is staleness, not contradiction.** The docs don't fight each other;
they fight the last six months of git history. Most recent doc: 2026-01-30. Last code:
2026-02-24. The Blob→Redis migration, the CDN-caching fixes, and the entire admin
subsystem exist only in commits.

## Out of scope

- **Subscription / token-limit monetization** — still deferred. v1.1 monetizes via affiliate
  links only; the tool stays free to users. (Pro tier = THI-41, a later milestone.)
- **Card ownership modeling** — PRD says assume users own all cards.
- **Full cross-unit reward conversion (miles↔cash)** — still deferred for fiat reward units.
  **Exception, new in v1.1:** crypto→HKD valuation is in scope — the minimum needed to rank
  crypto cards by net value (see the v1.1 milestone + DEC-DATA-001).

## Users

One person (Jeff) as visionary/product owner; Claude as builder. No teams, no sprints.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-02 after v1.1 milestone*
