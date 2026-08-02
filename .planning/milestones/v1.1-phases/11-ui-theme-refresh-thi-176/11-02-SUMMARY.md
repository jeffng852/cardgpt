---
phase: 11-ui-theme-refresh-thi-176
plan: 02
subsystem: recommender-ui
tags: [ui, redesign, brutalist, card-component, i18n, THI-176]
requires:
  - "11-01 v2 tokens + fonts (globals.css --bg/--fg/--brand, --font-display/sans/mono, badge colors)"
  - "applyCtaProps (AFF-01 / D-05 rel triplet)"
  - "calculateReward formatReward / getRewardUnitName"
provides:
  - "buildCardView pure view-builder (reused by Phase 9 directory, D-05)"
  - "CreditCardCard shared brutalist card (contract §5), parameterized ranked/browse"
  - "CardRecommendationList rendering ranked v2 cards"
affects:
  - "Phase 9 card directory (will reuse CreditCardCard in browse mode)"
tech-stack:
  added: []
  patterns:
    - "Pure render-free view-builder (buildCardView) mirrors applyCtaProps — node-env vitest, no component-render dep"
    - "Alignment rule (D-06): flex-col h-full card + 2-line name reserve + footer margin-top:auto"
key-files:
  created:
    - src/lib/cards/buildCardView.ts
    - src/lib/cards/__tests__/buildCardView.test.ts
    - src/components/CreditCardCard.tsx
  modified:
    - src/components/CardRecommendationList.tsx
    - messages/en.json
    - messages/zh-HK.json
decisions:
  - "Kept the recommender as a single-column list (max-w-3xl) rather than a multi-col grid — preserves the expand/collapse UX and lowers risk; the 2-line reserve + footer pin keep it grid-ready for Phase 9."
  - "buildCardView returns raw values + flags (free/unit/amount) so i18n ('Free', reward-type fallback, 'Reward on HK$X') stays in the component, keeping the helper pure and node-testable."
  - "best-for chips derived only from existing rule categories (drop 'all'), bounded to 3, with a reward-unit fallback — never fabricated."
metrics:
  duration: "~20m"
  completed: 2026-07-28
  tasks: 3
  files: 6
status: complete
---

# Phase 11 Plan 02: Shared Brutalist Card + Recommender Re-skin Summary

Built the shared brutalist card (contract §5) as a pure `buildCardView` helper plus a presentational `CreditCardCard`, and rewired the recommender results onto it — a presentation-only swap (D-02) with the ranking engine, reward-type filter, expand/collapse breakdown, and Phase 8 affiliate CTA all behaviorally identical.

## What was built

- **`buildCardView(card, opts)`** — pure, render-free view-builder. Maps a `CreditCard` (+ optional ranked `calculation` + `isTopPick`) to a typed `CardView`: `typeBadge` (CREDIT/CRYPTO/PREPAID from `card.cardType`), `dataGrid` rows (reward, topReward, rewardType, annualFee, fxFee), `bestFor` chip labels, `cta` state, and `reserveNameLines: 2` (D-06). Delegates the affiliate anchor to `applyCtaProps` — the D-05 rel triplet is NOT re-implemented. Unit-tested in node-env vitest (12 cases) mirroring the `applyCtaProps.test.ts` pattern.
- **`CreditCardCard`** — square/flat/1px-hairline card, parameterized ranked vs browse (D-05, so the Phase 9 directory reuses it). Header issuer bug + type badge / mint `RECOMMENDED` tag; uppercase display name with a reserved 2-line min-height; Geist-Mono `tabular-nums` data grid; neon best-for chips (yellow `#e1ff67` / cyan `#4af5fe` / black-filled); footer CTA pinned to the bottom (`margin-top:auto`). Top-pick footer is filled mint `#67ffc5`; a link-less card renders "No apply link · still ranked" and no anchor.
- **`CardRecommendationList`** — composes `CreditCardCard` via `buildCardView` in `mode="ranked"`, index 0 = top pick. Preserved: reward-type filter tabs (all/cash/miles/points/crypto with counts), per-card expand/collapse breakdown (rules, caps, expiry/action alerts, fees, min-income) restyled onto v2 hairlines, and the loading + no-results states. The Apply CTA renders only when `applyUrl` exists and spreads `applyCtaProps` output (rel="sponsored nofollow noopener", target _blank) — Phase 8 / AFF-01 intact.
- **i18n** — new keys `results.viewCard`, `results.noApplyLink`, `results.topReward`, `results.rewardType`, `results.rewardOn` (`{amount}` interpolation), `results.bestFor`, `results.cardTypes.{credit,crypto,prepaid}` added to BOTH `messages/en.json` and `messages/zh-HK.json`.

## Deviations from Plan

None affecting scope. One test-data fix during TDD: the initial fx-fee test expectation `0.0195 -> "2.0%"` was a float-rounding error (`1.95.toFixed(1)` = `"1.9"`); corrected the fixture rate to `0.02` (the impl was correct). Not a code deviation.

## Verification

- `npm test` — 14 files, 120 passed / 7 skipped (pre-existing skips). `applyCtaProps`, the fiat-ranking regression snapshot, and all engine tests stay green.
- `npm test -- src/lib/cards` — the new buildCardView suite passes.
- `npx tsc --noEmit` — exit 0.
- `npm run build` — compiles.
- Both message files parse as valid JSON with every new key present in both languages.
- No residual teal/emerald/amber/slate gradient utilities in the results components (grep clean, comment aside).

## Threat surface

No new trust boundary (per plan T-11-02). The only security-relevant behavior — the affiliate Apply anchor — is preserved by delegating to `applyCtaProps`, guarded by its passing test.

## Known Stubs

None.

## Self-Check: PASSED

All 4 source artifacts exist on disk; all 4 plan commits present in `git log` (test RED `9b4812b`, then feat `e7c355c` / `018faa2` / `c1cbf46`).
