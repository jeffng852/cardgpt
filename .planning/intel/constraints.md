# Constraints Intel

Extracted from the 4 SPEC-typed docs, plus the SPEC-signal content the classifiers flagged
inside two DOC-typed docs (CARD_RESEARCH_SUMMARY, PARSER_DOCUMENTATION).

Precedence among SPECs (manifest-supplied, lower = higher): SCHEMA_DESIGN (1) >
SCHEMA_REFACTOR_NOTES (2) > ARCHITECTURE (3) > LANDING_PAGE_REDESIGN (4) > COLOR_SYSTEM (5).

**Every constraint carries a `status:`.** `VERIFIED` = confirmed against code on 2026-07-15.
`CLAIMED` = asserted by a doc, not verified. `STALE` = contradicted by code; code wins.

---

## Schema constraints

### CON-rule-priority — rule priority taxonomy
- source: /Users/jeffreyng/cardgpt/SCHEMA_DESIGN.md (SPEC, prec 1)
- type: schema
- doc says: three levels — `base` (universal base rate), `bonus` (category/condition
  bonuses), `premium` (highest tier, e.g. spend-based upgrades, overrides via `Math.max`).
- status: **STALE — code wins.** `src/types/card.ts:65` declares
  `RulePriority = 'base' | 'bonus' | 'specific'`. There is no `premium`.
  `calculateReward.ts:206` filters `r.priority === 'specific'`.
  Semantics also differ: doc's `premium` = highest-tier override for spend upgrades;
  code's `specific` = "replaces base rate entirely (mutually exclusive, e.g., specific
  merchant rates)" (`card.ts` docstring). This is a **rename plus a semantic shift**, not a
  pure rename. See WARNING-001.
- authoritative form (code): `base | bonus | specific`

### CON-cumulative-flag — cumulative vs replacing bonuses
- source: SCHEMA_DESIGN.md (SPEC, prec 1)
- type: schema
- constraint: `isCumulative: true` → rate adds to base (Citi: 1% base + 1% bonus = 2%).
  `isCumulative: false` → rate replaces base.
- status: VERIFIED in principle, but **deprecated in code**. `card.ts:105` marks it
  `@deprecated Use priority instead: 'bonus' = cumulative, 'specific' = not cumulative`.
  The flag's intent survives; the mechanism moved into `priority`.

### CON-merchant-taxonomy — categories vs specificMerchants vs merchantTypes
- source: /Users/jeffreyng/cardgpt/SCHEMA_REFACTOR_NOTES.md (SPEC, prec 2)
- type: schema
- constraint: Separate broad `categories?: string[] | ['all']` from
  `specificMerchants?: string[]`. `merchantTypes` is **deprecated** but retained for
  backward compatibility. Transaction mirrors this with `category?` + `merchantId?`
  (`merchantType?` deprecated).
- matching priority: (1) rule applies to `all`; (2) specific merchant ID match — highest
  priority; (3) category match.
- status: **VERIFIED.** `card.ts:93` retains `merchantTypes?` as the deprecated field;
  `calculateReward.ts:80-87` implements the old-schema fallback branch exactly as described;
  `cardRepository.ts:210-212` validates that at least one of the three is present.
- **precedence inversion:** SCHEMA_DESIGN (prec 1) models the world in `merchantTypes` only.
  SCHEMA_REFACTOR_NOTES (prec 2) supersedes it. Manifest precedence ranks the *superseded*
  doc higher. Code sides with the refactor. See WARNING-003.

### CON-reward-conditions — rule condition fields
- source: SCHEMA_DESIGN.md (SPEC, prec 1)
- type: schema
- constraint: `conditions: { currency, paymentType, minAmount, minMonthlySpending,
  geographic: { excludedRegions, onlineExempt } }`
- status: VERIFIED and **superset in code**. `RewardCondition` (`card.ts:33-58`) implements
  all of the above and adds `excludedCurrencies`, `dayOfWeek`, `maxAmount`.
  `PaymentType` extends beyond the doc's online/offline to include `contactless`, `recurring`.

### CON-reward-cap — cap modeling
- source: SCHEMA_DESIGN.md (SPEC, prec 1) + CARD_RESEARCH_SUMMARY.md (DOC w/ SPEC signal, prec 8)
- type: schema
- SCHEMA_DESIGN says: `rewardCap: { unit, redemptionThreshold }` — auto-redeem at threshold.
  "No monthly/yearly limits for Citi Cash Back Card."
