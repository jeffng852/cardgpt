# Feature Research — CardGPT v1.1 (Card Directory & Crypto Expansion)

**Domain:** HK credit-card reward recommender → browsable multi-category (credit + crypto/neobank) card directory with affiliate monetization
**Researched:** 2026-07-16
**Confidence:** MEDIUM-HIGH — directory/affiliate patterns are well-established (HIGH); crypto reward mechanics verified against live issuer/aggregator sources (HIGH on structure, MEDIUM on per-card HK eligibility, which shifts fast — see RQ-001, needs primary-source verification before data entry)

> Scope note: this covers ONLY the four NEW v1.1 features (Data page, Research page, crypto category, affiliate). The Home recommender stays as-is. Every recommendation is graded against the **existing** schema (`src/types/card.ts`) and engine (`recommendCards.ts` / `calculateReward.ts`), and dependencies on them are called out explicitly.

---

## Crypto Card Reward Mechanics — how real cards actually work

This section exists to make the schema decisions concrete. The key finding: **crypto-card rewards vary on five independent axes**, and CardGPT's existing `RewardRule` model already covers three of them. The two it doesn't (reward *asset* naming, and *holding/staking-gated tiers*) are exactly the two additions the exploration note proposed.

### The five modeling axes

| Axis | What varies | Real examples | Does current schema cover it? |
|------|-------------|---------------|-------------------------------|
| **1. Rate structure** | Flat % vs tiered % | Flat: HashKey (up to 4%). Tiered: Crypto.com (0/2/3/4/5/8%), Gnosis Pay (1/2/3/4/5%), Wirex (up to 8%) | **YES** — one `RewardRule` per tier, `categories:['all']` for the flat case |
| **2. Tier gate** | What unlocks a higher tier | **Locked stake** of native token (Crypto.com: lock CRO ~$500→$1M). **Unlocked holding** of native token (Gnosis Pay: hold ≥0.1/1/10/100 GNO; Wirex: hold WXT). **Subscription** (Crypto.com Pro: $29.99/mo). **Membership** (HashKey). | **NO** — needs `minStaking {amount, asset}` on `RewardCondition` (rule-level). Models both locked-stake and unlocked-holding; the lock/hold distinction is a *display* nuance, not a ranking one |
| **3. Reward asset** | What you're paid in | Native volatile token (CRO, GNO, WXT), stablecoin (USDC), or fiat voucher (HashKey → monthly HKD vouchers) | **PARTIAL** — needs `RewardUnit += 'crypto'` + asset named via existing `rewardPrograms` pattern (program "Crypto.com", asset "CRO") |
| **4. Caps** | Spend eligible for the reward | Bitget: up to 20% **capped at $800**. Gnosis Pay: per-tier **weekly** spend cap (e.g. 3% tier → first $500/week). Crypto.com: monthly caps per tier | **PARTIAL** — `monthlySpendingCap` + `fallbackRate` exist on `RewardRule`, but express only a **monthly** window. Weekly caps need normalization (×~4.33) or a cap-period field. See pitfall below |
| **5. Funding / wallet constraints** | How the card is loaded + who can hold it | Gnosis Pay: fund with stablecoin on Gnosis Chain (USDCe/EURe/GBPe), **self-custodial**. Crypto.com/Bitget/Wirex: custodial app balance. All: KYC + regional eligibility (HKID) | **NO** — `fundingOptions` (display-only, crypto subset) + `hkEligible` boolean |

### Concrete card profiles (for schema validation, not for data entry)

