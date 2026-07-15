# CardGPT — Roadmap

**Mode:** **As-built capture.** CardGPT is a deployed, working product — 87 commits on main,
live on Vercel (`hkg1`), last code activity 2026-02-24. This roadmap is a **retrospective
map of what already exists**, reconstructed from code and git history on 2026-07-15.

> **Read this before planning anything.**
> Every phase below is **COMPLETE and shipped**. These are not work items. Do not plan the
> building of features that shipped six months ago.
> Phase boundaries are reconstructed from the actual delivery sequence in git — they were
> never planned as phases at the time.

**No new milestone is defined.** Milestone framing is deliberately deferred to a later
session. The **Backlog / Open** section below is the honest statement of what remains.

**Granularity:** standard (5 phases) · **Convention:** sequential (no `config.json` present)

---

## Phases

- [x] **Phase 1: Card Schema & Corpus** - Typed card/reward model, 11-card HK corpus, repository layer
- [x] **Phase 2: Recommendation Engine & NLP Parser** - Bilingual text → structured transaction → ranked cards
- [x] **Phase 3: Public Web Experience** - Bilingual desktop UI, tags, ranked results, dark mode, landing page
- [x] **Phase 4: Admin & AI Card Ingestion** - Auth, card CRUD, PDF extraction, pending-approval queue
- [x] **Phase 5: Persistence & Deployment** - Upstash Redis migration, CDN/caching hardening, Vercel hkg1

---

## Phase Details

### Phase 1: Card Schema & Corpus
**Goal**: HK credit card reward structures are representable as data, precisely enough to compute a recommendation
**Depends on**: Nothing (foundation)
**Requirements**: PUB-002 (schema), PUB-003, PUB-004
**Status**: **COMPLETE**
**Success Criteria** (verified true):
  1. A card's overlapping reward rules are representable without duplication — base rate plus cumulative bonuses (Citi's advertised "2% dining" = 1% base + 1% bonus) — via `RulePriority` + `isCumulative`
  2. Tiered caps are representable — HSBC Red's "$10,000 online at 4%, then 0.4%" — via per-rule `monthlySpendingCap` + `fallbackRate`
  3. 11 HK cards / 40 reward rules exist in `src/data/cards.json`, well under the PRD's 100-card bound
  4. Rules distinguish broad `categories` from `specificMerchants` (the `merchantTypes` abstraction error was refactored out; the field survives as a deprecated back-compat branch)
  5. Card data is reachable through `cardRepository` in both sync (build-time) and async (runtime) variants, with validation
**Key artifacts**: `src/types/card.ts`, `src/data/cards.json`, `src/lib/data/cardRepository.ts`
**Known debt**: `RewardCap` is write-only dead schema (populated on 3 cards, read by nothing — see OPEN-002). `dayOfWeek` is honored by the engine but used by 0 cards. `fallbackRate` / `isPromotional` / `notes` exist in code but in no SPEC.
**Plans**: N/A (retrospective)

### Phase 2: Recommendation Engine & NLP Parser
**Goal**: A user's plain-language description of a purchase yields a correctly ranked set of cards
**Depends on**: Phase 1
**Requirements**: PUB-005, PUB-006, PUB-010
**Status**: **COMPLETE** (PUB-006 deviates from PRD; PUB-007 never built — see Backlog)
**Success Criteria** (verified true):
  1. Free text in English or Traditional Chinese parses into a structured `Transaction` — amount, currency, category, merchant, payment type — with per-field confidence (`parseTransaction(input) → ParseResult`)
  2. Each card scores against a transaction producing reward amount, unit, effective rate, and fees (`calculateReward(card, transaction) → RewardCalculation`)
  3. Cards rank by **net value** (reward minus fees), so a high-reward card with a high foreign-transaction fee correctly loses to a cheaper one
  4. Ties resolve deterministically through a 5-level chain, never arbitrarily (`recommendCards.ts:99-128`)
  5. User preferences filter the candidate set — reward unit, max annual fee, excluded cards