- CARD_RESEARCH_SUMMARY proposes: add `monthlySpendingCap?: number` **inside** `RewardCap`,
  to handle HSBC Red's "$10,000 online at 4%, then 0.4%" tiered structure. Labeled
  "Minor Addition Needed" — i.e. proposed, not built, as of that doc.
- status: **DIVERGED — the proposal shipped in a different shape.**
  - `RewardCap` (`card.ts:235-249`) exists with `monthlyLimit?`, `yearlyLimit?`, `unit`,
    `redemptionThreshold?`, `currentAccumulated?` — and does **NOT** contain
    `monthlySpendingCap`.
  - `monthlySpendingCap` shipped on **`RewardRule`** instead (`card.ts:126`), paired with
    `fallbackRate`, and is live in the admin rule form, `PendingReviewView.tsx`, and
    `CardRecommendationList.tsx:337`.
  - **No card in `src/data/cards.json` populates `rewardCap` at all** (0 occurrences of any
    rewardCap key across all 11 cards).
  See WARNING-002 and INFO-004.

### CON-excluded-merchants — universal exclusions
- source: SCHEMA_DESIGN.md (SPEC, prec 1)
- type: schema
- constraint: Common exclusions across rules: fps-transfer, cash-advance, balance-transfer,
  installment, tax-payment, bill-payment, utilities, insurance, charity, mutual-fund,
  casino, government-fee.
- status: CLAIMED — `excludedMerchants` is referenced by `cardRepository` validation, but
  the exclusion list contents were not verified against card data.

### CON-extra-rule-fields — fields in code, absent from every SPEC
- source: code (`src/data/cards.json`, `src/types/card.ts`)
- type: schema
- constraint: Live card rules carry `fallbackRate`, `isPromotional`, and `notes` — none of
  which appear in SCHEMA_DESIGN.md or SCHEMA_REFACTOR_NOTES.md.
- status: VERIFIED (observed in the `sim-card` rule payload). Undocumented schema surface.

## Architecture constraints

### CON-data-layer — card persistence
- source: /Users/jeffreyng/cardgpt/docs/ARCHITECTURE.md (SPEC, prec 3)
- type: protocol
- doc says: Production = **Vercel Blob** (`cards.json` via `@vercel/blob` SDK);
  development = local `src/data/cards.json` static import. Env detection via
  `blobStorage.ts` → `isProductionEnvironment()`, `isBlobConfigured()`,
  `BLOB_READ_WRITE_TOKEN`.
- status: **STALE — code wins.** Card storage is **Upstash Redis**
  (`src/lib/data/redisStorage.ts`, `@upstash/redis 1.36.1`). `blobStorage.ts` no longer
  exists. Commits `6fb4d19` ("Migrate from Vercel Blob to Upstash Redis") and `d43be5e`
  ("Fix Redis env var mismatch and remove dead blob code") are the authority.
  `@vercel/blob 2.0.1` survives as a dependency but is used **only** by
  `src/app/api/admin/upload/route.ts` for image upload. Env vars: both `KV_REST_API_*` and
  `UPSTASH_REDIS_*` names are supported (commit `18a038c`). See INFO-001.
- authoritative form (code): Upstash Redis for card data; Vercel Blob for image upload only.

### CON-server-client-split — rendering boundary
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: protocol
- constraint: `page.tsx` is a **server** component (fetches cards, passes as props);
  `HomeClient.tsx` is a **client** component (UI + runs `recommendCards()` client-side).
  Rationale: `process.env.VERCEL` is unavailable on the client, so a client-side
  `loadCards()` silently fell back to the stale build-time static import.
- status: VERIFIED structurally (`HomeClient.tsx` present, server/client split in place).
  The underlying rationale remains valid regardless of the Blob→Redis change.

### CON-force-dynamic — cache bypass
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: protocol
- constraint: Every route reading card data must `export const dynamic = 'force-dynamic'`
  to bypass Next.js static caching. Named: `src/app/[locale]/page.tsx`,
  `src/app/api/admin/cards/route.ts`, `src/app/api/admin/cards/[id]/route.ts`.
- status: CLAIMED — not re-verified. Still-relevant constraint; the caching failure mode it
  guards against is real and was the subject of multiple commits.

### CON-sync-async-repository — data access contract
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: api-contract
- constraint: `cardRepository.ts` exposes sync (`getCardById`, `getAllCards` — build-time)
  and async (`getCardByIdAsync`, `getAllCardsAsync` — runtime, hits remote store) variants.
  **Rule: admin and public pages must always use the async variants.**
- status: VERIFIED that `cardRepository.ts` exists with validation logic. The sync/async
  rule remains the stated contract; the backing store is now Redis, not Blob.