- **Crypto.com Visa** — staking-gated tiers. Lock CRO to unlock a fixed cashback %: ~$400→1%, ~$4k→2%, $50k→4%, $500k→5% (+15% travel), $1M→8%. Reward asset = **CRO (volatile)**. Now also has a subscription path (Pro $29.99/mo → 3%). *This is the canonical "staking gates the tier" case → maps to `minStaking` on each tier's rule.*
- **Gnosis Pay** — **holding**-gated (NOT locked): hold ≥0.1 GNO→1%, 1→2%, 10→3%, 100→4%, +1% OG-NFT boost →5%. **Per-tier weekly spend cap.** Reward asset = **GNO (volatile)**, airdropped weekly. Spend funded by stablecoin on-chain. *Tests the "hold not stake" + weekly-cap edge.*
- **Wirex** — holding-gated in **WXT** (platform token), up to 8%, 0% FX. Available in HK via 35-country coverage. *Same shape as Gnosis; different asset.*
- **Bitget Card** — up to **20% capped at $800**, virtual card live in APAC. Reward likely promotional/tiered. *Tests the hard monetary cap → `monthlySpendingCap`.*
- **HashKey × Visa (HK-native)** — HK licensed-exchange card, up to **4%**, rewards **auto-converted monthly to HKD vouchers**. *The cleanest HK-eligible case AND the easiest to value (voucher ≈ HKD 1:1). Strong candidate for first crypto card entered.*
- **RedotPay / UPay** — named as relatively obtainable by HK residents; verify at source.

### What CardGPT must model faithfully — schema implications (informs downstream schema work)

