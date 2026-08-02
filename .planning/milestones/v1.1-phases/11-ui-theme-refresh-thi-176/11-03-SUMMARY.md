---
phase: 11-ui-theme-refresh-thi-176
plan: 03
subsystem: recommender-input-ui
tags: [ui, theme, brutalist-editorial, next-intl, tailwind-v4]
requires: ["11-01"]
provides:
  - "TransactionInput restyled onto the v2 (brutalist-editorial) system"
  - "FloatingCards restyled to a flat monochrome background"
affects:
  - src/components/TransactionInput.tsx
  - src/components/FloatingCards.tsx
tech-stack:
  added: []
  patterns:
    - "Consume 11-01 v2 tokens as Tailwind utilities (bg-bg, text-fg, text-muted-fg, border-border-strong, bg-brand, bg-neon-yellow/cyan, text-destructive, text-badge-crypto)"
    - "Display face via font-[family-name:var(--font-display)]; mono values via var(--font-mono) (matches 11-02 CreditCardCard)"
    - "Selectable chips: white/1px-black, selected -> filled neon keeping black border (contract §5)"
key-files:
  created: []
  modified:
    - src/components/TransactionInput.tsx
    - src/components/FloatingCards.tsx
decisions:
  - "Reward-type chips use neon-yellow when selected; merchant quick-tags use neon-cyan — two visually distinct chip rows, both contract-compliant (§5 allows yellow/cyan)"
  - "Dropped decorative reward-type emojis for a cleaner brutalist chip; kept merchant emojis (recognition aid)"
  - "Merchant quick-tags kept above-vs-below reorder: input surface now sits between the reward-type row and the quick-tags row, matching the approved mockup (input then example chips)"
metrics:
  duration: ~10m
  completed: 2026-07-28
status: complete
---

# Phase 11 Plan 03: Recommender Input Re-skin Summary

Restyled the recommender INPUT surface (`TransactionInput`) and the ambient `FloatingCards` background onto the 11-01 v2 brutalist-editorial system — brutalist chips, a 2px-border square input with a mint focus outline, a mint uppercase submit, hairline detected-info badges, and a flat monochrome floating-card motif — with every parse/debounce/AI-fallback/tag/submit behavior byte-for-byte intact.

## What was built

### Task 1 — TransactionInput re-skin (`7be3e01`)
- **Reward-type selector** (cash/miles/points): selectable chips per contract §5 — white + 1px `--border-strong`, 2px radius, uppercase display label; **selected → filled `--neon-yellow`** keeping the black border. Single-select toggle + crypto type-union branch preserved.
- **Merchant quick-tags** (mcdonalds/wellcome/parknshop/sushiro/shell/cathay): same chip treatment; **selected → filled `--neon-cyan`** + black border. The select/deselect + tag↔input mutation (`handleQuickTag`) is untouched.
- **Main input**: big square field — white (`bg-bg`), **2px `--border-strong`**, 2px radius, Inter 16px; the old rounded/teal/shadow focus ring replaced with a **2px mint (`--brand`) focus outline**. Character-count indicator kept; its at-limit state recolored amber → `--destructive`.
- **Detected-info badges + shimmer skeleton**: restyled onto hairline surfaces (`bg-surface`, 1px `--border`, 2px radius), monochrome + a single mint accent (amount value in `text-badge-crypto`); the `animate-[shimmer_2s_infinite]` keyframe usage and analyzing/parsed conditional logic are unchanged.
- **Submit button**: mint fill + 1.5px `#121212` border, 2px radius, uppercase display label with a `→`; disabled + spinner/analyzing states and copy keys preserved.
- **AI error block**: restyled to a hairline `--destructive` treatment; message + rate-limit copy kept.
- **Dead-token fix**: the pre-existing unmapped classes (`text-text-secondary`, `text-text-primary`, `text-text-tertiary`, `bg-input-bg`) — which had no `--color-*` mapping in Tailwind v4 and rendered as no-ops — were replaced with real v2 utilities so the styling actually applies.

**Behavior preserved (D-02):** all handlers, state, the 80-char `MAX_INPUT_LENGTH`, the 300ms+200ms debounce, the `/api/parse-activity` AI fallback, `handleQuickTag`, `autoFocus`, and the `onSubmit(result, selectedRewardType)` contract are unchanged — only classes/markup styling moved.

### Task 2 — FloatingCards re-skin (`6fc20bf`)
- Replaced the teal `bg-gradient-to-br` + `rounded-xl` + `shadow-lg` card mock with a **flat, square, low-opacity (`opacity-[0.07]`) monochrome motif** on v2 tokens (`bg-surface` fill, hairline `--border` edges, a `bg-muted` stripe). No shadow, no gradient, no rounding.
- The `prefers-reduced-motion: reduce` guard (returns `null`), the resize regeneration listener, and the `float` keyframes are all intact.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm test` (vitest) | 14 files · 120 passed / 7 skipped (pre-existing skips) — green |
| `npm run build` | exit 0 (compiles) |
| Dead-token grep (`text-text-*`, `bg-input-bg`) | none remain |
| Teal/gradient/shadow grep (FloatingCards) | none remain |

The 7 skipped tests are pre-existing `describe.skip`/`it.skip` cases unrelated to this plan (no test file touched).

## Deviations from Plan

**1. [Constraint — no mockup eyebrow string] "DESCRIBE YOUR PURCHASE" eyebrow not added**
- **Found during:** Task 1.
- **Issue:** The approved mockup shows an uppercase eyebrow label ("DESCRIBE YOUR PURCHASE") above the input. No such next-intl key exists in `input.*`, and the plan explicitly forbids editing `messages/en.json` / `messages/zh-HK.json` in this plan (11-04 owns chrome strings). Hardcoding English would break the bilingual contract (§6).
- **Resolution:** Kept the input's existing placeholder as the guiding text and styled the existing `rewardTypeLabel` / `quickTagsLabel` as uppercase display eyebrows. The input surface still reads as "describe your purchase → find card → example chips". A dedicated input eyebrow can be added when an `input.describeLabel` key is introduced (suggest 11-04 or a follow-up, added to both locales).
- **Files modified:** none beyond the planned file.

**2. [Refinement — mockup fidelity] Merchant quick-tags moved below the input surface**
- The plan preserved behavior but did not mandate order; the approved mockup places example chips after the input. Reordered to reward-type → input surface → quick-tags. Purely presentational; the tag↔input state mutation is unaffected.

Otherwise the plan executed as written.

## Note on `bg-surface`
The plan's acceptance criteria list `bg-surface` among previously-**unmapped** classes to remove. As of 11-01, `--color-surface` IS mapped in `globals.css` (`@theme inline`), so `bg-surface` is now a live v2 utility and is the contract-correct token for the detected-badge/shimmer raised surfaces (§5: "1px --border, --surface bg"). The truly-dead tokens (`text-text-*`, `bg-input-bg`) had no `--color-*` mapping and were removed — confirmed by grep.

## Self-Check: PASSED
- `src/components/TransactionInput.tsx` — FOUND (modified)
- `src/components/FloatingCards.tsx` — FOUND (modified)
- Commit `7be3e01` — FOUND
- Commit `6fc20bf` — FOUND
