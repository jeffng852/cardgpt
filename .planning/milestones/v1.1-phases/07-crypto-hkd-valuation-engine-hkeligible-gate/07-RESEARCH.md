# Phase 7: Crypto→HKD Valuation Engine & `hkEligible` Gate - Research

**Researched:** 2026-07-24
**Domain:** TypeScript recommendation-engine extension + first-time vitest setup (Next 16 / React 19 / TS 5 / ESM)
**Confidence:** HIGH (all engine claims verified against source; vitest version verified against npm registry)

## Summary

Phase 7 is **structurally low-risk** because the operator's locked decision DEC-VAL-B keeps crypto entirely out of the fiat pipeline. The safest implementation partitions eligible cards into a **fiat set (`cardType === 'credit'`)** and a **non-fiat/crypto set** *before* the existing sort runs, then runs the current `recommendCards()` sort on the fiat set **unchanged** and values/sorts the crypto set separately into a new **optional** `cryptoSegment` field on `RecommendationResult`. Because the fiat code path is byte-for-byte the same array through the same comparator, the "11-card rankings unchanged" regression is guaranteed by construction — the vitest snapshot is a safety net, not the sole defense. [VERIFIED: src/lib/engine/recommendCards.ts:50-146]

The only consumer of the return shape reads `recommendationResult.recommendations` and nothing else [VERIFIED: src/components/HomeClient.tsx:52], so **adding an optional `cryptoSegment?` field and an optional 4th `rateTable?` parameter is fully backward-compatible** — no existing call site or component changes.

vitest 4.1.10 is current and its engine requirement (`node ^20 || ^22 || >=24`) is satisfied by this machine (node v22.23.1) [VERIFIED: npm registry]. The pragmatic config is `environment: 'node'` (engine tests need no DOM), `globals: true` (the two pre-existing test files already use bare `describe/it/expect`), and a `resolve.alias` mapping `@`→`./src` (no extra dependency needed).

