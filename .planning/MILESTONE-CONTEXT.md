# Milestone v1.2 — Context (for /gsd-new-milestone to consume)

**Captured:** 2026-07-31 (direction gathered at the v1.1→v1.2 boundary; the heavy requirements/roadmap flow runs fresh from this).

**Proposed name:** v1.2 — Real Data: Crypto Activation & Sustainable Ingestion
**One-line goal:** Get real, trustworthy card + crypto data into CardGPT so the v1.1 machinery (crypto valuation engine, rate cron, directory) actually delivers live value — and make keeping that data accurate sustainable.

## Chosen themes (product owner selected 2026-07-31)

### 1. Activate crypto for real (RQ-001)
v1.1 built the whole crypto stack (valuation engine, HKD rate cron, unit-segmented ranking, `hkEligible` gate, merge-aware seed, directory) but it's **dormant** — there are NO real crypto cards in prod, so none of it surfaces to users. This theme sources real HK-available crypto/neobank card data (+ their reward structures) and seeds it, so the engine, cron, and directory light up end-to-end.
- Ties to DEC-DATA-001 (bulk crypto data from ranked.plus public listings, facts-only, provenance-labeled; recommender ranks only `hkEligible`).
- The rate cron already fetches CoinMarketCap rates by ticker — real cards must key crypto rewards by `shortName` ticker (Phase 7 hard constraint).

### 2. Fix + rethink data ingestion (GH #12)
Two parts, both about trustworthy data getting IN:
- **Immediate:** the prod `OPENROUTER_API_KEY` is DEAD (401). It powers BOTH the admin T&C extractor (`extractRewards.ts`) AND the user-facing free-text query parser (`parseActivity.ts`) — so the live recommender is degraded for ambiguous input right now. **Rotate the key** (one rotation fixes both; verify both paths). Highest live-user impact.
- **Strategic:** the T&C-PDF→AI ingestion isn't scalable and issuer docs aren't always findable. **Scraping was evaluated and NOT recommended** (see memory [[cardgpt-tc-ingestion-not-scalable]] + the reasoning below). Recommendation = **hybrid manual-first**: use the marketing `applyUrl` (already stored) as a discovery+draft source via the EXISTING `extractTextFromUrl()` (already fetches URL or PDF → same LLM), keep a human verifying caps/tiers/exclusions against the T&C before approval. No per-issuer scrapers. Scale isn't the real problem at 11 cards; accuracy is.

## Key facts to carry into requirements (don't re-derive)
- **Scraping verdict:** don't build scrapers — HTML source swap doesn't remove the LLM parse step; marketing pages omit the caps the engine needs (over-recommend risk); HK bank ToS forbid automated scraping; maintenance is perpetual. Hybrid manual-first instead.
- **The corpus IS the product** (Data-Leona's domain) — accuracy drives recommendations, so a wrong cap is worse than a missing card.
- **THI-236 (admin auth, Urgent)** intersects: ingestion flows through the admin surface, which is NOT a sound security boundary. The owner did NOT pick admin-hardening as a v1.2 theme, but note the dependency — any ingestion automation leans on an unsound admin gate. Flag at requirements time.
- **DEC-AFF-DROP:** affiliate disclosure was dropped (risk-accepted); THI-297 revisits before real monetized links. Not a v1.2 theme unless the owner adds it.

## What the fresh /gsd-new-milestone should do
1. Confirm the name/scope with the owner (this is captured direction, not locked requirements).
2. Optional research: light — most of the domain is already understood (see above + the completed scraping eval). Probably skip heavy 4-agent research; the unknowns are data-sourcing specifics (which HK crypto cards exist, where their reward data lives), not tech.
3. Scope requirements across the two themes (candidate categories: CRYPTO-DATA / ingestion INGEST / and the key-rotation as an ops task). Continue REQ-ID + phase numbering from v1.1 (last phase was 11).
4. Roadmap the phases.

## Not chosen for v1.2 (deferred, per owner)
- Admin auth hardening (THI-236) — real debt, but not this milestone's focus (noted as a dependency risk above).
- New user-facing features (compare view, monetization, mobile/PWA) — not raised.
