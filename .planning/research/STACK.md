# Stack Research

**Domain:** HK card-reward recommender — v1.1 additive milestone (card directory, crypto category, affiliate monetization, editorial page, UI refresh)
**Researched:** 2026-07-16
**Confidence:** HIGH

> **Scope note:** This is a *subsequent* milestone on a deployed app. The existing stack
> (Next.js 16.1.4, React 19.2.3, Tailwind v4, TypeScript 5 strict, next-intl 4.7, next-themes,
> Upstash Redis, @vercel/blob for images, @anthropic-ai/sdk, pdf-parse) is **not** re-evaluated
> here. This document answers only: *what does v1.1 need to add, and — more importantly — what
> should it refuse to add.*
>
> **Headline finding:** v1.1 needs **zero new runtime dependencies**. Every new feature is
> buildable with the stack already installed. The only genuinely new *artifact* is a small
> config file (a static crypto→HKD rate table) and a schema/engine change — not a package.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **(none new)** | — | All four v1.1 features | The existing stack covers the directory, the editorial page, affiliate links, and crypto valuation. Adding a dep here would be ceremony, not capability. See per-feature analysis below. |

### The four features and what each actually needs

#### 1. Crypto → HKD valuation → **static rate config in code (no dep, no live API)**

This is the one *structural* change (engine + a value table), and the research question is
"live price API vs static table." **Recommendation: static, manually-maintained rate table.**
Verdict is decisive, not a coin-flip:

- **The ranking is insensitive to crypto price precision.** The engine ranks cards by *net
  HKD value* of a reward. The gap between a 5% crypto-card reward and a 1% cashback card is
  huge relative to the intraday drift of CRO/USDC. A rate that is a few percent stale does not
  reorder the list. You need *approximately correct*, not *live*.
- **The engine runs client-side, on the sub-1-second critical path.** A live price feed would
  put a third-party network call (CORS, rate limits, key handling, failure modes) directly in
  front of the one thing CardGPT promises to do fast. That is a poor trade for cosmetic freshness.
- **The reward asset set is tiny and slow-moving.** Crypto cards reward in a handful of assets
  (CRO, USDC/stablecoins, occasionally BTC/ETH). A table of ~5–10 `asset → HKD` rates covers the
  whole corpus. USDC≈USD≈7.8 HKD is effectively a constant.
- **It generalizes the latent miles/points gap for free.** The note (`recommendCards.ts`) flags
  that net-value comparison across `miles`/`points` is already unprincipled. A single
  `rewardUnitValue: Record<string, number>` map (HKD per unit, keyed by unit *and* asset/program)
  is the minimal fix for *all* non-cash units, not just crypto. Model it as one config, consumed by
  `calculateNetValue`.

**Integration point:** `calculateNetValue()` in `src/lib/engine/calculateReward.ts` currently
returns `rewardAmount - fees` in raw units. Give it a `valuePerUnit` lookup (default `1` for
`cash`/HKD) so net value is always HKD-comparable. The table lives in `src/data/` (or `src/config/`),
is imported client-side, and is a one-line edit to refresh.

**If freshness is ever wanted later (explicitly NOT this milestone):** the clean upgrade is a
Vercel Cron → CoinGecko free **Demo** plan (HKD *is* a supported `vs_currency`; 10,000 calls/mo,
100/min, no cost) → write rates into Redis alongside card data → serve to the client with the card
payload. This keeps the third-party call **server-side and cached**, never on the client path. Do
not reach for this until someone actually complains the static numbers are stale.

#### 2. Affiliate monetization → **outbound URLs + a subid convention (no SDK, no library)**

Affiliate networks do not ship client SDKs you embed; they issue **tracking URLs**. The whole job
is *populating `card.applyUrl`* (which is already referral-aware, `card.ts:269`) and appending a
tracking parameter.

- **Involve Asia** (the relevant HK aggregator, runs the MoneyHero/MoneySmart-style card offers):
  you generate a **deeplink** in their dashboard; it returns a tracking URL. You can attach a
  **Sub ID** (their param for source attribution) to segment which surface/card drove the click —
  e.g. `?aff_sub=<card-id>` or `?sub_id=...`. That is a query-string convention on your side, not code.
- **Direct issuer / exchange referral programs** (e.g. a bank's own "refer a friend", Crypto.com's
  referral link): each is just a bespoke URL, sometimes with your referral code baked into the path
  or a `ref=` param. Same rail — paste into `applyUrl`.
- **All CardGPT has to build:** (a) put the right URL in each card record; (b) optionally a ~10-line
  helper that appends a subid/UTM so you can attribute clicks per card; (c) render the outbound
  `<a>` with `target="_blank"` and `rel="sponsored nofollow noopener"` (correct SEO/security
  hygiene for paid links). No package.

