# Pitfalls Research

**Domain:** HK bilingual client-side card-reward recommender + browsable global card directory + crypto-card valuation + affiliate monetization (Next.js 16, client-side engine, Upstash Redis, Vercel `hkg1`)
**Researched:** 2026-07-16
**Confidence:** HIGH on the code-grounded engine/data/i18n pitfalls (verified against `src/` on 2026-07-16); MEDIUM on the compliance/disclosure pitfall (regulatory landscape moves and this is not legal advice).

> Scope note: these are pitfalls **specific to adding the v1.1 features to THIS system**, verified against the live engine (`recommendCards.ts`, `calculateReward.ts`), the loader (`loadCards.ts`, `cardRepository.ts`), the schema (`types/card.ts`), and the home surface (`page.tsx`, `HomeClient.tsx`). File:line references are to the code as read on 2026-07-16.
>
> Public-repo reminder: this file is world-readable. The admin-auth item (THI-236) is referenced by ticket only; no exploit specifics here.

## Critical Pitfalls

### Pitfall 1: Global / non-HK cards leak into the recommender because the `hkEligible` gate lives in the wrong place (or nowhere)

**What goes wrong:**
The recommender surfaces a card the user in HK cannot obtain (a global Crypto.com/Revolut-style card), or a directory-only record shows up as a ranked "use this card" recommendation. This is the single highest-trust-damage failure of the milestone: the directory is *allowed* to be global and lower-accuracy (DEC-DATA-001), but the recommender must never recommend an unobtainable card.

**Why it happens:**
There is **no `hkEligible` gate anywhere in the current pipeline** — it doesn't exist yet, and the places it must be added are diffuse:
- `recommendCards()` filters candidates on **only** `card.isActive` and `preferences.excludedCardIds` (`recommendCards.ts:56-60`). Nothing else.
- `loadCards()` → `processDatabase()` (the exact feed to the home recommender via `page.tsx:16` → `HomeClient.tsx:44`) filters on **only** `validateCard` + `card.isActive` (`loadCards.ts:97-104`).
- The Data page will read the **unfiltered** corpus (`getAllCardsAsync` / `getDatabaseAsync`, `cardRepository.ts:104,81`), which is correct for the directory but means the *same array shape* flows to two surfaces with opposite eligibility requirements.

The trap: a dev adds the gate in one entry point (say `loadCards`) and assumes it holds "everywhere the engine builds its candidate set." But the engine builds its candidate set from **whatever array it is handed**, and there are multiple hand-off points: `loadCards()` (home), `getCardsByRewardUnit()` (`loadCards.ts:183`), `getActiveCardsAsync()` (`cardRepository.ts:112`), the `/api/parse-activity` path, and any new "best card" helper on the Data page. Miss one and global cards leak.

**How to avoid:**
- Make `hkEligible` gating a **single choke point the recommender cannot bypass**, not a caller responsibility. Add the filter **inside `recommendCards()`** (alongside the `isActive` filter at `recommendCards.ts:56`) so *no* caller can accidentally feed it a global card — then the directory reads a *different* function that deliberately skips the gate. Defense in depth: also filter in `processDatabase()`/`loadCards()`.
- Treat "recommender feed" and "directory feed" as **two named, separate data paths** with an explicit contract: `loadRecommendableCards()` (gated) vs `loadDirectoryCards()` (ungated). Never let the directory path reach `recommendCards()`.
- Decide the **default for a card with `hkEligible` undefined**. Bulk-seeded global records will have it unset. The safe default for the *recommender* is `hkEligible !== true` → excluded (fail closed). The 11 existing HK cards need a one-time backfill to `hkEligible: true` or they vanish from the recommender.
- Add a guard test: assert that for a corpus containing a known global-only card, `recommendCards()` never returns it.

**Warning signs:**
- A crypto/neobank card with no HK issuance appears in home-page results.
- `totalCardsEvaluated` (`recommendCards.ts:142`) jumps to the full global count after the directory import.
- The recommender count and the directory count converge (they should diverge post-import).

**Phase to address:**
The crypto/directory data-model + engine phase — the gate must land in the **same phase that imports the global set**, never after. Importing global cards before the gate exists is the dangerous ordering.

---

