# CardGPT — Requirements

**Mode:** As-built capture. CardGPT is a **deployed, working product** (87 commits, live on
Vercel hkg1). These requirements are recorded with their **verified status against code**,
not as work to do.

**Verified:** 2026-07-15 by reading `/Users/jeffreyng/cardgpt` directly. GitHub main is
ground truth. Every `Status` below carries a code citation.

**Sources:**
- `PUB-*` — derive from `CardGPT PRD.md` (precedence 0, pinned canonical, dated 2026-01-09,
  still `Status: Exploring`).
- `ADM-*` — derive from **code only**. The PRD is silent on the entire admin surface. Per
  DEC-SCOPE-001 this surface is core and in scope; these requirements are reverse-engineered
  from the shipped system and **need ratification in PRD v2**.

## Status legend

| Status | Meaning |
|--------|---------|
| **MET** | Built and verified against code |
| **DEVIATES** | Built, but demonstrably differs from the stated requirement |
| **PARTIAL** | Built in part; a named sub-clause is missing |
| **NOT BUILT** | No implementation exists |
| **DEFERRED** | Intentionally absent; met by design |

---

## Corrections to the ingest intel

Four claims in `.planning/intel/` did not survive verification. Recorded here because
downstream planning would otherwise inherit them.

| # | Intel claim | Verified reality |
|---|-------------|------------------|
| C1 | WARNING-002: "**no card** in `cards.json` populates `rewardCap` — zero occurrences" | **False.** 3 of 11 populate it: `citi-cash-back`, `sc-smart`, `sc-simply-cash`. **But the conclusion survives and sharpens:** `rewardCap` is referenced at `src/types/card.ts:278` and in data/docs, and is **never read by any engine, UI, or admin code**. It is *write-only* dead schema — populated and ignored, which is worse than absent: the data implies a contract nothing honors. |
| C2 | REQ-typing-animation: "1-minute cadence not confirmed (no `60000` literal)" | **Resolved — it deviates.** `TypingAnimation.tsx:16` sets `intervalMs = 10000` with the comment `// 10 seconds = 6 times per minute`. PRD requires 1 minute. Copy itself matches the PRD exactly. |
| C3 | REQ-tie-breaking: "PARTIAL / UNCONFIRMED, consistent with the PRD's class ordering" | **Resolved — it deviates.** No reward-unit-class tie-break exists. See PUB-006. |
| C4 | SYNTHESIS: "Extracted: **15**" requirements | **16.** The synthesis's own ID list enumerates 16; the count is a miscount. |

---

## Public tool (PRD-derived)

### PUB-001 — Manual card curation, automation later
- **Source:** PRD — "manually curated from the beginning. Explore Automation later."
- **Acceptance:** Card data exists and is maintainable without engineering deploys.
- **Status:** **MET, and exceeded.** Delivered via the admin panel (ADM-*) with AI-assisted
  PDF extraction and an approval queue. The "explore automation later" clause has been
  actioned. The PRD does not describe this surface.

### PUB-002 — Reward parameters drive the recommendation
- **Source:** PRD parameter list (8 parameters).
- **Acceptance:** All eight parameters influence the recommendation.
- **Status:** **PARTIAL — 6 of 8 fully live.**

  | Parameter | Status | Evidence |
  |-----------|--------|----------|
  | Reward % per $ | MET | `rewardRate` on `RewardRule` |
  | Transaction fee | MET | `fees.foreignTransactionFeeRate`; ranked on net value |
  | Merchant type | MET | `categories` + `specificMerchants` |
  | Payment type | MET (exceeds PRD) | `'online'\|'offline'\|'contactless'\|'recurring'` |
  | Spending currency | MET | `Currency` union + `'foreign'` |
  | Reward unit | MET | `'cash'\|'miles'\|'points'` |
  | **Rewards cap** | **DEVIATES** | Ships as per-rule `monthlySpendingCap` + `fallbackRate` (`card.ts:126`), fully wired. The `RewardCap` interface is populated on 3 cards but **read by nothing**. See OPEN-002. |
  | **Day of week** | **SUPPORTED BUT UNUSED** | Honored at `calculateReward.ts:131`; appears **0 times** in `cards.json`. Dead code path. |