### CON-api-key-protection — secret handling
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: nfr
- constraint: AI keys (OpenAI/Anthropic) and the storage token are **server-side only**,
  never sent to the client. AI features run through server API routes
  (`/api/parse-activity`), rate-limited. Card data (names, rates, fees) IS exposed to the
  client — public marketing info, not sensitive.
- status: VERIFIED in shape — `@anthropic-ai/sdk` is server-side; `/api/parse-activity`
  exists. Rate limiting not verified.

### CON-type-contracts — core type signatures
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: api-contract
- constraint:
  - `parseTransaction(input: string): ParseResult` → `{ transaction, confidence, warnings }`
  - `calculateReward(card, transaction): RewardCalculation` → `{ cardId, rewardAmount,
    rewardUnit, effectiveRate, fees }`
  - `recommendCards(cards, transaction): RecommendationResult` → `{ recommendations, transaction }`
- status: VERIFIED at module level (`src/lib/engine/`, `src/lib/parser/` match these paths
  and names). Exact field lists not diffed.

### CON-performance-budget — latency targets
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: nfr
- constraint: Parser <2ms; engine per card <1ms; full recommendation <15ms; card load
  (remote) <100ms; total search latency <20ms after initial page load.
  Scalability: parser O(n) in input length; engine O(c×r) cards×rules; "handles 100+ cards".
- status: CLAIMED — no benchmark evidence in the repo. Note the doc's own baseline says
  "~50 cards × ~5 rules"; actual is **11 cards × 40 rules total**, so real load is far
  below the modeled figure.

### CON-i18n-locales — supported locales
- source: docs/ARCHITECTURE.md (SPEC, prec 3)
- type: protocol
- constraint: English (`en`) + Traditional Chinese (`zh-HK`). Coverage required across
  parser keywords, UI labels, card names, error messages, category names.
- status: VERIFIED. `messages/en.json`, `messages/zh-HK.json`. `next-intl 4.7`.

## Design-system constraints

### CON-color-tokens — ChatGPT-inspired palette
- source: /Users/jeffreyng/cardgpt/COLOR_SYSTEM.md (SPEC, prec 5)
- type: schema (design tokens)
- constraint, light mode: `background #ffffff`, `background-secondary #f7f7f8`,
  `background-tertiary #ececf1`, `foreground #2e2e2e`, `foreground-muted #6e6e80`,
  `foreground-subtle #8e8ea0`, `border #e5e5e5`, `border-light #f0f0f0`,
  `primary #10a37f`, `primary-hover #0d8968`, `primary-light #e6f7f2`,
  `card-bg #ffffff`, `card-hover #f9f9f9`, `success #10a37f`, `error #ef4146`,
  `warning #ff9500`, `info #0084ff`.
- constraint, dark mode: `background #212121`, `background-secondary #2f2f2f`,
  `background-tertiary #3f3f3f`, `foreground #ececec`, `foreground-muted #c5c5d2`,
  `foreground-subtle #9b9ba8`, `border #4d4d4d`, `border-light #3a3a3a`,
  `primary #19c37d`, `primary-hover #1a9f6b`, `primary-light #1a4d3c`,
  `card-bg #2f2f2f`, `card-hover #3a3a3a`, `success #19c37d`, `error #ff5f5f`,
  `warning #ffb340`, `info #4da6ff`.
- constraint, delivery: Tailwind v4 `@theme inline`; CSS custom properties in `globals.css`;
  all tokens exposed as Tailwind utilities (`bg-background`, `text-foreground-muted`,
  `border-border`, `bg-primary`, `bg-card-bg`, `text-success`…).
- status: VERIFIED for `primary #10a37f` (`globals.css:15`) and `success #10a37f`
  (`globals.css:32`). Full token table not diffed line-by-line.

### CON-dark-mode-mechanism — how dark mode activates
- source: COLOR_SYSTEM.md (SPEC, prec 5)
- type: protocol
- doc says: Automatic via `prefers-color-scheme` only. "Dark mode is not forced - respects
  user's system settings." Manual toggle listed under **Future Enhancements** ("If manual
  dark mode toggle is needed: add `[data-theme="dark"]`, add state management, persist in
  localStorage").
- status: **STALE — code wins.** The manual toggle shipped. `next-themes 0.4.4`,
  `src/components/ThemeProvider.tsx`, `src/components/DarkModeToggle.tsx` all exist, and
  the PRD (prec 0) requires "Light and Dark Mode". The lower-precedence
  DARK_MODE_IMPLEMENTATION.md (DOC, prec 10) is the accurate account. See INFO-003.

