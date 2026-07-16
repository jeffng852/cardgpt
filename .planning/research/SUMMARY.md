# Project Research Summary

**Project:** CardGPT — v1.1 milestone (Card Directory & Crypto Expansion)
**Domain:** HK bilingual client-side card-reward recommender → browsable multi-category (credit + crypto/neobank) card directory with affiliate monetization
**Researched:** 2026-07-16
**Confidence:** HIGH (code-grounded engine/data/i18n findings) / MEDIUM (per-card crypto HK-eligibility, and the compliance posture — moves fast, not legal advice)

## Executive Summary

CardGPT v1.1 is a **subsequent, additive milestone on a deployed product**, not a greenfield build. The Home per-transaction recommender stays exactly as-is; everything new is additive: a browsable Data page (directory), a Research (editorial) page, a crypto-card category, affiliate monetization on the existing `applyUrl` rail, and a ranked.plus-inspired theme refresh (THI-176). The single most important finding across all four research streams is that **v1.1 needs zero new runtime dependencies** — the existing stack (Next.js 16, React 19, Tailwind v4, TypeScript strict, next-intl, Upstash Redis) covers every feature. The only genuinely new *artifact* is a small static crypto→HKD rate table and a schema/engine change. Nearly all "obvious" libraries (data-grid, affiliate SDK, CMS, live price feed, FX library, state manager) are traps to be actively refused.