**Primary recommendation:** Partition-before-sort + additive return/param shape + `vitest run` with node env, globals, and an inline `@`→`src` alias. Value crypto via an injectable `HkdRateTable`; treat `minStaking` tiers as **not met by default** in `matchesRule` so the base un-staked rate is what's valued.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Crypto→HKD valuation | Engine (client-side pure fn) | — | Roadmap locks "no fetch inside client engine"; rate is injected like `cards` [VERIFIED: 07-CONTEXT.md:36] |
| Crypto segmentation | Engine (`recommendCards`) | — | DEC-VAL-B: segment produced where ranking is produced [VERIFIED: 07-CONTEXT.md:22-23] |
| `hkEligible` fail-closed gate | Engine (`recommendCards` filter) | — | CRY-05: recommender must never return ineligible cards; directory (data layer) still lists them [VERIFIED: 07-CONTEXT.md:37] |
| Staking-gate (`minStaking`) handling | Engine (`calculateReward.matchesRule`) | — | Un-staked default is a rule-matching decision, sits where `minMonthlySpending` is handled [VERIFIED: calculateReward.ts:162-166] |
| Rate-table provision (injection) | Caller (page/server) | Engine consumes | Engine stays pure; caller supplies the static table |
| Crypto-segment UI | Deferred (Phase 9/11) | — | Out of scope [VERIFIED: 07-CONTEXT.md:16, 73-74] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | ^4.1.10 | Test runner (dev-only, first in repo) | Vite-native, ESM-first, zero-config TS via esbuild — the natural fit for a Next/ESM/TS repo with no existing Jest [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vitest/coverage-v8` | ^4.x | Coverage reports | Only if the plan wants a coverage gate; NOT required for TECH-01. Skip to honor single-artifact simplicity. |
| `vite-tsconfig-paths` | ^6.1.1 | Auto-reads `@/*` from tsconfig | Alternative to inline `resolve.alias`; adds a dependency — **not recommended** here [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resolve.alias` inline | `vite-tsconfig-paths` | Auto-syncs with tsconfig but adds a dep; the single `@`→`src` alias is trivial to hand-write. Prefer inline (fewer moving parts). |
| `vitest` | `jest` + `ts-jest`/`babel` | Jest needs ESM/TS transform config wrestling in a `moduleResolution: bundler` repo; vitest reads the vite/esbuild pipeline for free. |
| `globals: true` | explicit `import { describe, it, expect } from 'vitest'` | Existing two test files use bare globals [VERIFIED: engine.test.ts:50]; `globals: true` runs them without edits. Explicit imports are cleaner long-term but require touching those files. |

**Installation:**
```bash
npm install -D vitest@^4.1.10
```

**Version verification (done this session):**
- `npm view vitest version` → `4.1.10` [VERIFIED: npm registry]
- `vitest@4.1.10` engines → `node ^20.0.0 || ^22.0.0 || >=24.0.0`; local `node -v` → `v22.23.1` ✓ [VERIFIED]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `vitest` | npm | 5+ yrs | ~10M+/wk | github.com/vitest-dev/vitest | OK | Approved (dev-only) |
| `vite-tsconfig-paths` | npm | 5+ yrs | ~2M+/wk | github.com/aleclarson/vite-tsconfig-paths | OK | Not used (alt only) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
recommendCards(cards, transaction, preferences?, rateTable?)
        │
        ▼
 ┌─────────────────────────────────────────┐
 │ 1. Base eligibility filter               │
 │    isActive && !excluded                 │
 │    && card.hkEligible !== false  ◄── CRY-05 fail-closed gate
 └───────────────┬──────────────────────────┘
                 │  eligibleCards
     ┌───────────┴────────────┐
     ▼                        ▼
 FIAT partition          CRYPTO partition
 (cardType==='credit')   (cardType!=='credit')
     │                        │
     ▼                        ▼
 EXISTING pipeline        valuateCrypto(calc, card, rateTable)
 (preference filters,      → hkdEquivalent | null, stale, asOf
  calculateReward,         │
  sort+tie-break,          ├─ rate absent/≤0 → "value unavailable", NOT ranked
  rank/isRecommended)      ├─ rate stale     → keep + flag (last-known)  ◄── DEC-VAL-A
     │  UNCHANGED           └─ sort ranked-by-hkdEquivalent among themselves
     ▼                        │
 result.recommendations   result.cryptoSegment  (NEW, optional)
     └───────────┬────────────┘
                 ▼
        RecommendationResult
```

File-to-implementation mapping:
- Gate + partition + assembly → `src/lib/engine/recommendCards.ts`
- `valuateCrypto` helper + `HkdRateTable` type → new `src/lib/engine/valuateCrypto.ts` (Claude's discretion on layout [VERIFIED: 07-CONTEXT.md:41])
- `minStaking` un-staked default → `src/lib/engine/calculateReward.ts` (`matchesRule`)
- New types (`HkdRateTable`, `CryptoRecommendation`, `cryptoSegment`) → `src/types/recommendation.ts` / `src/types/card.ts`

### Recommended Project Structure
```
src/lib/engine/
├── recommendCards.ts    # + hkEligible gate, + partition, + cryptoSegment assembly
├── calculateReward.ts   # + minStaking "not-met-by-default" in matchesRule
├── valuateCrypto.ts     # NEW: HkdRateTable, valuateCrypto(), staleness logic
├── index.ts             # export new symbols
└── __tests__/
    ├── engine.test.ts             # pre-existing (will auto-run — triage, see pitfalls)
    ├── fiat-regression.test.ts     # NEW: byte-identical corpus snapshot (TECH-01)
    ├── valuateCrypto.test.ts       # NEW: rate present/stale/absent/zero
    ├── hkEligible.test.ts          # NEW: undefined⇒in, false⇒out
    └── minStaking.test.ts          # NEW: base un-staked tier valued
```

### Pattern 1: Additive return/param shape (no consumer breakage)
**What:** Extend `RecommendationResult` with an optional field; add an optional 4th param.
**When to use:** Whenever the return shape must grow without disturbing the fiat answer.
**Example:**
```typescript
// src/types/card.ts (or a new engine types file)
export type AssetSymbol = string; // e.g. 'USDC', 'BTC'
export interface HkdRate { hkdPerUnit: number; asOf: string; } // asOf = ISO 8601
export type HkdRateTable = Record<AssetSymbol, HkdRate>;

// src/types/recommendation.ts
export interface CryptoRecommendation extends CardRecommendation {
  /** null ⇒ "value unavailable", not ranked */
  hkdEquivalent: number | null;
  rateStale: boolean;
  rateAsOf?: string;
}
export interface RecommendationResult {
  recommendations: CardRecommendation[]; // FIAT — unchanged
  cryptoSegment?: CryptoRecommendation[]; // NEW, optional — absent for callers that don't pass a rate table
  // ...existing fields unchanged
}

