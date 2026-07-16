# Architecture Research

**Domain:** CardGPT v1.1 — Card Directory & Crypto Expansion (integration into an existing Next.js 16 client-side recommender)
**Researched:** 2026-07-16
**Confidence:** HIGH (grounded in a direct read of `card.ts`, `recommendCards.ts`, `calculateReward.ts`, `cardRepository.ts`, `redisStorage.ts`, `loadCards.ts`, the `[locale]` route tree, and `cards.json`)

> This is a **subsequent-milestone** integration study, not a greenfield design. Every recommendation below names the exact existing seam it plugs into and flags new-vs-modified. The v1.1 milestone note's decisions (additive schema, static valuation, `hkEligible` gate) all check out against the code — with three concrete gotchas the note under-specifies: (1) the `RewardUnit` union has a hardcoded fan-out that TypeScript-strict will flag in ~8 places, (2) production card data lives in **Redis, not `cards.json`**, so any backfill/seed is a Redis write, and (3) the net-value comparison is **already unit-blind** today, which is exactly why crypto forces the valuation fix.

---

## Standard Architecture

### System Overview (current, with v1.1 additions marked ✚)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PUBLIC (src/app/[locale])                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐   ┌──────────────┐   ┌──────────────┐  ┌───────────┐ │
│  │  page.tsx │   │ ✚ data/      │   │ ✚ research/  │  │ privacy/  │ │
│  │ (Home =   │   │   page.tsx   │   │   page.tsx   │  │ terms/    │ │
│  │recommender)│  │ (directory)  │   │ (editorial)  │  │           │ │
│  └─────┬─────┘   └──────┬───────┘   └──────────────┘  └───────────┘ │
│  server comp     server comp (force-dynamic)      static / no-dynamic│
│        │ loadCards()     │ getAllCardsAsync()                        │
│        ▼                 ▼                                            │
│  ┌───────────────┐  ┌─────────────────┐                             │
│  │ HomeClient    │  │ ✚ DataClient    │  ('use client' — filtering) │
│  │ 'use client'  │  │   'use client'  │                             │
│  └──────┬────────┘  └─────────────────┘                             │
├─────────┼────────────────────────────────────────────────────────────┤
│         ▼  CLIENT-SIDE ENGINE (src/lib/engine)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ recommendCards   │→ │ calculateReward  │→ │ ✚ valuation.ts    │  │
│  │ (+ hkEligible ✚) │  │ (+ HKD-equiv ✚)  │  │ (asset→HKD table) │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                  DATA ACCESS (src/lib/data)                          │
│  ┌───────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │ loadCards()   │  │ cardRepository   │  │ redisStorage       │   │
│  │ active-only   │  │ getAllCardsAsync │  │ read/writeCards…   │   │
│  └───────┬───────┘  └────────┬─────────┘  └─────────┬──────────┘   │
│          └───────────────────┴──────────────────────┘              │
│                              ▼                                       │
├─────────────────────────────────────────────────────────────────────┤
│   STORES:  Upstash Redis (key 'cards' = prod truth)  ·  cards.json  │
│            (build-time fallback seed only)                           │
├─────────────────────────────────────────────────────────────────────┤
│   ADMIN (src/app/admin + /api/admin): CRUD · AI extract · pending    │
│   queue · init-redis  →  writeCardsToRedis()   [+ ✚ seed script]    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New / Modified in v1.1 |
|-----------|----------------|------------------------|
| `src/types/card.ts` | Domain schema (`CreditCard`, `RewardRule`, `RewardUnit`, `RewardCondition`, `RewardPrograms`) | **Modified** — additive fields + `RewardUnit += 'crypto'` |
| `src/lib/engine/recommendCards.ts` | Filter → calculate → sort by net value → tie-break | **Modified** — add `hkEligible` gate + widen unit unions + thread valuation |
| `src/lib/engine/calculateReward.ts` | Per-card reward math; `calculateNetValue = reward − fees` | **Modified** — net value must resolve to HKD-equivalent |
| `src/lib/engine/valuation.ts` | asset/unit → HKD rate lookup | **New** |
| `src/lib/data/loadCards.ts` | Active-card load path (Home) — Redis→static fallback | Unchanged (optionally add `hkEligible` prefilter) |
| `src/lib/data/cardRepository.ts` | `getAllCardsAsync` (all incl. inactive) — Data-page path | **Modified** — widen `validateRewardUnit` list only |
| `src/lib/data/redisStorage.ts` | Redis read/write of the `cards` key | Unchanged |
| `src/app/[locale]/data/page.tsx` + `DataClient` | Browse full global set, filter, no ranking | **New** |
| `src/app/[locale]/research/page.tsx` | Editorial surface | **New** |
| Bulk seed script / `init-redis` | One-time crypto/global corpus load into Redis | **New (merge-aware)** |