The four research streams converge on one structural throughline: **the crypto→HKD valuation change is the critical path**, and it is not a field addition — it is engine logic that forces a latent, pre-existing bug into the open. Today `calculateNetValue = rewardAmount − fees` compares raw numbers across `cash`/`miles`/`points` with **no unit conversion** (so "2 miles" and "$2 cash" rank equal). Crypto is a fourth incompatible unit poured into a comparator that already cannot compare three. This valuation phase carries **three coupled decisions that must be explicit success criteria**: (a) a **rate-staleness fail-safe** (a missing/zero/stale rate must degrade to a visible "value unavailable / as-of <time>" state, never a silent 0 or 1 that still ranks #1); (b) **cross-unit normalization vs. honest unit-segmented results** (normalize to HKD, or keep the existing per-unit tabs and add a crypto segment — never silently rank raw amounts across units); and (c) the **staking base-tier default** — because the proposed `minStaking` mechanism reuses `minMonthlySpending`, which is a documented no-op ("assume the condition is met"). Copying that pattern would apply every crypto card's *top* staking tier to *every* user, systematically over-valuing crypto cards. The conservative decision — value at the base, un-staked tier — must be made *before* writing the evaluation.

Three further cross-cutting rules govern safe implementation, and they are ordering constraints, not polish. **`hkEligible` must be enforced INSIDE `recommendCards()` (fail-closed: `undefined`⇒eligible for the 11 legacy cards, new global cards must set `false`) and must land in the same phase that imports the global card set** — importing the global set before the gate exists is the dangerous ordering that leaks unobtainable cards into recommendations. **`RewardUnit += 'crypto'` is an 8-site type fan-out AND a runtime crash** (`groupByRewardUnit` pushes onto an undefined `grouped['crypto']` key) — not a one-line change; `tsc --noEmit` catches the typed sites but the index-access crash must be audited by hand. **Redis is production truth**, so `cardType`/`hkEligible` backfills are a two-write operation (edit `cards.json` *and* run a merge-aware Redis script), and the bulk crypto seed must be **merge-aware, never `init-redis`** (which clobbers Redis from static JSON, discarding live admin edits). Finally, **compliance is a real pre-deploy release gate** alongside THI-236: the SFC treats HK-targeted, Chinese-language, HKD-denominated crypto content as active marketing, so affiliate + crypto disclosure must be bilingual, conspicuous, before the CTA, and ranking must never reorder by commission — and note `loadCards` currently *drops* cards without an `applyUrl`, so "recommendable" must be decoupled from "has affiliate link."

## Key Findings

### Recommended Stack

The headline stack finding is a refusal: **v1.1 ships on `package.json` as-is, zero new runtime deps.** Every new feature is buildable with what's installed, and adding a library would be the exact "architecture ceremony" the owner rejects. See [STACK.md](STACK.md).

**Core technologies (all existing):**
- **Static crypto→HKD rate table** (new *config*, not a package): a `Record<string, number>` of ~5–10 `asset→HKD` rates in `src/lib/engine/valuation.ts` — ranking is insensitive to sub-percent crypto drift; a live client-side price feed would put a third-party call on the sub-1s ranking path for freshness the ranking doesn't need.
- **Native React + Tailwind v4** for the Data page — corpus is capped <100 cards, so `useState` + `Array.filter/sort` beats any data-grid library.
- **Plain React + next-intl** for the Research page — bilingual by the same mechanism as the rest of the app; MDX/CMS deferred (MDX doesn't integrate with next-intl and forces per-locale file duplication).
- **Existing `applyUrl` + a subid/UTM convention** for affiliate — networks issue tracking *URLs*, not SDKs; render `rel="sponsored nofollow noopener"`.
- **Tailwind v4 `@theme inline` tokens + next-themes** for the theme refresh — a re-skin, not a re-architecture.
- **Optional: `vitest`** (dev-only) — not a feature dep, but this is the first milestone to touch engine math since GSD adoption, and the "no test runner" gap (OPEN-008) makes the new valuation logic otherwise unverifiable.

### Expected Features

See [FEATURES.md](FEATURES.md). Crypto reward mechanics vary on five axes; the existing `RewardRule` model already covers three, and the two it doesn't (reward *asset* naming, and *staking-gated tiers*) are exactly the proposed additions.

**Must have (table stakes):**
- Data page: full browsable list + key attributes per row + filter (type/issuer) + sort + search + card detail.
- `cardType` (required, backfill 11 cards → `'credit'`) — unlocks the type filter and the crypto category.
- `hkEligible` gate — directory shows all; recommender ranks only eligible.
- `RewardUnit += 'crypto'` + asset naming via `rewardPrograms`.
- `RewardCondition.minStaking {amount, asset}` — express tiered crypto rewards.
- Crypto→HKD static valuation config + engine wiring (start with HashKey vouchers + a stablecoin card = easy 1:1 cases to validate the pipeline).
- `applyUrl` population + **bilingual advertiser/affiliate disclosure**.
- Research page shell + methodology ("how CardGPT ranks") + ≥1 crypto explainer.

**Should have (competitive differentiators):**
- Unified credit + crypto directory (MoneyHero = HK credit only; ranked.plus = global crypto only; CardGPT does both, HK-framed).
- Crypto cards ranked by real net HKD value — differentiated, but highest-risk (hard dependency on the valuation engine).
- Recommender→detail deep-link.
- ranked.plus-inspired theme refresh (THI-176).

**Defer (v1.x / v2+):**
- Side-by-side compare; `fundingOptions` display; more Research articles; cap-period handling for weekly-capped crypto cards; live price feeds; full miles↔cash normalization; Pro/subscription tier (THI-41, out of scope).

**Anti-features (actively refuse):** static S/A/B tiers or global ranking; ranking by affiliate commission; full country geo-matrix; user accounts/portfolio; full CMS/blog for Research; live price feeds at launch; cloaked affiliate links.

### Architecture Approach

See [ARCHITECTURE.md](ARCHITECTURE.md). This is an integration study — every recommendation names the existing seam it plugs into. Three patterns govern the work: **additive schema with TypeScript-strict as the migration guardrail** (adding `'crypto'` surfaces every hardcoded three-unit site as a compile error — treat the error list as the checklist); **inject the valuation rate, keep the engine pure** (the rate table is data passed as a prop from the server component, exactly like `cards` — no fetch inside the client engine, fiat stays at identity rate `1` so existing rankings are byte-identical); and **gate the recommender, not the store** (the `hkEligible` filter lives inside `recommendCards()` as the single choke point; the Data page reads a different, ungated path).

**Major components:**
1. `src/types/card.ts` — `+cardType` (required), `+hkEligible?`, `+fundingOptions?`, `RewardUnit += 'crypto'`, `RewardRule.rewardAsset?`, `RewardCondition.minStaking?`, `RewardPrograms.crypto?`.
2. `src/lib/engine/valuation.ts` (**new**) — `toHkd(amount, unit, asset, table)` + static default rate table; injectable so static→Redis→live-feed is a data change, not an engine change.
3. `src/lib/engine/recommendCards.ts` + `calculateReward.ts` (**modified**) — `hkEligible` gate, widened unit unions, HKD-equivalent net value.
4. `src/app/[locale]/data/` + `DataClient` (**new**) — directory, `force-dynamic`, `getAllCardsAsync()`, client-side filter, no engine call.
5. `src/app/[locale]/research/` (**new**) — editorial; static unless it reads card data.
6. Merge-aware seed script + `cardType`/`hkEligible` backfill scripts (**new**) — one-shot Redis writes, out of the request path.

### Critical Pitfalls

Top items from [PITFALLS.md](PITFALLS.md) (9 total, all code-grounded):

1. **`hkEligible` leak** — gate inside `recommendCards()` (fail-closed), landing in the **same phase that imports the global set**. Two named paths: `loadRecommendableCards()` (gated) vs `loadDirectoryCards()` (ungated). Guard test: a global-only card must never be returned by `recommendCards()`.
2. **Stale crypto rate corrupts ranking** — missing/zero/NaN rate must fail *safe and loud* (exclude + "value unavailable," or flag "estimated, as of <time>"), never silently become 0 or a frozen number. Stamp every crypto valuation with as-of; keep the rate Redis-updatable without a deploy.
3. **Cross-unit raw-number comparison** — normalize all units to HKD, or segment results by unit (add a crypto tab). Record the decision. Never silently rank raw amounts across units.
4. **`minStaking` no-op over-valuation** — do NOT reuse `minMonthlySpending`'s "assume met" path without deciding gate semantics. Default to base (un-staked) tier; show top tiers as conditional.
5. **`RewardUnit += 'crypto'` runtime crash** — `groupByRewardUnit` throws on undefined `grouped['crypto']`. `tsc --noEmit` + manual index-access audit + a crypto display branch in `formatReward`/`getRewardUnitName`.
6. **Bulk-data trust** — label directory provenance (source + last-verified + HK-availability) so accepted lower-accuracy data (DEC-DATA-001) doesn't read as authoritative.
7. **Caching regression** — every new card-reading surface needs `export const dynamic = 'force-dynamic'` + async repository variants (repeats the historically painful CDN-caching fight).
8. **i18n gaps** — `en.json` and `zh-HK.json` in one commit; add a key-parity check; translate crypto/provenance/disclosure vocabulary.
9. **Affiliate + crypto disclosure** — bilingual, conspicuous, before the CTA; ranking neutral to affiliate presence; decouple "recommendable" from "has `applyUrl`" (fix `loadCards.ts:49-52`). Pre-deploy compliance release gate (SFC active-marketing exposure).

## Implications for Roadmap

The four streams converged on a natural six-phase clustering. Phases 1–3 are the critical path and tightly coupled by dependency order; phases 4–6 are lower-risk and partly parallelizable. **First prod deploy is gated on THI-236 (admin auth)** — phases 1–5 are all buildable and testable locally without it.

### Phase 1: Schema + Type Fan-out + Backfills
**Rationale:** Foundation — everything compiles against this, and the type change is the first domino.
**Delivers:** `card.ts` schema additions; `RewardUnit += 'crypto'` with all 8 fan-out sites fixed (incl. the `groupByRewardUnit` runtime-crash audit); `cardType`/`hkEligible` backfills as a **two-write** operation (`cards.json` + merge-aware Redis script).
**Addresses:** `cardType`, crypto `RewardUnit` + asset naming, `minStaking` schema, `hkEligible` field.
**Avoids:** Pitfall 5 (union runtime crash); the "edit only `cards.json`, forget Redis" backfill trap.

### Phase 2: Valuation Engine + `hkEligible` Gate
**Rationale:** The critical-path, highest-risk item; must precede any global import so the gate exists first.
**Delivers:** `valuation.ts` (injectable static rate table + `toHkd`); HKD-equivalent `calculateNetValue`; `hkEligible` gate inside `recommendCards()`; rate-staleness fail-safe; base-tier staking default.
**Uses:** static rate config (STACK.md), inject-the-rate + gate-the-recommender patterns (ARCHITECTURE.md).
**Success criteria (the three coupled decisions):** (a) rate-staleness fail-safe visible + as-of stamped; (b) cross-unit normalize-vs-segment decision recorded and applied; (c) staking valued at base tier un-staked. **Regression test:** identity fiat rates ⇒ existing 11-card rankings byte-identical.
**Avoids:** Pitfalls 1, 2, 3, 4, 7 (rate fetch caching).

### Phase 3: Bulk Crypto Seed + Affiliate / Disclosure
**Rationale:** Depends on Phase 1 schema (cards must validate) and Phase 2 gate (global cards must be gated *before* they land). Blocked upstream on primary-source card sourcing (RQ-001).
**Delivers:** merge-aware seed script (read Redis → append by new id → write back, **never `init-redis`**); `applyUrl` population; bilingual affiliate + crypto disclosure; decouple "recommendable" from "has `applyUrl`."
**Avoids:** Anti-pattern 1 (`init-redis` clobber), Anti-pattern 2 (bulk through the pending queue), Pitfall 9 (disclosure).

### Phase 4: Data Page (Directory)
**Rationale:** Depends on schema + seeded data to be meaningful; lower-risk, read-only.
**Delivers:** `data/page.tsx` (`force-dynamic`, `getAllCardsAsync`) + `DataClient` (filter/sort/search/detail); provenance + HK-availability labeling; derived headline rate.
**Avoids:** Pitfall 6 (bulk-data trust), Pitfall 7 (caching), Pitfall 8 (i18n).

### Phase 5: Research Page
**Rationale:** Independent editorial surface; can run parallel to Phase 4.
**Delivers:** Research shell + methodology page + ≥1 crypto explainer, bilingual, plain React + next-intl.
**Avoids:** Pitfall 8 (i18n parity).

### Phase 6: UI / Theme Refresh (THI-176)
**Rationale:** Last — spans Home + Data + Research; pure styling once the surfaces exist.
**Delivers:** ranked.plus-inspired re-skin via Tailwind v4 tokens + next-themes.

### Phase Ordering Rationale
- **Dependency-driven:** schema (1) → engine/gate (2) → data+affiliate (3) → directory UI (4). Directory is *decoupled from valuation* (a crypto card can be shown with raw attributes without being valued), so 4 depends only on schema+data, not on the engine — but 3 must not import global cards before the 2 gate exists.
- **Risk-front-loaded:** the one structural, highest-risk item (valuation) is Phase 2, isolated with its own success criteria and a byte-identical fiat regression test.
- **Parallelizable tail:** Phases 4/5 are low-risk and can overlap; Phase 6 is styling-only and last.
- **Deploy gate:** THI-236 (admin auth) blocks the first prod deploy; all build/test work for 1–5 proceeds locally.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-plan-phase --research-phase`):
- **Phase 2 (valuation engine):** the three coupled decisions (staleness fail-safe design, normalize-vs-segment, staking default) are genuine design forks touching the client engine.
- **Phase 3 (seed + affiliate/disclosure):** blocked on primary-source crypto card data (RQ-001, per-card HK eligibility shifts fast); the SFC/affiliate compliance posture is MEDIUM-confidence, operator/legal-review, not self-clearable in code.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (schema/fan-out):** mechanical `tsc`-driven checklist; the 8 sites are enumerated in ARCHITECTURE.md.
- **Phase 4 (Data page):** native React + Tailwind over <100 rows.
- **Phase 5 (Research page):** plain React + next-intl.
- **Phase 6 (theme refresh):** Tailwind token work; a UI-spec pass (not research) is the right tool.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Grounded in a direct `package.json` + source read; the "zero new deps" verdict is decisive. |
| Features | MEDIUM-HIGH | Directory/affiliate patterns HIGH; crypto reward *mechanics* HIGH on structure; per-card HK eligibility MEDIUM (needs primary-source verification — RQ-001). |
| Architecture | HIGH | Direct read of the engine, loader, repository, schema, route tree; every seam and the 8 fan-out sites are file:line confirmed. |
| Pitfalls | HIGH (code) / MEDIUM (compliance) | Engine/data/i18n pitfalls verified against `src/` 2026-07-16; SFC/affiliate compliance is MEDIUM (moves; not legal advice). |

**Overall confidence:** HIGH on *how to build it safely*; MEDIUM on *the external crypto data and the compliance posture* — both isolated to Phase 3 and flagged for operator/legal review.

### Gaps to Address

- **Primary-source crypto card data (RQ-001):** which HK-available crypto cards exist and their real reward structures. Blocks Phase 3 data entry. Handle: source from primary issuer/aggregator docs before seeding; DEC-DATA-001 permits lower-accuracy directory data *only* with provenance labeling.
- **SFC / affiliate compliance posture:** whether promoting crypto cards to HK retail with affiliate inducement is "active marketing." Handle: operator/legal review as a pre-deploy release gate; keep crypto copy factual, no yield/return/referral-bonus framing. **Public-repo reminder:** compliance/exploit specifics go in Linear, never in `.planning/`.
- **Cross-unit decision (normalize vs. segment):** a real design fork — must be *decided* in Phase 2 planning and recorded.
- **Opportunistic schema debt (OPEN-001 taxonomy drift, OPEN-002 dead `RewardCap`):** live in `card.ts`; touching the schema is a natural moment to retire dead schema, but scope it as its own explicit decision — do not silently bundle.
- **No test runner (OPEN-008):** first engine-math milestone since GSD adoption; consider `vitest` to cover the new valuation logic.

## Sources

### Primary (HIGH confidence)
- Direct code read 2026-07-16: `src/types/card.ts`, `src/lib/engine/{recommendCards,calculateReward}.ts`, `src/lib/data/{cardRepository,redisStorage,loadCards}.ts`, `src/app/[locale]/page.tsx`, `src/app/api/admin/init-redis/route.ts`, `src/data/cards.json`, `messages/{en,zh-HK}.json` — ground truth per PROJECT.md.
- `.planning/PROJECT.md` (v1.1 milestone, DEC-DATA-001, DEC-SCOPE-001); `.planning/notes/ranked-plus-directory-and-crypto-expansion.md` (operator decisions); repo `CLAUDE.md`.
- CoinGecko API pricing + supported currencies (HKD supported, Demo free tier) — https://www.coingecko.com/en/api/pricing
- Involve Asia Sub ID / deeplink model (tracking URLs, no SDK) — https://involve.asia/blog/sub-ids-optimise-earnings/
- Next.js official MDX guide (App Router) — https://nextjs.org/docs/pages/guides/mdx

### Secondary (MEDIUM confidence)
- Crypto card mechanics (Crypto.com tiers/staking, Gnosis Pay holding + weekly caps, Wirex, Bitget, HashKey×Visa HK) — crypto.com/help, gnosispay.com, spendnode.io, crypto.news — HIGH on structure, MEDIUM on per-card HK eligibility (RQ-001).
- Directory/affiliate UX — MoneyHero, MoneySmart HK.
- Affiliate-disclosure norms (FTC "clear and conspicuous," financial-vertical strictness) — Termly, Post Affiliate Pro.

### Tertiary (LOW confidence / needs validation)
- HK SFC crypto/virtual-asset marketing posture — Norton Rose Fulbright, Charltons Quantum, Stephenson Harwood. Not legal advice; flag for operator/legal review before the crypto-promo deploy.

---
*Research completed: 2026-07-16*
*Ready for roadmap: yes*