**Key artifacts**: `src/lib/parser/transactionParser.ts`, `src/lib/engine/calculateReward.ts`, `src/lib/engine/recommendCards.ts`
**Known debt**: The shipped tie-break chain (net value → reward → annual fee → issuer → alphabetical) **has no reward-unit-class step**, contradicting the PRD's "cash back highest priority, then miles" (OPEN-006). Test files exist but **cannot run** — no test runner is installed and there is no `test` script (OPEN-008).
**Plans**: N/A (retrospective)

### Phase 3: Public Web Experience
**Goal**: An HK consumer can get a card recommendation in their own language, without an account, in seconds
**Depends on**: Phase 2
**Requirements**: PUB-008, PUB-009, PUB-011, PUB-012, PUB-013, PUB-014, PUB-015, PUB-016
**Status**: **COMPLETE** (PUB-016 deviates on cadence)
**Success Criteria** (verified true):
  1. A visitor lands, types or tags a transaction, and sees ranked cards — no login, no account
  2. Selecting a category or merchant tag populates the text field
  3. Each result row shows estimated rewards, estimated fees, and an "Apply Here" CTA to the issuer's page; the top row is tagged "Recommended"
  4. The entire UI — labels, card names, categories, errors, parser keywords — switches between English and Traditional Chinese via a visible switcher
  5. A visitor can switch between light and dark mode, and the choice persists
  6. An animated bilingual tagline types above the input on load and on an interval
**Key artifacts**: `src/components/HomeClient.tsx`, `TransactionInput.tsx`, `CardRecommendationList.tsx`, `LanguageSwitcher.tsx`, `DarkModeToggle.tsx`, `ThemeProvider.tsx`, `TypingAnimation.tsx`, `FloatingCards.tsx`, `messages/{en,zh-HK}.json`
**Known debt**: Typing cadence is 10s, not the PRD's 60s (OPEN-007). The PRD scopes **desktop**; LANDING_PAGE_REDESIGN added unratified mobile/PWA scope, and two design directions (ChatGPT-minimal vs. playful-fintech) coexist unreconciled in `globals.css` (OPEN-005). All landing-page performance/accessibility constraints are **claimed, never verified** — that doc's testing checklist is entirely unchecked despite a sign-off (OPEN-009).
**Plans**: N/A (retrospective)
**UI hint**: yes

### Phase 4: Admin & AI Card Ingestion
**Goal**: Card reward data can be curated and kept current without an engineering deploy
**Depends on**: Phase 1
**Requirements**: PUB-001, ADM-001, ADM-002, ADM-003, ADM-004, ADM-006, ADM-007
**Status**: **COMPLETE**
**Success Criteria** (verified true):
  1. An admin logs in with a password and holds a session; unauthenticated visits to `/admin` redirect to the login page
  2. An admin can create, edit, and delete cards and their nested reward rules through a UI, and see corpus stats on a dashboard
  3. An admin uploads a card's T&C PDF and AI extracts structured reward rules from it — including monthly spending caps — rather than the admin hand-entering them
  4. **AI output never reaches the live corpus unreviewed** — extracted cards land in a pending queue and a human approves them first
  5. Card images are added by dropping files and running one script, mapped automatically by card ID
