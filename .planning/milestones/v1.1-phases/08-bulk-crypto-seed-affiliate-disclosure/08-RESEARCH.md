# Phase 8: Bulk Crypto Seed & Affiliate / Disclosure - Research

**Researched:** 2026-07-25
**Domain:** Scheduled external-API price feed (Vercel Cron + CoinMarketCap), merge-aware Redis data seeding, affiliate-link CTA wiring
**Confidence:** MEDIUM (official docs confirmed the cron + storage mechanics; CoinMarketCap credit-exhaustion behavior and exact per-asset CMC IDs remain LOW/ASSUMED — flagged below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Build **all machinery now, defer only the real data load.** The seed script, rate-table cron, affiliate CTA wiring, and `loadCards` fix are all implemented and tested against a small crypto fixture (a handful of representative crypto/neobank cards). The bulk seed of *real* cards is a later, RQ-001-gated action — the script exists and is proven; only its input data waits. — Reversible: fixture is test-only.
- **D-02:** Rate source is a **scheduled cron job that fetches real rates from CoinMarketCap** (`/v2/cryptocurrency/quotes/latest`, convert=HKD) and writes `{ [assetTicker]: { hkdPerUnit, asOf } }` to Redis, injected into `recommendCards()` (the engine never fetches — DEC-VAL-B). — Costly to reverse: external API dependency, Vercel Cron entry, `CRON_SECRET`, `COINMARKETCAP_API_KEY`.
- **D-02a (⚠ public repo):** CoinMarketCap **requires an API key**, free "Basic" tier is **credit-metered**. Key is a Vercel env var, **never committed**. Cron must be **credit-budget-aware**: batch all tickers into one `quotes/latest` call, refresh on a modest cadence (≥ daily is fine per Phase 7's 24h staleness), cache to Redis so page loads never hit CMC.
- **D-03:** Rate-table key = crypto asset **`shortName` ticker, exact casing** (locked in Phase 7). CMC `symbol` values must be mapped to these tickers **in the job**, not at engine lookup.
- **D-04:** Fetch failures use Phase 7's existing staleness logic (stale → last-known + `rateStale` warning; bad/absent → `hkdEquivalent: null`). The cron writes `asOf` only on success; a CMC error/credit-exhaustion **leaves the last-known table in Redis untouched** (never overwrite with nulls).
- **D-05:** `applyUrl` CTA renders `rel="sponsored nofollow noopener"` and appears **only when a link exists** (AFF-01).
- **D-06:** **`loadCards` no longer requires `applyUrl`** — remove the hard drop at `loadCards.ts:49-52`. "Recommendable" is decoupled from "has `applyUrl`."
- **D-07:** Ranking is **never** reordered by affiliate presence — structural, asserted by test.
- **D-08 (⚠ scope reduction + risk-accepted):** The **bilingual affiliate/advertiser disclosure is DROPPED** by product-owner decision. Only the disclosure clause of AFF-02 is cut; the other two clauses (recommendable-without-applyUrl, ranking-neutrality) are kept as D-06/D-07. Do not silently re-add a disclosure surface — that reopens the requirement.
- **D-09:** Seed script models itself on **`scripts/backfill-card-type.mjs`** (read → mutate-by-id → write-back), NOT `seed-redis.mjs` (fresh-seed-only, refuses on populated store). Same conventions: `--dry-run`, read-back-verify, `vercel env pull` (KV_* precedence), no secrets in file. Idempotent: appends by new id, skips existing ids, never touches the 11 credit cards or admin edits.
- **D-10:** Crypto directory data is bulk-seeded from ranked.plus public listings (facts only, no referral links), provenance-labeled, per DEC-DATA-001 — **this is the deferred real-data load**, not this phase's build. The fixture stands in until RQ-001 resolves.

### Claude's Discretion

- Exact CoinMarketCap endpoint params, symbol→ticker mapping table, refresh cadence within the free credit budget, caching + cron scheduling mechanics.
- Fixture composition (how many crypto cards, which assets) — pick a minimal representative set covering stablecoin + volatile + staking-gated + a null-rate case.
- Affiliate CTA visual treatment within the existing `CardRecommendationList` Apply button.

### Deferred Ideas (OUT OF SCOPE)

- Real bulk crypto card data load (RQ-001) — the actual global crypto/neobank set from ranked.plus. Machinery built + tested against a fixture; real load is a later data step.
- Admin-editable rate table — rejected (manual toil + gated on THI-236 admin-auth). Cron-fetched instead.
- Richer asset coverage / higher-frequency refresh / paid CMC tier — later.
- Prepaid card handling / its own results section — Phase 9.
- `cryptoSegment` UI rendering (a crypto section beside the fiat list) — downstream UI phase; engine contract is ready, this phase only makes it non-inert.
- Admin-auth hardening (THI-236, Urgent) — release gate, not phase work.
- The bilingual affiliate disclosure and its pre-deploy compliance gate (D-08) — removed, not deferred; reopening it is new scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AFF-01 | Apply CTA uses affiliate/referral links where available (populate existing `applyUrl`), rendered `rel="sponsored nofollow noopener"` | Architecture Patterns → Pattern 3 (CTA rel attributes); exact render site confirmed at `CardRecommendationList.tsx:460-475`, single non-optional `.applyUrl` access site in the whole codebase besides the two validators |
| AFF-02 (revised) | Ranking never reordered by affiliate presence; "recommendable" decoupled from "has applyUrl" (loadCards fix); disclosure clause dropped (D-08, out of scope) | Architecture Patterns → Pattern 1 (loadCards relaxation); Don't Hand-Roll; confirmed `CardRecommendationList` render order comes solely from the already-sorted `recommendations` array — no applyUrl-based reordering exists anywhere to remove |
</phase_requirements>

## Summary

This phase wires three previously-inert pieces of machinery into a working system, without touching the existing 11-card fiat pipeline. All three areas are greenfield for this codebase (no prior cron, no prior external price-feed call, no prior merge-aware crypto seed), so research leaned on official Vercel and CoinMarketCap documentation rather than existing repo patterns — except for the merge-aware Redis mutation, where `scripts/backfill-card-type.mjs` is a complete, already-proven template to clone.

The rate-table cron is a Vercel Cron (`vercel.json` `crons` array) hitting a new App Router route (`src/app/api/cron/refresh-rates/route.ts`) that is itself protected by the official `CRON_SECRET` Bearer-token pattern (confirmed verbatim in Vercel's own docs). Inside that route, a single batched CoinMarketCap `/v2/cryptocurrency/quotes/latest` call (all tickers comma-separated, `convert=HKD`) resolves prices, which are written to a **new** dedicated Redis key (recommend `crypto-rates`, sibling to the existing `cards` key) as `{ [shortNameTicker]: { hkdPerUnit, asOf } }` — the exact shape `HkdRateTable` already expects. A critical, non-obvious CMC gotcha: the `v2` endpoint returns an **array per requested symbol** (not a single object) because tickers collide across coins; production code should resolve by CMC's numeric `id` internally and map the result back to the locked `shortName` ticker, never index `data[SYMBOL][0]` blindly.

The rate table has to reach the **client-side** `recommendCards()` call in `HomeClient.tsx` (a `'use client'` component). Since `page.tsx` is already a server component (`force-dynamic`) that loads `cards` and passes them as a prop, the natural wiring is to add a second server-side read (`readRateTableFromRedis()`, mirroring the existing `readCardsFromRedis()`) in `page.tsx`, pass it down as a new `rateTable` prop, and thread it into the existing 3-arg `recommendCards()` call as the 4th argument inside `handleSubmit`. No client-side fetch of CoinMarketCap ever happens — this preserves DEC-VAL-B (engine never fetches) end to end.

The merge-aware seed script is the most template-able piece: `scripts/backfill-card-type.mjs` already demonstrates every required property (read whole `cards` object → mutate in place → write back → independent read-back verification → `--dry-run` → env-var credentials only, KV_* precedence). The new script differs only in mutation semantics: instead of setting a missing field on existing cards, it **appends new cards by id**, skipping any id that already exists (so it's safe to re-run and safe to run after real data lands later).

The `loadCards.ts` `applyUrl` hard-drop is a two-line, well-isolated fix: grep across the whole repo shows exactly one non-optional read of `card.applyUrl` (the validator itself); `CardRecommendationList.tsx:460` already treats it as optional (`{card.applyUrl && (...)}`) and `cardRepository.ts`'s separate validator (used for admin create/update) already treats it as optional. No other code path assumes `applyUrl` is always present.

**Primary recommendation:** Build the cron route and CMC fetch as a small, dependency-free module (native `fetch`, no new npm package) behind `CRON_SECRET`; add one new Redis key for rates; thread `rateTable` through `page.tsx` → `HomeClient` props → the existing 4th engine argument; clone `backfill-card-type.mjs` verbatim for the merge-aware seed, changing only the mutation step; delete the two-line `applyUrl` hard-drop in `loadCards.ts`; add `rel="sponsored nofollow noopener"` at the one existing CTA render site.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CoinMarketCap price fetch | API / Backend (Vercel Cron route) | — | External API calls must never happen in the browser (key leakage) or inside the pure client engine (DEC-VAL-B); a serverless cron route is the only tier with both a secret-safe env and a schedule trigger |
| Rate-table persistence | Database / Storage (Redis) | — | Cron writes, page reads — Redis is the hand-off; no in-memory cache survives across serverless invocations |
| Rate-table injection into ranking | Frontend Server (SSR) → Browser/Client | — | `page.tsx` (server) reads Redis and passes `rateTable` as a prop; `HomeClient` (client) calls the already-client-side `recommendCards()` with that prop as the 4th arg. The engine itself stays framework-agnostic (pure function, no tier) |
| Cron authentication | API / Backend | — | `CRON_SECRET` check inside the route handler; must reject with 401 before doing any CMC work or Redis write |
| Merge-aware crypto seed | Database / Storage (via a Node script, not the web app) | — | Runs out-of-band against production Redis; not part of the request/response path at all |
| Apply CTA affiliate link + rel attributes | Browser / Client | — | Purely a rendered `<a>` tag property; no server logic needed |
| `loadCards` applyUrl validation relaxation | API / Backend (data-layer validator) | Frontend Server (consumes `loadCards()` at `page.tsx`) | The validator lives in the data layer (`src/lib/data/loadCards.ts`), but the effect (cards without a link still render) surfaces through the server component that calls it |

## Standard Stack

### Core

No new runtime dependencies are required for this phase. Every capability is served by tools already present in the stack.

| Capability | Tool | Version (verified) | Why |
|------------|------|---------------------|-----|
| CoinMarketCap HTTP call | native `fetch` (Node/Next.js runtime) | Next.js 16.1.4 (already in `package.json`) [VERIFIED: repo package.json] | No HTTP client library needed for a single GET with a header — adding `axios`/`node-fetch` would be pure overhead |
| Rate persistence | `@upstash/redis` | `1.36.1` (already in `package.json`, already used by `redisStorage.ts`) [VERIFIED: repo package.json] | Same client already wraps the `cards` key; add a second key with the same client instance pattern |
| Cron scheduling | Vercel Cron (`vercel.json` `crons`) | Platform feature, no package [CITED: vercel.com/docs/cron-jobs] | Native to the Vercel platform this project already deploys to (`hkg1`, Thirdvisor Pro team) — no third-party scheduler needed |
| Cron auth | `CRON_SECRET` env var + manual header check | Platform convention, no package [CITED: vercel.com/docs/cron-jobs/manage-cron-jobs] | Official, zero-dependency pattern |
| Test runner (already installed) | `vitest` | `4.1.10` [VERIFIED: repo package.json] | Reuse the Phase 7 Wave-0 runner for the new validation tests |

### Supporting

None needed — this phase intentionally avoids adding packages (`Don't Hand-Roll` below explains why a full CMC SDK is unnecessary for a single endpoint call).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` for CoinMarketCap | An official/community CMC SDK (e.g. `coinmarketcap-api` npm package) | Adds a dependency + its own maintenance/legitimacy risk for one GET request with one header; native fetch is simpler and avoids adding an unaudited package to a public repo |
| Vercel Cron | An external scheduler (GitHub Actions cron, a third-party cron-as-a-service) | Vercel Cron is already inside the deploy target, needs no extra service account/secret, and is the documented, supported mechanism for this exact use case |
| Symbol-based CMC lookup | ID-based CMC lookup (`id=`/`convert_id=`) | Symbol lookup is simpler to write but returns an **array per ticker** (collision-prone per CMC's own docs); ID-based lookup is unambiguous but requires maintaining a small ticker→CMC-id map — recommended tradeoff: use ID-based lookup, see Pitfall 1 |

**Installation:** None required — no new packages.

**Version verification:** `@upstash/redis@1.36.1` and `vitest@4.1.10` confirmed directly from the repo's own `package.json` (already installed, already in production use for the `cards` key and Phase 7 tests respectively). No new package versions to verify.

## Package Legitimacy Audit

**Not applicable this phase — zero new external packages are introduced.** CoinMarketCap access uses the runtime's native `fetch`; Redis access reuses the already-installed, already-vetted `@upstash/redis` client. If the planner or an executor later decides a CMC SDK is warranted (e.g. for TypeScript response typings), run the Package Legitimacy Gate protocol against that specific package name before adding it, and gate the install behind a `checkpoint:human-verify` task per this repo's public-repo posture.

**Packages removed due to [SLOP] verdict:** none — none proposed.
**Packages flagged as suspicious [SUS]:** none — none proposed.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Vercel Cron (vercel.json "crons": [{ path: "/api/cron/refresh-      │
│ rates", schedule: "0 3 * * *" }]) — fires daily, UTC                │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTP GET, Authorization: Bearer <CRON_SECRET>
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ src/app/api/cron/refresh-rates/route.ts  (API / Backend tier)       │
│  1. Verify Authorization header === `Bearer ${process.env.          │
│     CRON_SECRET}` → 401 if not, and NO-OP if COINMARKETCAP_API_KEY  │
│     is unset (graceful degradation, D-02a)                          │
│  2. Batch GET pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/   │
│     latest?id=<comma CMC ids>&convert=HKD  (X-CMC_PRO_API_KEY hdr)  │
│  3. Map CMC numeric id → locked shortName ticker (explicit table)   │
│  4. On success: write { [ticker]: { hkdPerUnit, asOf: now } } to    │
│     Redis key "crypto-rates" — MERGE with existing table, never     │
│     blanket-overwrite (a transient CMC outage on one asset must not │
│     null out a previously-good rate for another asset)              │
│  5. On CMC error / 429 / credit exhaustion: log + return 200/204,   │
│     leave "crypto-rates" untouched (D-04)                            │
└───────────────────────────┬───────────────────────────────────────┘
                            │ writes
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Upstash Redis — TWO independent keys, same client instance:         │
│   "cards"        → CardDatabase { cards[], lastUpdated, ... }       │
│   "crypto-rates" → HkdRateTable { [ticker]: {hkdPerUnit, asOf} }    │
└───────────────────────────┬───────────────────────────────────────┘
                            │ reads (server-side, force-dynamic)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ src/app/[locale]/page.tsx  (Frontend Server / SSR tier)              │
│  const cards = await loadCards();                                   │
│  const rateTable = await readRateTableFromRedis();  // NEW           │
│  return <HomeClient cards={cards} rateTable={rateTable} />;          │
└───────────────────────────┬───────────────────────────────────────┘
                            │ props (serializable JSON, server→client)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ src/components/HomeClient.tsx  ('use client', Browser tier)          │
│  handleSubmit(...) calls:                                            │
│  recommendCards(cards, transaction, preferences, rateTable) // 4-arg │
│  → engine partitions fiat vs crypto, values crypto via valuateCrypto │
│  → result.recommendations (fiat, unchanged) rendered as before        │
│  → result.cryptoSegment now POPULATED (was always undefined before   │
│    this phase) — its UI rendering is explicitly deferred to a later  │
│    phase; this phase only makes the data non-inert                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ src/components/CardRecommendationList.tsx (Browser tier)              │
│  {card.applyUrl && <a href={card.applyUrl}                            │
│      rel="sponsored nofollow noopener" target="_blank">...</a>}       │
│  — renders only when a link exists; card itself always renders       │
│    (loadCards.ts no longer drops link-less cards)                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ scripts/seed-crypto-cards.mjs (out-of-band, operator-run, NOT part   │
│ of the request path)                                                 │
│  1. READ current { cards } from Redis key "cards"                    │
│  2. Load fixture (or later, real) crypto cards from a JSON file       │
│  3. For each fixture card: if id already in cards → skip (idempotent) │
│     else → append to cards[]                                          │
│  4. WRITE the whole merged object back (same key, same shape)         │
│  5. Independent READ-BACK verify (count, sample ids) — never trust    │
│     the in-memory object just written                                 │
│  --dry-run supported throughout                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/
│   └── api/
│       └── cron/
│           └── refresh-rates/
│               └── route.ts        # NEW — CRON_SECRET-gated CMC fetch → Redis write
├── lib/
│   ├── data/
│   │   ├── redisStorage.ts         # ADD readRateTableFromRedis()/writeRateTableToRedis() mirroring readCardsFromRedis()
│   │   └── loadCards.ts            # EDIT — remove applyUrl hard-drop (lines 49-52)
│   └── engine/                     # UNCHANGED — Phase 7 contract consumed as-is
├── components/
│   ├── HomeClient.tsx              # EDIT — accept rateTable prop, thread as 4th recommendCards() arg
│   └── CardRecommendationList.tsx  # EDIT — add rel="sponsored nofollow noopener" at :462
├── data/
│   └── crypto-cards.fixture.json   # NEW — the ≈4-5 card fixture (sibling of cards.json/card-template.json)
scripts/
└── seed-crypto-cards.mjs           # NEW — merge-aware append-by-id seed, cloned from backfill-card-type.mjs
vercel.json                         # EDIT — add "crons" array
```

### Pattern 1: Relaxing `loadCards`' `applyUrl` requirement (D-06)

**What:** Remove the hard `if (!card.applyUrl...) return false` branch inside `loadCards.ts`'s internal `validateCard`, so a structurally-valid card without an `applyUrl` still passes validation and is returned by `loadCards()`/`loadCardsSync()`.
**When to use:** Exactly this phase — this validator is intentionally distinct from `cardRepository.ts`'s validator (which already treats `applyUrl` as optional, used for admin create/update).
**Example:**
```typescript
// src/lib/data/loadCards.ts — BEFORE (lines 49-52)
if (!card.applyUrl || typeof card.applyUrl !== 'string') {
  console.warn(`Invalid card ${card.id}: missing or invalid applyUrl`);
  return false;
}

// AFTER — delete the block entirely. If applyUrl IS present, no format
// validation existed here before either (cardRepository.ts already owns
// URL-format validation on writes); no replacement check is needed for reads.
```
Confirmed via repo-wide grep: the ONLY other read of `.applyUrl` is already optional (`card.applyUrl && (...)` in `CardRecommendationList.tsx:460`, and `card.applyUrl || ''` / `cardData.applyUrl` in two admin display components that already tolerate `undefined`).

### Pattern 2: Server-side rate table injection into a client component (greenfield)

**What:** `page.tsx` (server, `force-dynamic`) reads both Redis keys and passes both as serializable props; `HomeClient` (client) threads the rate table into the existing optional 4th `recommendCards()` parameter.
**When to use:** Any time a client-side pure-function engine needs server-fetched data it must never fetch itself (DEC-VAL-B).
**Example:**
```typescript
// src/app/[locale]/page.tsx
import { loadCards } from '@/lib/data/loadCards';
import { readRateTableFromRedis } from '@/lib/data/redisStorage'; // NEW export
import HomeClient from '@/components/HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cards = await loadCards();
  const rateTable = await readRateTableFromRedis(); // returns HkdRateTable | undefined
  return <HomeClient cards={cards} rateTable={rateTable} />;
}
```
```typescript
// src/components/HomeClient.tsx
interface HomeClientProps {
  cards: CreditCard[];
  rateTable?: HkdRateTable; // NEW — optional, mirrors recommendCards' own optional 4th param
}

export default function HomeClient({ cards, rateTable }: HomeClientProps) {
  // ...
  const handleSubmit = (result: ParseResult, selectedRewardType?: RewardType) => {
    // ...
    const recommendationResult = recommendCards(
      cards,
      result.transaction,
      preferences,
      rateTable // NEW 4th arg — additive per Phase 7's contract, byte-identical when undefined
    );
    // recommendationResult.cryptoSegment is now populated when rateTable exists
    // AND at least one non-fiat eligible card is present; UI rendering of that
    // segment is out of scope for this phase (deferred to a later UI phase) —
    // only wire it through, do not render it.
  };
}
```
Source pattern for the Redis-read half — cloned from the already-proven `readCardsFromRedis()`:
```typescript
// src/lib/data/redisStorage.ts — model after readCardsFromRedis() (lines 65-79)
const RATES_KEY = 'crypto-rates';

export async function readRateTableFromRedis(): Promise<HkdRateTable | null> {
  try {
    const data = await getRedis().get<HkdRateTable>(RATES_KEY);
    return data ?? null;
  } catch (error) {
    console.error('[Redis] Failed to read crypto rate table:', error);
    return null; // fail-safe: absent table → valuateCrypto already returns null per-card (Phase 7)
  }
}
```

### Pattern 3: CRON_SECRET-gated route handler (official Vercel pattern)

**What:** Verify the `Authorization` header matches `Bearer ${process.env.CRON_SECRET}` before doing any work; 401 otherwise. This is Vercel's own documented pattern, not a custom scheme.
**When to use:** Any Vercel Cron endpoint that must reject public/unauthenticated triggering.
**Example:**
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs (official docs, verbatim pattern)
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Graceful degradation (D-02a): if the CMC key isn't configured yet, no-op
  // rather than error — the page already fail-safes on an absent rate table.
  const cmcKey = process.env.COINMARKETCAP_API_KEY;
  if (!cmcKey) {
    console.warn('[cron/refresh-rates] COINMARKETCAP_API_KEY not set — skipping refresh.');
    return Response.json({ skipped: true });
  }

  // ... fetch + map + merge-write (see Pattern 4) ...
  return Response.json({ success: true });
}
```

### Pattern 4: Batched, ID-based CoinMarketCap fetch (avoids the symbol-collision pitfall)

**What:** Query `/v2/cryptocurrency/quotes/latest` by CMC numeric `id` (not `symbol`) to get one unambiguous object per requested asset, then map the numeric id back to the locked `shortName` ticker explicitly.
**When to use:** Always, for this integration — see Pitfall 1 below for why `symbol=` is risky.
**Example:**
```typescript
// Source: https://coinmarketcap.com/api/documentation (v2 quotes/latest; id-based lookup
// avoids the documented symbol-collision array response)
const CMC_ID_TO_TICKER: Record<number, string> = {
  1: 'BTC',
  1027: 'ETH',
  3408: 'USDC',
  // extend as fixture/real assets grow — validate every configured ticker
  // resolves to exactly one id at cron startup; fail loud (log + skip write)
  // if a ticker is missing from this map rather than silently dropping it.
};

async function fetchRatesHKD(ids: number[]): Promise<Record<string, number>> {
  const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${ids.join(',')}&convert=HKD`;
  const res = await fetch(url, {
    headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY! },
  });
  if (!res.ok) throw new Error(`CMC ${res.status}`);
  const json = await res.json();
  const out: Record<string, number> = {};
  for (const id of ids) {
    const ticker = CMC_ID_TO_TICKER[id];
    const price = json.data?.[String(id)]?.quote?.HKD?.price;
    if (ticker && typeof price === 'number' && price > 0) {
      out[ticker] = price;
    }
    // else: skip this asset silently for THIS run — the merge-write (below)
    // preserves its last-known Redis value rather than nulling it (D-04).
  }
  return out;
}
```

### Anti-Patterns to Avoid

- **Blanket-overwriting the `crypto-rates` Redis key on every cron run:** always read-merge-write (like `backfill-card-type.mjs` does for `cards`), so a partial CMC failure on one asset can't wipe out a previously-good rate for a different asset.
- **Querying CMC by `symbol=` in production:** the v2 endpoint returns an array per requested symbol due to ticker collisions across different coins; indexing `[0]` blindly risks silently picking the wrong asset. Use `id=`.
- **Fetching CoinMarketCap from the browser or from inside `recommendCards()`:** violates DEC-VAL-B (engine never fetches) and would leak the API key to the client bundle — the key must only ever be read via `process.env` inside a server route.
- **Reusing `seed-redis.mjs` for the crypto seed:** it explicitly refuses to run on a populated store (fresh-seed-only) — using it would either no-op uselessly or, if ever modified to bypass that guard, would clobber the 11 live credit cards. Clone `backfill-card-type.mjs` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled background job | A custom polling/queue mechanism, a GitHub Actions workflow, an external cron-as-a-service | Vercel Cron (`vercel.json` `crons`) | Already inside the deploy target, zero extra infra/credentials, officially documented `CRON_SECRET` auth pattern |
| Endpoint authentication for a scheduled job | A custom signing scheme, IP allowlisting, a hand-rolled HMAC | `CRON_SECRET` Bearer-token check | Vercel injects this automatically on every cron invocation; a custom scheme adds complexity and attack surface for no benefit |
| CoinMarketCap client | A hand-rolled retry/backoff/pagination wrapper, or pulling in a full SDK | A single `fetch` call with explicit id-based params and a hard timeout | The Basic tier is one batched call per refresh — no pagination, no complex retry logic needed; a full SDK is unjustified dependency weight for one endpoint |
| Merge-aware Redis mutation | A new bespoke read-modify-write implementation from scratch | Clone `scripts/backfill-card-type.mjs`'s structure (read → mutate → write → read-back verify → `--dry-run`) | It already encodes every safety property this phase needs (never clobber, idempotent, verified) — re-deriving it risks reintroducing the exact clobber bug this pattern was built to prevent |

**Key insight:** Every piece of "new infrastructure" in this phase (cron, external API auth, merge-aware writes) already has an official, dependency-free, previously-proven-in-this-repo solution. The work is wiring, not invention.

## Runtime State Inventory

> Included because this phase performs a production Redis data migration (merge-aware crypto card seed) and registers new platform-level state (a Vercel Cron job + two new secrets) that a code review alone would not surface.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Production Upstash Redis `cards` key currently holds exactly the 11 credit cards (all `cardType: 'credit'`, all with `applyUrl`) — confirmed via `src/data/cards.json` (the corpus originally seeded) and `06-05-SUMMARY.md`. The crypto fixture cards are **new ids appended to this same key**, not a separate key. | Code edit (new seed script) + one operator-run data-migration step (`node scripts/seed-crypto-cards.mjs`) against prod, `--dry-run` first, per D-09. |
| Live service config | None found for CoinMarketCap itself (no prior integration exists). **New** platform-level config this phase introduces: a Vercel Cron entry in `vercel.json` (code-tracked, fine) and — separately — the `COINMARKETCAP_API_KEY` / `CRON_SECRET` values, which must be added via the Vercel dashboard/CLI (`vercel env add`), **not** committed. | Manual: add both env vars in Vercel project settings (Production + Preview as needed) before the cron can do real work; code degrades gracefully if absent (Pattern 3). |
| OS-registered state | None — Vercel Cron registration lives entirely in the committed `vercel.json`; there is no separate OS-level scheduler (no launchd/cron/Task Scheduler equivalent for this project). | None. |
| Secrets/env vars | Two **net-new** secret names this phase introduces: `COINMARKETCAP_API_KEY`, `CRON_SECRET`. Neither currently exists in any env file this agent can read (repo `.env.local`/`.env.prod.local` access is correctly sandboxed — not inspected). Existing Redis secrets (`KV_REST_API_URL`/`KV_REST_API_TOKEN`) are reused unchanged for the new `crypto-rates` key (same client, same credentials, no new Redis secret needed). | Manual: `vercel env add COINMARKETCAP_API_KEY production` and `vercel env add CRON_SECRET production` (generate with e.g. `openssl rand -hex 32` per Vercel's own recommendation), then `vercel env pull` locally before running the seed script or testing the cron route locally. |
| Build artifacts | None — no compiled/installed artifact carries any of these names (no new npm package, no generated client). | None. |

**Nothing found in category "OS-registered state":** verified — this project's only scheduling mechanism is Vercel's own `vercel.json` `crons`, which is itself the tracked artifact; there is no parallel OS-level registration to reconcile.

## Common Pitfalls

### Pitfall 1: CoinMarketCap `symbol=` lookups return an array, not a single object

**What goes wrong:** Code written against `data[SYMBOL].quote.HKD.price` (singular object) either throws or silently reads `undefined`/wrong data once CMC's v2 response comes back as `data[SYMBOL] = [ {...}, {...} ]` for a ticker shared by multiple coins.
**Why it happens:** CoinMarketCap's v1 endpoint returned the single highest-ranked coin per symbol; v2 intentionally returns **all** coins sharing that ticker to avoid silently picking the wrong one — but that means the shape changed and naive object-path code from older tutorials/blog posts breaks. [CITED: CoinMarketCap v2 API documentation — symbol collision behavior]
**How to avoid:** Query by CMC numeric `id=` (see Pattern 4) with an explicit, validated `id → shortName ticker` map maintained in the cron route. Fail loud (log + skip that asset's write) if a configured ticker has no id mapping, rather than guessing.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'HKD')`, or a rate that silently doesn't match the intended asset (e.g. a low-cap token sharing "USDC"'s ticker outranking the real one in some edge case).

### Pitfall 2: Overwriting the whole rate table on a partial CMC failure

**What goes wrong:** If the cron route does `redis.set('crypto-rates', freshResults)` unconditionally, a CMC outage or credit exhaustion that only returns 3 of 5 configured tickers would **wipe out** the other 2 tickers' last-known-good rates, forcing those cards to `hkdEquivalent: null` even though a perfectly good rate existed an hour ago.
**Why it happens:** Treating the cron write as a "fresh snapshot" instead of a "merge update" — easy mistake to carry over from the mental model of a full price snapshot.
**How to avoid:** Read the existing `crypto-rates` table first, merge in only the tickers that successfully resolved this run, and write the merged object back — mirroring exactly how `backfill-card-type.mjs` merges into `cards` rather than replacing it. D-04 requires this explicitly.
**Warning signs:** Cards intermittently flipping to "value unavailable" on a schedule that correlates with cron runs rather than genuine staleness.

### Pitfall 3: Forgetting the rate table is optional everywhere it's threaded

**What goes wrong:** Making `rateTable` a required prop/param anywhere in the new chain (`page.tsx` → `HomeClient` → `recommendCards`) means a Redis outage, a not-yet-configured `COINMARKETCAP_API_KEY`, or a fresh empty `crypto-rates` key would throw instead of gracefully falling back to "crypto valued as null" (the exact behavior Phase 7 already guarantees).
**Why it happens:** TypeScript strictness pressure to "just make it required" once the plumbing is in place.
**How to avoid:** Keep `rateTable` optional (`HkdRateTable | undefined`) at every hop, matching `recommendCards`' own optional 4th parameter (already `rateTable?: HkdRateTable`). `readRateTableFromRedis()` should return `null`/`undefined` (never throw) on any Redis error, matching `readCardsFromRedis()`'s existing error-swallowing pattern.
**Warning signs:** A missing/misconfigured secret causing a 500 on the home page instead of a silently-degraded crypto segment.

### Pitfall 4: One reward unit per crypto card (unit-mixing)

**What goes wrong:** `valuateCrypto.ts`'s own doc comment (`card.ts`) locks in the assumption that a crypto card has exactly one reward asset — `hkdEquivalent = calc.rewardAmount * hkdPerUnit` implicitly assumes `rewardAmount` is denominated in a single named asset. A fixture (or later, real data) card with two different crypto reward rules (e.g. one rule paying BTC, another paying ETH) would silently value the wrong unit.
**Why it happens:** The engine's `rewardAmount` is a single number; it doesn't carry a per-rule asset tag beyond the card-level `rewardPrograms.crypto`.
**How to avoid:** Keep every crypto-card fixture (and later, real card) to a single crypto reward asset. If a real card genuinely pays multiple assets, that's a schema extension for a later phase — flag it, don't force it into this phase's fixture.
**Warning signs:** A card's valued HKD amount looking implausibly high or low relative to its stated reward rate.

### Pitfall 5: `health-check.js` does NOT validate env vars — false sense of safety

**What goes wrong:** Assuming the existing `npm run build`/`npm run dev` gate (`scripts/health-check.js`) will catch a missing `COINMARKETCAP_API_KEY` or `CRON_SECRET` before deploy.
**Why it happens:** The gate's name ("health check") suggests broader validation than it performs.
**How to avoid:** Read the actual script (confirmed in this research): it only checks for the existence of specific critical **files/directories** and `node_modules` — it has zero awareness of environment variables. This is actually convenient for D-02a's graceful-degradation requirement (a missing key must NOT break the build), but don't rely on it to catch a misconfigured secret before deploy; that's Ops-Grace's / manual `vercel env ls` job.
**Warning signs:** None at build time — the failure mode is silent (cron just no-ops) until someone checks the Vercel Cron logs or the `crypto-rates` key stays empty.

## Code Examples

Verified patterns from official sources (see Patterns 2-4 above for full code):

### CRON_SECRET verification (official, verbatim)
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs
import type { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json({ success: true });
}
```

### `vercel.json` crons entry
```json
// Source: https://vercel.com/docs/cron-jobs/quickstart
{
  "crons": [
    { "path": "/api/cron/refresh-rates", "schedule": "0 3 * * *" }
  ]
}
```
Note: this project's `vercel.json` already has other top-level keys (`buildCommand`, `regions`, `headers`, etc.) — add `"crons"` as a new sibling key, do not replace the file.

### CTA `rel` attribute change (AFF-01)
```tsx
// src/components/CardRecommendationList.tsx:460-475 — only the rel attribute changes
{card.applyUrl && (
  <a
    href={card.applyUrl}
    target="_blank"
    rel="sponsored nofollow noopener"  // was: "noopener noreferrer"
    className="..."
  >
    {/* unchanged */}
  </a>
)}
```
Note: `noreferrer` is dropped in favor of the AFF-01-mandated `sponsored nofollow noopener` triplet — `sponsored` is the search-engine-facing affiliate-disclosure signal, `nofollow` reinforces it for crawlers that don't recognize `sponsored`, `noopener` is the security-relevant `target="_blank"` tab-nabbing mitigation (kept). If cross-origin `Referer` leakage to the affiliate's analytics is a concern, that's a product decision outside this research's scope — the locked D-05 wording is exactly `rel="sponsored nofollow noopener"`, so implement it verbatim.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| CMC v1 quotes/latest — one object per symbol | CMC v2 quotes/latest — array per symbol (collision-safe) | CMC's v1→v2 migration (v1 endpoints marked deprecated in current docs) | Any code copied from an older CMC v1 tutorial will read the wrong shape; use v2 with id-based lookup as documented here |

**Deprecated/outdated:** CoinMarketCap's v1 cryptocurrency endpoints are marked deprecated in current documentation — use v2 throughout, as specified in D-02.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact CMC numeric `id` values for the fixture's chosen tickers (e.g. BTC=1, ETH=1027, USDC=3408) were not individually re-verified against CMC's live `/v1/cryptocurrency/map` endpoint in this research session — the ids shown in Pattern 4 are widely-known, stable CMC ids from training knowledge. | Architecture Patterns → Pattern 4 | If wrong, the cron would fetch the wrong asset's price (or a 400 from CMC) — low blast radius since the merge-write (Pitfall 2) means a bad fetch just leaves that one ticker's last-known value stale, never fabricates a wrong number silently swapped in. Planner should have the implementing task verify each id against CMC's own map endpoint or web UI before shipping. |
| A2 | CoinMarketCap's exact behavior on monthly-credit exhaustion (does it return HTTP 429, or a 200 with an error payload, or something else) was not found explicitly in the official pricing/FAQ pages fetched this session — only community sources describe a 429. | Architecture Patterns → Pattern 3/4 (error handling) | If the actual status code differs, the cron's error-handling branch (log + leave last-known table untouched) should still work as long as it treats **any non-2xx or malformed-JSON response** as a soft failure rather than special-casing 429 specifically — recommend coding defensively for "not 2xx" rather than hard-coding 429. |
| A3 | The recommended Redis key name `crypto-rates` for the new rate table is a naming choice (Claude's Discretion per CONTEXT.md), not a value found in any existing code or doc. | Architecture Patterns → Pattern 2 / diagram | Low risk — purely a naming choice; changing it later is a one-line edit in two files (`redisStorage.ts` constant + the cron route), no migration needed since it's a brand-new key. |
| A4 | The fixture file location `src/data/crypto-cards.fixture.json` is a recommendation based on the existing convention of non-corpus files living alongside `cards.json` (`card-template.json`, `examples/`, `pending.json`) — not an explicit instruction from CONTEXT.md. | Architecture Patterns → Recommended Project Structure | Low risk — purely organizational; the planner/executor is free to relocate it (e.g. under `scripts/fixtures/`) without any functional impact, as long as both the seed script and any tests reference the same path. |

## Open Questions

1. **Exact CMC numeric IDs for the final fixture asset list**
   - What we know: the fixture composition itself is Claude's Discretion (per CONTEXT.md) and not yet chosen; CMC ids for major assets (BTC, ETH, USDC) are stable and well-known, but should be confirmed against CMC's own reference at implementation time rather than trusted from training data (see A1).
   - What's unclear: which exact assets the planner will pick for the ≈4-5-card fixture, and therefore which ids need confirming.
   - Recommendation: the executing plan should include a small, explicit "confirm CMC id for ticker X" step (grep CMC's public currency pages or hit `/v1/cryptocurrency/map?symbol=X` once, cache the result in the `CMC_ID_TO_TICKER` map) rather than trusting memorized ids silently.

2. **Exact cron cadence within the free 15,000-credit/month budget**
   - What we know: Basic tier = 15,000 credits/month, 50 req/min; Phase 7's staleness tolerance is 24h; a single batched call (one `convert=HKD`, N symbols in one request) very likely costs a small, roughly-fixed number of credits per call regardless of N (CMC's public pricing page did not give an explicit per-symbol multiplier for `id=`/`symbol=` — only that each **additional convert currency** beyond the first costs more).
   - What's unclear: the exact credit cost of a single call requesting HKD conversion for N assets — official docs consulted this session state the credit multiplier for *additional convert currencies*, not for *additional symbols in one request*.
   - Recommendation: a once-daily cron (`0 3 * * *`, i.e. ~11am HKT) uses at most 31 calls/month regardless of the per-call credit cost multiplier for a small fixture (≤5 assets) — comfortably inside 15,000 credits under any plausible per-call cost. No further budget verification needed unless the real-data phase (RQ-001) grows the asset list into the hundreds.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vercel CLI | `vercel env add`/`vercel env pull` for the two new secrets | ✓ | 54.18.6 | — |
| Node.js | Cron route runtime, seed script | ✓ | v22.23.1 | — |
| `@upstash/redis` | Rate-table read/write | ✓ (already installed) | 1.36.1 | — |
| `COINMARKETCAP_API_KEY` (Vercel env) | Cron route's actual CMC fetch | ✗ (not yet provisioned — net-new secret this phase) | — | Route no-ops gracefully (Pattern 3); page falls back to `rateTable: undefined` → crypto valued `null` per Phase 7 (no user-facing error) |
| `CRON_SECRET` (Vercel env) | Cron route auth gate | ✗ (not yet provisioned — net-new secret this phase) | — | Route must treat an unset `CRON_SECRET` as "reject all" (the official pattern's `!cronSecret \|\| ...` check already does this) — never treat a missing secret as "allow all" |
| Vercel Cron (platform feature) | Scheduling the rate refresh | ✓ (Thirdvisor Pro team — no per-plan minimum-interval restriction, confirmed) | — | — |
| CoinMarketCap Basic API access | Real HKD price data | Unconfirmed — no existing CMC account/key referenced anywhere in the repo | — | Same graceful no-op as above until a key is provisioned |

**Missing dependencies with no fallback:** none — every missing dependency (both new secrets, the CMC key) has an explicit, already-designed graceful-degradation path per D-02a/D-04 and Phase 7's existing fail-safe.

**Missing dependencies with fallback:** `COINMARKETCAP_API_KEY`, `CRON_SECRET` — both net-new secrets to be provisioned via `vercel env add` before the cron does real work; the system functions (crypto simply valued as "unavailable") without them in the interim.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 [VERIFIED: repo package.json] |
| Config file | `vitest.config.ts` (repo root) — `environment: 'node'`, `globals: true`, `@` alias → `src` |
| Quick run command | `npx vitest run src/lib/data/__tests__/<file>.test.ts` (or the equivalent new test file path) |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AFF-01 | Apply CTA renders `rel="sponsored nofollow noopener"` only when `applyUrl` exists | unit/component (render-level string assertion, or a lightweight snapshot on the rendered anchor's `rel` attribute) | `npx vitest run src/components/__tests__/CardRecommendationList.test.tsx -x` | ❌ Wave 0 — no component test file exists yet for this component |
| AFF-02 (loadCards clause) | A card without `applyUrl` still passes `loadCards()`/`loadCardsSync()` validation and is returned | unit | `npx vitest run src/lib/data/__tests__/loadCards.test.ts -x` | ❌ Wave 0 |
| AFF-02 (ranking-neutrality clause, D-07) | Two structurally-identical cards, one with `applyUrl` one without, rank identically (same net value ⇒ same tie-break order) | unit, structural | `npx vitest run src/lib/engine/__tests__/*.test.ts -x` (extend an existing engine test file, or add a new one) | Partial — existing engine test files (`hkEligible.test.ts`, `segmentation.test.ts`) are the right home for this; no dedicated affiliate-neutrality test exists yet |
| D-02/D-04 (rate table cron logic) | CMC fetch failure preserves last-known rates; success writes fresh `asOf`; missing key handled gracefully | unit (mock `fetch`, mock Redis client) | `npx vitest run src/app/api/cron/__tests__/refresh-rates.test.ts -x` | ❌ Wave 0 — new route, no test yet |
| D-09 (merge-aware seed) | Seed script skips existing ids, appends new ones, never touches the 11 credit cards; `--dry-run` performs no write | integration (can run against a local/mocked Redis, or exercise the pure merge function in isolation if the script is refactored to export a testable `mergeCards()` helper) | `npx vitest run scripts/__tests__/seed-crypto-cards.test.ts -x` (recommend extracting the merge logic into a small testable function, mirroring how `backfill-card-type.mjs`'s logic is currently inline and untested — consider whether to add a thin exported helper for testability) | ❌ Wave 0 — no prior script has unit tests; `backfill-card-type.mjs` itself is untested (verified end-to-end manually per its own SUMMARY) |

### Sampling Rate

- **Per task commit:** run the specific new/changed test file(s) via `npx vitest run <file>`.
- **Per wave merge:** `npm test` (full suite) — must stay green including the Phase 7 byte-identical fiat snapshot.
- **Phase gate:** Full suite green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/lib/data/__tests__/loadCards.test.ts` — covers AFF-02 (applyUrl-optional validation)
- [ ] `src/components/__tests__/CardRecommendationList.test.tsx` — covers AFF-01 (rel attribute + conditional render); note no component-test tooling (`@testing-library/react` or similar) is installed yet — this is a net-new devDependency the planner must add if a true render test is desired, or the check can be done as a plain string-template unit test against a smaller extracted render helper if avoiding a new devDependency is preferred (Claude's Discretion)
- [ ] `src/lib/engine/__tests__/affiliateNeutrality.test.ts` (or extend an existing file) — covers D-07 ranking-neutrality
- [ ] `src/app/api/cron/__tests__/refresh-rates.test.ts` — covers D-02/D-04 cron fetch/merge/failure logic (mock `global.fetch` and the Redis client)
- [ ] `scripts/__tests__/seed-crypto-cards.test.ts` — covers D-09 merge-aware seed logic; consider extracting a pure `mergeCards(existing, incoming)` function from the script so it's testable without a live/mocked network Redis client

*(No existing test infrastructure covers any of these five phase-new surfaces — all are Wave 0 gaps.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Yes (cron endpoint) | `CRON_SECRET` Bearer-token check, official Vercel pattern (Pattern 3) — constant-time comparison is not strictly required here since Vercel controls both sides and the secret is high-entropy, but a straightforward `!==` string check is what the official docs themselves use |
| V3 Session Management | No | This phase adds no user-facing session/auth surface |
| V4 Access Control | Yes (cron endpoint) | Same `CRON_SECRET` check is the entire access-control boundary for `/api/cron/refresh-rates` — must reject BEFORE any CMC call or Redis write, not after |
| V5 Input Validation | Yes | CMC response JSON must be validated before use: reject non-numeric/non-positive `price` values (mirrors `valuateCrypto.ts`'s own `!(rate.hkdPerUnit > 0)` guard) rather than trusting the external API's shape blindly; the ticker→id map must be an explicit allowlist (never derive a Redis key from unsanitized external data) |
| V6 Cryptography | No | No cryptographic operations introduced (CRON_SECRET is a shared-secret comparison, not a crypto primitive this phase implements) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Cron endpoint publicly triggerable (anyone could POST/GET it and force a CMC call, burning API credits, or attempt to write bogus rates) | Elevation of Privilege / Denial of Service | `CRON_SECRET` Bearer check, reject-first (401 before any work), per Pattern 3 — this is the standard, Vercel-documented mitigation and should be applied verbatim, not reinvented |
| CoinMarketCap API key leakage (public repo) | Information Disclosure | Key lives ONLY in Vercel env vars, read via `process.env.COINMARKETCAP_API_KEY` inside a server-only route handler; never inline in `vercel.json`, never in any committed file, never referenced from client-bundled code (`HomeClient.tsx` must never import anything that touches this env var) |
| Merge-seed script writing to production Redis | Tampering | `--dry-run` first, independent read-back verification after write (both already the established pattern from `backfill-card-type.mjs`), and the script must be run manually by an operator (not wired into CI/automated deploy) given it mutates live data |
| Poisoned/wrong rate leading to bad valuation (a CMC response with a garbage/zero/negative price, or a ticker-collision mismatch feeding the wrong coin's price into a card's ticker slot) | Tampering / Repudiation | Input validation at the fetch boundary (V5 above) — reject non-positive/non-numeric prices before writing to Redis; `valuateCrypto.ts`'s own existing guard (`!(rate.hkdPerUnit > 0)`) is a second, independent backstop already in place from Phase 7, so even a bad write can't silently rank a bogus value — worst case is "value unavailable," never a fabricated number |

## Sources

### Primary (HIGH confidence)
- Repo source files (read directly this session): `src/lib/engine/recommendCards.ts`, `src/lib/engine/valuateCrypto.ts`, `src/types/card.ts`, `src/types/recommendation.ts`, `src/lib/data/loadCards.ts`, `src/lib/data/redisStorage.ts`, `src/lib/data/cardRepository.ts`, `scripts/backfill-card-type.mjs`, `scripts/seed-redis.mjs`, `src/components/CardRecommendationList.tsx`, `src/components/HomeClient.tsx`, `src/app/[locale]/page.tsx`, `vercel.json`, `scripts/health-check.js`, `vitest.config.ts`, `package.json`, `src/lib/engine/__tests__/hkEligible.test.ts`
- `.planning/phases/07-.../07-VERIFICATION.md` — the locked engine contract this phase feeds

### Secondary (MEDIUM/CITED confidence)
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) — cron expression syntax, `vercel.json` shape, cron mechanics
- [Vercel Cron Jobs quickstart](https://vercel.com/docs/cron-jobs/quickstart) — `vercel.json` example, App Router route handler shape
- [Vercel Managing Cron Jobs docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — official `CRON_SECRET` pattern (verbatim code sample), idempotency/concurrency guidance, Hobby-vs-other-plan accuracy differences
- [CoinMarketCap API pricing page](https://coinmarketcap.com/api/pricing/) — Basic tier: 15,000 credits/month, 50 req/min
- CoinMarketCap v2 quotes/latest documentation (via WebSearch synthesis) — symbol batching, `convert=HKD`, symbol-collision array-response behavior, `id`-based lookup recommendation

### Tertiary (LOW confidence — flagged in Assumptions Log)
- Community sources (blog posts, community docs) on CMC 429/credit-exhaustion exact behavior — official docs did not state this explicitly this session (A2)
- Specific CMC numeric IDs (BTC=1, ETH=1027, USDC=3408) — from training knowledge, not re-verified against CMC's live map endpoint this session (A1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, every tool already verified in the repo's own `package.json`
- Architecture: MEDIUM-HIGH — Vercel cron/auth mechanics confirmed against official docs fetched directly; Redis/engine wiring confirmed against actual repo source
- Pitfalls: MEDIUM — CMC symbol-collision behavior corroborated across multiple independent search results and matches CMC's own documented v1→v2 rationale; credit-exhaustion HTTP status is the one genuinely unconfirmed detail (LOW, flagged)

**Research date:** 2026-07-25
**Valid until:** 30 days for the Vercel/Redis mechanics (stable platform APIs); 7-14 days for CoinMarketCap pricing/credit specifics (external vendor terms can change) — re-verify CMC pricing page if implementation is delayed past early August 2026
