# CardGPT — Milestones

The shipped-milestone ledger. GitHub `main` is ground truth; this records what each milestone delivered.

---

## v1.1 — Card Directory & Crypto Expansion

**Status:** COMPLETE (6/6 phases) · **Shipped:** 2026-07-31 (all phases merged to `main` + deployed live, cardgpt-beta.vercel.app) · **Closed:** 2026-08-02 (milestone archived; Phase 9 & 10 human UAT signed off, verifications canonicalized to `passed`).

**Stats:** 6 phases · 21 plans · 30 tasks.

**Goal:** extend CardGPT from a fiat-only recommender into a product that values crypto-card rewards, exposes a browsable card directory and a research/methodology surface, and wears a cohesive redesigned identity.

**Phases delivered:**

| Phase | What shipped | Linear | PR |
|-------|--------------|--------|----|
| 6. Schema, Crypto Type Fan-out & Backfills | `cardType` (credit/crypto/prepaid), crypto reward unit + asset, staking gate, `hkEligible` field; 11 cards backfilled (JSON + Redis); dead `RewardCap` retired | THI-252/253/254 | #3–#5 |
| 7. Crypto→HKD Valuation Engine & hkEligible Gate | HKD valuation ranks crypto beside fiat (unit-segmented, partition-before-sort → fiat ranking byte-identical), fail-safe on stale rates, fail-closed `hkEligible` gate; vitest regression baseline | THI-279/280 | #7–#8 |
| 8. Bulk Crypto Seed & Affiliate / Disclosure | Merge-aware seed script + crypto fixture; CoinMarketCap `CRON_SECRET`-gated daily rate cron (live); affiliate CTA `rel="sponsored nofollow noopener"`; `loadCards` fix (recommendable without `applyUrl` — restored a dropped card, 10→11). Disclosure dropped (DEC-AFF-DROP, risk-accepted) | THI-294 | #9 |
| 11. UI / Theme Refresh (redesign) | Whole-app re-skin into CardGPT's own brutalist-editorial v2 design system (`.planning/design/ui-contract-v2.md`) — monochrome + mint/neon, Rethink Sans/Inter/Geist Mono, `CardGPT▍` logo, shared `CreditCardCard`, dark mode kept, every behavior preserved. Re-sequenced ahead of 9 & 10 | THI-176 | #10 |
| 9. Data Page (Card Directory) | Public `/[locale]/cards` grid (reuses `CreditCardCard` browse mode) + `/[locale]/cards/[id]` detail (`getCardById`) + client search/sort + page-level provenance banner + recommender deep-link, bilingual. Filters deferred (RQ-001) | THI-311 | #13 |
| 10. Research Page | Public bilingual `/[locale]/research` — ranking-methodology explainer (accurate to `recommendCards.ts`) + crypto-valuation explainer (accurate to `valuateCrypto.ts`), plain React + next-intl, full en/zh-HK parity | THI-319 | #14 |

**Process:** every phase ran the full gate — issue-first Linear ticket → feature branch → plan-checker → goal-backward verifier → qa-karen pre-merge review → PR → product-owner sign-off → squash-merge → Ops-Grace post-deploy health check.

**Key decisions locked:** DEC-VAL-A/B/C (unit-segmented crypto valuation, fail-safe, base un-staked tier) · DEC-DATA-001 (bulk crypto data provenance-labeled) · DEC-DATA-002 (CoinMarketCap cron rate table) · DEC-AFF-DROP (affiliate disclosure dropped, risk-accepted) · the v2 design contract.

**Milestone audit (2026-07-31):** `gaps_found` — but all gaps were closure-hygiene, not capability gaps (product shipped live + Ops-Grace HEALTHY). Full report archived at `milestones/v1.1-MILESTONE-AUDIT.md`. Resolved at close: Phase 9 & 10 human UAT signed off. Carried forward as known overrides: Phases 6 & 11 shipped without a canonical VERIFICATION.md (features wired + live, integration-verified); the recommender-side crypto display (`cryptoSegment` built by the engine, not yet rendered) is deferred to the RQ-001 milestone.

**Open at close (non-blocking, carried forward):**

- **GH #12** — prod `OPENROUTER_API_KEY` is dead (401); the user-facing free-text parser (`parseActivity.ts`) degrades to keyword-only for ambiguous input. Needs a key rotation. **Highest user-impact.**
- **CRY-04 crypto display** — the engine builds `cryptoSegment` but no UI renders it (`HomeClient.tsx:63` reads only `.recommendations`); crypto is browsable via `/cards` but not recommendable-with-value. RQ-001-gated. Reconcile the Research copy that promises a visible segment when this lands.
- **RQ-001** — no real crypto-card data yet (the CoinMarketCap rate cron runs but there are no crypto cards in prod); the seed machinery + rate table are built and dormant-ready.
- **THI-297** — revisit the affiliate disclosure before real monetized Apply links ship.
- **THI-236** (Urgent) — admin auth hardening (pre-existing, unrelated to v1.1 features).
- **GH #11** — minor Phase 11 redesign nits; Phase 9 zh-HK empty-count cosmetic.
- Ingestion strategy: scraping evaluated (recommendation: hybrid manual-first, not per-issuer scrapers).

---

*Phases 1–5 (v1.0, the original as-built product) predate the GSD process and were captured retrospectively in ROADMAP.md; they are not itemized here.*