1. **`cardType: 'credit' | 'crypto' | 'prepaid'`** — required, one-line backfill of the 11 existing cards to `'credit'`. Enables directory type-filter and lets the engine treat crypto distinctly. (Decided; DEC in exploration note.)
2. **`RewardUnit += 'crypto'`, asset named via `rewardPrograms`** — without this a crypto reward can't be expressed at all.
3. **`RewardCondition.minStaking { amount, asset }`** (rule-level) — a tiered card = N rules, each gated on a different `minStaking`, structurally identical to how `minMonthlySpending` already gates a rule. Covers axes 1+2. Do **not** invent a card-level `stakingRequirement`.
4. **Crypto→HKD valuation (engine + config, NOT a card field)** — THE structural change. The recommender ranks by **net HKD value**; a CRO/GNO/WXT reward must resolve to HKD to rank against a cashback card. MVP = a **static, manually-maintained rate per asset** (config, hand-updated). Stablecoin/voucher assets are ~1:1 (trivial); native tokens are volatile (need a rate + a staleness warning). This latently affects miles/points too — scope deliberately.
5. **`hkEligible` boolean** — the directory-vs-recommender switch. Directory shows all; recommender ranks only `hkEligible`. Must land **before** crypto cards enter the recommender corpus, or a non-obtainable global card surfaces as a "recommendation."
6. **Cap period** — decide whether to normalize weekly caps (Gnosis) into the existing monthly `monthlySpendingCap`, or add a `capPeriod`. Normalizing is cheaper and accurate enough for ranking.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes / Dependencies |
|---------|--------------|------------|----------------------|
| **Data page: browsable list of all cards** | Every comparison site (MoneyHero, MoneySmart, ranked.plus) opens with a full browsable list | MEDIUM | Reads existing `getAllCardsAsync`. No new data layer. Shows all cards incl. non-`hkEligible` |
| **Key attributes visible in list row** | Users scan headline rate, annual fee, network, issuer, type without clicking | LOW–MEDIUM | "Headline best rate" is **derived** from reward rules via `calculateReward` — no new field (per note) |
| **Filter by card type & issuer** | Core of MoneyHero/MoneySmart UX ("cashback / air miles / crypto / by bank") | MEDIUM | Depends on `cardType` + existing `tags`/`issuer`. Type filter is the crypto category's main payoff |
| **Sort (by headline rate, annual fee)** | Expected on any directory | LOW | Client-side sort over the derived headline rate |
| **Card detail view** | Full reward rules, fees, T&C link, apply CTA — the "learn more" destination | MEDIUM | Renders existing `rewards[]`, `fees`, `termsUrl`. Crypto cards additionally show staking tiers + `fundingOptions` |
| **Search** | Basic find-by-name | LOW | Client-side filter |
| **Apply CTA on directory + detail** | The monetization surface; users expect an obvious "apply" path | LOW | Populate existing `applyUrl`; conditional render (already referral-aware) |
| **Advertiser / affiliate disclosure** | Legally/ethically table-stakes for any card-comparison site (MoneyHero & MoneySmart both disclose) | LOW | Bilingual (en/zh-HK). Must appear wherever apply links do: recommender results, directory, detail, research |
| **Research page: ≥1–2 evergreen explainers + a methodology page** | A "research" surface that's empty reads as unfinished; "how we rank" builds trust + SEO | LOW (eng) / MEDIUM (content) | Static MDX/markdown. Engineering is cheap; the **content is the cost**. Bilingual |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes / Dependencies |
|---------|-------------------|------------|----------------------|
| **Unified credit + crypto directory** | MoneyHero = HK credit only; ranked.plus = crypto/neobank only. CardGPT covers **both in one HK-framed directory** | MEDIUM | Enabled by `cardType`. This is the milestone's distinctive position |
| **Per-transaction recommender deep-linked to directory** | Directory sites give static "best cards"; CardGPT answers "best card *for this purchase*" and links each result to its detail page | LOW | Deep-link recommender result → card detail. Reuses existing engine |
| **Crypto cards ranked by real net HKD value** | Most crypto-card content is unranked listicles; net-value ranking (after volatile-asset valuation) is genuinely differentiated | HIGH | **Hard dependency on the crypto→HKD valuation engine work.** This is the milestone's riskiest item |
| **Crypto-card education (staking tiers, holding vs locking, funding)** on Research page | Crypto reward mechanics confuse users; a clear bilingual explainer is high-value + SEO magnet | LOW (eng) / MEDIUM (content) | Static content; leverages the mechanics captured above |
| **Side-by-side compare (2–4 cards)** | MoneyHero/MoneySmart offer it; feels premium | MEDIUM | Client-side selection + comparison layout. Reuses derived attributes. **Defer past MVP** |
| **Ranked.plus-inspired theme refresh (THI-176)** | Modern look lifts perceived quality of the whole tool | MEDIUM | Tailwind v4 tokens already in `globals.css`; a re-skin, not a re-architecture |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Static S/A/B tiers or a global ranking** | ranked.plus has them; look authoritative | CardGPT's ranking is **per-transaction** — a static tier misrepresents it. Already decided against | Keep ranking per-purchase; directory is unranked/browsable |
| **Ranking cards by affiliate commission** | Maximizes short-term revenue | Destroys the net-value-to-user integrity that is CardGPT's whole moat; users notice | Always rank by net value to user; monetize only via which links exist, never the order |
| **Full country geo-matrix (ranked.plus style)** | Crypto cards vary by country | CardGPT is HK-only; a matrix is dead complexity | Single `hkEligible` boolean |
| **Adoption/volume metrics (users, processed volume)** | ranked.plus's ranking basis | Irrelevant once tiers are dropped; unmaintainable secondhand data | Skip entirely |
| **User accounts / save-favorites / portfolio** | "Let me track my cards" | Breaks the no-login architecture (PRD constraint); large scope | Stay stateless; users re-query freely |
| **Full CMS/blog engine + comments for Research** | "We'll publish lots of articles" | Over-engineering; invites spam/moderation | Static MDX files in-repo; version-controlled |
| **Live crypto price feeds at launch** | "Valuations should be real-time" | Volatile token prices + API deps + failure modes; over-scoped for MVP | Static manually-maintained rate per asset + staleness warning; upgrade later |
| **Cloaked/hidden affiliate links** | Higher CTR | Trust + disclosure-norm violation on a finance site | Transparent CTA + clear disclosure |

---

## Feature Dependencies