---

## Recommended Project Structure (additions only)

```
src/
├── app/[locale]/
│   ├── data/
│   │   └── page.tsx          # ✚ server comp, force-dynamic, getAllCardsAsync()
│   ├── research/
│   │   └── page.tsx          # ✚ server comp OR static; MDX/editorial content
│   └── page.tsx              # (unchanged) Home = recommender
├── components/
│   ├── DataClient.tsx        # ✚ 'use client' directory grid + filters
│   └── CardDirectoryCard.tsx # ✚ browse-view card cell (derives headline rate)
├── lib/
│   ├── engine/
│   │   └── valuation.ts      # ✚ asset→HKD rate table + toHkd() helper
│   └── data/
│       └── seedCrypto.ts     # ✚ (or scripts/seed-crypto.mjs) merge-into-Redis seed
├── types/
│   └── card.ts               # modified in place
└── scripts/
    └── backfill-cardtype.mjs # ✚ one-time: cardType='credit' on the 11, write Redis
```

### Structure Rationale

- **`data/` and `research/` live under `[locale]`** so next-intl routing and the en/zh-HK split come for free, matching `privacy/` and `terms/`. Use `@/i18n/routing`'s `Link`, not raw `next/link`.
- **`valuation.ts` sits inside `engine/`**, not `data/`, because it is engine logic (a pure function `toHkd(amount, unit, asset) → number`). Keeping the *rate values* as an injectable argument (see Pattern 2) means the module ships a static default table today and can be fed a Redis-served table later with zero engine changes.
- **Seed + backfill are scripts, not runtime code** — one-shot data operations that write Redis, kept out of the request path.

---

## Architectural Patterns

### Pattern 1: Additive schema, TypeScript-strict as the migration guardrail

**What:** Every crypto field is a new **optional** property or a new enum member. The 11 existing cards stay valid; unspecified fields default to `undefined` and read as "not a crypto card."

**Schema changes (in `card.ts`):**
```typescript
export type RewardUnit = 'cash' | 'miles' | 'points' | 'crypto';   // +crypto
export type CardType   = 'credit' | 'crypto' | 'prepaid';          // new

interface CreditCard {
  cardType: CardType;              // REQUIRED → forces the backfill (see below)
  hkEligible?: boolean;            // optional; undefined ⇒ treated eligible
  fundingOptions?: string[];       // optional; Data-page display, crypto subset
  // ...existing fields unchanged
}

interface RewardRule {
  rewardAsset?: string;            // only meaningful when rewardUnit==='crypto' (e.g. 'CRO','USDC')
  // ...
}

interface RewardCondition {
  minStaking?: { amount: number; asset: string };   // rule-level, mirrors minMonthlySpending
}

interface RewardPrograms {
  crypto?: RewardProgramInfo;      // name the asset, reusing the existing pattern
}
```

**When to use:** Whenever extending a schema that has live persisted records. Because `tsconfig` is `strict: true`, adding `'crypto'` to `RewardUnit` will surface **every** hardcoded `'cash' | 'miles' | 'points'` site at compile time — treat that error list as your modification checklist.

