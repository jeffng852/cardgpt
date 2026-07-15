# Context Intel

Running notes from the 12 DOC-typed sources, keyed by topic, with source attribution.

**Global caveat:** 3 of these docs are explicitly flagged by their classifiers as HISTORICAL
SNAPSHOTS (~6 months stale). Their state claims are quarantined below under
"Historical snapshots" and must not be read as current. GitHub main is ground truth.

---

## Ground truth — established from code on 2026-07-15

Recorded first, because most docs below disagree with it.

- source: `git log`, `package.json`, `src/` (read directly during synthesis)
- Stack: **Next.js 16.1.4**, React 19.2.3, Tailwind v4, TypeScript 5, next-intl 4.7,
  next-themes 0.4.4.
- Storage: **Upstash Redis** (`@upstash/redis 1.36.1`) for card data.
  `@vercel/blob 2.0.1` retained for image upload only.
- AI: `@anthropic-ai/sdk 0.71.2`; `pdf-parse 1.1.1` for card-document extraction.
- Repo: 87 commits on main. Last code activity 2026-02-24. Deployed on Vercel (hkg1).
- Card data: **11 cards, 40 reward rules** in `src/data/cards.json`.
- API surface: **12 routes** — `/api/parse-activity`, `/api/admin/{auth,cards,cards/[id],
  export-cards,init-redis,extract,stats,upload,pending,pending/[id],pending/[id]/approve}`.
- Recent trajectory (most recent first): `d43be5e` fix Redis env var mismatch + remove dead
  blob code → `18a038c` support both KV_REST_API and UPSTASH_REDIS env names →
  `ca0cde5` add export-cards endpoint → `6fb4d19` **migrate Blob → Redis** →
  `8e3a91b`/`c17c7bf`/`8762842` a run of CDN-caching and write-verification fixes.
- Reading of that trajectory: the last stretch of work was a **fight with storage
  consistency and CDN caching**, ending in the Redis migration. No doc in the ingest set
  records any of it.

## Product framing

- source: /Users/jeffreyng/cardgpt/README.md (DOC, prec 13)
- CardGPT is a Hong Kong credit card rewards optimizer. Next.js App Router, Tailwind v4,
  TypeScript, Vercel, next-intl (English + Traditional Chinese).
- Development workflow is Linear-based, with commit conventions.
- README states Next.js **15**; actual is **16.1.4**. Stale.

- source: /Users/jeffreyng/cardgpt/CardGPT PRD.md (PRD, prec 0)
- Origin framing: HK credit card rewards vary widely and the average user holds **>3 cards**.
  The tool advises which card maximizes rewards for a described transaction.
- PRD metadata: `Status: Exploring`, `Priority: High`, `Potential Impact: Small`,
  `Feasibility: Easy`, Date Added 2026-01-09, Next Review 2026-01-16.
  The "Next Review" date passed ~6 months ago with no recorded review.

## Recommendation engine

- source: /Users/jeffreyng/cardgpt/ENGINE_DOCUMENTATION.md (DOC, prec 6)
- Covers `calculateReward`, `recommendCards`, reward rules, transaction matching, monthly
  spending caps, ranking/tie-breaking, `RecommendationPreferences`, formatting utilities,
  and React/API integration patterns.
- Cross-references SCHEMA_DESIGN.md — inherits SCHEMA_DESIGN's stale `premium` priority
  taxonomy (see WARNING-001).
- Lists engine tests at `src/lib/engine/__tests__/engine.test.ts` and an
  `app/api/recommend/route.ts` integration point. **Note:** no `/api/recommend` route exists
  in the current API surface — recommendations run client-side per the ARCHITECTURE
  server/client split. That integration example is stale.

## Card research

- source: /Users/jeffreyng/cardgpt/CARD_RESEARCH_SUMMARY.md (DOC, prec 8)
- Research on reward structures, caps, and conversion rates for **10** HK cards:
  CitiBank Cash Back, SC Smart, SC Simply Cash, SC Cathay (Standard / Priority Banking /
  Priority Private), HSBC EveryMile, HSBC Red, DBS Black World, Hang Seng enJoy.
- Conversion rates reference:
  - Cathay cards → direct Asia Miles.
  - HSBC EveryMile → $1 RewardCash = 20 miles (various programs).
  - DBS Black → DBS$48 = 1,000 miles → 1 mile = DBS$0.048.
  - Citi / SC Smart / SC Simply Cash → direct cash percentage.
  - HSBC Red → RewardCash = cash equivalent.
- Concludes the schema handles all 10 cards with **one addition needed**:
  `monthlySpendingCap` for HSBC Red's "$10,000 online at 4%, then 0.4%". That addition
  shipped, but on `RewardRule` rather than inside `RewardCap` as proposed. See INFO-004.
- Card corpus has since grown to **11** — `sim-card` (United Asia Finance Limited,
  Mastercard, 8% cashback on eligible online retail ≥HKD500, fallback 0.4%) is in
  `cards.json` but appears in **no** research doc.

## Parser

- source: /Users/jeffreyng/cardgpt/PARSER_DOCUMENTATION.md (DOC, prec 7)
- Bilingual EN/zh-Hant natural-language → `Transaction` with confidence scores. Covers
  amount extraction, currency detection, category detection, merchant detection, payment
  type detection, confidence scoring, and engine integration.
- See CON-parser-contract in constraints.md.

## Dark mode & typing animation