**Integration point:** the existing `applyUrl` field + the "Apply Here" CTA component. Schema is
unchanged (as the exploration note already concluded).

#### 3. Data page directory → **native React + Tailwind v4 (no data-grid library)**

- The corpus is **11 cards today, capped under 100 by the PRD.** Filter/sort/table over <100 rows
  is `useState` + `Array.filter/sort` + a Tailwind table/grid. This is genuinely trivial and adding
  a grid lib would be the exact "architecture ceremony" the owner rejects.
- Data-grid libraries (TanStack Table, ag-grid, MUI DataGrid) earn their weight at **thousands of
  rows with virtualization, column resizing, server-side pagination** — none of which apply here.
- Bilingual (en/zh-HK) rendering is already solved by next-intl; a grid lib would add a second
  i18n surface to reconcile.

**Integration point:** a new `/data` route (App Router), reading cards via the existing async
`cardRepository` (`getAllCardsAsync`), filtering client-side. The `hkEligible` flag is the
directory-vs-recommender switch — the directory shows all cards; the recommender keeps filtering to
`hkEligible`. "Best rate" per card is **derived** from existing reward rules, not stored.

#### 4. Research page → **plain React + next-intl for v1.1 (no MDX, no CMS)**

Editorial/explainer surface. Three candidates were weighed:

- **Plain React + next-intl (RECOMMENDED for v1.1).** Zero new deps, zero build config. Fits a
  *small* initial set of curated explainer articles. Long-form copy lives in next-intl message
  catalogs (or co-located TSX), so it is bilingual by the same mechanism as the rest of the app.
  Best match for "solo maintainer, simplicity."
- **MDX (`@next/mdx`) — defer.** Nice for markdown authoring, but: (a) it is a new package + a
  `next.config` wrapper + a required `mdx-components.tsx`; (b) it does **not** integrate with
  next-intl — bilingual means maintaining `article.en.mdx` **and** `article.zh.mdx` per piece, a
  duplication tax the message-catalog approach avoids. Only worth it if the Research page grows into
  a real markdown-authored blog. If adopted later, pin `@next/mdx` to the **Next.js major (16.x)**.
- **Redis-stored content — do not build.** It matches the "edit without deploy" admin pattern, but
  it requires building an editor UI / content schema for what is, in v1.1, a handful of static
  articles. That is a CMS project masquerading as a page. Explicitly out of scope.

**Integration point:** a new `/research` route with next-intl namespaces per article. No storage
change.

#### 5. ranked.plus-inspired UI / theme refresh → **existing Tailwind v4 tokens + next-themes**