### PUB-003 — Corpus under 100 cards
- **Source:** PRD — "Start with <100 cards"
- **Status:** **MET.** 11 cards / 40 reward rules in `src/data/cards.json`.

### PUB-004 — Assume users own all cards
- **Source:** PRD
- **Status:** **MET.** No ownership model anywhere.

### PUB-005 — Category optimization
- **Source:** PRD — "optimization logic based on the preferred categories they select"
- **Status:** **MET.** `RecommendationPreferences.preferredRewardUnits`,
  `recommendCards.ts:65-72`.

### PUB-006 — Tie-breaking
- **Source:** PRD — ties resolve by (1) user preference; then (2) **reward-unit class —
  cash back highest, then miles, then the rest**; then (3) estimated rewards within class.
- **Status:** **DEVIATES.** Verified at `recommendCards.ts:99-128`. The shipped chain is:

  1. Higher net value
  2. Higher reward amount
  3. Lower annual fee
  4. Preferred issuer
  5. Alphabetical by card name

  **The PRD's step 2 — reward-unit class ordering — does not exist in the sort.**
  `preferredRewardUnits` is applied as a **filter** (removes cards from the result set
  entirely, `recommendCards.ts:65-72`), not as a tie-break ordering. A
  `groupByRewardUnit` utility exists (`recommendCards.ts:175`) but is not used by the sort.
  So a cash-back card and a miles card tied on net value resolve by **annual fee then
  alphabetical**, not by the PRD's cash-over-miles preference.
- **Note:** This may be a deliberate improvement — ranking on net value is arguably more
  correct than the PRD's class hierarchy. But it is undocumented drift. See OPEN-006.

### PUB-007 — Multi-card split
- **Source:** PRD — "recommend multiple cards for one transaction… only where maximum
  rewards cap has met and the merchant allows transaction splitting (e.g. wedding venue
  deposits)"
- **Status:** **NOT BUILT.** Verified: no split logic in `src/lib/engine/` (the only `split`
  match is `.split('T')` on a date string at `calculateReward.ts:18`). No "merchant allows
  splitting" flag on any card, merchant, or transaction type.
- **Blocked by:** OPEN-002. Its trigger condition — "maximum rewards cap has met" — depends
  on a cap model that currently computes nothing from `rewardCap`.
- **This is the largest unbuilt PRD requirement.** Tracked in Backlog, not mapped to a phase.

### PUB-008 — No login, desktop web
- **Source:** PRD
- **Status:** **MET for the public tool.** Admin auth exists but does not gate the public
  tool. The PRD's "no login" framing no longer describes the whole system.
- **Conflict:** PRD says **desktop**; LANDING_PAGE_REDESIGN specifies mobile-first PWA.
  See OPEN-005.

### PUB-009 — Category and merchant tags populate the input
- **Source:** PRD — selecting a tag injects text into the text field
- **Status:** **MET** (structurally). `TransactionInput.tsx` handles tag selection;
  SESSION_SUMMARY records a change to single-select merchant tags. Exact tag→field
  population not re-verified end-to-end.

### PUB-010 — NLP transaction input
- **Source:** PRD — "text field… analyzed via NLP"
- **Status:** **MET.** `src/lib/parser/transactionParser.ts` →
  `parseTransaction(input) → ParseResult`. Bilingual EN/zh-Hant with confidence scoring.
  Confidence is computed internally but **not displayed** (removed from UI per
  SESSION_SUMMARY). HKD is the default currency.

### PUB-011 — Bilingual with language switch
- **Source:** PRD
- **Status:** **MET.** `next-intl 4.7`, `messages/en.json` + `messages/zh-HK.json`,
  `LanguageSwitcher.tsx`. Locale is Traditional Chinese (`zh-HK`).