### CON-wcag-aa — contrast
- source: COLOR_SYSTEM.md (SPEC, prec 5); restated in LANDING_PAGE_REDESIGN.md (prec 4)
- type: nfr
- constraint: All text colors meet WCAG AA contrast. Focus states use `primary` with a
  visible outline.
- status: CLAIMED — asserted in both docs, no audit evidence. In LANDING_PAGE_REDESIGN it
  sits in an **unchecked** testing checklist.

## Landing page constraints — ALL CLAIMED, NONE VERIFIED

Per the ingest brief: LANDING_PAGE_REDESIGN.md (SPEC, prec 4) is typed SPEC but reads as a
retrospective implementation report ("What Was Built", past tense, a "Sign-Off" section
asserting "All requirements met"). Its entire **Testing Checklist is unchecked** — every box
under Desktop, Mobile, Accessibility, and Performance is `- [ ]`. The constraints below are
therefore recorded as **CLAIMED, NOT VERIFIED**, despite the doc's sign-off language.

### CON-brand-palette — accent colors
- constraint: primary teal `#10a37f` (trust & growth); accent purple `#9333ea`
  (premium/smart); accent orange `#f59e0b` (energy/savings); accent blue `#3b82f6`
  (global/bilingual).
- status: **VERIFIED** — the one landing constraint that checks out.
  `globals.css:20-25` defines `--accent-purple: #9333ea`, `--accent-orange: #f59e0b`,
  `--accent-blue: #3b82f6`, each with a `-light` variant.

### CON-responsive-breakpoints
- constraint: Mobile <768px (single column, 3 floating cards); Tablet 768-1024px (2 columns);
  Desktop >1024px (4-column grid, 6 floating cards).
- status: CLAIMED, NOT VERIFIED.
- note: PRD (prec 0) scopes the tool to **desktop**. This mobile-first spec exceeds it.

### CON-tap-targets
- constraint: Minimum 44x44px touch targets; no hover-only interactions.
- status: CLAIMED, NOT VERIFIED (unchecked checklist item).

### CON-analysis-latency-100ms
- constraint: "Under 100ms analysis" — surfaced as a user-facing stat on the landing page
  ("100ms Analysis Time").
- status: CLAIMED, NOT VERIFIED.
- note: Conflicts in framing with ARCHITECTURE.md's stricter, more granular budget
  (<20ms total search latency; <100ms is that doc's *card load* figure, not analysis).
  The landing page markets the looser number.

### CON-lighthouse-90
- constraint: Page loads <3s; Lighthouse score >90; animations at 60fps; no layout shift.
- status: CLAIMED, NOT VERIFIED (unchecked checklist item).

### CON-prefers-reduced-motion
- constraint: Floating-cards animation must be disabled under `prefers-reduced-motion`.
  Animation detail: 20-30s cycles, 5% opacity, GPU-accelerated pure CSS, no JS RAF.
- status: CLAIMED, NOT VERIFIED. `FloatingCards.tsx` exists; the media-query guard was
  not confirmed.

### CON-pwa-manifest
- constraint: `public/manifest.json` with `name: "CardGPT - AI Credit Card Recommendations"`,
  `short_name: "CardGPT"`, `display: "standalone"`, `theme_color: "#10a37f"`,
  icons 192x192 + 512x512, a "Quick Analysis" shortcut, `categories: ["finance",
  "productivity"]`. Plus PWA/Apple-web-app meta tags and Open Graph in `layout.tsx`.
- status: CLAIMED, NOT VERIFIED.
- note: PWA is **not a PRD requirement**. Scope added by a lower-precedence SPEC.

## Parser constraints (SPEC signal inside a DOC)

### CON-parser-contract
- source: /Users/jeffreyng/cardgpt/PARSER_DOCUMENTATION.md (DOC, prec 7 — classifier
  flagged API-reference/pattern-table/confidence-formula SPEC signals)
- type: api-contract
- constraint: Bilingual (EN/zh-Hant) `parseTransaction` converts natural language into a
  structured `Transaction` with per-field confidence scores. Extracts amount, currency,
  category, merchant, payment type.
- status: VERIFIED at module level (`src/lib/parser/transactionParser.ts`). Pattern/keyword
  tables and the confidence formula were not diffed against code — treat the doc's specifics
  as CLAIMED.
- note: SESSION_SUMMARY.md records that the **confidence score was removed from the UI** and
  that HKD is the default currency. The parser still computes confidence internally
  (`ParseResult.confidence` is in the ARCHITECTURE type contract); it is just not displayed.
