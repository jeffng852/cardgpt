# Phase 8: Bulk Crypto Seed & Affiliate / Disclosure - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 11 (6 new, 4 modified, 1 new fixture)
**Analogs found:** 9 / 11 (2 net-new/greenfield, flagged below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/seed-crypto-cards.mjs` | utility (data-migration script) | batch / file-I/O + CRUD | `scripts/backfill-card-type.mjs` | exact |
| `src/app/api/cron/refresh-rates/route.ts` | route (cron handler) | event-driven / request-response | `src/app/api/admin/stats/route.ts` (shape) + Vercel official `CRON_SECRET` doc pattern (auth) | role-match (no prior cron in repo — partial/net-new) |
| `src/lib/data/*` CMC fetch helper (e.g. `src/lib/data/fetchCryptoRates.ts` or colocated in the route) | service (external-fetch client) | request-response / transform | `src/lib/ai/extractRewards.ts` (`extractWithOpenRouter`) | role-match |
| `readRateTableFromRedis()` / `writeRateTableToRedis()` in `src/lib/data/redisStorage.ts` | utility (data-access) | CRUD | `readCardsFromRedis()` in same file (`src/lib/data/redisStorage.ts:65-79`) | exact |
| `src/data/crypto-cards.fixture.json` | config/fixture | file-I/O | `src/data/cards.json` (schema) | exact |
| `src/lib/data/__tests__/loadCards.test.ts` | test | CRUD-validation | `src/lib/engine/__tests__/hkEligible.test.ts` (vitest conventions, corpus fixture pattern) | role-match |
| `src/lib/engine/__tests__/affiliateNeutrality.test.ts` | test | transform/structural | `src/lib/engine/__tests__/hkEligible.test.ts` | exact |
| `src/app/api/cron/__tests__/refresh-rates.test.ts` | test | event-driven, mocked fetch+Redis | `src/lib/engine/__tests__/valuateCrypto.test.ts` (vitest style) — no existing route-handler test to clone; net-new pattern for mocking `fetch`/Redis | partial (no route test precedent) |
| `scripts/__tests__/seed-crypto-cards.test.ts` | test | batch/file-I/O | `src/lib/engine/__tests__/valuateCrypto.test.ts` (vitest style only) — no script has ever been unit-tested (`backfill-card-type.mjs` is untested) | partial (no script-test precedent) |
| `src/components/__tests__/CardRecommendationList.test.tsx` | test (component) | UI/render | **none** — no component-test tooling installed | **no analog — flagged** |
| Modified: `src/lib/data/loadCards.ts` (applyUrl drop), `src/components/CardRecommendationList.tsx` (CTA rel), `src/components/HomeClient.tsx` (rateTable prop), `vercel.json` (crons key) | edits to existing files | n/a | themselves (surrounding-convention notes below) | n/a |

## Pattern Assignments

### `scripts/seed-crypto-cards.mjs` (utility, batch/CRUD)

**Analog:** `scripts/backfill-card-type.mjs` (full file read — 118 lines)

Clone this file's skeleton almost verbatim; only the mutation step changes (append-by-id instead of set-missing-field). Concrete conventions to copy:

**Credential resolution** (lines 27-38, identical precedence to `redisStorage.ts`):
```js
const url =
  process.env.REAL_STORAGE_KV_REST_API_URL ||
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.REAL_STORAGE_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) { console.error(...); process.exit(1); }
const redis = new Redis({ url, token });
```

**`--dry-run` flag** (line 28): `const DRY_RUN = process.argv.includes('--dry-run');`

**Read → refuse-if-empty guard** (lines 62-70): fetch `cards` key, `process.exit(1)` if null/no-array — this backfill guard becomes, in the new script, a "refuse if the key is *completely* empty" check (still don't silently create the corpus from nothing).

**Mutate-in-place loop** (lines 76-83) — replace the `if (!card.cardType)` set-field logic with:
```js
let added = 0;
for (const fixtureCard of fixtureCards) {
  if (cards.some((c) => c.id === fixtureCard.id)) continue; // idempotent skip
  cards.push(fixtureCard);
  added++;
}
```

**Timestamp + write-back** (lines 96-102):
```js
database.lastUpdated = new Date().toISOString();
if (database.metadata) database.metadata.totalCards = cards.length;
await redis.set(CARDS_KEY, database);
```

**Independent read-back verification** (lines 105-118) — re-`redis.get`, never trust the in-memory object, sample-log one card, `process.exit(1)` on any discrepancy.

**Do NOT use `scripts/seed-redis.mjs` as the template** — it's fresh-seed-only (refuses on a populated store) and would either no-op or, if modified, risk clobbering the 11 live cards (per D-09 and the anti-pattern called out in RESEARCH.md).

---

### `src/app/api/cron/refresh-rates/route.ts` (route, event-driven)

**Analog for file shape/imports/response conventions:** `src/app/api/admin/stats/route.ts` (full file, 32 lines) — simplest existing route: `NextRequest`/`NextResponse` import, single exported `GET`, `dynamic = 'force-dynamic'`, try/catch → `NextResponse.json(..., { status })` on error.

**Analog for auth-gate shape:** `src/app/api/admin/cards/route.ts` lines 37-40 — the `if (!isAuthenticatedFromRequest(request)) return unauthorizedResponse();` guard-first pattern. The cron route's equivalent (bespoke, no existing helper — this repo has no prior Bearer-token route) should mirror that "reject before any work" placement, using the **official Vercel `CRON_SECRET` pattern** (RESEARCH.md Pattern 3, verbatim):
```ts
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const cmcKey = process.env.COINMARKETCAP_API_KEY;
  if (!cmcKey) {
    console.warn('[cron/refresh-rates] COINMARKETCAP_API_KEY not set — skipping refresh.');
    return Response.json({ skipped: true });
  }
  // ... fetch + map + merge-write ...
  return Response.json({ success: true });
}
```

**No prior cron/scheduled route exists in this repo** — this is genuinely greenfield for the auth mechanism (flagged as partial match). Follow the admin routes' `try/catch` + explicit-status-response convention for the body of the handler even though the auth gate itself is new.

---

### CoinMarketCap fetch client (service, request-response/transform)

**Analog:** `src/lib/ai/extractRewards.ts`, function `extractWithOpenRouter` (lines 143-191) — closest existing "call external HTTP API with an API-key header, parse JSON, degrade gracefully" pattern in the repo (there is no prior Redis-adjacent fetch client, so this AI-extraction module is the best transform/fetch analog).

**Imports/shape convention to copy:**
```ts
const response = await fetch(EXTERNAL_URL, {
  method: 'GET', // CMC quotes/latest is a GET, unlike this POST analog
  headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY! },
});
if (!response.ok) {
  throw new Error(`CMC ${response.status}`); // non-2xx → treat as soft failure at the call site
}
const data = await response.json();
```

**Error handling convention** (lines 183-190, `extractWithOpenRouter`'s catch block) — never throw all the way up into a user-facing 500; log + return a structured "unavailable" result. For the CMC client this becomes: log + return `{}`/empty resolved-tickers map so the cron's merge-write step (Pattern 4 in RESEARCH.md) leaves the last-known table untouched (D-04) — do NOT propagate the exception into the route in a way that skips the graceful-degradation path.

**Use RESEARCH.md's own Pattern 4 code verbatim for the CMC-specific id-based lookup** (id→ticker map, `/v2/cryptocurrency/quotes/latest?id=...&convert=HKD`) — this is the authoritative, already-drafted implementation; `extractRewards.ts` only supplies the *house style* for structuring a fetch-and-degrade helper, not the CMC-specific mechanics.

---

### `readRateTableFromRedis()` (utility, CRUD/data-access)

**Analog:** `readCardsFromRedis()` in `src/lib/data/redisStorage.ts` (lines 65-79, same file the new function lives in) — clone directly, changing only the key and type:

```ts
// existing pattern (lines 65-79)
export async function readCardsFromRedis(): Promise<CardDatabase | null> {
  try {
    console.log('[Redis] Reading cards from Redis...');
    const data = await getRedis().get<CardDatabase>(CARDS_KEY);
    if (data) { ... return data; }
    console.log('[Redis] No cards found in Redis');
    return null;
  } catch (error) {
    console.error('[Redis] Failed to read cards:', error);
    return null;
  }
}
```

New function is the same shape against a new `RATES_KEY = 'crypto-rates'` constant, returning `HkdRateTable | null`, reusing the same lazy `getRedis()` singleton (lines 20-35) — no new client instance, no new credential-resolution code. A `writeRateTableToRedis()` companion (for the cron route) should mirror whatever `writeCardsToRedis` does elsewhere in this file (check the write counterpart in the same module) but must **merge**, not overwrite — see Pitfall 2 in RESEARCH.md; `backfill-card-type.mjs`'s read-mutate-write shape is the merge template even though this is a `.ts` module not a script.

---

### `src/data/crypto-cards.fixture.json` (fixture)

**Analog:** `src/data/cards.json` (schema — read lines 1-40 above) — same `CardDatabase` shape (`{ cards: [...], lastUpdated, version, metadata }`), each card object matching the `CreditCard` type (`id`, `cardType: 'crypto'`, `name`, `issuer`, `rewards[]`, `fees`, `isActive`, `lastUpdated`, plus `rewardPrograms.crypto.{name,shortName}` and `hkEligible` per Phase 7's `types/card.ts`). Keep the fixture small (~4-5 cards) covering: stablecoin, volatile asset, a staking-gated rule, and a null-rate (unmapped ticker) case, per RESEARCH.md's Fixture Composition discretion note.

---

### Test files (vitest conventions)

**Analog for all new `*.test.ts` files:** `src/lib/engine/__tests__/valuateCrypto.test.ts` and `src/lib/engine/__tests__/hkEligible.test.ts` — both establish the house style:
- `import { describe, it, expect } from 'vitest';`
- Small typed factory helpers at the top of the file (e.g. `calc()`, `cryptoCard()`, `fiatCard()`) rather than inline literals in every test.
- One `describe` block per function/module, one `it` per behavior/edge-case, comment header block explaining *why* the test exists and citing the requirement ID (e.g. `CRY-04 / DEC-VAL-A`).
- Null/degrade-not-throw assertions are the dominant pattern (`expect(res.hkdEquivalent).toBeNull()`) — mirror this for the cron/seed-script failure-path tests (D-04, D-09).
- `hkEligible.test.ts` also shows importing the real corpus (`cardsData` from `@/data/cards.json`) and casting via `as unknown as CreditCard[]` — reuse this for `loadCards.test.ts` and `affiliateNeutrality.test.ts` if real-corpus interaction is needed; otherwise build minimal fixtures inline as `valuateCrypto.test.ts` does.

**`src/lib/data/__tests__/loadCards.test.ts`** — no existing test file for this module; use `hkEligible.test.ts`'s "minimal card factory + real corpus" style. Directly test both the removed hard-drop (a card without `applyUrl` must still validate) and that existing corpus cards (which all have `applyUrl`) are unaffected.

**`src/lib/engine/__tests__/affiliateNeutrality.test.ts`** — exact-match analog `hkEligible.test.ts` (same "gate/neutrality assertion against `recommendCards()`" shape, same corpus-import style). Two structurally-identical cards differing only in `applyUrl` presence must produce identical ranking/tie-break order (D-07) — assert on `recommendCards()`'s output order directly, following `hkEligible.test.ts`'s pattern of calling the real engine function rather than mocking it.

**`src/app/api/cron/__tests__/refresh-rates.test.ts`** — **no existing route-handler test in this repo to clone** (flagged partial). Use `valuateCrypto.test.ts`'s vitest style/structure (describe/it, typed factories, degrade-not-throw assertions) but the route-specific technique (mocking `global.fetch` and the `@upstash/redis` client) has no local precedent — plan to use `vi.stubGlobal('fetch', ...)`/`vi.mock('@upstash/redis', ...)` per vitest's own docs, not a repo pattern.

**`scripts/__tests__/seed-crypto-cards.test.ts`** — **no script in this repo has ever been unit-tested** (`backfill-card-type.mjs` itself is untested per its own SUMMARY — flagged partial). RESEARCH.md's own recommendation (Wave 0 Gaps) is to extract a pure `mergeCards(existing, incoming)` helper from the script specifically so it becomes testable in isolation, then test that helper with `valuateCrypto.test.ts`'s vitest style (no Redis/file-I/O in the test itself).

**`src/components/__tests__/CardRecommendationList.test.tsx`** — **NO ANALOG, flag explicitly.** This repo has **zero** component-test tooling installed (no `@testing-library/react`, no `jsdom`/`happy-dom` environment in `vitest.config.ts` — confirmed: `environment: 'node'` only, `include: ['src/**/*.{test,spec}.{ts,tsx}']` with no DOM setup). Two options, both explicitly called out in RESEARCH.md's Wave 0 Gaps:
  1. Add `@testing-library/react` + a `jsdom`/`happy-dom` vitest environment (net-new devDependency — flag for Package Legitimacy Gate per this repo's public-posture convention) and write a true render test.
  2. Avoid the new dependency: extract the CTA's `rel`/conditional-render logic into a small pure helper function and unit-test *that* in plain vitest, avoiding a full component-render test.
  Planner must pick one explicitly rather than silently assuming testing-library is available.

---

### Modified files — surrounding conventions to preserve

**`src/lib/data/loadCards.ts`** (delete lines 49-52, the `applyUrl` hard-drop inside `validateCard`) — leave every other validation branch (`id`, `name`, `issuer`, `rewards[]`, `fees`) untouched; `cardRepository.ts`'s separate validator already treats `applyUrl` as optional, so this change only needs to bring `loadCards.ts`'s validator in line, not touch `cardRepository.ts`.

**`src/components/CardRecommendationList.tsx`** (line ~464, the `<a>` inside `{card.applyUrl && (...)}`) — only the `rel` string changes, from `"noopener noreferrer"` to `"sponsored nofollow noopener"` (D-05, verbatim). Do not touch the surrounding `target="_blank"`, className, or the conditional-render guard itself — that guard already implements "renders only when a link exists" (AFF-01) with no code change needed there.

**`src/components/HomeClient.tsx`** (props interface + `handleSubmit`, lines ~27-51) — add `rateTable?: HkdRateTable` to `HomeClientProps` (optional, mirroring `recommendCards`'s own optional 4th param) and thread it as the 4th positional arg to the existing `recommendCards(cards, result.transaction, preferences)` call (line ~45-49) → becomes `recommendCards(cards, result.transaction, preferences, rateTable)`. No other logic in this file changes.

**`vercel.json`** — add a new top-level `"crons"` array **sibling** to the existing `buildCommand`/`devCommand`/`framework`/`regions`/`env`/`headers` keys; do not restructure or remove any existing key.

## Shared Patterns

### Redis credential resolution (KV_* precedence)
**Source:** `src/lib/data/redisStorage.ts` lines 24-34 (also duplicated verbatim in both `scripts/backfill-card-type.mjs` and `scripts/seed-redis.mjs`)
**Apply to:** the new seed script, and any new Redis-touching code — always resolve `REAL_STORAGE_KV_REST_API_URL → KV_REST_API_URL → UPSTASH_REDIS_REST_URL` (+ matching `_TOKEN`), never hardcode or invent a new env var name for Redis access.

### Merge-aware read→mutate→write→verify (never blanket-overwrite)
**Source:** `scripts/backfill-card-type.mjs` (full file)
**Apply to:** `seed-crypto-cards.mjs` (append-by-id) AND the new `crypto-rates` Redis write path in the cron route (merge per-ticker, never `redis.set` a fresh snapshot) — this is the single most load-bearing shared pattern in the phase; both write paths must independently implement "read existing → merge only what changed → write whole object back → read back to verify."

### Error handling: log + return degraded state, never throw to the user
**Source:** `readCardsFromRedis()` (`src/lib/data/redisStorage.ts:65-79`) and `extractWithOpenRouter` (`src/lib/ai/extractRewards.ts:143-191`)
**Apply to:** `readRateTableFromRedis()`, the CMC fetch client, and the cron route as a whole — every failure mode (Redis error, CMC non-2xx, missing env var) must degrade to a safe fallback (`null`/skip/last-known-value), never an unhandled throw or 500, matching Pitfall 3 in RESEARCH.md.

### No-cache admin-style JSON response wrapper
**Source:** `noCacheResponse()` helper in `src/app/api/admin/cards/route.ts` (lines 22-31)
**Apply to:** optional for the cron route (it's not user-facing/browser-cached, so this is lower priority than for admin routes) but the `try/catch` → explicit-status `NextResponse.json`/`Response.json` convention it embodies should still be followed for consistency with every other route in `src/app/api/**`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/__tests__/CardRecommendationList.test.tsx` | test (component) | UI/render | No component-test tooling (`@testing-library/react`, jsdom/happy-dom environment) installed anywhere in this repo; `vitest.config.ts` is `environment: 'node'` only. Planner must decide: add the devDependency (flag for Package Legitimacy Gate) or test an extracted pure helper instead of the rendered component. |
| `src/app/api/cron/refresh-rates/route.ts` (auth-gate specifically) | route | event-driven | No prior Bearer-token/cron-authenticated route exists in this repo (all existing routes use cookie/session admin auth via `isAuthenticatedFromRequest`). The official Vercel `CRON_SECRET` doc pattern (already fully drafted in RESEARCH.md Pattern 3) is the source of truth here, not a repo analog. |

## Metadata

**Analog search scope:** `scripts/`, `src/app/api/**`, `src/lib/data/`, `src/lib/ai/`, `src/lib/engine/__tests__/`, `src/components/`, `src/data/`, `vitest.config.ts`, `package.json`, `vercel.json`
**Files scanned:** ~25 (targeted reads, no full-repo scan needed — RESEARCH.md had already identified most candidate files)
**Pattern extraction date:** 2026-07-25