**Key artifacts**: `src/app/admin/**` (18 files), `src/app/api/admin/**` (11 routes), `src/lib/ai/extractRewards.ts`, `src/lib/ai/parseActivity.ts`, `src/lib/auth/adminAuth.ts`, `src/lib/data/pendingRepository.ts`
**Known debt**: 🔴 **`src/lib/auth/adminAuth.ts` does not adequately protect this subsystem — see OPEN-003 and [THI-236](https://linear.app/thirdvisor/issue/THI-236) (Urgent). Details are withheld here because the repo is public.** Success criterion 1 above ("an admin logs in with a password and holds a session") describes the *intent*; it is not reliably enforced in practice. The file's own comment concedes "consider using a proper JWT or session library." Rate limiting on AI routes is asserted by ARCHITECTURE.md but unverified. **This entire subsystem is documented nowhere** — no PRD coverage, no ADR (OPEN-004).
**Plans**: N/A (retrospective)
**UI hint**: yes

### Phase 5: Persistence & Deployment
**Goal**: Card edits made in admin are durable, immediately visible to the public site, and live in production
**Depends on**: Phase 4
**Requirements**: ADM-005
**Status**: **COMPLETE**
**Success Criteria** (verified true):
  1. A card saved in admin persists to Upstash Redis and survives redeploys
  2. A card edit is visible on the public site immediately — not served stale from CDN or a build-time snapshot (`force-dynamic` on card-reading routes; server/client split so `page.tsx` fetches and `HomeClient.tsx` renders)
  3. The Redis store can be seeded (`/api/admin/init-redis`) and exported back to local (`/api/admin/export-cards`)
  4. Deployment env accepts both `KV_REST_API_*` and `UPSTASH_REDIS_*` variable naming
  5. The app is live on Vercel in `hkg1` with security headers, and `npm run dev`/`build` are gated by a health check
**Key artifacts**: `src/lib/data/redisStorage.ts`, `src/lib/data/cardWriter.ts`, `src/lib/data/loadCards.ts`, `vercel.json`, `scripts/health-check.js`
**Origin story — read before touching the data layer**: This phase is the residue of a sustained fight with storage consistency and CDN caching. In sequence: `8762842` trust `put()` instead of immediate read-back verification → `c17c7bf` add `cacheControlMaxAge: 0` → `8e3a91b` switch to unique URLs per write to bypass CDN caching → **`6fb4d19` migrate Blob → Redis** → `ca0cde5` add export-cards → `18a038c` support both env-var namings → `d43be5e` fix env var mismatch, remove dead blob code. Blob was abandoned because per-write CDN cache-busting was a losing battle. **This knowledge exists only in git** (OPEN-004).
**Plans**: N/A (retrospective)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Card Schema & Corpus | N/A (retrospective) | Shipped | ~2026-01 |
| 2. Recommendation Engine & NLP Parser | N/A (retrospective) | Shipped | ~2026-01 |
| 3. Public Web Experience | N/A (retrospective) | Shipped | ~2026-01 |
| 4. Admin & AI Card Ingestion | N/A (retrospective) | Shipped | ~2026-02 |
| 5. Persistence & Deployment | N/A (retrospective) | Shipped | 2026-02-24 |

---

## Backlog / Open

Nothing here is scheduled. No milestone is defined. These are the honest unresolved items —
recorded so a later session can decide, not resolved by inference now.

### Open questions — require a human decision

| ID | Question | Why it matters |
|----|----------|----------------|
| **OPEN-001** | **Rule-priority taxonomy.** Docs say `base\|bonus\|premium`; code implements `base\|bonus\|specific` (`card.ts:65`). **Not a rename** — the doc's `premium` is a highest-tier override for spend-based upgrades; the code's `specific` means "replaces base rate entirely." SCHEMA_DESIGN's "Tiered Spending Card" pattern has **no code equivalent**. | Decide which is intended. If `specific` is correct → rewrite SCHEMA_DESIGN and delete the tiered-spending pattern. If a spend-tier override is genuinely wanted → it's new work. Do not let a planner infer a rename and file phantom work. |
| **OPEN-002** | **The reward-cap contract.** `RewardCap` (`card.ts:235-249`) is **write-only dead schema** — populated on 3 of 11 cards (`citi-cash-back`, `sc-smart`, `sc-simply-cash`) and **read by no engine, UI, or admin code**. The shipping cap is per-rule `monthlySpendingCap` + `fallbackRate` (`card.ts:126`), fully wired. | Likely resolution: delete `RewardCap`, declare per-rule caps canonical. But this decides whether **PUB-007 (multi-card split) is buildable as the PRD describes it** — its trigger is "maximum rewards cap has met." Needs an explicit call. **Correction to intel:** WARNING-002 claimed zero cards populate `rewardCap`; 3 do. The dead-schema conclusion stands and worsens — data implies a contract nothing honors. |
| **OPEN-005** | **Product surface + design direction.** PRD scopes **desktop**; LANDING_PAGE_REDESIGN specifies mobile-first installable PWA (never ratified). PRD asks for ChatGPT color tone; LANDING_PAGE layers playful-fintech purple/orange/blue on top. Both palettes coexist in `globals.css:15-25`. | Is mobile/PWA in scope? Which design direction governs? Folded into the PRD-v2 question. |
| **OPEN-006** | **Tie-break semantics.** Shipped chain has **no reward-unit-class step**, contradicting the PRD's "cash back highest priority, then miles, then the rest." `preferredRewardUnits` is a *filter*, not an ordering. | Is net-value ranking the intended improvement (likely — it's arguably more correct), or is this a regression against the PRD? Either way, one of the two must change. |
| **OPEN-007** | **Typing cadence.** PRD says every 1 minute; code says `intervalMs = 10000` (10s), commented "6 times per minute." | Someone made a deliberate 6× change and recorded no reason. Confirm intent, then fix the code or the PRD. |

