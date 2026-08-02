# Phase 7: Crypto→HKD Valuation Engine & `hkEligible` Gate — Context

**Gathered:** 2026-07-24
**Status:** Ready for planning
**Source:** Inline decision capture (operator settled the 3 open design forks directly, in lieu of /gsd-discuss-phase)

<domain>
## Phase Boundary

Phase 7 makes crypto cards **valuable and safe to recommend** without changing any existing fiat behaviour:
- Value crypto rewards in HKD-equivalent (for ordering the crypto segment + informational display), via an **injectable static rate table**.
- Present crypto results **unit-segmented** — a separate section, not merged into the fiat ranked list (see DEC-VAL-B).
- Enforce `hkEligible` **fail-closed inside `recommendCards()`** so an HK resident is never recommended a card they can't obtain (directory still shows it).
- Install **vitest** (first real test runner) and guard the "existing 11-card fiat rankings unchanged" regression.

Out of scope: live price feeds, full miles↔cash normalization, crypto-segment UI polish (Data page = Phase 9, theme = Phase 11).
</domain>

<decisions>
## Implementation Decisions

### DEC-VAL-B — Cross-unit presentation: UNIT-SEGMENTED (operator chose this over normalize-to-HKD)
Crypto cards are **NOT** merged into the fiat ranked list. The recommender's primary ranked answer stays **fiat-only** (cashback/miles ordered by net HKD value, exactly as today). Crypto/neobank cards appear in a **separate segment** ("crypto options for this purchase"), ranked **among themselves** by HKD-equivalent value. Crypto HKD valuation exists only for intra-crypto ordering + display — it is **never** folded into the fiat sort.
- **Rationale (operator):** honesty about crypto volatility; a stale/volatile crypto rate must never displace a fiat card in the core "which one card" answer.
- **Consequence (leverage):** this makes TECH-01 largely **structural** — because crypto never enters the fiat comparison, the fiat ranking is provably unperturbed; the byte-identical guard becomes a safety net rather than the sole defense.

### DEC-VAL-A — Stale/missing rate: LAST-KNOWN + STALENESS WARNING, with a value-unavailable floor
When a crypto card's HKD rate is **stale**, value it using the **last-known rate** and show a visible staleness marker ("rate as of <time>"). Do **not** drop it from the crypto segment for mere staleness.
- **Encoded edge:** if there is **no rate at all** (no last-known value ever — e.g. a brand-new asset absent from the injected table, or a zero/invalid entry), the card shows **"value unavailable"** and is **not ranked** within the crypto segment (cannot rank on a number that doesn't exist).
- **Note vs roadmap:** this is intentionally **softer** than the roadmap's original "fail-safe, never rank #1" language. It is acceptable **only because** DEC-VAL-B segments crypto out of the fiat list, so a stale crypto rate can no longer silently rank #1 in the primary answer. The two decisions are coupled — do not weaken one without revisiting the other.

### DEC-VAL-C — Staking/holding-gated tiers: BASE UN-STAKED TIER by default
Value staking-gated crypto rewards at the **base, un-staked tier**. Surface higher tiers as **conditional** ("up to X% if you stake Y"). Must **NOT** inherit `minMonthlySpending`'s "assume met" no-op (a staking gate is a real barrier, not an assumed-met condition).

### Locked by ROADMAP (not re-decided here)
- **Injectable static rate table:** the HKD rate is passed **into** the engine like `cards` — **no fetch inside the client engine**. "Stale / last-known" is defined by timestamped entries in that injected table; "staleness" threshold is Claude's discretion (see below).
- **`hkEligible` gate (CRY-05):** enforced **fail-closed inside `recommendCards()`**. `undefined` ⇒ eligible (covers the 11 legacy cards); global/bulk cards must set `hkEligible: false` explicitly. The directory still shows ineligible cards; the recommender never returns them.
- **Regression (TECH-01):** with identity fiat rates, the existing **11-card fiat rankings are byte-identical**, guarded by a **vitest** suite. vitest is installed **dev-only this phase** (OPEN-008 — the first test runner in the repo).

### Claude's Discretion
- Engine module/function layout for valuation + segmentation (e.g. a valuation helper + a segmentation step in/around `recommendCards()`).
- Rate-table shape (e.g. `{ [asset]: { hkdPerUnit, asOf } }`) and the staleness threshold definition.
- vitest config + test-file layout; whether to fold in the existing (currently non-running) engine/parser test files.
</decisions>

<canonical_refs>
## Canonical References
**Downstream agents MUST read these before planning or implementing.**

### Engine (where the work lands)
- `src/lib/engine/recommendCards.ts` — the recommender. `hkEligible` gate goes **fail-closed here**; crypto segmentation happens here (or a thin wrapper). The existing fiat sort must be untouched.
- `src/lib/engine/calculateReward.ts` — per-rule reward math; crypto `formatReward`/unit handling already added in Phase 6.
- `src/lib/engine/index.ts` — engine exports.

### Schema (already built in Phase 6)
- `src/types/card.ts` — `RewardUnit` (incl. `crypto`), `RewardCondition.minStaking {amount, asset}`, `CreditCard.hkEligible`, crypto named asset via `rewardPrograms`.

### Requirements / process
- `.planning/ROADMAP.md` → Phase 7 detail (success criteria for CRY-04, CRY-05, TECH-01).
- `.planning/REQUIREMENTS.md` → CRY-04, CRY-05, TECH-01 full text.
- `./CLAUDE.md` → **no test runner exists yet** (vitest is installed THIS phase); PUBLIC repo (no security specifics committed); prod Redis is now `KV_*` on Thirdvisor.
</canonical_refs>

<specifics>
## Specific Ideas
- **vitest** is installed dev-only this phase (TECH-01 / OPEN-008) — the repo's first real test runner. Its first content is the byte-identical fiat-ranking regression suite; the crypto valuation logic gets unit tests too.
- The 11 current cards are all `credit` + `hkEligible` undefined ⇒ all eligible; there is **no crypto card data yet** (bulk crypto seed is Phase 8), so Phase 7's crypto paths are exercised primarily by tests/fixtures, not live cards.
</specifics>

<deferred>
## Deferred Ideas
- Live crypto price feeds (roadmap: future milestone — this phase uses the injected STATIC table).
- Full miles↔cash normalization (deferred).
- Crypto-segment UI/presentation polish — owned by Phase 9 (Data page) and Phase 11 (theme).
</deferred>

---

*Phase: 07-crypto-hkd-valuation-engine-hkeligible-gate*
*Context captured: 2026-07-24 via inline decision capture (operator settled DEC-VAL-A/B/C)*