// src/lib/engine/recommendCards.ts — signature stays backward compatible
export function recommendCards(
  cards: CreditCard[],
  transaction: Transaction,
  preferences?: RecommendationPreferences,
  rateTable?: HkdRateTable, // NEW optional 4th param
): RecommendationResult { /* ... */ }
```
Rationale: `HomeClient.tsx:46-52` calls with 3 args and reads only `.recommendations` [VERIFIED]. A 4th optional param + optional field is invisible to it.

### Pattern 2: Partition-before-sort (structural fiat immutability)
**What:** Split eligible cards into fiat/crypto and run the *existing* sort only on fiat.
**Example:**
```typescript
// after the base eligibility filter, before preference filters:
const fiatCards   = eligibleCards.filter(c => c.cardType === 'credit');
const cryptoCards = eligibleCards.filter(c => c.cardType !== 'credit');

// --- run the EXISTING pipeline verbatim on fiatCards ---
//     (preference filters, calculateReward, sort, tie-break, rank)
// --- run a separate valuation+sort on cryptoCards → cryptoSegment ---
```
The 11 legacy cards are all `cardType: 'credit'` [VERIFIED: cards.json has 11 `cardType` entries, 11 cards], so `fiatCards === the 11` and the fiat ranking is provably identical.

### Pattern 3: Injectable rate + staleness (DEC-VAL-A)
```typescript
// src/lib/engine/valuateCrypto.ts
const STALENESS_MS = 24 * 60 * 60 * 1000; // Claude's discretion [07-CONTEXT.md:42]

