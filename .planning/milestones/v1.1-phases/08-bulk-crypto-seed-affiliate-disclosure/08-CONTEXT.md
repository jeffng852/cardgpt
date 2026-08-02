# Phase 8: Bulk Crypto Seed & Affiliate / Disclosure - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the **machinery** for the global crypto/neobank card set and affiliate monetization, without disturbing the 11 live credit cards:

1. A **merge-aware seed script** (read Redis → append by new id → write back) that can load crypto/neobank cards without clobbering the 11 credit cards or live admin edits — never `init-redis` (which clobbers).
2. A **crypto→HKD rate table**, refreshed by a scheduled job, written to Redis and injected into `recommendCards()` — the missing input that makes Phase 7's (currently inert) `valuateCrypto` produce real numbers (DEC-DATA-002).
3. The **Apply CTA affiliate wiring** — populate the existing `applyUrl` rail, render `rel="sponsored nofollow noopener"` (AFF-01).
4. The **`loadCards` fix** — a card is recommendable **without** an `applyUrl` (remove the hard drop at `loadCards.ts:49`), and ranking is **never** reordered by affiliate presence.

**Explicitly NOT in this phase's build:** the actual bulk load of *real* crypto card data (blocked on RQ-001 — which HK-available crypto cards exist and their real reward structures). All machinery above is built and tested against a **small crypto fixture**; the real data lands later when RQ-001 resolves.

</domain>

<decisions>
## Implementation Decisions

### Scope & sequencing
- **D-01:** Build **all machinery now, defer only the real data load.** The seed script, rate-table cron, affiliate CTA wiring, and `loadCards` fix are all implemented and tested against a small crypto fixture (a handful of representative crypto/neobank cards). The bulk seed of *real* cards is a later, RQ-001-gated action — the script exists and is proven; only its input data waits. — **Reversibility:** reversible — fixture is test-only; swapping in real data is a data step, not a code change.