### PUB-012 — Ranked results display
- **Source:** PRD — sorted descending; top carries "Recommended"; each row shows estimated
  rewards, estimated fees, and an "Apply Here" CTA to the issuer.
- **Status:** **MET.** Sort at `recommendCards.ts:99`; `"recommended"` at
  `messages/en.json:145`; `applyUrl` CTA at `CardRecommendationList.tsx:448`; fees modeled
  and ranked on net value.

### PUB-013 — Free for v1, monetization later
- **Source:** PRD
- **Status:** **DEFERRED (met by design).** No payment, subscription, or token-limit code.
  Intentional future scope — not a gap.

### PUB-014 — Light and dark mode
- **Source:** PRD
- **Status:** **MET.** `next-themes 0.4.4`, `ThemeProvider.tsx`, `DarkModeToggle.tsx`.
  `COLOR_SYSTEM.md`'s claim that the toggle is a "future enhancement" is stale.

### PUB-015 — ChatGPT color tone
- **Source:** PRD — "Reference Chatgpt.com"
- **Status:** **MET.** `--primary: #10a37f` verified at `globals.css:15`.
- **Tension:** LANDING_PAGE_REDESIGN layers a "modern & playful fintech" palette
  (purple/orange/blue, gradients) on top of the ChatGPT minimalism. Both coexist in
  `globals.css:15-25`. An extension, not a contradiction — but unreconciled. See OPEN-005.

### PUB-016 — Typing animation
- **Source:** PRD — left-to-right typing animation above the text field, firing on refresh
  and **every 1 minute**, copy: EN "How much are you earning from spending today?" /
  ZH "你今日想點賺法？"
- **Status:** **DEVIATES on cadence; copy exact.**
  - Copy **verified exact**: `messages/en.json:6` and `messages/zh-HK.json:6` match the PRD
    strings character-for-character.
  - Cadence **deviates**: `TypingAnimation.tsx:16` sets `intervalMs = 10000` — 10 seconds,
    commented `// 10 seconds = 6 times per minute`. The PRD specifies 1 minute. Someone
    made a deliberate 6× change and did not record why. See OPEN-007.

---

## Admin / ingestion (code-derived — needs PRD v2 ratification)

Per DEC-SCOPE-001 this surface is **core and in scope**. No PRD or doc covers any of it;
these are reverse-engineered from the shipped system.

### ADM-001 — Admin authentication
- **Source:** code — `src/lib/auth/adminAuth.ts`, `/api/admin/auth`
- **Behavior:** Shared-password login → HTTP-only session cookie (`cardgpt_admin_session`).
  `POST` login, `DELETE` logout, `GET` status. Pages guard via `isAuthenticated()` →
  `redirect('/admin/login')` (`src/app/admin/page.tsx:6-9`). Middleware **skips** `/admin`
  (`middleware.ts:59-60`) — auth is enforced per-page/route, not in middleware.