**Trade-offs:** Making `cardType` **required** (the note's recommendation) is the one change that isn't free — it demands a backfill (below). The alternative (`cardType?`) needs zero migration but leaves "what type is this card?" perpetually ambiguous. Recommendation stands: required + trivial backfill.

**Hardcoded-union fan-out (the modification checklist — 8 confirmed sites):**
| File:line | What breaks | Fix |
|-----------|-------------|-----|
| `recommendCards.ts:18` | `preferredRewardUnits?: Array<'cash'\|'miles'\|'points'>` | widen to `RewardUnit[]` |
| `recommendCards.ts:163,175-177,194` | `filterByRewardUnit`, `groupByRewardUnit` `Record<>`, `getBestCardForRewardUnit` | widen; add `crypto: []` bucket |
| `loadCards.ts:184` | `getCardsByRewardUnit(rewardUnit)` param | widen to `RewardUnit` |
| `cardRepository.ts:194` | `validateRewardRule` allowlist `['cash','miles','points']` | add `'crypto'` |
| `lib/ai/extractRewards.ts:336` | `validateRewardUnit()` | add `'crypto'` case (or leave — AI extracts credit T&Cs only) |
| `types/transaction.ts:56` | `preferredRewardTypes?: (…)[]` | widen if user can prefer crypto |
| `components/HomeClient.tsx:20`, `TransactionInput.tsx:8,213`, `CardRecommendationList.tsx:26` | UI reward-type filter unions | widen only if crypto is a Home filter option (likely **not** — Home is HK-only) |

> UI-side unions on Home can stay `cash|miles|points`: the recommender only ever ranks `hkEligible` cards, and crypto cards that are HK-eligible are the minority. Widen engine/data types; widen UI types only where crypto should appear as a Home filter.

### Pattern 2: Inject the valuation rate; keep the engine pure

**What:** The recommender runs **client-side**, so it cannot fetch a live rate (no secrets, no server call in `recommendCards`). Instead, the **rate table is data injected from the server component**, exactly like `cards` already are. `calculateNetValue` converts each reward to HKD before comparison.

**The structural problem this fixes (verified in code):** Today `calculateNetValue = rewardAmount − fees`, and `rewardAmount = transaction.amount × effectiveRate` **with no unit conversion** (`calculateReward.ts:276,315`). So "2 miles" and "$2 cash" both yield `rewardAmount = 2` and compare **equal** — the cross-unit ranking is already arbitrary and only survives because HK comparisons are mostly within-unit. A crypto reward of `amount × 0.02` in CRO would rank against cashback by raw magnitude — meaningless. Crypto is what forces the latent bug into the open.

**The fix, scoped to not disturb fiat:**
```typescript
// valuation.ts — static default today, Redis-served later, same shape
export type ValuationTable = Record<string, number>; // unit|asset → HKD per unit
export const DEFAULT_VALUATION: ValuationTable = {
  cash: 1, miles: 1, points: 1,          // identity ⇒ existing rankings UNCHANGED
  'crypto:CRO': 2.1, 'crypto:USDC': 7.8, // manually-maintained (DEC-DATA-001)
};
export const toHkd = (amount: number, unit: RewardUnit, asset?: string,
                      table = DEFAULT_VALUATION) =>
  amount * (table[unit === 'crypto' ? `crypto:${asset}` : unit] ?? 1);
```
```typescript
// calculateNetValue gains unit awareness; fiat keeps rate 1 ⇒ no regression
calculateNetValue(calc, table) = toHkd(calc.rewardAmount, calc.rewardUnit, calc.rewardAsset, table) - calc.fees
```

**Injection path (reuses the existing server→client seam):** the server component (`page.tsx`) already calls `loadCards()` and passes `cards` to `HomeClient`. Add one prop: read the table (static import now; `redis.get('valuation')` later) and pass `valuation={table}` alongside `cards`. `HomeClient` forwards it into `recommendCards`. **No fetch inside the engine.**

**When to use:** any client-side ranking that must compare heterogeneous units. **Trade-offs:** static rates go stale (accepted per DEC-DATA-001 — crypto directory is known debt); the injectable-table shape means swapping static→Redis→live-feed later is a data change, not an engine change. Keep fiat at identity `1` so **existing cash/miles/points output is byte-identical** — this is the regression test.

### Pattern 3: Gate the recommender, not the store (`hkEligible`)

**What:** The Data page shows **all** cards; the recommender ranks **only** `hkEligible` ones. Put the gate at the **engine boundary** so any caller of the recommender is protected, and let the Data page read a different path that never touches the engine.

```typescript
// recommendCards.ts — one line in the existing eligibleCards filter (line ~56)
let eligibleCards = cards.filter(card => {
  if (!card.isActive) return false;
  if (card.hkEligible === false) return false;   // undefined ⇒ eligible (11 legacy HK cards pass)
  if (preferences?.excludedCardIds?.includes(card.id)) return false;
  return true;
});
```

- **Home path** → `loadCards()` → `recommendCards()` → gate applies. (Optionally also prefilter in `loadCards` as an optimization, but the engine gate is the single source of truth for "recommendable".)
- **Data path** → `getAllCardsAsync()` (returns all incl. inactive) → `DataClient`, **no engine call**, so global/non-HK cards are shown but never recommended.

**Trade-offs:** `=== false` (not falsy) is deliberate — it makes `undefined` mean "eligible," so the 11 existing cards need no `hkEligible` field. New global cards must set `hkEligible: false` explicitly. Document this default clearly or it silently recommends a global card.

---

## Data Flow

### Home (recommender) — unchanged shape, one new prop
```
User types purchase → HomeClient
  server: loadCards() [Redis→static, active-only]  +  valuation table (static/Redis)
  client: recommendCards(cards, txn, {valuation})
          → filter (isActive, hkEligible✚, prefs)
          → calculateReward per card
          → sort by calculateNetValue = toHkd(reward)✚ − fees
          → tie-break (unchanged) → ranked list + Apply CTA (applyUrl)
```

### Data page (directory) — new, read-only
```
/[locale]/data (force-dynamic) → getAllCardsAsync()  [ALL cards, incl. non-hkEligible/inactive]
  → DataClient: client-side filter by cardType✚ / issuer / rewardUnit / hkEligible✚
  → derive headline "best rate" per card from existing rewards (no new field)
  → Apply CTA (applyUrl)   — NO recommendCards, NO valuation ranking
```

### Bulk crypto seed — one-time, admin/script
```
curated ranked.plus-sourced JSON (attributes only, no referral links)
  → seed script: read current Redis 'cards' → append new-id crypto cards → writeCardsToRedis()
  (MERGE, not init-redis clobber — see anti-pattern)
```

### State management
Client filtering state (Data page) is local component state (`useState`), same as the existing `CardRecommendationList` reward-type filter — no store, no router state needed. Locale is next-intl; theme is next-themes. Nothing new.

---

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| Current: 11 → full global set (dozens, PRD cap <100 cards) | Client-side directory over <100 cards is trivial — render + filter in the browser, no pagination, no search index needed. `getAllCardsAsync` reads one Redis key. |
| If corpus outgrew ~100 | Add client-side virtualization + a derived index; still no server search. Not a v1.1 concern. |
| Valuation freshness | Static table is fine at this scale; a scheduled job writing `redis.set('valuation', …)` is the next step if/when rates need to be current — no code change, just start populating the injected table from Redis. |

### Scaling priorities
1. **First "bottleneck" is data quality, not perf** — the global set is a weekly secondhand aggregation (DEC-DATA-001). Correctness/staleness of directory cards is the real risk; the `hkEligible` gate contains blast radius to the directory.
2. **Redis payload size** — the whole corpus is one JSON value under key `cards`. Dozens of cards is kilobytes; fine. Only revisit near the 100-card cap.

---

## Anti-Patterns

### Anti-Pattern 1: Seeding the crypto corpus via `init-redis` (clobber)
**What people do:** add crypto cards to `cards.json`, hit `/api/admin/init-redis`. **Why it's wrong:** `init-redis` does `writeCardsToRedis(getDatabase())` — it **overwrites** the Redis `cards` key from the *static* `cards.json`, discarding any Redis-only edits the admin UI has made to the live 11 (production truth is Redis, and it may have diverged from `cards.json`). **Do this instead:** a **merge-aware** seed — read current Redis, append crypto cards by new `id`, write back. Reserve `init-redis` for genuine first-boot.

### Anti-Pattern 2: Pushing the bulk global set through the pending-review queue
**What people do:** route dozens of ranked.plus cards through `/api/admin/extract` + pending approval. **Why it's wrong:** that pipeline is built for AI extraction of **one T&C PDF at a time**, not structured bulk listings; it's high-friction and mismatched. **Do this instead:** one-off curated seed script for the bulk import; keep the admin CRUD + pending queue for ongoing **per-card** maintenance of HK credit cards.

### Anti-Pattern 3: Converting units inside `calculateReward` (mutating display)
**What people do:** multiply `rewardAmount` by the HKD rate inside `calculateReward`. **Why it's wrong:** `rewardAmount` + `rewardUnit` feed the UI ("Earn 1,200 Asia Miles"); scaling it corrupts every existing display and the `formatReward`/`getRewardUnitName` path. **Do this instead:** convert **only at comparison time** in `calculateNetValue` (and expose a separate derived `hkdValue` if the UI wants to show it). Keep `rewardAmount` in native units.

### Anti-Pattern 4: Forgetting `force-dynamic` on the Data page
**What people do:** ship `data/page.tsx` as a default (statically cached) server component. **Why it's wrong:** it reads live Redis card data; without `export const dynamic = 'force-dynamic'` it hits the exact CDN-caching failure Phase 5 fought (stale cards served from the edge). **Do this instead:** `force-dynamic` on `data/` (it reads cards). The **Research** page needs it **only if** it reads card data — pure editorial/MDX can stay statically rendered.

---

## Integration Points

### Internal boundaries
| Boundary | Communication | Notes |
|----------|---------------|-------|
| server `page.tsx` ↔ `HomeClient`/`DataClient` | props (`cards`, `valuation`✚) | Established seam; add one prop, no new transport |
| `recommendCards` ↔ `valuation.ts` | function arg (injected table) | Keeps engine pure & client-safe |
| Data page ↔ store | `getAllCardsAsync()` | Reuse as-is; returns all cards incl. inactive/non-HK |
| Home ↔ store | `loadCards()` | Reuse as-is; active-only, Redis→static fallback |
| Seed/backfill scripts ↔ Redis | `writeCardsToRedis()` | Merge semantics required (anti-pattern 1) |

### External services
| Service | Integration | Notes |
|---------|-------------|-------|
| Upstash Redis (`cards` key) | `redisStorage` (unchanged) | Prod truth; env precedence `REAL_STORAGE_*`→`KV_*`→`UPSTASH_*` |
| Anthropic (extract) | admin route, server-only | Untouched by v1.1 |
| Affiliate networks | populate `applyUrl` (`card.ts:269`) | **Data task, zero schema change** — field already referral-aware |
| Crypto price source | manual → static `valuation.ts` table | No live API in v1.1 (DEC-DATA-001); injectable for later |

---

## Migration Required (call-outs)

1. **`cardType` backfill (if required):** set `cardType: 'credit'` on all 11 cards. **Two writes, not one** — edit `src/data/cards.json` (the fallback seed) **and** run a one-shot script that reads Redis, stamps `cardType`, and `writeCardsToRedis()` back. Editing only `cards.json` leaves production (Redis) without the field. This is the single most-missable step.
2. **`RewardUnit += 'crypto'` fan-out:** widen the 8 hardcoded-union sites above; `npx tsc --noEmit` (after `npm install`) is the checklist generator. No runtime data migration.
3. **No migration for the optional fields** (`hkEligible`, `fundingOptions`, `minStaking`, `rewardAsset`, `rewardPrograms.crypto`) — absent ⇒ correct legacy behavior.
4. **Opportunistic (decide explicitly, don't bundle silently):** OPEN-002's dead `RewardCap` write-only schema and OPEN-001's `premium`/`specific` taxonomy drift both live in `card.ts` — this is a natural moment to retire dead schema, but scope it as its own decision.

---

## Suggested Build Order (dependencies first)

1. **Schema + type fan-out** (`card.ts` + 8 union sites) and **`cardType` backfill** (cards.json + Redis script). *Foundation — everything compiles against this.*
2. **Valuation + engine** (`valuation.ts`, `calculateNetValue` HKD-equiv, `hkEligible` gate in `recommendCards`). *Prove no fiat regression: identity rates ⇒ existing 11-card rankings unchanged.*
3. **Bulk crypto seed** (merge-aware script → Redis) + **affiliate `applyUrl`** population. *Depends on schema (1) so cards validate; gives (4) real content.*
4. **Data page** (`data/page.tsx` force-dynamic + `DataClient`). *Depends on schema + data present to be meaningful.*
5. **Research page** — independent editorial; can run parallel to (4).
6. **UI / theme refresh (THI-176)** — last; spans Home + Data + Research.

Gating context for the roadmap: shipping to prod is blocked on **THI-236** (admin auth) per PROJECT.md — the security fix likely lands before this milestone's first deploy. Steps 1–5 are buildable/testable locally without it.

---

## Sources

- Direct code read (2026-07-16): `src/types/card.ts`, `src/lib/engine/{recommendCards,calculateReward}.ts`, `src/lib/data/{cardRepository,redisStorage,loadCards}.ts`, `src/app/[locale]/page.tsx`, `src/app/api/admin/init-redis/route.ts`, `src/data/cards.json` — **HIGH confidence** (ground truth per PROJECT.md).
- `.planning/PROJECT.md` (v1.1 milestone, DEC-DATA-001, DEC-SCOPE-001) — **HIGH**.
- `.planning/notes/ranked-plus-directory-and-crypto-expansion.md` (decisions record) — **HIGH** (operator-decided).

---
*Architecture research for: CardGPT v1.1 card-directory + crypto integration*
*Researched: 2026-07-16*