### Known gaps — no decision needed, just unbuilt/undone

| ID | Item |
|----|------|
| **PUB-007** | **Multi-card split is entirely unbuilt.** No split logic in `src/lib/engine/`; no "merchant allows splitting" flag anywhere. Largest unbuilt PRD requirement. **Downstream of OPEN-002.** |
| **OPEN-003** | 🔴 **Admin authentication requires urgent hardening. Tracked privately as [THI-236](https://linear.app/thirdvisor/issue/THI-236) (Urgent) — details deliberately withheld from this file.** Confirmed against the live deployment on 2026-07-15. `src/lib/auth/adminAuth.ts` does not adequately protect the admin surface, and its own header comment concedes "For production, consider using a proper JWT or session library." **This repo is public, so the specifics live in the Linear issue rather than here** — publishing them while the issue is open would hand over a working exploit. Scope: the whole admin surface, all 11 `/api/admin/*` routes, writing to live Redis. No personal data is at risk (the product holds none); the exposure is card-data integrity and API-key abuse. **Read THI-236 before touching `src/lib/auth/`, and re-expand this entry once the fix has shipped.** |
| **OPEN-004** | **Zero ADRs.** CAND-001…007 are unlocked candidates. **CAND-006 (Redis migration) and CAND-007 (admin panel) have no doc source at all** — they exist only in git. Promoting these two into real ADRs is the **clearest early win for GSD adoption**. Also: `docs/ARCHITECTURE.md` still documents Vercel Blob and must be rewritten; the PRD needs a v2 covering the admin surface + Redis. |
| **OPEN-008** | **Tests exist but cannot run.** `src/lib/engine/__tests__/engine.test.ts` and `src/lib/parser/__tests__/transactionParser.test.ts` are present, but **no test runner is installed** (no jest/vitest/mocha in `package.json`) and there is **no `test` script**. ENGINE_DOCUMENTATION references these tests as if they run. |
| **OPEN-009** | **Landing-page NFRs are claimed, never verified.** Lighthouse >90, <3s load, 60fps, WCAG AA, 44×44px tap targets, `prefers-reduced-motion` guard, PWA manifest — all asserted by LANDING_PAGE_REDESIGN under a sign-off, with an **entirely unchecked** testing checklist. Only the brand palette is verified (`globals.css:15-25`). |
| **OPEN-010** | **`dayOfWeek` is a dead code path.** Honored at `calculateReward.ts:131`; used by 0 of 11 cards. Either a card should exercise it or it should go. |
| **OPEN-011** | **Doc debt.** Stale framework versions (docs say 14/15, actual 16.1.4), stale card counts (10/36 vs. actual 11/40), `sim-card` in no research doc, `/api/recommend` referenced but nonexistent, `DEPLOYMENT_READY.md` rooted at a dead path. |
