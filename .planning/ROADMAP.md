# CardGPT — Roadmap

**Two layers.** **Phases 1–5 are an as-built capture** — a retrospective map of the deployed
product (87 commits, live on Vercel `hkg1`), reconstructed from code + git history on 2026-07-15.
They are **COMPLETE and shipped**. **Phases 6–11 are Milestone v1.1 — Card Directory & Crypto
Expansion**, which **shipped 2026-07-31 and was archived 2026-08-02**.

> **Read this before planning.** All phases 1–11 are shipped. No milestone is currently active —
> start the next one with `/gsd-new-milestone`. The Backlog / Open section below lists
> cross-milestone open items and release gates; it is preserved across milestone archival.

**Granularity:** standard · **Convention:** sequential (no `config.json` present)

---

## Milestones

- ✅ **v1.0 (as-built)** — Phases 1–5 — the pre-GSD deployed product (retrospective capture 2026-07-15)
- ✅ **v1.1 Card Directory & Crypto Expansion** — Phases 6–11 — **SHIPPED 2026-07-31**, archived 2026-08-02 → [`milestones/v1.1-ROADMAP.md`](milestones/v1.1-ROADMAP.md) · [audit](milestones/v1.1-MILESTONE-AUDIT.md) · [requirements](milestones/v1.1-REQUIREMENTS.md)

---

## Phases

<details>
<summary>✅ v1.0 as-built (Phases 1–5) — retrospective capture, shipped before GSD</summary>

- [x] **Phase 1: Card Schema & Corpus** — Typed card/reward model, 11-card HK corpus, repository layer
- [x] **Phase 2: Recommendation Engine & NLP Parser** — Bilingual text → structured transaction → ranked cards
- [x] **Phase 3: Public Web Experience** — Bilingual desktop UI, tags, ranked results, dark mode, landing page
- [x] **Phase 4: Admin & AI Card Ingestion** — Auth, card CRUD, PDF extraction, pending-approval queue
- [x] **Phase 5: Persistence & Deployment** — Upstash Redis migration, CDN/caching hardening, Vercel hkg1

Full retrospective detail lives in git history + `.planning/archive/`. These predate GSD and were never Linear-mirrored.

</details>

<details>
<summary>✅ v1.1 Card Directory & Crypto Expansion (Phases 6–11) — SHIPPED 2026-07-31</summary>

- [x] **Phase 6: Schema, Crypto Type Fan-out & Backfills** (5/5) — `cardType`, crypto reward unit + asset, staking gate, `hkEligible`; 11 cards backfilled; dead `RewardCap` retired — THI-252/253/254, PRs #3–#5
- [x] **Phase 7: Crypto→HKD Valuation Engine & hkEligible Gate** (3/3) — unit-segmented HKD valuation (partition-before-sort → fiat byte-identical), fail-safe on stale rates, fail-closed gate; vitest baseline — THI-279/280, PRs #7–#8
- [x] **Phase 8: Bulk Crypto Seed & Affiliate / Disclosure** (4/4) — merge-aware seed + fixture; CoinMarketCap daily rate cron; affiliate CTA rel triplet; `loadCards` fix (10→11 cards). Disclosure dropped (DEC-AFF-DROP) — THI-294, PR #9
- [x] **Phase 11: UI / Theme Refresh** (4/4) — whole-app re-skin into the v2 brutalist-editorial system (`design/ui-contract-v2.md`); shared `CreditCardCard`; dark mode kept. Re-sequenced ahead of 9 & 10 — THI-176, PR #10
- [x] **Phase 9: Data Page (Card Directory)** (3/3) — public `/cards` grid + `/cards/[id]` detail + client search/sort + provenance banner + recommender deep-link, bilingual — THI-311, PR #13
- [x] **Phase 10: Research Page** (2/2) — public bilingual `/research` ranking-methodology + crypto-valuation explainers, engine-accurate — THI-319, PR #14

Full phase detail archived at [`milestones/v1.1-ROADMAP.md`](milestones/v1.1-ROADMAP.md).

</details>

---

## Backlog / Open

Nothing here is scheduled. No milestone is defined. These are the honest unresolved items —
recorded so a later session can decide, not resolved by inference now.

### Open questions — require a human decision

