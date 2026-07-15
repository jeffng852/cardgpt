# Requirements Intel

All requirements derive from a **single PRD**: `/Users/jeffreyng/cardgpt/CardGPT PRD.md`
(precedence 0 — pinned canonical statement of product intent, above the SPECs).

Because there is exactly one PRD, **no competing acceptance variants exist**. No requirement
below has more than one source, and nothing has been merged or discarded.

**Caveat on the PRD's authority:** the PRD is dated 2026-01-09 and carries `Status: Exploring`.
It is pinned canonical for *intent*, but it describes a pre-build product. CardGPT is now
deployed with 87 commits. Where the PRD and the code disagree about what exists, this file
records the PRD as intent and the code as state — it does not silently reconcile them.

`verified:` was established by reading code on 2026-07-15. GitHub main = ground truth.

---

## Data input

### REQ-manual-card-curation
- source: CardGPT PRD.md ("Credit Card Rewards Data will have to be manually curated from
  the beginning. Explore Automation later.")
- description: Card reward data is hand-curated initially; automation explored later. Named
  sources: MoneyHero, MoneySmart, finance blogs.
- acceptance: Card data exists and is maintainable without engineering deploys.
- verified: **MET, and exceeded.** Curation happens through an admin panel with AI-assisted
  PDF extraction (`/api/admin/extract`, `pdf-parse` + Anthropic SDK) and a pending-approval
  queue. The "explore automation later" clause has effectively been actioned; the PRD does
  not describe this surface. See WARNING-004.

### REQ-reward-parameters
- source: CardGPT PRD.md (parameter list)
- description: Recommendation output must be determined by: reward % per $ spent;
  transaction fee to user; merchant type; payment type (online/offline); spending currency
  (HKD vs non-HKD); reward unit (cash / Asia Miles / bank points); rewards cap (maximum);
  day of week.
- acceptance: All eight parameters influence the recommendation.
- verified: **PARTIAL — 7 of 8 fully wired.**
  - reward % — `rewardRate` on RewardRule. MET.
  - transaction fee — `fees.foreignTransactionFeeRate`, ranked on net value. MET.
  - merchant type — `categories` + `specificMerchants`. MET.
  - payment type — `PaymentType = 'online'|'offline'|'contactless'|'recurring'`. MET, exceeds PRD.
  - currency — `Currency` union + `'foreign'`. MET.
  - reward unit — `RewardUnit = 'cash'|'miles'|'points'`. MET.
  - rewards cap — **AMBIGUOUS.** See WARNING-002: `RewardCap` interface exists but **no card
    in `src/data/cards.json` populates `rewardCap`**; caps are instead expressed as per-rule
    `monthlySpendingCap` + `fallbackRate`.
  - day of week — **SUPPORTED BUT UNUSED.** `dayOfWeek` is honored in
    `calculateReward.ts:131` but appears **0 times** in `src/data/cards.json`. No card
    currently exercises it.

### REQ-card-corpus-under-100
- source: CardGPT PRD.md ("Start with <100 cards")
- acceptance: Fewer than 100 cards at launch.
- verified: **MET.** `src/data/cards.json` holds **11 cards / 40 reward rules**.
  (Docs across the set say "10 cards / 36 rules" — stale. An 11th card, `sim-card`
  from United Asia Finance, has since been added. See INFO-007.)

## Recommendation logic

### REQ-category-optimization
- source: CardGPT PRD.md ("optimization logic based on the preferred categories they select")
- acceptance: User-selected preferred categories influence ranking.
- verified: MET. `RecommendationPreferences.preferredRewardUnits` in
  `src/lib/engine/recommendCards.ts:18`.

### REQ-multi-card-split
- source: CardGPT PRD.md ("We can recommend multiple cards for one transaction, but it
  should only be for cases where maximum rewards cap has met and also if the merchant allows
  transaction splitting with different cards (e.g. wedding venue deposits)")
- acceptance: When a card's reward cap is exhausted AND the merchant permits splitting,
  recommend a multi-card split across the transaction.
- verified: **NOT IMPLEMENTED.** No split logic exists anywhere in `src/lib/engine/`.
  There is no "merchant allows splitting" flag on any card, merchant, or transaction type.
  This is the single largest unbuilt PRD requirement. See INFO-008.

### REQ-tie-breaking
- source: CardGPT PRD.md
- acceptance: Ties resolve by (1) user preference indication; then (2) reward-unit class —
  cash back highest priority, then miles, then the rest; then (3) estimated rewards within
  the same class. No cross-unit conversion required, except between fiat currencies.
- verified: PARTIAL / UNCONFIRMED. `recommendCards.ts:99` sorts and the module groups by
  reward unit (`cash`/`miles`/`points`), consistent with the PRD's class ordering, but the
  exact three-level tie-break chain was not traced end-to-end during this synthesis.
  Flag for verification during roadmapping.

### REQ-assume-user-owns-all-cards
- source: CardGPT PRD.md ("Assume users own all cards in the recommendation")
- acceptance: No card-ownership model; all cards are candidates.
- verified: MET. No ownership tracking in the codebase.

## User experience

### REQ-no-login-desktop-web
- source: CardGPT PRD.md ("User do not have to login to use the tool and use it on a
  desktop website")
- acceptance: Public tool, no auth, desktop web.
- verified: MET for the public tool. **Scope note:** admin auth (`/api/admin/auth`) now
  exists — it does not gate the public tool, so this requirement holds, but the PRD's
  "no login" framing no longer describes the whole system.
- conflict note: The PRD says **desktop**. LANDING_PAGE_REDESIGN.md (SPEC, prec 4) specifies
  a mobile-first PWA with tap targets, install prompts, and mobile breakpoints. The lower-
  precedence SPEC expanded scope beyond the canonical PRD. See INFO-009.

### REQ-category-and-merchant-tags
- source: CardGPT PRD.md ("User can select the preferred rewards categories tags before
  inputing" / "select some popular merchant tags before inputing" / "Selected tags should be
  populated in the text field")
- acceptance: Tag chips exist for categories and popular merchants; selecting a tag injects
  text into the input field.
- verified: LIKELY MET. `TransactionInput.tsx` handles merchant tag selection
  (SESSION_SUMMARY records a change to single-select merchant tags). Exact tag→text-field
  population not re-verified.

### REQ-nlp-transaction-input
- source: CardGPT PRD.md ("a text field for user to input their upcoming spending
  transaction (analyzed via NLP)")
- acceptance: Free-text transaction input parsed into a structured transaction.
- verified: MET. `src/lib/parser/transactionParser.ts` →
  `parseTransaction(input) → ParseResult`, bilingual EN/zh-Hant, with confidence scoring.

### REQ-bilingual-with-switch
- source: CardGPT PRD.md ("Platform supports both Chinese and English for the prompt and
  have language switch")
- acceptance: Full EN + Chinese UI with a user-facing language switch.
- verified: MET. `next-intl 4.7`, `messages/en.json` + `messages/zh-HK.json`,
  `LanguageSwitcher.tsx`. Locale is Traditional Chinese (zh-HK).

### REQ-ranked-results-display
- source: CardGPT PRD.md
- acceptance: Cards sorted descending; top option carries a "Recommended" tag; each row
  shows estimated rewards for the transaction, estimated fees, and an "Apply Here" CTA
  linking to the issuer's card page.
- verified: MET. `recommendCards.ts:99` sorts descending; `messages/en.json:145` defines
  `"recommended": "Recommended"`; `CardRecommendationList.tsx:448` renders the `applyUrl`
  CTA; fees are modeled and ranked on net value.

### REQ-free-v1-monetization-later
- source: CardGPT PRD.md ("Tool is free for v1, will add monthly subscription + token limit
  model for future versions")
- acceptance: v1 free. Subscription + token limits deferred.
- verified: MET (by absence, as intended). No payment, subscription, or token-limit code
  exists. Explicitly future scope — not a gap.

## Design

### REQ-light-dark-mode
- source: CardGPT PRD.md ("Light and Dark Mode")
- acceptance: Both modes available to the user.
- verified: MET. `next-themes 0.4.4`, `ThemeProvider.tsx`, `DarkModeToggle.tsx`.
- conflict note: COLOR_SYSTEM.md (SPEC, prec 5) states dark mode is system-preference-only
  and lists a manual toggle as a *future enhancement*. That SPEC is stale — the toggle
  shipped. See INFO-003.

### REQ-chatgpt-color-tone
- source: CardGPT PRD.md ("Website Colour tone: Reference Chatgpt.com")
- acceptance: ChatGPT-like palette.
- verified: MET. COLOR_SYSTEM.md defines the ChatGPT-inspired token set; `#10a37f` primary
  confirmed at `src/app/globals.css:15`.
- tension: LANDING_PAGE_REDESIGN.md layers a "modern & playful fintech" palette
  (purple/orange/blue accents, gradients) on top of the ChatGPT minimalism. Both are in
  `globals.css` (lines 20-25). Not a contradiction — an extension — but the two design
  directions are not obviously reconciled. See INFO-009.

### REQ-typing-animation
- source: CardGPT PRD.md ("Let-to-right 'typing' Animation that activates every 1 minute and
  when user refresh above the text field { Eng: "How much are you earning from spending
  today?" | Chinese: 你今日想點賺法？}")
- acceptance: Left-to-right typing animation above the text field, firing on refresh and
  every 60 seconds, with the exact bilingual copy specified.
- verified: PARTIAL / UNCONFIRMED. `TypingAnimation.tsx` exists and uses `setInterval`
  (lines 36, 72), but the **1-minute cadence was not confirmed** (no `60000` literal found)
  and the exact PRD copy was not diffed against `messages/*.json`. Flag for verification.