```
cardType (required + backfill)
    └──enables──> Data-page type filter
    └──enables──> Crypto category (directory display)

RewardUnit += 'crypto' + asset via rewardPrograms
    └──requires──> Crypto→HKD valuation (engine + config)
                       └──enables──> Crypto cards ranked in recommender by net value

hkEligible (boolean)
    └──gates──> Crypto cards entering the recommender corpus  [MUST precede it]
    └──switch──> Directory shows all · Recommender ranks hkEligible only

RewardCondition.minStaking {amount, asset}
    └──expresses──> Crypto tiered rewards (Crypto.com / Gnosis / Wirex)

applyUrl population ──enables──> Affiliate monetization
    └──requires──> Advertiser/affiliate disclosure (parallel, non-optional)

Directory display  ──decoupled from──> Crypto→HKD valuation
    (a crypto card can be SHOWN with raw attributes without being VALUED)
```

### Dependency Notes

- **Directory is decoupled from valuation; the recommender is not.** A crypto card can appear on the Data page (raw rate, asset, fees) with **no** HKD valuation. It only needs valuation to be *ranked* in the recommender. This lets the Data page + crypto display ship ahead of the engine work — a natural phase split.
- **`hkEligible` must precede crypto-in-recommender.** Without the gate, importing the full global set (DEC-DATA-001) leaks non-obtainable cards into recommendations.
- **Crypto→HKD valuation is the critical-path, highest-risk item.** It's engine logic + config, latently touches miles/points, and blocks the "crypto ranked by net value" differentiator.
- **Affiliate rail has zero engine dependency** — pure data (`applyUrl`) + UI (CTA + disclosure). Can ship independently, earliest.
- **Blocked upstream:** crypto card *data* is blocked on primary-source sourcing (RQ-001) — do NOT copy ranked.plus records (DEC-DATA-001).

---

## MVP Definition

### Launch With (v1.1)

- [ ] `cardType` field (required) + one-line backfill of 11 cards → `'credit'` — unlocks everything
- [ ] Data page: full list + type/issuer filter + sort + search + card detail — the directory core
- [ ] `RewardUnit += 'crypto'` + asset naming via `rewardPrograms` — express crypto rewards at all
- [ ] `RewardCondition.minStaking {amount, asset}` — express tiered crypto rewards
- [ ] `hkEligible` boolean + recommender gate — protect recommendation quality
- [ ] Crypto→HKD static valuation config + engine wiring — make crypto rank meaningfully (start with HashKey vouchers + a stablecoin card = easy 1:1 cases to validate the pipeline)
- [ ] `applyUrl` population + bilingual advertiser/affiliate disclosure — the monetization
- [ ] Research page shell + methodology ("how CardGPT ranks") + 1 crypto explainer
- [ ] ranked.plus-inspired theme refresh (THI-176)

### Add After Validation (v1.x)

- [ ] Side-by-side compare (2–4 cards) — once directory usage proves demand
- [ ] `fundingOptions` display for crypto cards — when crypto card count justifies it
- [ ] More Research articles ("best cashback card in HK", "what is an FX fee", crypto glossary) — SEO-driven, add over time
- [ ] Cap-period handling for weekly-capped crypto cards (if a weekly-cap card is added and monthly normalization proves too lossy)

### Future Consideration (v2+)

