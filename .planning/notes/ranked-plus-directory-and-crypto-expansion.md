---
title: Ranked.plus-style directory + crypto card expansion
date: 2026-07-16
context: /gsd-explore session — brainstorming a new offering/monetization direction for CardGPT
related_issues: [THI-176, THI-51]
related_notes: []
---

# Ranked.plus-style directory + crypto card expansion

Captured from a `/gsd-explore` session on 2026-07-16. Starting prompt: research ranked.plus,
adopt its UI/theme/format, add its card data, and give CardGPT a home / data / research page
structure — plus "anything else relevant."

This note records what we **decided**, not a plan. Scope is milestone-sized; the plan lives in
`/gsd-new-milestone` → phases. Maps onto existing tickets **THI-176** (ranked.plus-style revamp)
and **THI-51** (crypto cards).

## What ranked.plus actually is (the research finding that reshaped the plan)

Researched live (WebFetch + search, 2026-07-16). ranked.plus is **not** an HK credit-card site:

- It's a **global directory of neobanks and crypto/fintech cards** (Revolut/Wise/Crypto.com-style).
- Its **tiers are adoption-based** — ranked by total processed volume and user count — **not** by
  reward quality.
- Its structure: home, a data/database browser, a map/geo checker, and a research hub.
- **Legal check came back empty:** no GitHub repo, no license, no terms, no data-reuse statement.
  The site's only sourcing line is *"the information is based on publicly available sources and
  updated once a week"* — i.e. it is itself a downstream aggregator.

Consequence: ranked.plus is a **design/format/schema reference, NOT a data source.** We adopt its
page structure and its card-parameter model; we do **not** copy its card records or its ranking.

## Decisions

1. **Home stays the recommender.** The existing "type a purchase → best card for it" engine remains
   the core and the landing experience. Everything else is additive.
2. **Add two new surfaces:** a **Data page** (browse all cards) and a **Research page**. Additive,
   not a replacement.
3. **No tier system.** We drop S/A/B tiers entirely. (They only make sense with a *static* ranking;
   CardGPT's ranking is inherently *per-transaction*, so a static tier would misrepresent it.)
4. **Support a crypto card category** alongside HK credit cards. This is a real product expansion
   (THI-51), not a detour.
5. **Monetize via affiliate/referral on the existing `applyUrl`.** That field already exists and is
   already referral-aware (`card.ts:268` — "only shown when referral link available"). So the
   monetization rail is a *populate-the-links* job, not a schema change. This is the MoneyHero/
   MoneySmart model in a nicer wrapper, and it fits the current no-login architecture.

## Card-parameter determination (delegated to the assistant)

Judged against the current `src/types/card.ts` schema. Kept deliberately lean.

**Add — needed for the crypto category:**
- `cardType: 'credit' | 'crypto' | 'prepaid'` on `CreditCard`. Today every card is *implicitly* an
  HK reward credit card; this field is what lets the Data page filter by type and lets the engine
  treat crypto cards distinctly. Highest-value single addition.
- Extend `RewardUnit` (currently `cash | miles | points`) with **`crypto`**, and name the asset by
  reusing the existing `rewardPrograms` pattern (e.g. program "Crypto.com", asset "USDC"/"CRO").
  Without this a crypto card's rewards cannot be expressed at all.

**Add — optional, only where a crypto card needs it:**
- **Staking gate → `minStaking { amount, asset }` on `RewardCondition` (rule-level), NOT the card.**
  Crypto reward *tiers* (e.g. 1% / 2% / 5% by amount of native token staked) are really *different
  rules gated on different staking amounts* — structurally identical to how `minMonthlySpending`
  already gates a rule. Reuse that mechanism; don't invent a card-level parallel. (This refines the
  first-pass idea of a card-level `stakingRequirement`.)
- `hkEligible` — a simple boolean (not ranked.plus's full country matrix); crypto cards vary on HK
  availability and CardGPT is HK-only.
- `fundingOptions` — how the card is loaded (bank transfer / crypto deposit); Data-page use, crypto
  subset only.

**Already in the schema — do not duplicate:** annual fee, FX fee, network, issuer, min income,
reward rates, reward-program names.

**Skip:** adoption/volume metrics (their ranking basis; we dropped tiers) and the global geo matrix
(HK-only).

**Derive, don't store:** a headline "best rate" per card for the browse view — compute from the
existing reward rules; no new field.

## Does the card data structure need to change? (evaluation)

**Verdict: yes, but the changes are additive and backwards-compatible — no re-architecture, no risky
migration.** Evaluated against the live schema (`src/types/card.ts`) and the engine
(`recommendCards.ts`, `calculateReward.ts`).

1. **The additions are non-breaking.** Every change is a new *optional* field (`stakingRequirement`
   via `RewardCondition.minStaking`, `hkEligible`, `fundingOptions`) or a new enum member
   (`RewardUnit += 'crypto'`). The 11 existing cards in Redis stay valid and default gracefully. The
   only one with a migration cost is `cardType` **if made required** — then the 11 cards need a
   one-line backfill to `'credit'`. Recommendation: make `cardType` required with a trivial one-time
   backfill (you always want to know a card's type); keep the rest optional.

2. **The one genuinely *structural* issue is reward valuation, not fields.** The recommender ranks by
   **net value**, which needs every reward reduced to a comparable number. Today the PRD punts on
   cross-unit conversion ("no conversion for now except fiat"). A crypto reward in USDC/CRO must
   resolve to an HKD-equivalent to rank against a cashback card — otherwise crypto cards sort
   arbitrarily. So the real work is giving the engine a **value-per-reward-unit** notion (even a
   static, manually-maintained rate per unit), which *also* latently affects miles/points today.
   **This is the structural decision to make** — engine logic + a small conversion config, not a card
   field. It should be an explicit item in the milestone.

3. **`RewardRule` already fits the common case.** "Flat X% in <unit> on all/most categories" is
   expressible today via `categories: ['all']` + `rewardUnit`. Fees, network, issuer, and
   program-naming all generalize. So the core reward model is more extensible than it looks — no
   rewrite.

4. **Opportunity, scope deliberately:** OPEN-001 (premium/specific taxonomy drift) and OPEN-002
   (`RewardCap` is write-only dead schema) both live in this same file. Touching the schema for crypto
   is a natural moment to retire dead `RewardCap` — but decide that in the milestone; don't silently
   bundle it into the crypto work.

## Open dependency

Building the crypto data is **blocked on sourcing** — see `.planning/research/questions.md`
(which HK-available crypto cards exist and their real reward structures, from primary sources).