- source: /Users/jeffreyng/cardgpt/DARK_MODE_IMPLEMENTATION.md (DOC, prec 10)
- Retrospective report: dark mode toggle via `next-themes` + `ThemeProvider` +
  `DarkModeToggle`; animated bilingual typing tagline via `TypingAnimation`; `HowItWorks`
  component; translations across `messages/en.json` + `messages/zh-HK.json`.
- **This DOC is more accurate than the higher-precedence COLOR_SYSTEM.md SPEC**, which still
  describes the toggle as a future enhancement. All named components verified present. See
  INFO-003.

## Card image automation

- source: /Users/jeffreyng/cardgpt/CARD_IMAGE_AUTOMATION.md (DOC, prec 9)
- Operational guide: drop images in `card_image/`, run `npm run add-card-images`
  (`scripts/add-card-images.sh`), which serves them from `public/cards/` and maps them via
  `src/lib/cardImages.ts` keyed on card IDs in `src/data/cards.json`.
- Covers naming rules, image format/sizing, coverage reporting, troubleshooting.
- `npm run add-card-images` confirmed in `package.json`.

## Development workflow

- source: /Users/jeffreyng/cardgpt/DEVELOPMENT.md (DOC, prec 11)
- Local dev cycle, health-check script, npm scripts, troubleshooting, and a set of
  **protected critical files**: `src/app/[locale]/page.tsx`, `src/app/[locale]/layout.tsx`,
  `src/middleware.ts`, `src/i18n/routing.ts`, `package.json`, `tsconfig.json`, `.npmrc`,
  `next.config.js`, `scripts/health-check.js`.
- Health check is wired into both dev and build: `package.json` confirms
  `"dev": "node scripts/health-check.js && next dev"` and
  `"build": "node scripts/health-check.js && next build"`, with a `dev:skip-check` escape
  hatch. This still holds.

## Deployment

- source: /Users/jeffreyng/cardgpt/DEPLOYMENT.md (DOC, prec 12)
- Vercel deployment runbook: production build, GitHub repo setup, environment variables,
  performance/Lighthouse checklist, Vercel Analytics, Google Analytics, rollback procedure,
  build troubleshooting, MVP known limitations, post-deployment TODO backlog.
- Predates the Redis migration — any storage env-var guidance here is suspect. Current env
  vars accept both `KV_REST_API_*` and `UPSTASH_REDIS_*` naming (commit `18a038c`).

## Historical snapshots — QUARANTINED, DO NOT TREAT AS CURRENT

All three are point-in-time work logs. Their classifiers flagged every state claim as
as-of-that-date. Retained for narrative/rationale value only.

### PROGRESS_SUMMARY.md (DOC, prec 15) — dated 2026-01-21
- Claims as of that date: phases complete through THI-22; **12/17 tickets = 71%**;
  27 commits; "THI-18 next"; specific file line counts; commit SHAs `ee47240`, `91c95d2`,
  `5af655a`; 10 cards / 36 reward rules.
- Now: **87 commits**, 11 cards / 40 rules. All ticket/progress figures are obsolete.
- Contains a **"Technical Decisions"** section with 5 ADR-shaped entries
  (problem/solution/rationale). Per the ingest brief these are **NOT promoted** to locked
  decisions — they are retrospective log entries with no standalone authority. Captured as
  CAND-001…CAND-005 in decisions.md, all unlocked, each with a verification verdict.
  See INFO-005.

### SESSION_SUMMARY.md (DOC, prec 16) — dated 2026-01-22
- Claims as of that date: 100% card image coverage; 100% Chinese translation coverage;
  HKD default currency; single-select merchant tags; confidence score removed from UI;
  category matching scoring changed; health-check wired into npm dev/build;
  THI-23/26/27/28/29/32 done, THI-33/34 outstanding; "ready for deployment" with
  uncommitted changes.
- Useful residue: the parser/UI behavior notes (HKD default, confidence score removed,
  single-select merchant tags) are plausible and explain current UI shape, but are unverified.

### DEPLOYMENT_READY.md (DOC, prec 14) — dated 2026-01-25
- Claims as of that date: Chinese i18n complete; 45+ translation keys; 10/10 card images;
  THI-23/26/27/28/29/32 complete, THI-33/34 remaining; "production-ready" v1.0.
- Also references a **stale project path** — `/Users/jeffreyng/Desktop/CODE STUDIO/CardGPT`
  — which is not the current repo root (`/Users/jeffreyng/cardgpt`). Any copy-pasted command
  from this doc will fail. See INFO-011.

## Known documentation gaps (no doc covers these)

Surfaced for the roadmapper — these are the parts of the live system with zero doc coverage:

1. **Upstash Redis storage layer** — the migration, env-var handling, `redisStorage.ts`,
   `init-redis` and `export-cards` endpoints. ARCHITECTURE.md still documents Vercel Blob.
2. **Admin subsystem** — auth, card CRUD UI, `stats`, `upload`, and the pending-review/
   approval workflow (`pendingRepository.ts`, `PendingReviewView.tsx`). Not in the PRD.
3. **AI card extraction** — `/api/admin/extract`, `pdf-parse` + Anthropic SDK. Not in any doc.
4. **`/api/parse-activity`** — mentioned only in passing in ARCHITECTURE.md's file tree.
5. **The CDN-caching/write-consistency saga** (`8762842`, `c17c7bf`, `8e3a91b`) — hard-won
   operational knowledge, entirely undocumented.
6. **`sim-card`** — the 11th card, in no research doc.
7. **`fallbackRate` / `isPromotional` / `notes`** rule fields — in code, in no SPEC.