- **Status:** 🔴 **NOT ADEQUATELY MET — urgent.** The mechanism above does not actually
  secure the admin surface against a motivated visitor. Confirmed against the live
  deployment 2026-07-15. **Specifics are withheld from this file because the repo is
  public** — they are in [THI-236](https://linear.app/thirdvisor/issue/THI-236) (Urgent).
  The file's own comment concedes "For production, consider using a proper JWT or session
  library." Treat ADM-001 as unmet until THI-236 ships. See OPEN-003.

### ADM-002 — Card CRUD UI
- **Source:** code — `src/app/admin/**` (18 files), `/api/admin/cards`, `/api/admin/cards/[id]`
- **Behavior:** List, create, edit, delete cards; nested reward-rule CRUD
  (`cards/[id]/rules/**`) via `RuleForm.tsx` / `RuleListView.tsx`. `/api/admin/stats` backs
  the dashboard. `/api/admin/upload` handles card images via `@vercel/blob`.
- **Status:** **MET.**

### ADM-003 — AI-assisted PDF card extraction
- **Source:** code — `/api/admin/extract`, `src/lib/ai/extractRewards.ts`, `pdf-parse`,
  `@anthropic-ai/sdk`
- **Behavior:** Admin uploads a card T&C PDF (`admin/upload/UploadExtractor.tsx`);
  `pdf-parse` extracts text; Anthropic extracts structured reward rules (including
  `monthlySpendingCap`); result lands in the pending queue for human review.
- **Status:** **MET.**

### ADM-004 — Pending review / approval queue
- **Source:** code — `/api/admin/pending`, `/api/admin/pending/[id]`,
  `/api/admin/pending/[id]/approve`, `src/lib/data/pendingRepository.ts`,
  `PendingQueueView.tsx`, `PendingReviewView.tsx`
- **Behavior:** AI-extracted cards queue for human review; an admin inspects and approves
  before the card reaches the live corpus. Human-in-the-loop gate on AI output.
- **Status:** **MET.**

### ADM-005 — Redis-backed card persistence
- **Source:** code — `src/lib/data/redisStorage.ts`, `@upstash/redis 1.36.1`, commits
  `6fb4d19`, `d43be5e`, `18a038c`
- **Behavior:** Card database persists in Upstash Redis. `cardRepository.ts` exposes sync
  (build-time) and async (runtime) variants — **admin and public pages must use async**.
  `/api/admin/init-redis` seeds; `/api/admin/export-cards` syncs Redis → local.
  Env vars accept both `KV_REST_API_*` and `UPSTASH_REDIS_*`.
- **Status:** **MET.** Replaced Vercel Blob. `docs/ARCHITECTURE.md` still documents Blob
  and is wrong. See OPEN-004.

### ADM-006 — AI activity parsing
- **Source:** code — `/api/parse-activity`, `src/lib/ai/parseActivity.ts`
- **Behavior:** Server-side AI parsing endpoint. Keeps the Anthropic key server-side.
- **Status:** **MET.** Rate limiting asserted by `docs/ARCHITECTURE.md` but **not verified**.

### ADM-007 — Card image pipeline
- **Source:** code — `scripts/add-card-images.sh`, `src/lib/cardImages.ts`,
  `npm run add-card-images`
- **Behavior:** Drop images in `card_image/` → script serves them from `public/cards/` →
  mapped by card ID.
- **Status:** **MET.**

---

## Traceability

| Req | Phase | Status |
|-----|-------|--------|
| PUB-002 (schema) | Phase 1 | Partial (cap + dayOfWeek) |
| PUB-003 | Phase 1 | Complete |
| PUB-004 | Phase 1 | Complete |
| PUB-005 | Phase 2 | Complete |
| PUB-006 | Phase 2 | Deviates |
| PUB-010 | Phase 2 | Complete |
| PUB-008 | Phase 3 | Complete |
| PUB-009 | Phase 3 | Complete |
| PUB-011 | Phase 3 | Complete |
| PUB-012 | Phase 3 | Complete |
| PUB-013 | Phase 3 | Deferred by design |
| PUB-014 | Phase 3 | Complete |
| PUB-015 | Phase 3 | Complete |
| PUB-016 | Phase 3 | Deviates (cadence) |
| PUB-001 | Phase 4 | Complete |
| ADM-001 | Phase 4 | Complete (risk: OPEN-003) |
| ADM-002 | Phase 4 | Complete |
| ADM-003 | Phase 4 | Complete |
| ADM-004 | Phase 4 | Complete |
| ADM-006 | Phase 4 | Complete |
| ADM-007 | Phase 4 | Complete |
| ADM-005 | Phase 5 | Complete |
| **PUB-007** | **Backlog** | **NOT BUILT** — blocked on OPEN-002 |

**Coverage:** 23 requirements. 22 mapped to delivered phases; 1 (PUB-007) explicitly in
Backlog as unbuilt and blocked. No orphans.