- [ ] Live crypto price feeds replacing the static rate — when volatility mispricing becomes a real complaint
- [ ] Full cross-unit conversion for miles↔cash (still deferred; crypto→HKD is the minimal opening)
- [ ] Subscription / Pro tier (THI-41 — explicitly out of scope this milestone)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `cardType` + backfill | HIGH | LOW | P1 |
| Data page (list/filter/sort/search/detail) | HIGH | MEDIUM | P1 |
| `hkEligible` gate | HIGH (protects core) | LOW | P1 |
| crypto `RewardUnit` + asset naming | HIGH | LOW | P1 |
| `minStaking` on `RewardCondition` | HIGH | LOW–MEDIUM | P1 |
| Crypto→HKD valuation (engine + config) | HIGH | HIGH | P1 (critical path, risky) |
| `applyUrl` population + disclosure | HIGH (revenue) | LOW | P1 |
| Research shell + methodology + 1 explainer | MEDIUM | LOW (eng) | P1 |
| Theme refresh (THI-176) | MEDIUM | MEDIUM | P2 |
| Recommender→detail deep-link | MEDIUM | LOW | P2 |
| Side-by-side compare | MEDIUM | MEDIUM | P2 |
| `fundingOptions` display | LOW–MEDIUM | LOW | P3 |
| More Research articles | MEDIUM (SEO) | MEDIUM (content) | P3 |
| Live price feeds | LOW (now) | HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | MoneyHero / MoneySmart (HK credit) | ranked.plus (global crypto/neobank) | CardGPT v1.1 approach |
|---------|-----------------------------------|-------------------------------------|-----------------------|
| Scope | HK credit cards | Global crypto/neobank cards | **Both, HK-framed** (`hkEligible` gate) |
| Primary view | Filterable list + "best X" pages | Data browser + geo map + research hub | Home = **per-transaction recommender**; Data = browsable directory |
| Ranking basis | Editorial "best deals" | **Adoption/volume tiers** | **Net HKD value per transaction** (no static tiers) |
| Filters | Type, issuer, benefit | Country matrix, card params | Type (incl. crypto), issuer — no geo matrix |
| Compare | Side-by-side | Table browser | Deferred to v1.x |
| Research | "Best card" listicles + guides | Research hub | Methodology + crypto explainers (bilingual) |
| Monetization | Affiliate — paid only on apply/purchase | (no clear affiliate/license) | Affiliate via `applyUrl`; **never rank by commission** |
| Disclosure | Explicit advertiser disclosure | Weak/absent | Explicit bilingual disclosure (table-stakes) |

**Affiliate mechanics (both HK comparison sites):** compensated only when a user applies/purchases via the outbound link — the Apply CTA click → application is the conversion event. Best practice observed: prominent CTA button, opens issuer site in a new tab, clear disclosure, and (worth adding) outbound-click tracking so conversion can be reasoned about. CardGPT already conditionally renders the CTA "only when a referral link is available" (`card.ts:268`), so this is a **populate-the-links + add-disclosure** job, not new architecture.

---

## Sources

- Crypto.com Visa tiers/staking — [Crypto.com Cards](https://crypto.com/us/cards), [Crypto.com Help: Level Up Rewards](https://help.crypto.com/en/articles/12017612-level-up-rewards-and-benefits), [Forbes Advisor review](https://www.forbes.com/advisor/credit-cards/crypto-com-rewards-visa-review/), [Skrumble review](https://skrumble.com/crypto-cards/crypto-com-visa-review/) — HIGH
- Gnosis Pay holding-gated GNO cashback + weekly caps — [Gnosis Pay rewards](https://gnosispay.com/rewards), [GNO Cashback How It Works](https://gnosispay.zendesk.com/hc/en-us/articles/33285413664404-GNO-Cashback-How-It-Works), [spendnode](https://www.spendnode.io/crypto-cards/gnosis-pay-card/) — HIGH
- HK-available crypto cards (Wirex/Bitget/HashKey/RedotPay/UPay) — [spendnode HK](https://www.spendnode.io/crypto-cards/country/hong-kong/), [cashbackisl HK guide](https://www.cashbackisl.com/en/hk-crypto-card-comparison-2/), [Bitget Card](https://www.bitget.com/cards/landing), [HashKey×Visa launch (crypto.news)](https://crypto.news/hashkey-visa-launch-hong-kong-credit-card-with-up-to-4-rewards/) — MEDIUM (per-card HK eligibility shifts fast; verify per RQ-001)
- Directory/affiliate UX — [MoneyHero all cards](https://www.moneyhero.com.hk/en/credit-card/all), [MoneySmart HK](https://www.moneysmart.hk/en/credit-cards) — HIGH
- Internal: `src/types/card.ts` schema, `.planning/notes/ranked-plus-directory-and-crypto-expansion.md`, `.planning/research/questions.md` (RQ-001), PROJECT.md (DEC-DATA-001, DEC-SCOPE-001)

---
*Feature research for: HK card directory + crypto expansion + affiliate monetization*
*Researched: 2026-07-16*