### Pitfall 2: A stale or wrong crypto→HKD rate silently corrupts net-value ranking

**What goes wrong:**
Crypto rewards (USDC/CRO/etc.) are valued into HKD to rank against cashback/miles cards. If the rate is stale, wrong, zero, or missing, the crypto card silently sorts to the top or bottom — and because ranking is deterministic and unexplained, **the user sees a confident wrong answer**. A 5%-in-CRO card during a CRO drawdown can still show as "best" if the rate froze at last week's high.

**Why it happens:**
- The engine has **no concept of per-unit value today**. `calculateNetValue()` is literally `rewardAmount - fees` (`calculateReward.ts:314-316`), and `rewardAmount = transaction.amount * effectiveRate` (`calculateReward.ts:276`) in *raw reward units*. Introducing crypto forces a conversion step that has never existed, so it gets bolted on quickly.
- The client-side engine means the rate must be **fetched server-side and passed down** (secrets/rate-limits can't live in the client, same discipline as card data). A naive implementation fetches the rate in a route that is statically cached (see Pitfall 7) and freezes it.
- Rate providers fail. A missing/NaN rate that defaults to `0` silently zeroes crypto rewards; a default of `1` massively overvalues them. Both are "successful" code paths.

**How to avoid:**
- **Fail safe, loudly.** If a crypto asset has no fresh rate, do **not** rank the card on a guessed value. Options in preference order: (a) exclude the crypto card from ranked results and show it as "value unavailable — rate stale," (b) rank it but visibly flag "estimated, rate as of <time>." Never let a missing rate silently become 0 or a stale number that still ranks #1.
- **Stamp every crypto valuation with an `as-of` timestamp** and a staleness threshold. Past the threshold, degrade to the fail-safe above. Surface "rate as of HH:MM" in the UI next to any crypto reward.
- Keep the rate source **server-side** and injected into the client engine as data (mirrors the existing card-data server/client split). Do not fetch rates from the client.
- For v1.1's accepted-debt posture, a **manually-maintained static rate config with an explicit `updatedAt`** is acceptable and honest — but it must still show its as-of date and must be trivially updatable without a deploy (Redis, like card data). A static rate with no visible date is the trap.
- Guard against zero/negative/NaN rates at the boundary; treat them as "no rate," not as a value.

**Warning signs:**
- A crypto card ranks #1 for an everyday HKD purchase where a 2% cashback card should win.
- Crypto reward values don't move across days of obvious market movement (frozen rate).
- Reward shows `$0.00` or an absurd value for a crypto card.

**Phase to address:**
The crypto-valuation engine phase. The rate-staleness fail-safe is a **success criterion of that phase**, not a follow-up.

---

### Pitfall 3: Reward-unit valuation is compared across cash/miles/points/crypto as raw numbers — the tie-break has no unit-class step

**What goes wrong:**
The recommender ranks a card with a raw-number reward against another card in a *different unit* as if the numbers were the same currency. Crypto makes an **already-latent bug visible and severe**: a "4 miles per $" card produces `rewardAmount = 400` on a $100 transaction; a 2% cashback produces `rewardAmount = 2`. The sort at `recommendCards.ts:99-128` ranks by `netValue = rewardAmount - fees` first, so **400 "beats" 2** even though 400 Asia Miles ≈ HK$40 and the "winner" may be worse. Adding crypto (CRO amounts that can be tiny or huge) stresses this to the point of nonsense.

**Why it happens:**
- `calculateNetValue()` compares mixed units directly (`calculateReward.ts:314`). There is no value-per-unit normalization — the PRD explicitly punted on cross-unit conversion for fiat, and it was never noticed because the demo corpus is cashback-heavy.
- The tie-break chain (`recommendCards.ts:104-127`) is: net value → raw reward amount → annual fee → preferred issuer → alphabetical. **There is no "normalize to a common HKD value" step and no reward-unit-class step.** Crypto is the fourth incompatible unit poured into a comparator that already can't compare three.
- `rewardUnit` for a card is taken as `matchingRules[0].rewardUnit` (`calculateReward.ts:277`) with the comment "All matching rules should have same unit" — an assumption crypto cards (mixed cash-funding + crypto-reward rules) can break, silently mislabeling the reward.

**How to avoid:**
- Introduce a **single `valueInHKD(rewardAmount, rewardUnit, asset)` normalization** and rank on *that*, not on raw `rewardAmount`. This is the "value-per-reward-unit" notion the exploration note flagged as the real structural work — it fixes miles/points too, not just crypto.
- Keep a per-unit value config: cash = 1.0 HKD; miles/points = a maintained HKD-per-unit estimate; crypto = live/maintained rate × asset. Rank by normalized HKD value; keep the raw amount only for display.
- If full normalization is out of scope for a phase, **do not silently rank across units** — segment results by unit class (the UI already has cash/miles/points tabs at `CardRecommendationList.tsx:149-173`) so a cashback card and a miles card are never presented as directly ranked against each other. Add a crypto segment. This is the honest interim.
- Validate the `matchingRules[0].rewardUnit` assumption: if a card's matched rules span multiple units, handle explicitly rather than picking index 0.

**Warning signs:**
- A miles or crypto card outranks a strictly-better cashback card on a plain HKD purchase.
- "Net value" numbers for miles/crypto cards are order-of-magnitude larger than cashback cards.
- Two cards with genuinely equal HKD value never tie (because raw amounts differ by unit).

**Phase to address:**
The crypto-valuation engine phase — but scope the decision explicitly (normalize-all vs segment-by-unit). This is the "structural decision to make" called out in the exploration note.

---

### Pitfall 4: `minStaking` inherits the `minMonthlySpending` no-op and over-values staking-gated crypto tiers

**What goes wrong:**
A crypto card's top reward tier (e.g. "5% back if you stake 40,000 CRO") is applied **as if the staking requirement were always met**, so every user is shown the maximum crypto reward whether or not they stake. The card is systematically over-valued and can wrongly win recommendations.

**Why it happens:**
The exploration note proposes modelling staking tiers by **reusing the `minMonthlySpending` mechanism** (`minStaking` on `RewardCondition`, structurally identical). But `minMonthlySpending` is currently a **documented no-op**: `calculateReward.ts:162-165` says *"Note: minMonthlySpending requires tracking user's monthly spending … For now, we assume the condition is met if present."* If `minStaking` copies that pattern, it copies the bug — the gate is declared but never enforced, and the highest tier always applies.

**How to avoid:**
- Decide the **default assumption for staking** deliberately, and make it *conservative* for ranking: absent a user-supplied staking level, value the crypto card at its **base (un-staked) tier**, not its top tier. Over-valuing is worse than under-valuing for trust.
- If staking tiers are shown at all, show them as **conditional/aspirational** ("up to 5% with 40,000 CRO staked"), visually distinct from the value used for ranking.
- Do **not** reuse the `minMonthlySpending` code path without first deciding whether it should now actually gate. If you fix one, decide about the other (they're the same latent issue).

**Warning signs:**
- A staking-gated crypto card ranks as if every tier is unlocked.
- The same card shows an identical top reward for all users regardless of any staking input.
- `minStaking` appears in the schema but never changes a computed reward in tests.

**Phase to address:**
The crypto data-model + engine phase — this is a design decision to make *before* writing the `minStaking` evaluation, not after.

---

### Pitfall 5: Adding `'crypto'` to the `RewardUnit` union breaks hard-coded three-unit code paths at runtime

**What goes wrong:**
The moment `RewardUnit` becomes `'cash' | 'miles' | 'points' | 'crypto'`, several places that hard-code the three-unit world break — some caught by the TypeScript compiler (good), but at least one **throws at runtime** in the client engine.

**Why it happens:**
The three-unit assumption is baked in widely:
- `groupByRewardUnit()` returns `Record<'cash'|'miles'|'points', ...>` and does `grouped[rec.calculation.rewardUnit].push(...)` (`recommendCards.ts:173-187`). With a `'crypto'` reward, `grouped['crypto']` is `undefined` → `.push` throws. **Runtime crash in the client.**
- `RecommendationPreferences.preferredRewardUnits` is typed `Array<'cash'|'miles'|'points'>` (`recommendCards.ts:18`); `HomeClient` has a parallel `type RewardType = 'cash'|'miles'|'points'` (`HomeClient.tsx:20`) — a crypto preference can't even be expressed.
- `filterByRewardUnit`, `getBestCardForRewardUnit`, `getCardsByRewardUnit` (`loadCards.ts:183`) all take the three-literal union.
- `CardRecommendationList.tsx:149-173` renders exactly three tabs and counts.
- Runtime validators reject crypto: `cardRepository.ts:194` (`['cash','miles','points']`), `extractRewards.ts:48,296` (AI extraction schema).
- `formatReward`/`getRewardUnitName` (`calculateReward.ts:324-364`) have no crypto branch, and crypto needs an **asset name + HKD-equivalent** display, not a generic label.

**How to avoid:**
- After extending `RewardUnit`, **run `npx tsc --noEmit`** (after `npm install`) and treat every resulting error as a required fix — strict mode (`tsconfig strict: true`) will surface the typed ones. But note `grouped[...]` indexing may **not** be caught (index access can widen), so audit `groupByRewardUnit` explicitly.
- Grep for the literal unit lists (`'cash', 'miles', 'points'` and `['cash','miles','points']`) and handle each: engine unions, UI tabs, validators, AI-extraction schema.
- Give crypto a **display path** in `formatReward`/`getRewardUnitName` that shows the asset (reusing the `rewardPrograms` pattern) and its HKD estimate.
- Add a crypto tab/segment to `CardRecommendationList` (both languages — see Pitfall 8).

**Warning signs:**
- Client throws "Cannot read properties of undefined (reading 'push')" when a crypto card is in results.
- A crypto reward renders as the bare string `crypto` or an empty label.
- AI extraction or admin save rejects a legitimately crypto rule.

**Phase to address:**
The crypto data-model phase — the union change is the first domino; the audit is part of the same phase's definition of done.

---

### Pitfall 6: The bulk-imported global corpus erodes trust because stale/global data isn't labeled or contained

**What goes wrong:**
The directory shows crypto/neobank cards seeded from ranked.plus (a global, weekly, secondhand aggregation — accepted lower accuracy per DEC-DATA-001). Without containment, users read a wrong fee/rate as authoritative CardGPT data, or assume a globally-listed card is HK-available. The accepted debt silently becomes reputational damage.

**Why it happens:**
- The debt is **accepted but not yet contained** — acceptance without labeling is how "known debt" turns into "user got burned." The schema already has `sourceUrl`, `sourceLastVerified`, and `notes` on rules (`card.ts:158-170`) but nothing enforces their use, and there's no card-level "data provenance / last verified / HK-availability" surface.
- `card.lastUpdated` exists (`card.ts:289`) but is a generic timestamp, not a "we verified this against the issuer on X" signal.
- The directory and recommender share a schema, so it's tempting to present bulk-seeded fields with the same visual authority as the hand-curated 11 HK cards.

**How to avoid:**
- **Label provenance on the directory.** For bulk-seeded cards, show "sourced from public aggregation, last updated <date>" and an explicit **HK-availability** indicator (drawn from `hkEligible`). Visually distinguish bulk-seeded records from hand-verified HK cards.
- Populate `sourceLastVerified` / a card-level "last verified" and **display it**; a directory row with no verification date should read as "unverified," not as fact.
- Keep the **containment boundary crisp**: bulk-seeded data lives on the directory; the recommender only ever ranks `hkEligible` (Pitfall 1). The directory's job is "browse what exists"; the recommender's job is "trust this for your purchase."
- Data-Leona's remit (per repo `CLAUDE.md`) explicitly covers staleness — wire the directory's provenance fields to that review loop.
- Don't overreach: DEC-DATA-001 says contain, not solve. The goal is honest labeling, not per-card accuracy this milestone.

**Warning signs:**
- A directory card shows precise fees/rates with no source or verification date.
- Users can't tell an HK-available card from a globally-listed one.
- Support/feedback: "this card's fee is wrong" / "I can't get this card in HK."

**Phase to address:**
The directory/Data-page phase — labeling and the HK-availability indicator are part of shipping the directory, not a later polish.

---

### Pitfall 7: New Data/Research pages (or the crypto-rate fetch) get statically cached and serve stale data

**What goes wrong:**
The Data page shows a card set frozen at build time (missing recent admin edits), or the crypto→HKD rate freezes because it was fetched in a statically-rendered route. This is a **repeat of the exact failure class** that caused the historically painful CDN-caching fight (Phase 5 in the archived roadmap; the Blob→Redis migration).

**Why it happens:**
- The existing home page and card-read API routes all carry `export const dynamic = 'force-dynamic'` deliberately (`page.tsx:12`, `api/admin/cards/route.ts:15`, `api/admin/cards/[id]/route.ts:14`, `api/admin/stats/route.ts:11`). A **new** Data or Research route added without it will be statically optimized by Next.js 16 by default and serve stale card data.
- The async repository variants (`getAllCardsAsync`, `getDatabaseAsync`) are what read fresh Redis data (`cardRepository.ts:81-123`). A new page that uses the **sync** variants (`getAllCards`, `getCardById`) gets the **build-time static JSON**, not live data — the repo doc calls this out as a standing rule.
- A crypto rate fetched inside a cached Server Component or a route without `force-dynamic` / `revalidate` is captured at build/first-render and never refreshes.

**How to avoid:**
- Every new card-reading route/page gets **`export const dynamic = 'force-dynamic'`** and uses the **async** repository variants (`getAllCardsAsync`, `getCardByIdAsync`) — this is an existing, load-bearing project constraint; apply it to the new surfaces verbatim.
- For the crypto rate: fetch it in a dynamic/revalidated path with an explicit freshness policy; never rely on default static caching for volatile data.
- Add the new pages to Ops-Grace's post-deploy check: confirm the Data page reflects a fresh admin edit.

**Warning signs:**
- A card edited in admin doesn't appear on the Data page until a redeploy.
- Crypto values are identical across deploys/days.
- The new page renders the 11-card static JSON count, not the live corpus.

**Phase to address:**
Both the directory phase and the crypto-valuation phase — carry the `force-dynamic` + async-repository rule into every new surface's plan.

---

### Pitfall 8: New surfaces and crypto labels ship English-only, breaking the en/zh-HK bilingual contract

**What goes wrong:**
The Data page, Research page, crypto reward labels, "last verified" provenance strings, staking-tier copy, and the affiliate disclosure render raw i18n keys or English text for zh-HK users. CardGPT's core promise is "in the user's language"; a half-translated new surface breaks it visibly.

**Why it happens:**
- Translations live in two files that must stay in lockstep: `messages/en.json` and `messages/zh-HK.json` (next-intl 4.7). New keys added to `en.json` but not `zh-HK.json` render the key or fall back to English.
- The reward-type tabs are already translated via `tRewardTypes('miles'|'points')` (`CardRecommendationList.tsx:161,173`). A **crypto** tab needs `tRewardTypes('crypto')` added to **both** files, or it shows the raw key.
- New surfaces (Data/Research) are large and copy-heavy — the temptation is to hardcode English strings inline "for now."
- Dynamic/derived strings — asset names, "rate as of <time>", "last verified <date>", HK-availability labels — are easy to forget in the zh-HK file.

**How to avoid:**
- Treat **both message files as a single change unit**: every new key lands in `en.json` and `zh-HK.json` in the same commit. Add a lightweight key-parity check (compare key sets of the two files) to catch drift.
- No hardcoded UI strings on the new pages — route everything through `useTranslations`.
- Explicitly translate the new vocabulary: crypto/asset labels, staking copy, provenance/"last verified", HK-availability, and the affiliate disclosure (Pitfall 9). Traditional Chinese, HK conventions.
- Verify both locales render on the new pages before calling them done ("Looks Done But Isn't").

**Warning signs:**
- zh-HK page shows English text or literal keys like `rewardTypes.crypto`.
- `en.json` and `zh-HK.json` have different key counts.
- Crypto tab label is blank or shows the key.

**Phase to address:**
Each phase that adds a surface (directory, research, crypto UI) owns its own bilingual coverage; add a message-key-parity check once, early.

---

### Pitfall 9: Affiliate + crypto promotion ships without adequate disclosure — trust and regulatory exposure

**What goes wrong:**
The "Apply Here" CTA on `applyUrl` becomes a monetized affiliate link with no visible disclosure, and crypto cards are promoted to HK retail users in a way that crosses HK's aggressive crypto-marketing line. Two distinct risks: (a) undisclosed affiliate relationships (trust + FTC-style norms), and (b) HK-specific crypto-promotion sensitivity.

**Why it happens:**
- The monetization is a "just populate the links" job (exploration note, `card.ts:268`), so the **disclosure** is easy to skip — there is no disclosure copy anywhere in the codebase today (grep found none).
- Financial affiliate marketing has **stricter** disclosure norms than general verticals; "clear and conspicuous," placed **before** the affiliate action, is the FTC standard, and vague/buried disclaimers are considered insufficient.
- HK crypto rules are pointed: the SFC treats content **written in Chinese and denominated in HKD, targeting the HK public** as "active marketing," and prohibits trading incentives / referral bonuses on licensed platforms. CardGPT is exactly Chinese-language, HKD-denominated, HK-targeted — so promoting crypto cards with affiliate inducement is the sensitive case, not a hypothetical.

**How to avoid:**
- Add a **clear, conspicuous affiliate disclosure** near the "Apply Here" CTA (and a standing disclosure page), in **both** languages — not buried in a footer. State that CardGPT may earn a commission and that ranking is (or isn't) affected by it. Be honest about the recommender: it ranks by computed net value, and affiliate presence must not reorder results (see below).
- **Do not let affiliate presence influence ranking.** Ranking is by net value (`recommendNetValue`), not by which cards have affiliate links. If a card lacks an affiliate `applyUrl`, it must still rank on merit (note: `loadCards` currently *requires* `applyUrl` and drops cards without it — `loadCards.ts:49-52` — so an hkEligible card without an affiliate link would silently vanish from the recommender; decouple "has affiliate link" from "is recommendable").
- For crypto specifically: keep promotion **factual/informational** (attributes, not inducements), avoid yield/return claims and referral-bonus framing, and add crypto-risk context. Treat "is this active marketing of a VA service to HK retail" as a real question to check before launch, not a formality. This is a compliance flag for human/operator review, not something to self-clear in code.
- Because the repo is public and HK-targeted, get the disclosure and crypto-promo posture reviewed as a **release gate**, alongside the THI-236 auth gate.

**Warning signs:**
- "Apply Here" links carry affiliate tracking with no disclosure text on the page.
- Crypto cards are described with yield/return/"earn" inducement language.
- A card with an affiliate link ranks above a strictly-better card without one.

**Phase to address:**
The affiliate-monetization phase (disclosure + ranking-neutrality) and, as a cross-cutting release gate, before the first prod deploy that exposes crypto promotion.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Static, manually-maintained crypto→HKD rate (no live feed) | Ships crypto valuation without a rate-provider integration | Silent staleness if the `updatedAt`/as-of isn't shown and enforced | Acceptable for v1.1 **only** if the as-of date is displayed, the rate is Redis-updatable without deploy, and staleness degrades to a fail-safe (Pitfall 2) |
| Bulk-seeded global directory data with lower accuracy | Populates the directory without manual entry (DEC-DATA-001) | Trust erosion if unlabeled | Acceptable **only** with provenance + "last verified" + HK-availability labeling (Pitfall 6) |
| Segment results by reward-unit instead of full cross-unit normalization | Avoids building a value-per-unit model this milestone | Miles/points/crypto never truly comparable; "best card" is per-segment only | Acceptable as an honest interim; **never** silently rank raw amounts across units (Pitfall 3) |
| Value staking-gated crypto tiers at base (un-staked) tier | Avoids a user staking-input UI | Under-states reward for actual stakers | Acceptable and *preferred* over over-valuing; show top tiers as conditional (Pitfall 4) |
| Reusing `minMonthlySpending`'s "assume met" code path for `minStaking` | One mechanism, less code | Copies a live no-op bug → over-valuation | **Never** without first deciding the gate semantics (Pitfall 4) |
| Adding new pages with sync repository variants | Simpler, no async | Serves build-time static data, not live Redis | **Never** on card-reading surfaces — async + `force-dynamic` is a project rule (Pitfall 7) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Crypto rate source | Fetching in a statically-cached route; defaulting missing rate to 0 or 1 | Server-side fetch in a dynamic/revalidated path; missing → explicit "no rate" fail-safe, never a silent number |
| Upstash Redis (rate + card data) | New page reads sync static JSON (`getAllCards`) and looks "live" in dev, stale in prod | Always async variants (`getAllCardsAsync`/`getDatabaseAsync`) + `force-dynamic` on card/rate-reading surfaces |
| ranked.plus data | Copying records/ranking, or importing referral links | Design/schema reference only; factual attributes seeded; **their** referral links excluded, CardGPT's affiliate links substituted (DEC-DATA-001) |
| Affiliate networks | Ranking cards by affiliate availability; dropping cards without an affiliate link | Rank by net value only; decouple "recommendable" from "has affiliate `applyUrl`" (fix `loadCards.ts:49-52` requirement) |
| next-intl (en + zh-HK) | Adding keys to `en.json` only | Both message files in one commit; key-parity check |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full global directory rendered/ranked client-side | Sluggish Data page; large client payload | Corpus capped <100 cards (PRD); paginate/filter the directory; don't ship the whole global set to the recommender (gate first) | Only if the global import blows past the <100-card cap — watch import size |
| Per-card crypto rate lookups | Many rate calls, slow render | Resolve all needed rates once server-side, inject as a small map | At more crypto assets than rate-cache entries |
| `force-dynamic` on every new page | No caching → every request hits Redis | Correct for *card-reading* surfaces (data must be live); keep static pages (Research editorial) genuinely static where data isn't card-dependent | N/A — correctness over caching here, but don't blanket-`force-dynamic` purely-static content |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Fetching crypto rate or affiliate tokens from the client | Leaks keys / rate-limit abuse; same class as exposing Redis/Anthropic secrets | Server-side only; inject rate as data into the client engine (mirror the existing card-data split) |
| Committing anything security-sensitive to this **public** repo | World-readable exploit surface | Keep specifics in Linear; THI-236 (admin auth) is the worked example — do not detail it here |
| Treating admin surface as protected while adding crypto/directory admin CRUD | Bulk-import tooling on an unhardened admin | THI-236 must land within/before the first v1.1 prod deploy (shipping gate, per PROJECT.md) |
| Affiliate redirect without validation | Open-redirect / malicious `applyUrl` | `applyUrl` already URL-validated on write (`cardRepository.ts:149-152`); keep validation; consider allow-listing affiliate domains |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Recommender confidently ranks a crypto card #1 on a stale/guessed rate | User acts on a wrong "best card" | Show rate as-of; fail-safe when stale (Pitfall 2) |
| Cross-unit "best card" that compares miles/crypto vs cash as raw numbers | User trusts a worse card | Normalize to HKD or segment by unit; never mix raw amounts (Pitfall 3) |
| Directory card looks as authoritative as a verified HK card | User relies on stale/global data | Provenance + "last verified" + HK-availability labels (Pitfall 6) |
| Half-translated new page for zh-HK users | Core "your language" promise broken | Full en/zh-HK parity per surface (Pitfall 8) |
| Undisclosed affiliate CTA | Trust damage when discovered | Clear, conspicuous, bilingual disclosure before the action (Pitfall 9) |

## "Looks Done But Isn't" Checklist

- [ ] **`hkEligible` gate:** recommender never returns a non-HK card — verify with a global-only test card that `recommendCards()` excludes it; confirm the gate is inside the engine, not just one caller.
- [ ] **Crypto valuation staleness:** missing/stale rate degrades to a visible fail-safe, not a silent 0/1 — verify by simulating a missing rate.
- [ ] **Cross-unit ranking:** a 2% cashback beats a "4 miles/$" card on a plain HKD purchase — verify the normalization or segmentation actually applies.
- [ ] **`minStaking`:** staking-gated tier does **not** apply un-staked — verify a staking card values at base tier by default.
- [ ] **`RewardUnit += crypto`:** `npx tsc --noEmit` clean **and** `groupByRewardUnit` doesn't throw on a crypto reward at runtime.
- [ ] **New pages:** carry `export const dynamic = 'force-dynamic'` and use async repository variants — verify an admin edit shows immediately.
- [ ] **i18n:** `en.json` and `zh-HK.json` key sets match; crypto tab + provenance + disclosure render in zh-HK.
- [ ] **Directory provenance:** every bulk-seeded card shows source + last-verified + HK-availability.
- [ ] **Affiliate:** disclosure visible before the CTA in both languages; a card without an affiliate link still ranks on merit and still appears in the recommender.
- [ ] **Health check + build:** `npm run build` passes its `scripts/health-check.js` gate with the new schema/pages.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Global card leaked into recommender | LOW | Add/relocate `hkEligible` filter inside `recommendCards()`; backfill `hkEligible` on the 11 HK cards; add guard test. Data is Redis-editable, no deploy needed to re-flag. |
| Stale crypto rate shipped as fact | LOW–MEDIUM | Update rate in Redis; add as-of display + staleness fail-safe. Ranking recovers on next dynamic render. |
| Cross-unit mis-ranking discovered post-launch | MEDIUM | Fall back to unit-segmented display immediately (UI already has tabs); build normalization behind it. |
| `minStaking` over-valuation | LOW–MEDIUM | Flip default to base-tier valuation; recompute. Requires an engine fix + redeploy. |
| Runtime crash from `RewardUnit` union | LOW | Fix `groupByRewardUnit` map init to include crypto; add the missing display branches. |
| Missing zh-HK translations | LOW | Add keys to `zh-HK.json`; key-parity check prevents recurrence. |
| Undisclosed affiliate / crypto-promo exposure | MEDIUM–HIGH | Add disclosure immediately; pull/soften crypto inducement copy; escalate to operator/legal review. Highest non-code cost. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. hkEligible leak | Crypto/directory data-model + engine phase (same phase as the global import) | Global-only test card excluded by `recommendCards()`; recommender count ≠ directory count |
| 2. Crypto rate staleness | Crypto-valuation engine phase | Simulated missing/stale rate → fail-safe, not silent number; as-of shown |
| 3. Cross-unit valuation | Crypto-valuation engine phase | 2% cashback beats 4 miles/$ on plain HKD txn; decision (normalize vs segment) recorded |
| 4. minStaking no-op | Crypto data-model + engine phase | Staking card values at base tier un-staked |
| 5. RewardUnit union break | Crypto data-model phase | `tsc --noEmit` clean + no runtime throw on crypto reward |
| 6. Bulk-data trust/labeling | Directory / Data-page phase | Every seeded card shows source + last-verified + HK-availability |
| 7. Caching regression | Directory phase + crypto-valuation phase | Admin edit reflects immediately on new pages; crypto value refreshes |
| 8. i18n gaps | Every surface-adding phase (+ one-time key-parity check) | zh-HK renders all new copy; key sets match |
| 9. Affiliate/crypto disclosure | Affiliate-monetization phase + pre-deploy release gate | Bilingual disclosure before CTA; ranking neutral to affiliate presence; crypto-promo posture reviewed |

## Sources

- Live code read of `/Users/jeffreyng/cardgpt/src` on 2026-07-16 (engine, loader, repository, schema, home surface, i18n message files) — HIGH confidence, primary source.
- `.planning/PROJECT.md` and `.planning/notes/ranked-plus-directory-and-crypto-expansion.md` (DEC-DATA-001, DEC-SCOPE-001, schema-change evaluation).
- Repo `CLAUDE.md` (public-repo rule, force-dynamic/async-repository constraints, THI-236 gate, Data-Leona remit, CDN-caching history).
- HK SFC crypto/virtual-asset marketing posture — [Norton Rose Fulbright: Crypto asset regulation in Hong Kong](https://www.nortonrosefulbright.com/en/knowledge/publications/10fba6f7/crypto-asset-regulation-in-hong-kong), [Charltons Quantum: HK Virtual Assets Regulation](https://charltonsquantum.com/hong-kong-virtual-assets-regulation/), [Stephenson Harwood: Virtual assets laws in Hong Kong](https://www.stephensonharwood.com/insights/virtual-assets-laws-and-regulations-in-hong-kong/) — MEDIUM confidence; not legal advice, flag for operator/legal review.
- Affiliate-disclosure norms (FTC "clear and conspicuous," financial-vertical strictness) — [Termly: Affiliate Disclosure guide](https://termly.io/resources/articles/affiliate-disclosure/), [Post Affiliate Pro: Do I have to disclose affiliate links?](https://www.postaffiliatepro.com/faq/do-i-have-to-disclose-affiliate-links/) — MEDIUM confidence.

---
*Pitfalls research for: CardGPT v1.1 — Card Directory & Crypto Expansion*
*Researched: 2026-07-16*