| ID | Question | Why it matters |
|----|----------|----------------|
| **OPEN-001** | **Rule-priority taxonomy.** Docs say `base\|bonus\|premium`; code implements `base\|bonus\|specific` (`card.ts:65`). **Not a rename** — the doc's `premium` is a highest-tier override for spend-based upgrades; the code's `specific` means "replaces base rate entirely." SCHEMA_DESIGN's "Tiered Spending Card" pattern has **no code equivalent**. | Decide which is intended. If `specific` is correct → rewrite SCHEMA_DESIGN and delete the tiered-spending pattern. If a spend-tier override is genuinely wanted → it's new work. Do not let a planner infer a rename and file phantom work. |
| **OPEN-002** | **The reward-cap contract.** `RewardCap` (`card.ts:235-249`) is **write-only dead schema** — populated on 3 of 11 cards (`citi-cash-back`, `sc-smart`, `sc-simply-cash`) and **read by no engine, UI, or admin code**. The shipping cap is per-rule `monthlySpendingCap` + `fallbackRate` (`card.ts:126`), fully wired. | Likely resolution: delete `RewardCap`, declare per-rule caps canonical. But this decides whether **PUB-007 (multi-card split) is buildable as the PRD describes it** — its trigger is "maximum rewards cap has met." Needs an explicit call. **Correction to intel:** WARNING-002 claimed zero cards populate `rewardCap`; 3 do. The dead-schema conclusion stands and worsens — data implies a contract nothing honors. |
| **OPEN-005** | **Product surface + design direction.** PRD scopes **desktop**; LANDING_PAGE_REDESIGN specifies mobile-first installable PWA (never ratified). PRD asks for ChatGPT color tone; LANDING_PAGE layers playful-fintech purple/orange/blue on top. Both palettes coexist in `globals.css:15-25`. | Is mobile/PWA in scope? Which design direction governs? Folded into the PRD-v2 question. |
| **OPEN-006** | **Tie-break semantics.** Shipped chain has **no reward-unit-class step**, contradicting the PRD's "cash back highest priority, then miles, then the rest." `preferredRewardUnits` is a *filter*, not an ordering. | Is net-value ranking the intended improvement (likely — it's arguably more correct), or is this a regression against the PRD? Either way, one of the two must change. |
| **OPEN-007** | **Typing cadence.** PRD says every 1 minute; code says `intervalMs = 10000` (10s), commented "6 times per minute." | Someone made a deliberate 6× change and recorded no reason. Confirm intent, then fix the code or the PRD. |

### Known gaps — no decision needed, just unbuilt/undone

| ID | Item |
|----|------|
| **PUB-007** | **Multi-card split is entirely unbuilt.** No split logic in `src/lib/engine/`; no "merchant allows splitting" flag anywhere. Largest unbuilt PRD requirement. **Downstream of OPEN-002.** |
| **OPEN-003** | 🔴 **Admin authentication requires urgent hardening. Tracked privately as [THI-236](https://linear.app/thirdvisor/issue/THI-236) (Urgent) — details deliberately withheld from this file.** Confirmed against the live deployment on 2026-07-15. `src/lib/auth/adminAuth.ts` does not adequately protect the admin surface, and its own header comment concedes "For production, consider using a proper JWT or session library." **This repo is public, so the specifics live in the Linear issue rather than here** — publishing them while the issue is open would hand over a working exploit. Scope: the whole admin surface, all 11 `/api/admin/*` routes, writing to live Redis. No personal data is at risk (the product holds none); the exposure is card-data integrity and API-key abuse. **Read THI-236 before touching `src/lib/auth/`, and re-expand this entry once the fix has shipped.** |
| **OPEN-004** | **Zero ADRs.** CAND-001…007 are unlocked candidates. **CAND-006 (Redis migration) and CAND-007 (admin panel) have no doc source at all** — they exist only in git. Promoting these two into real ADRs is the **clearest early win for GSD adoption**. Also: `docs/ARCHITECTURE.md` still documents Vercel Blob and must be rewritten; the PRD needs a v2 covering the admin surface + Redis. |
| **OPEN-008** | ✅ **RESOLVED (Phase 7 + 8).** vitest is installed and `npm test` (`vitest run`) is wired (`vitest.config.ts`); the suite runs green (108 passed / 7 skipped as of Phase 8, THI-294). The 7 skips are the pre-existing `transactionParser` assertions quarantined pending a taxonomy decision (separate follow-up). ⚠ CLAUDE.md's "There is no test runner" pitfall note is now stale — fix via doc-sync. |
| **OPEN-009** | **Landing-page NFRs are claimed, never verified.** Lighthouse >90, <3s load, 60fps, WCAG AA, 44×44px tap targets, `prefers-reduced-motion` guard, PWA manifest — all asserted by LANDING_PAGE_REDESIGN under a sign-off, with an **entirely unchecked** testing checklist. Only the brand palette is verified (`globals.css:15-25`). |
| **OPEN-010** | **`dayOfWeek` is a dead code path.** Honored at `calculateReward.ts:131`; used by 0 of 11 cards. Either a card should exercise it or it should go. |
| **OPEN-011** | **Doc debt.** Stale framework versions (docs say 14/15, actual 16.1.4), stale card counts (10/36 vs. actual 11/40), `sim-card` in no research doc, `/api/recommend` referenced but nonexistent, `DEPLOYMENT_READY.md` rooted at a dead path. |

### v1.1-carried follow-ups (from milestone close)

| ID | Item |
|----|------|
| **CRY-04 crypto display** | The engine builds `cryptoSegment` (valued crypto cards) but no UI renders it (`HomeClient.tsx:63` reads only `.recommendations`). Crypto is browsable via `/cards` but not recommendable-with-value. RQ-001-gated. When it lands, reconcile the `/research` copy that already describes a visible crypto segment. |
| **Phase 6 & 11 verification** | Both shipped without a canonical `VERIFICATION.md` (features wired + live + integration-verified in the v1.1 audit). Retroactive goal-backward verifications can be generated if a fully-clean archived record is wanted. |
| **GH #12** | Prod `OPENROUTER_API_KEY` dead (401) → free-text parser degraded to keyword-only. Rotate key. Highest user-impact. |
| **RQ-001 / THI-297** | Source real HK crypto-card data before the seed loads anything real; revisit affiliate disclosure before monetized Apply links ship. |