### Crypto→HKD rate table (refines DEC-DATA-002)
- **D-02:** Rate source is a **scheduled cron job that fetches real rates from CoinMarketCap** (`/v2/cryptocurrency/quotes/latest`, convert=HKD) and writes `{ [assetTicker]: { hkdPerUnit, asOf } }` to Redis, injected into `recommendCards()` (the engine never fetches — DEC-VAL-B). **This advances the earlier DEC-DATA-002 note** which had deferred live price feeds and assumed manually-seeded stablecoin rates — Jeff chose to bring a real fetched feed forward now, on CoinMarketCap (changed from an initial CoinGecko suggestion). — **Reversibility:** costly — introduces an external API dependency, a Vercel Cron entry, a `CRON_SECRET`, and a `COINMARKETCAP_API_KEY`; backing it out to a static table later means unwinding cron infra.
- **D-02a (⚠ public repo):** CoinMarketCap **requires an API key**, and its free "Basic" tier is **credit-metered** (monthly call budget). The key is a secret — it MUST be a Vercel env var (e.g. `COINMARKETCAP_API_KEY`), **never committed** (repo is public; honor `.gitignore` for `.env*`). The cron must be **credit-budget-aware**: batch all needed tickers into one `quotes/latest` call (comma-separated `symbol`), refresh on a modest cadence (Phase 7's 24h staleness tolerates ≥ daily), and cache to Redis so page loads never hit CMC. — **Reversibility:** reversible (config/secret).
- **D-03:** Rate-table key = crypto asset **`shortName` ticker, exact casing** (hard constraint locked in Phase 7 — resolved `shortName ?? name`, no normalization at lookup). CoinMarketCap `symbol` values must be mapped to these tickers in the job, not at engine lookup (CMC symbols are upper-case tickers, e.g. `USDC`, `BTC` — mapping is likely identity but must be explicit + validated).
- **D-04:** Fetch failures are **not** a new failure mode to design from scratch — Phase 7's staleness logic already handles it (stale → last-known value + `rateStale` warning; bad/absent rate → `hkdEquivalent: null`, never fabricated/thrown). The cron writes `asOf` on every successful refresh so Phase 7's 24h staleness gate works; a CMC error / credit-exhaustion leaves the last-known table in Redis untouched (never overwrite with nulls). — **Reversibility:** reversible.

### Affiliate CTA + disclosure (AFF-01 / AFF-02)
- **D-05:** `applyUrl` CTA renders `rel="sponsored nofollow noopener"` and appears **only when a link exists** (AFF-01). Affiliate URLs are populated later as they're obtained; the rail is built now. — **Reversibility:** reversible.
- **D-06:** **`loadCards` no longer requires `applyUrl`** — the hard drop at `loadCards.ts:49-52` is removed so a card without an affiliate link is still loaded, recommended, and ranked. "Recommendable" is decoupled from "has `applyUrl`." — **Reversibility:** reversible — local validator change.
- **D-07:** Ranking is **never** reordered by affiliate presence — a card with an `applyUrl` gets no ranking advantage over one without. Structural, asserted by test. — **Reversibility:** reversible.
- **D-08 (⚠ scope reduction + risk-accepted):** The **bilingual affiliate/advertiser disclosure is DROPPED.** Jeff, as product owner, chose to remove it after the trade-off was laid out explicitly. This drops the disclosure clause of **AFF-02** only (the other two AFF-02 clauses — recommendable-without-`applyUrl` and ranking-neutrality — are **kept**, as D-06/D-07). **AFF-02 is rewritten in REQUIREMENTS.md** to reflect the reduced scope. **Risk acknowledged and accepted by the product owner:** shipping affiliate/referral CTAs without a disclosure runs against advertising-standards / consumer-protection norms (heightened for financial products in HK); the disclosure was also a stated pre-deploy compliance release gate in STATE.md, which is correspondingly removed. Recorded here so the decision and its risk are on the record, not silently omitted. — **Reversibility:** one-way-ish — reintroducing later means re-opening the requirement, rebuilding the component, and a fresh compliance review; the *decision* is reversible but the shipped-without-it exposure is not retroactively fixable.

### Merge-aware seed (carries forward DEC-DATA-001)
- **D-09:** Seed script models itself on the existing **merge-aware precedent `scripts/backfill-card-type.mjs`** (read → mutate-by-id → write-back), NOT the fresh-seed-only `seed-redis.mjs` (which refuses on a populated store). Same operational conventions as existing scripts: `--dry-run`, read-back-verify, env via `vercel env pull` (KV_* precedence), public-repo (no secrets in file). Idempotent: appends by new id, skips existing ids, never touches the 11 credit cards or admin edits. — **Reversibility:** reversible.
- **D-10:** Crypto directory data is bulk-seeded from **ranked.plus public listings, facts only** (their referral links excluded), **provenance-labeled**, per DEC-DATA-001. The full global set feeds the directory; the recommender ranks only `hkEligible` cards (fail-closed gate already built in Phase 7). Applies to the *real* load (deferred); the fixture stands in until then.

### Claude's Discretion
- Exact CoinMarketCap endpoint params, symbol→ticker mapping table, refresh cadence within the free credit budget, caching + cron scheduling mechanics — for researcher/planner to nail down.
- Fixture composition (how many crypto cards, which assets) — pick a minimal representative set covering stablecoin + volatile + staking-gated + a null-rate case.
- Affiliate CTA visual treatment within the existing `CardRecommendationList` Apply button.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 8: Bulk Crypto Seed & Affiliate / Disclosure" — goal, success criteria, DEC-DATA-002 note
- `.planning/REQUIREMENTS.md` — AFF-01, AFF-02 (rewritten this phase), CRY-04/CRY-05 (Phase 7, consumed here)
- `.planning/STATE.md` §"Accumulated Context" — DEC-DATA-001, DEC-DATA-002, DEC-VAL-A/B/C, the RQ-001 upstream block, and the (now-removed) compliance release gate

### Phase 7 engine contract (this phase feeds it)
- `.planning/phases/07-crypto-hkd-valuation-engine-hkeligible-gate/07-CONTEXT.md` — DEC-VAL-A/B/C
- `.planning/phases/07-.../07-VERIFICATION.md` — the locked engine contract (rate-table key = `shortName` ticker; additive `rateTable` 4th param; `cryptoSegment`)
- `src/lib/engine/valuateCrypto.ts` — HKD valuation, 24h staleness, fail-safe null; consumes the rate table
- `src/lib/engine/recommendCards.ts` — partition-before-sort, `hkEligible` gate, optional `rateTable` 4th param (currently called 3-arg at `HomeClient.tsx:46`)
- `src/types/card.ts` §270-280 — `HkdRate { hkdPerUnit, asOf }`, `HkdRateTable`, `AssetSymbol`

### Data layer & scripts
- `src/lib/data/loadCards.ts` §49-52 — the `applyUrl` hard drop to remove (D-06)
- `scripts/backfill-card-type.mjs` — merge-aware read→mutate-by-id→write-back precedent (D-09 models on this)
- `scripts/seed-redis.mjs` — fresh-seed-only (do NOT reuse for merge; anti-pattern reference)
- `src/lib/data/redisStorage.ts` §27 — env precedence (KV_* is the live set)
- `src/data/cards.json` — the canonical 11 credit cards (all `cardType: credit`, all have `applyUrl`)

### Affiliate CTA surface
- `src/components/CardRecommendationList.tsx` §460 — the `applyUrl` Apply CTA render site (AFF-01)
- `src/app/[locale]/page.tsx` §16 — server `loadCards()` entry (downstream of D-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/backfill-card-type.mjs`: merge-aware Redis mutation pattern — clone its read→mutate→write-back + `--dry-run` + read-back-verify structure for the new seed script.
- Phase 7 engine (`valuateCrypto`, `recommendCards` with `rateTable`): fully built and verified; Phase 8 supplies the rate table it was designed to consume — no engine changes needed, only wiring the 4th arg at `HomeClient.tsx:46`.
- `HkdRateTable` / `HkdRate` types (`card.ts:270-280`): the exact shape the cron job must write.

### Established Patterns
- Merge-aware, idempotent, dry-run-first scripts that pull prod env via `vercel env pull` (KV_* precedence); public-repo, no secrets in file.
- Additive engine contract: injecting `rateTable` and populating `cryptoSegment` leaves 3-arg fiat callers byte-identical (proven in Phase 7).
- Fail-safe valuation already handles missing/stale rates — the cron just needs to write fresh `asOf` timestamps.

### Integration Points
- **Rate table → engine:** cron writes `{ticker:{hkdPerUnit,asOf}}` to Redis; server read path injects it as `recommendCards(cards, tx, opts, rateTable)`; wire it at `HomeClient.tsx:46` / `page.tsx`.
- **Seed script → Redis:** appends crypto cards by id alongside the 11 credit cards under the existing `cards` key.
- **Affiliate CTA:** `CardRecommendationList.tsx:460` already conditionally renders on `card.applyUrl`; add the `rel` attributes and ensure link-less cards still render (minus the button).
- **New infra:** Vercel Cron entry in `vercel.json` + `CRON_SECRET` + `COINMARKETCAP_API_KEY` env secret (greenfield — none exists today; keys are Vercel env vars, never committed).

</code_context>

<specifics>
## Specific Ideas

- Rate feed: **CoinMarketCap** (`/v2/cryptocurrency/quotes/latest`, `convert=HKD`), API key via Vercel env secret, credit-budget-aware batched calls cached to Redis.
- Merge-aware seed explicitly modeled on `backfill-card-type.mjs`, explicitly NOT `seed-redis.mjs`.
- Small crypto fixture drives all machinery testing until RQ-001 real data lands.

</specifics>

<deferred>
## Deferred Ideas

- **Real bulk crypto card data load (RQ-001)** — the actual global crypto/neobank set from ranked.plus public listings. Machinery is built + tested against a fixture this phase; the real load is a later data step once RQ-001 resolves.
- **Admin-editable rate table** — considered and rejected for now (manual toil + gated on THI-236 admin-auth). Cron-fetched instead.
- **Richer asset coverage / higher-frequency refresh / paid CMC tier** — expand later; this phase covers the fixture's assets on the free credit budget.
- **Prepaid card handling / its own results section** — Phase 9 (partition already routes prepaid into the non-fiat segment).
- **`cryptoSegment` UI rendering** (a crypto section beside the fiat list) — downstream UI phase; the engine contract is ready.
- **Admin-auth hardening (THI-236, Urgent)** — release gate, not phase work.

### Note on the dropped compliance gate
- The bilingual affiliate disclosure (former AFF-02 clause) and its pre-deploy compliance review are **removed** per D-08 (product-owner risk-accepted decision), not deferred. If revisited, it re-opens as new scope + a fresh compliance review.

</deferred>

---

*Phase: 8-Bulk Crypto Seed & Affiliate / Disclosure*
*Context gathered: 2026-07-25*