Pure styling work. Tailwind v4's `@theme inline` tokens (already in `globals.css`) and the existing
next-themes light/dark toggle are the entire toolkit. No component library, no CSS framework swap.
(If shadcn/ui is ever considered, note it is copy-in components, not a runtime dep — but it is **not
needed** for a theme refresh and would import a design system you'd then fight. Skip.)

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **(none)** | — | — | v1.1 requires no supporting library. Every table below under "What NOT to Use" is a library that looks relevant and isn't. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **vitest** (optional, unrelated to features) | Test runner | Not a v1.1 feature dep, but the crypto valuation change touches the engine — the pre-existing "no test runner" gap (OPEN-008) makes engine changes unverifiable. Installing `vitest` is a cheap safety net *if* you want the new `valuePerUnit` logic covered. Purely optional; flagged because this milestone is the first to touch engine math since GSD adoption. |

## Installation

```bash
# Core feature work: nothing to install.
# v1.1 ships on the dependencies already in package.json.

# OPTIONAL — only if you want to test the new engine valuation logic:
npm install -D vitest

# OPTIONAL / FUTURE — only if the Research page becomes markdown-authored (NOT v1.1):
# npm install @next/mdx @mdx-js/loader @mdx-js/react   # pin @next/mdx to 16.x
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Static crypto→HKD rate table in code | CoinGecko **Demo** free API (HKD supported, 10k calls/mo, 100/min) via a **server-side Vercel Cron → Redis** cache | Only if static rates prove too stale in practice. Keep the call server-side + cached; never client-side on the ranking path. This is a later, optional hardening — not v1.1. |
| Static rate table | CoinMarketCap / Binance / exchange APIs | If you outgrow CoinGecko's free tier or need assets it lacks. No advantage for CardGPT's tiny, stablecoin-dominated asset set. |
| Native React + Tailwind table | `@tanstack/react-table` v8 (headless) | Only at thousands of rows needing virtualization/column-management. Corpus is capped <100 — never triggers. |
| Plain React + next-intl content | `@next/mdx` (16.x) | Only if the Research page becomes a real markdown-authored blog with many long-form posts and you accept per-locale file duplication. |
| Query-param subid on `applyUrl` | A click-tracking/attribution SDK or redirect service | Only if you need server-side click logging/fraud checks. For v1.1, network dashboards + Sub IDs cover attribution with zero code. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Client-side live crypto price feed** (CoinGecko/CMC called from the browser) | Puts a third-party network call, CORS, rate limits, and a key-exposure/failure surface directly on the sub-1s client ranking path — for freshness the ranking doesn't need. | Static `asset → HKD` table in `src/data`; optional server-side cron→Redis later. |
| **Any data-grid library** (TanStack Table, ag-grid, MUI DataGrid, react-data-grid) | Built for thousands of rows + virtualization. Corpus is <100. Pure overhead + a second i18n surface. | `useState` + `Array.filter/sort` + Tailwind. |
| **An affiliate SDK / link-cloaking package** | Affiliate networks issue tracking *URLs*, not embeddable SDKs. Nothing to install. | Populate `applyUrl`; append a Sub ID / UTM param; `rel="sponsored nofollow noopener"`. |
| **A CMS (Sanity, Contentful) or Redis-backed article editor** for the Research page | v1.1 has a handful of static explainer articles. A CMS/editor is a whole subproject for content that fits in next-intl catalogs. | Plain React + next-intl now; MDX later only if volume justifies. |
| **shadcn/ui or a component library** for the theme refresh | Imports a design system you then fight; the refresh is token/color work Tailwind v4 already does. | Tailwind v4 `@theme inline` tokens + next-themes (already installed). |
| **A state manager (Redux/Zustand/Jotai)** for directory filters | Filter/sort state is local component state. | React `useState`. |
| **A charting library** | No feature in v1.1 renders a chart. | — |
| **A currency/FX library** (dinero.js, currency.js) for the rate math | Reward valuation is one multiply-and-subtract; a money lib is overkill and adds a dep to the client bundle. | Plain number math in `calculateNetValue`, rounded at display. |

## Stack Patterns by Variant

**If crypto reward asset set stays small + stablecoin-heavy (expected):**
- Use the static rate table. Refresh manually at data-curation time (Data-Leona's remit).
- Because ranking is insensitive to sub-percent drift and USDC≈constant.

**If a live rate is later mandated:**
- Use Vercel Cron (already have cron capability on Vercel) → CoinGecko Demo free tier → Redis cache → serve with card payload.
- Because it keeps the third-party dependency server-side, cached, and off the client critical path — consistent with "server-side secrets/data only" and `force-dynamic` card routes.

**If the Research page grows past ~5–10 static articles into markdown-authored long-form:**
- Adopt `@next/mdx` pinned to the Next.js major, and accept per-locale `.mdx` files.
- Because at that volume markdown authoring beats message catalogs, and the duplication tax becomes acceptable.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@next/mdx@16.x` (if ever added) | `next@16.1.4`, `react@19.2.3` | Pin the MDX package to the **same major as Next.js**; App Router requires an `mdx-components.tsx` at project root and a `withMDX(nextConfig)` wrapper + `pageExtensions`. Verified against current Next 16 App Router MDX docs. |
| `vitest` (if added) | `typescript@5`, existing `__tests__/*.test.ts` | The two existing test files were written for a runner that was never installed; vitest can adopt them with minimal changes. |
| CoinGecko Demo API (if server-side cron added) | HKD as `vs_currency` | HKD confirmed in CoinGecko's supported `vs_currencies`; Demo plan = free, 10k calls/mo, 100/min — a daily cron is trivially inside limits. |

## Sources

- CoinGecko API pricing + supported currencies (Demo plan free tier, 100/min, 10k/mo, HKD supported) — https://www.coingecko.com/en/api/pricing , https://docs.coingecko.com/reference/simple-supported-currencies — HIGH
- Involve Asia Sub ID / deeplink tracking model (tracking URLs + Sub ID params, no SDK) — https://involve.asia/blog/sub-ids-optimise-earnings/ , https://involve.asia/blog/how-to-generate-link/ — HIGH
- Next.js official MDX guide (App Router `createMDX`/`withMDX`, required `mdx-components.tsx`) — https://nextjs.org/docs/pages/guides/mdx — HIGH
- Repo ground truth read 2026-07-16: `package.json`, `src/types/card.ts`, `src/lib/engine/calculateReward.ts` (`calculateNetValue` returns raw-unit `reward − fees`, no cross-unit conversion), `recommendCards.ts` — HIGH
- Exploration note `.planning/notes/ranked-plus-directory-and-crypto-expansion.md` (schema additions are additive; valuation is the one structural change) — HIGH

---
*Stack research for: CardGPT v1.1 — Card Directory & Crypto Expansion*
*Researched: 2026-07-16*