export function valuateCrypto(
  calc: RewardCalculation, card: CreditCard, rateTable?: HkdRateTable
): { hkdEquivalent: number | null; rateStale: boolean; rateAsOf?: string } {
  const asset = card.rewardPrograms?.crypto?.shortName
             ?? card.rewardPrograms?.crypto?.name;         // resolve named asset
  const rate = asset ? rateTable?.[asset] : undefined;
  // absent OR zero/invalid ⇒ value unavailable, NOT ranked
  if (!rate || !(rate.hkdPerUnit > 0)) {
    return { hkdEquivalent: null, rateStale: false };
  }
  const ageMs = Date.now() - Date.parse(rate.asOf);
  const rateStale = Number.isFinite(ageMs) ? ageMs > STALENESS_MS : true;
  return {
    hkdEquivalent: calc.rewardAmount * rate.hkdPerUnit,     // last-known even if stale
    rateStale, rateAsOf: rate.asOf,
  };
}
```
Ranking the crypto segment: sort by `hkdEquivalent` desc, but entries with `hkdEquivalent === null` are appended unranked (cannot rank on a missing number) [VERIFIED: 07-CONTEXT.md:29].

### Pattern 4: `minStaking` = not-met-by-default (DEC-VAL-C)
**What:** A rule whose `conditions.minStaking` is set must **not** be treated as satisfied by default (unlike `minMonthlySpending`).
**Where:** `calculateReward.ts` `matchesRule`, right after the `minMonthlySpending` note (lines 162-166).
```typescript
// A staking/holding gate is a REAL barrier, not an assumed-met condition.
// Default valuation uses the base, un-staked tier ⇒ exclude staked tiers here.
if (conditions.minStaking) {
  return false; // tier not unlocked by default; surfaced separately as "conditional"
}
```
Because no fiat rule carries `minStaking`, this cannot perturb fiat. Higher tiers for display ("up to X% if you stake Y") are enumerated in a separate, non-ranked pass over `card.rewards` where `conditions.minStaking` is present.

### Anti-Patterns to Avoid
- **Merging crypto into `recommendations` then re-sorting** — violates DEC-VAL-B and risks reordering fiat. Never let a crypto card enter the fiat comparator.
- **Normalizing crypto to HKD and folding into the fiat net-value sort** — explicitly rejected by the operator [VERIFIED: 07-CONTEXT.md:22].
- **Treating `minStaking` like `minMonthlySpending`** — the existing "assume met" no-op (calculateReward.ts:162-165) must NOT extend to staking [VERIFIED: card.ts:66-72].
- **Dropping a stale-rate crypto card** — DEC-VAL-A keeps it with a last-known value + marker; only a *missing/zero* rate makes it "value unavailable" [VERIFIED: 07-CONTEXT.md:27-29].
- **Changing the positional order of the first 3 `recommendCards` params** — breaks `HomeClient` / `example.ts` / `integration-example.ts` call sites.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner / assertions / snapshots | A custom `assert` + diff script | `vitest` | TECH-01 mandates vitest; snapshots + watch + TS come free |
| `@/` alias resolution in tests | A custom module resolver | `resolve.alias` (one line) or `vite-tsconfig-paths` | Vite resolves aliases natively |
| Deterministic ranking capture | A new bespoke serializer | Reuse `scripts/capture-ranking.mts` logic inside a vitest snapshot test | Already written, already deterministic [VERIFIED: capture-ranking.mts:63-96] |

**Key insight:** The regression harness already exists as a script; Phase 7 mostly *ports* it into vitest rather than inventing it.

## Runtime State Inventory

Not a rename/refactor/migration phase — this is additive engine code + a dev-only test runner. No stored data, live-service config, OS-registered state, secrets, or build artifacts carry a renamed identifier. **None — verified: Phase 7 adds new optional fields/params and a devDependency; it renames nothing and touches no datastore.**

## Common Pitfalls

### Pitfall 1: Pre-existing test files auto-activate and may fail
**What goes wrong:** `src/lib/engine/__tests__/engine.test.ts` and `src/lib/parser/__tests__/transactionParser.test.ts` use bare `describe/it/expect` [VERIFIED: engine.test.ts:50, 32 global calls]. The moment vitest runs with `globals: true`, they execute for the first time ever and may fail (their mock cards predate the now-required `cardType` field, and their asserted numbers were never validated by a runner).
**Why it happens:** They were written as if a runner existed; none did [VERIFIED: CLAUDE.md "There is no test runner"].
**How to avoid:** Plan a triage task — run them first, then either fix assertions or quarantine. Note: the mocks lack `cardType`, but the engine never reads `cardType` for math, so failures (if any) will be assertion drift, not type crashes at runtime (esbuild strips types).
**Warning signs:** Red suite on first `vitest run` that has nothing to do with new crypto code.

### Pitfall 2: tsconfig excludes `__tests__`, so `tsc` won't type-check tests
**What goes wrong:** `tsconfig.json` has `"exclude": ["node_modules", "**/__tests__/**"]` [VERIFIED: tsconfig.json:33]. New test files get zero `tsc --noEmit` coverage and won't fail the build even if type-broken.
**Why it happens:** Intentional pre-vitest exclusion.
**How to avoid:** Rely on `vitest` (esbuild) to run them; if type-safety in tests is wanted, add a separate `tsconfig.test.json` or a `typecheck` step that includes tests. For globals typing, add `types: ["vitest/globals"]` there (optional — build is unaffected since main tsconfig excludes tests).

### Pitfall 3: Runtime `@/` imports in new tests
**What goes wrong:** Existing `engine.test.ts` only imports `@/types/*` as **types** (erased) and values via relative `../index`, so it needs no alias at runtime [VERIFIED: engine.test.ts:6-9]. A new test that imports a runtime value via `@/lib/engine` will fail without alias config.
**How to avoid:** Add `resolve.alias` `{ '@': path.resolve(__dirname, './src') }` in `vitest.config.ts` (below). This also lets the regression test do `import cards from '@/data/cards.json'` (resolveJsonModule is on [VERIFIED: tsconfig.json:12]).

### Pitfall 4: `matchingRules[0].rewardUnit` unit assumption
**What goes wrong:** `calculateReward` sets `rewardUnit = matchingRules[0].rewardUnit` assuming all matching rules share a unit [VERIFIED: calculateReward.ts:277]. A crypto card whose base rule is crypto but a bonus rule is cash would mis-label. Existing fiat cards are single-unit so this is latent, but crypto seed data (Phase 8) could trip it.
**How to avoid:** Not a Phase 7 blocker (no crypto cards exist yet [VERIFIED: 07-CONTEXT.md:67]), but flag it: crypto fixtures should keep one reward unit per card, or the valuation should key off the applied rule's unit.

### Pitfall 5: `groupByRewardUnit` and the crypto bucket
**What goes wrong:** `groupByRewardUnit` already seeds a `crypto: []` bucket and groups `result.recommendations` [VERIFIED: recommendCards.ts:176-181]. Once crypto is segmented OUT of `recommendations`, that bucket will always be empty from this path — which is *correct* under DEC-VAL-B but could confuse a future consumer expecting crypto there.
**How to avoid:** Leave `groupByRewardUnit` as-is (no fiat impact); document that crypto now lives in `cryptoSegment`, not in the grouped fiat recommendations.

### Pitfall 6: `.sort()` mutates in place — confirm the fiat array is fresh
**What goes wrong:** The existing code does `recommendations = calculations` then `.sort()` in place [VERIFIED: recommendCards.ts:91-99]. When partitioning, ensure the crypto sort operates on its own fresh array and never aliases the fiat array.
**How to avoid:** Build `cryptoSegment` from a separate `.map()`; never share the array reference with the fiat pipeline.

## Code Examples

### `vitest.config.ts` (concrete, working)
```typescript
// vitest.config.ts  (repo root)
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',   // engine is pure TS — no DOM needed
    globals: true,         // existing tests use bare describe/it/expect
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }, // mirrors tsconfig paths
  },
});
```
Notes:
- No `"type": "module"` in package.json (CJS default [VERIFIED: package.json]); vitest loads a `.ts` config regardless via its own esbuild pipeline — no `.mts` needed.
- `environment: 'node'` avoids pulling in `jsdom`/`happy-dom` (zero extra deps).
- Next 16 / React 19 are irrelevant to these node-env engine tests — no `@vitejs/plugin-react` required.

### `package.json` scripts to add
```jsonc
"scripts": {
  // ...existing
  "test": "vitest run",
  "test:watch": "vitest"
}
```
(`npm test` currently errors `Missing script: "test"` [VERIFIED: CLAUDE.md]; this is the fix.)

### Byte-identical fiat regression test (ports `capture-ranking.mts`)
```typescript
// src/lib/engine/__tests__/fiat-regression.test.ts
import { describe, it, expect } from 'vitest'; // or rely on globals
import { recommendCards } from '../recommendCards';
import cardsData from '@/data/cards.json';
import type { CreditCard } from '@/types/card';
import type { Transaction } from '@/types/transaction';

const corpus = (cardsData as { cards: CreditCard[] }).cards;

// Reuse the exact scenario set + serializer from scripts/capture-ranking.mts
const scenarios: Array<{ label: string; tx: Transaction; monthlySpending?: number }> = [
  { label: 'local-hkd-dining-500', tx: { amount: 500, currency: 'HKD', category: 'dining', paymentType: 'offline' } },
  // ...the other 4 scenarios verbatim from capture-ranking.mts:38-61
];

describe('fiat ranking is byte-identical (TECH-01)', () => {
  it('matches the committed identity-rate snapshot for the 11-card corpus', () => {
    const lines: string[] = [];
    for (const { label, tx, monthlySpending } of scenarios) {
      // NOTE: pass NO rateTable (or an identity table) → fiat path only
      const result = recommendCards(corpus, tx, monthlySpending !== undefined ? { monthlySpending } : undefined);
      for (const r of result.recommendations) {
        lines.push(JSON.stringify({
          scenario: label, id: r.card.id, rank: r.rank, isRecommended: r.isRecommended,
          rewardAmount: r.calculation.rewardAmount, rewardUnit: r.calculation.rewardUnit,
          effectiveRate: r.calculation.effectiveRate, netValue: r.netValue,
        }));
      }
    }
    expect(lines.join('\n')).toMatchSnapshot();
  });
});
```
- The `capture-ranking.mts` serializer (lines 63-81) is the template; snapshot the FULL corpus ranking (not just the 3 target cards) so any perturbation anywhere fails the test.
- Generate the snapshot on the **current** engine first (pre-crypto changes), commit it, then implement — any drift in the fiat sort turns the suite red. This is the TECH-01 guarantee.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One-shot `capture-ranking.mts` diffed by hand [VERIFIED: capture-ranking.mts:1-19] | vitest snapshot test in CI-able suite | This phase (TECH-01) | Regression becomes automated + repeatable |
| No test runner; `.test.ts` files inert [VERIFIED: CLAUDE.md] | vitest 4 installed dev-only | This phase (OPEN-008) | `npm test` becomes real for the first time |

**Deprecated/outdated:**
- Archived ENGINE_DOCUMENTATION claims tests run — they don't [VERIFIED: CLAUDE.md Known Pitfalls]. Ignore that claim; the runner is being introduced here.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Staleness threshold = 24h | Pattern 3 | Low — explicitly Claude's discretion [VERIFIED: 07-CONTEXT.md:42]; a wrong value only changes when the "stale" marker shows, never correctness |
| A2 | Segment boundary = `cardType !== 'credit'` (crypto + prepaid both non-fiat) | Pattern 2 | Medium — if operator wants prepaid to stay fiat, use `cardType === 'crypto'` for the segment instead. See Open Questions. |
| A3 | Crypto asset key resolved from `rewardPrograms.crypto.shortName ?? .name` | Pattern 3 | Medium — rate-table keys must match whatever the seed data (Phase 8) uses for the asset symbol; align key convention before Phase 8 |
| A4 | `globals: true` chosen over rewriting existing test files to explicit imports | Stack / Pattern | Low — either works; globals avoids touching pre-existing files |
| A5 | Adding optional 4th param `rateTable?` (vs. folding rate into `preferences`) | Pattern 1 | Low — both backward-compatible; positional param keeps `preferences` semantically clean |

## Open Questions (RESOLVED)

*All three resolved during planning and concretely encoded in Phase 7 plan tasks (see markers below).*

1. **Segment boundary: `cardType !== 'credit'` vs `=== 'crypto'`?**
   - What we know: schema has `credit | crypto | prepaid` [VERIFIED: card.ts:16]; the 11 legacy are all `credit`.
   - What's unclear: whether `prepaid`/neobank belongs in the crypto segment or its own.
   - **RESOLVED:** use `cardType === 'credit'` for the FIAT set (guarantees the 11 stay fiat) and everything else (`crypto`, `prepaid`) → the alt/crypto segment; revisit if prepaid needs its own section in Phase 9. *Encoded in 07-03 Task 2.*

2. **Rate-table key convention.**
   - What we know: asset named via `rewardPrograms.crypto` (name/shortName) [VERIFIED: card.ts:251, calculateReward.ts:336-341].
   - What's unclear: exact symbol string Phase 8 seed will use (`USDC` vs `USD Coin`).
   - **RESOLVED:** standardize on `shortName` (ticker, exact casing, resolved `shortName ?? name`) as the `HkdRateTable` key — a hard alignment constraint for Phase 8 seed data. *Encoded in 07-02 Task 1.*

3. **Should the two pre-existing test files be fixed or quarantined?**
   - **RESOLVED:** run once, triage — fix or `.skip` (with a note) so the suite stays green under `globals:true`. *Encoded in 07-01 Task 2.*

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest 4 engine req (`^20 || ^22 || >=24`) | ✓ | v22.23.1 | — |
| npm | install vitest dev-dep | ✓ | (bundled with node) | — |
| vitest | TECH-01 test runner | ✗ (to be installed this phase) | target ^4.1.10 | none — installing it IS the task |

**Missing dependencies with no fallback:** none blocking — vitest install is the phase's own deliverable.
**Missing dependencies with fallback:** none.

## Validation Architecture

> `.planning/config.json` does not exist [VERIFIED: `ls` returned "No such file"], so `workflow.nyquist_validation` is absent ⇒ treated as **enabled**. This section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 (node environment) |
| Config file | `vitest.config.ts` (new — see Wave 0) |
| Quick run command | `npx vitest run src/lib/engine/__tests__/fiat-regression.test.ts` |
| Full suite command | `npm test` (`vitest run`) after script is added |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRY-04 | Crypto valued in HKD via injected table; ranks within crypto segment | unit | `npx vitest run src/lib/engine/__tests__/valuateCrypto.test.ts` | ❌ Wave 0 |
| CRY-04 (a) | Missing/zero/stale rate fails safe (unavailable / last-known+marker) | unit | `npx vitest run src/lib/engine/__tests__/valuateCrypto.test.ts` | ❌ Wave 0 |
| CRY-04 (c) | Staking-gated tier valued at base un-staked tier | unit | `npx vitest run src/lib/engine/__tests__/minStaking.test.ts` | ❌ Wave 0 |
| CRY-05 | `hkEligible:false` excluded from recommendations; `undefined`⇒included | unit | `npx vitest run src/lib/engine/__tests__/hkEligible.test.ts` | ❌ Wave 0 |
| TECH-01 | 11-card fiat rankings byte-identical (identity rates) | snapshot | `npx vitest run src/lib/engine/__tests__/fiat-regression.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the specific new test file for that task (`npx vitest run <file>`)
- **Per wave merge:** `npm test` (full `vitest run`)
- **Phase gate:** full suite green (incl. the fiat snapshot) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework config (node env, globals, `@` alias)
- [ ] `package.json` `test` + `test:watch` scripts
- [ ] `npm install -D vitest@^4.1.10` — framework install
- [ ] `src/lib/engine/__tests__/fiat-regression.test.ts` + committed snapshot — covers TECH-01
- [ ] `src/lib/engine/__tests__/valuateCrypto.test.ts` — covers CRY-04 (incl. stale/absent/zero)
- [ ] `src/lib/engine/__tests__/hkEligible.test.ts` — covers CRY-05
- [ ] `src/lib/engine/__tests__/minStaking.test.ts` — covers DEC-VAL-C
- [ ] Triage decision for pre-existing `engine.test.ts` / `transactionParser.test.ts` (they auto-run under `globals: true`)

## Security Domain

> `security_enforcement` config absent ⇒ enabled. This phase is a pure client-side computation + a dev-only test runner; the primary security-relevant surface is dependency trust and the public-repo rule.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 7 touches no auth (admin auth = THI-236, out of scope) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (light) | Guard the injected `HkdRateTable`: treat `hkdPerUnit <= 0`, `NaN`, or unparseable `asOf` as "value unavailable" rather than trusting the number (already in Pattern 3) |
| V6 Cryptography | no | No cryptographic operation — "crypto" here means crypto-asset rewards, not encryption; never hand-roll anything here regardless |
| V14 Dependency / Supply Chain | yes | Only add `vitest` as a dev-dependency; verified legitimate (see Package Legitimacy Audit). No prod-runtime deps added. |

### Known Threat Patterns for {TS engine + dev tooling}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/typo dev-dependency | Tampering | Install only `vitest` (verified repo + downloads); pin `^4.1.10` |
| Untrusted rate value skewing rankings | Tampering | Validate `hkdPerUnit > 0` and finite `asOf`; degrade to "value unavailable" on bad input |
| Public-repo leakage | Info Disclosure | No secrets/exploit detail in RESEARCH.md or code/commits [VERIFIED: CLAUDE.md public-repo rule] — honored here |

## Sources

### Primary (HIGH confidence)
- `src/lib/engine/recommendCards.ts` (1-231) — sort pipeline, eligibility filter, `groupByRewardUnit`, return shape
- `src/lib/engine/calculateReward.ts` (1-379) — `matchesRule`, `minMonthlySpending` assume-met note, `rewardUnit` selection, crypto `formatReward`
- `src/types/card.ts` (1-329) — `RewardUnit`, `CardType`, `RewardCondition.minStaking`, `hkEligible`, `rewardPrograms.crypto`
- `src/types/recommendation.ts` (1-124) — `RecommendationResult`, `CardRecommendation`
- `src/components/HomeClient.tsx` (40-84) — the sole return-shape consumer
- `scripts/capture-ranking.mts` (1-98) — deterministic ranking-capture precedent
- `.planning/phases/07-.../07-CONTEXT.md` — DEC-VAL-A/B/C, locked injectable-rate + gate decisions
- `.planning/ROADMAP.md` Phase 7 + `.planning/REQUIREMENTS.md` CRY-04/CRY-05/TECH-01
- `CLAUDE.md` — no-test-runner state, public-repo rule
- npm registry — `vitest` 4.1.10 + engines; node v22.23.1 local

### Secondary (MEDIUM confidence)
- vitest config conventions (node env, globals, resolve.alias) — standard vitest usage, matched to this repo's structure

### Tertiary (LOW confidence)
- Staleness threshold (24h) — placeholder, operator's discretion

## Metadata

**Confidence breakdown:**
- Standard stack (vitest): HIGH — version + engines verified against npm registry; node compat confirmed
- Architecture (partition/segment/gate): HIGH — grounded in exact source lines; only consumer verified
- Pitfalls: HIGH — each tied to a verified source line
- Rate-table shape / staleness: MEDIUM — shape is idiomatic but keys/threshold need Phase 8 alignment

**Research date:** 2026-07-24
**Valid until:** ~2026-08-23 (stable; vitest minor bumps possible — re-verify version at install)
