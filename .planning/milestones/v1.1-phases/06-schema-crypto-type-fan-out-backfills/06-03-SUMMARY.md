---
phase: 06-schema-crypto-type-fan-out-backfills
plan: 03
subsystem: public-ui + admin-forms
tags: [react, next-intl, reward-unit, crypto, cardType, fan-out, admin]

# Dependency graph
requires:
  - phase: 06
    plan: 01
    provides: Widened RewardUnit ('cash'|'miles'|'points'|'crypto'), required CreditCard.cardType, RewardPrograms.crypto
  - phase: 06
    plan: 02
    provides: Engine/data/AI fan-out — formatReward/getRewardUnitName render crypto by named asset; validateCard requires cardType
provides:
  - Public reward-preference union (TransactionInput, HomeClient) sourced from the shared RewardUnit type — crypto typechecks against the widened engine preferences
  - CardRecommendationList filterRewardType accepts crypto; a crypto filter tab renders only when a crypto result exists
  - Admin card form: a Card Type selector (Credit/Crypto/Prepaid) + a 'credit' default on new cards so they satisfy validateCard's required-cardType rule
  - Crypto reward-unit <option> in all three admin rule editors (CardEditForm, RuleForm, UploadExtractor)
  - Localized 'Crypto' reward-type label in both en and zh-HK message files
affects: [phase-07-valuation, reward-unit-fan-out]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public reward-preference unions reference the shared RewardUnit type instead of re-listing cash|miles|points, so a future unit addition cannot desync the UI from the engine"
    - "Crypto controls render conditionally (availableRewardTypes.has('crypto')) — additive and invisible until crypto card data exists"
    - "New-card defaults (emptyCard.cardType='credit') satisfy create-time validation without changing the save/validation flow"

key-files:
  created:
    - .planning/phases/06-schema-crypto-type-fan-out-backfills/06-03-SUMMARY.md
  modified:
    - src/components/TransactionInput.tsx
    - src/components/CardRecommendationList.tsx
    - src/components/HomeClient.tsx
    - src/app/admin/cards/[id]/CardEditForm.tsx
    - src/app/admin/cards/[id]/rules/RuleForm.tsx
    - src/app/admin/upload/UploadExtractor.tsx
    - messages/en.json
    - messages/zh-HK.json

key-decisions:
  - "Widened the two public local RewardType aliases (TransactionInput, HomeClient) to `type RewardType = RewardUnit` rather than re-listing literals — the shared type is the single source of truth"
  - "The public home quick-selector still offers only cash/miles/points (no crypto quick-pick until crypto cards exist), but its emoji map gained a crypto glyph branch so a crypto selection would not render blank"
  - "Crypto-asset naming in the admin card form stays on the JSON authoring path (rewardPrograms.crypto); no crypto program-naming UI section added and updateRewardPrograms/hasRewardType left narrow ('miles'|'points') — the plan flagged this as optional and it materially enlarges the change for no Phase-6 benefit"
  - "Only one new user-facing PUBLIC string ('Crypto' reward-type label) was introduced; it is localized in both en.json and zh-HK.json (加密貨幣). Admin-form strings are hardcoded English by existing convention (no next-intl in the admin tree), so 'Card Type'/'Crypto' option labels there need no translation"

requirements-completed: [CRY-01, CRY-02]

# Metrics
duration: ~12min
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 03: Public-UI + Admin-Forms Reward-Unit Fan-Out (crypto) Summary

**Completed the CRY-02 reward-unit fan-out across the visitor-facing controls and the admin authoring forms: the public reward-preference unions now derive from the shared `RewardUnit` type (so a crypto reward typechecks and renders), the recommendation-list gained a crypto filter tab that appears only when a crypto result exists, and the admin card form gained a Card Type selector defaulting new cards to `credit` (satisfying `validateCard`'s required-cardType rule from 06-02) plus a Crypto reward-unit `<option>` in all three rule editors — `npx tsc --noEmit` and `npm run build` are both green.**

## Performance
- **Duration:** ~12 min
- **Started:** 2026-07-21
- **Completed:** 2026-07-22
- **Tasks:** 2 (each committed atomically)
- **Files modified:** 8 (3 public UI, 3 admin forms, 2 locale files)

## Accomplishments
- **Task 1 (public reward-type controls + filters):** Replaced the two hand-written local `RewardType = 'cash'|'miles'|'points'` aliases (`TransactionInput.tsx`, `HomeClient.tsx`) with `type RewardType = RewardUnit` imported from `@/types/card`, so a crypto preference flows through `setSelectedRewardType` and `preferredRewardUnits: [selectedRewardType]` without a type error. Widened `CardRecommendationList`'s `filterRewardType` state to `'all' | RewardUnit` and added a crypto filter tab that renders only when `availableRewardTypes.has('crypto')`, counting `rewardUnit === 'crypto'` — crypto amounts already route through `getRewardUnitName` (taught crypto in 06-02), so no crash. Added a 🪙 glyph branch to the home selector's emoji map. Added a localized `crypto` reward-type label to both message files.
- **Task 2 (admin forms):** Added `cardType: 'credit'` to `emptyCard` so a newly created card carries a valid cardType and passes `validateCard`. Added a **Card Type** `<select>` (Credit / Crypto / Prepaid) bound to `card.cardType` via `updateCard`, placed beside the Network field. Added a `<option value="crypto">Crypto</option>` to the reward-unit selector in `CardEditForm.tsx`, `RuleForm.tsx`, and `UploadExtractor.tsx`. Save/submit/validation logic untouched.
- **Behavior preservation:** No crypto card data exists yet (all 11 cards are `credit` with cash/miles/points), so every crypto UI path is inert — the crypto filter tab never appears, and existing credit-card flows render identically. This is CRY-02 UI fan-out, not Phase-7 valuation.

## Task Commits
Each task committed atomically (both reference THI-253):

1. **Task 1: Tolerate crypto in public reward-type controls + filters** — `61e6f23` (feat)
2. **Task 2: Add crypto reward-unit option + cardType control to admin forms** — `ce47158` (feat)

## Files Created/Modified
- `src/components/TransactionInput.tsx` — `type RewardType = RewardUnit` (import from `@/types/card`); 🪙 crypto glyph branch in the selector emoji map
- `src/components/CardRecommendationList.tsx` — imported `RewardUnit`; `filterRewardType` widened to `'all' | RewardUnit`; conditional crypto filter tab (renders only when a crypto result exists)
- `src/components/HomeClient.tsx` — `type RewardType = RewardUnit` (import from `@/types/card`)
- `src/app/admin/cards/[id]/CardEditForm.tsx` — `emptyCard.cardType = 'credit'`; new Card Type selector; crypto reward-unit `<option>`
- `src/app/admin/cards/[id]/rules/RuleForm.tsx` — crypto reward-unit `<option>`
- `src/app/admin/upload/UploadExtractor.tsx` — crypto reward-unit `<option>`
- `messages/en.json` — `rewardTypes.crypto = "Crypto"`
- `messages/zh-HK.json` — `rewardTypes.crypto = "加密貨幣"`

## Reward-unit fan-out sites changed (file:symbol)
1. `src/components/TransactionInput.tsx:RewardType` — local union → shared `RewardUnit`; emoji map gained a crypto branch
2. `src/components/HomeClient.tsx:RewardType` — local union → shared `RewardUnit`
3. `src/components/CardRecommendationList.tsx:filterRewardType` — `'all'|'cash'|'miles'|'points'` → `'all' | RewardUnit`; new conditional crypto filter tab
4. `src/app/admin/cards/[id]/CardEditForm.tsx:emptyCard.cardType` — new `'credit'` default
5. `src/app/admin/cards/[id]/CardEditForm.tsx` — new Card Type `<select>` (credit/crypto/prepaid); crypto reward-unit `<option>`
6. `src/app/admin/cards/[id]/rules/RuleForm.tsx` — crypto reward-unit `<option>`
7. `src/app/admin/upload/UploadExtractor.tsx` — crypto reward-unit `<option>`

## Bilingual confirmation
The only new **public** user-facing string is the crypto reward-type label. It is present in **both** locale files:
- `messages/en.json` → `rewardTypes.crypto` = `"Crypto"`
- `messages/zh-HK.json` → `rewardTypes.crypto` = `"加密貨幣"`

Admin-form labels ("Card Type", the "Crypto" `<option>` text) are hardcoded English by the existing admin-tree convention (the admin surface does not use next-intl), so they require no translation — consistent with the surrounding "Network", "Reward Unit", "Priority" labels.

## Threat model mitigations honored
- **T-06-03-01 (DoS, reward-type maps assuming a closed set):** all public unions widened to `RewardUnit`; the crypto filter renders only when present; `formatAmount` routes crypto through `getRewardUnitName` — a crypto reward cannot crash the controls.
- **T-06-03-02 (Tampering, new admin card missing cardType):** `emptyCard` defaults `cardType: 'credit'` and the Card Type selector lets an admin set it; `validateCard` (06-02) enforces on create/update.
- **T-06-03-SC (installs):** no new package installs — `npm install` only restored existing deps.

## Verification
- `npx tsc --noEmit` → **exit 0** (zero errors), run after `npm install`.
- `npm run build` → **exit 0** — `✓ Compiled successfully in 1288.3ms`, `✓ Generating static pages using 17 workers (20/20)`.
- Acceptance greps: `crypto` in TransactionInput=2, CardRecommendationList=4, HomeClient=2; `cardType:\s*'credit'` in CardEditForm=1; `value="crypto"` in CardEditForm=2 (cardType + reward-unit), RuleForm=1, UploadExtractor=1.
- Fan-out sweep: `grep -rn "'cash' | 'miles' | 'points'" src/components src/app` → **no matches** (no un-widened closed unions remain in the UI/admin tree).
- Did **not** run `npm test`/vitest/jest — no runner exists (binding CLAUDE.md constraint). Build success is the render proxy (no browser here).

## Deviations from Plan
None affecting scope. Two plan-sanctioned choices recorded:
- The plan offered the option of extending `updateRewardPrograms`/`hasRewardType` to `'crypto'` for crypto-asset naming "if straightforward". It materially enlarges the change (a new program-naming UI block), so per the plan's own guidance I widened only the reward-unit `<option>` + added the Card Type control and left crypto-asset naming to the JSON authoring path (`rewardPrograms.crypto`). `updateRewardPrograms`/`hasRewardType` remain narrow-typed.
- The public home quick-selector still offers only cash/miles/points (adding a crypto quick-pick is explicitly out of scope until crypto cards exist); the type and emoji map tolerate crypto so nothing renders blank if a crypto preference is passed.

## Scope boundaries confirmed
- **No 06-02 engine/data/AI files touched** (`recommendCards.ts`, `calculateReward.ts`, `cardRepository.ts`, `loadCards.ts`, `extractRewards.ts`, `transaction.ts` all untouched).
- **`src/lib/auth/` untouched** (THI-236 / public-repo constraint).
- **`.planning/STATE.md` and `.planning/ROADMAP.md` untouched** (orchestrator-owned).
- Stayed on branch `jeffreyn/thi-253-phase-6-reward-unit-fan-out-crypto-rewardcap-data-retirement`; no branch/push operations.
- No security specifics committed (public repo).

## Known Stubs
None. The crypto UI paths are inert only because no crypto card data exists yet (a data-availability state, not a code stub); every path typechecks and builds. The crypto filter tab and the admin crypto options are fully wired.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- The full reward-unit fan-out (engine + data + AI in 06-02, public UI + admin forms here) now tolerates crypto end-to-end. An admin can author a crypto card (set Card Type = Crypto, add a crypto reward rule); it renders in the public list behind a crypto filter tab once such data exists.
- 06-04 still owns retiring the `rewardCap` data blocks in `cards.json`; 06-05 owns the prod Redis `cardType` backfill.
- Phase 7 owns crypto→HKD valuation and the `minStaking` fail-closed gate (deferred here).

## Self-Check: PASSED
- SUMMARY.md exists on disk.
- Both task commits verified in git log: `61e6f23`, `ce47158`.
- `npx tsc --noEmit` exit 0; `npm run build` exit 0 (Compiled successfully, 20/20 static pages).
- Acceptance greps all satisfied; no bare `'cash' | 'miles' | 'points'` unions remain in `src/components`/`src/app`.
- `rewardTypes.crypto` present in both `messages/en.json` and `messages/zh-HK.json`.

---
*Phase: 06-schema-crypto-type-fan-out-backfills*
*Completed: 2026-07-22*
