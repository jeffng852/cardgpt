---
phase: 11-ui-theme-refresh-thi-176
plan: 01
subsystem: ui-design-system
tags: [ui, theme, tokens, fonts, tailwind-v4, dark-mode, re-skin, tracer]
status: awaiting-human-verify
requires:
  - next-themes ThemeProvider (attribute="class") — unchanged
  - next-intl (en / zh-HK) — unchanged
provides:
  - v2 brutalist-editorial token system (globals.css :root + .dark)
  - Tailwind v4 @theme inline mapping (v2 names + legacy names repointed to v2 values)
  - Rethink Sans (display) + Inter (body) + Geist Mono (data) via next/font/google
  - CardGPT wordmark logo + blinking mint cursor (reduced-motion aware)
  - fully-restyled Home shell (header/nav, hero, features grid, footer)
affects:
  - every surface consuming color/font utilities (via cascade — legacy names repointed)
tech-stack:
  added: [Rethink Sans (next/font/google), Inter (next/font/google)]
  patterns: [re-skin only — no logic/data-flow/routing change; class-based dark mode kept]
key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/[locale]/layout.tsx
    - src/components/Logo.tsx
    - src/components/HomeClient.tsx
    - src/components/TypingAnimation.tsx
decisions:
  - "Kept legacy token utility names (bg-background/text-foreground/bg-primary/etc.) in @theme inline, repointed to v2 values, so out-of-scope surfaces (TransactionInput, CardRecommendationList, HowItWorks, FloatingCards, chrome) inherit the v2 palette and the build stays green until their wave-2 restyle."
  - "Dark tokens live under .dark + @media(prefers-color-scheme:dark) — NOT data-theme — to preserve next-themes persistence (D-03), overriding the contract's data-theme note."
  - "Header renders the wordmark Logo as the sole brand element; appName kept as sr-only h1 to avoid a duplicate 'CardGPT CardGPT' while preserving the i18n key + page heading."
metrics:
  duration: ~15m
  completed: 2026-07-28
  tasks: 2 of 2 implementation (task 3 = human-verify checkpoint, pending)
---

# Phase 11 Plan 01: v2 Design System Tracer Summary

Stood up the CardGPT v2 (brutalist-editorial) design system end-to-end — tokens, three fonts, wordmark logo, and a fully-restyled Home shell — as a re-skin over the existing next-themes/next-intl app, with all behavior and tests preserved.

## What was built

**Task 1 — v2 tokens + fonts + wordmark logo** (commit `33b229f`)
- `globals.css`: replaced the ChatGPT-teal / playful-fintech tokens with the v2 system (contract §1). Light values on `:root`; dark values under `.dark` and `@media (prefers-color-scheme: dark) :root:not(.light)` (mirrors the file's original two-block structure — class-based, no `data-theme`). Added neon (yellow/cyan) + card-type badge tokens, and a `cursor-blink` keyframe.
- `@theme inline`: maps the v2 `--color-bg/-fg/-primary/-primary-fg/-brand/-surface/-muted/-muted-fg/-border/-border-strong/-ring/-destructive` + neon + badge tokens, plus font tokens `--font-display` (Rethink), `--font-sans` (Inter), `--font-mono` (Geist Mono). Legacy color names are also mapped, repointed to v2 values (see Deviations).
- `layout.tsx`: loads Rethink Sans (700/800) + Inter (400–600) via `next/font/google`, drops Geist Sans, keeps Geist Mono; each exposed as a CSS var and applied on `<body>`. `viewport.themeColor` moved off teal `#10a37f` → `#121212`. Metadata / ThemeProvider / NextIntlClientProvider / favicons untouched.
- `Logo.tsx`: rewritten as the `CardGPT▍` wordmark in the display face (camelCase, `-0.03em` tracking) + a mint `▍` cursor that blinks via CSS, disabled under `prefers-reduced-motion`. Same props (`size`, `className`); `size` now scales font-size.

**Task 2 — restyle the Home shell** (commit `e5766dc`)
- `HomeClient.tsx`: header → flat hairline-bottom bar (no backdrop-blur); hero → flat uppercase Rethink-800 headline `clamp(38–62px)` with tight tracking + `text-wrap: balance`, Inter lead in `--muted-fg` (tri-color gradient removed); features → four flat square hairline cells (1px `--border`, 0 radius, no gradient/shadow) with display-uppercase labels; footer → hairline top rule, monochrome, wordmark. All data flow (`handleSubmit`/`recommendCards`, `TransactionInput`, `CardRecommendationList`, `rateTable` threading) untouched.
- `TypingAnimation.tsx`: cursor recolored to mint (`--brand`); typing cadence, blink, and text cycling unchanged.

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm test` (vitest) | 13 files, 108 passed / 7 skipped (pre-existing) — green |
| `npm run build` | exit 0, compiled successfully |
| Residual teal/gradient utilities in HomeClient | none (grep clean) |

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 3 — Blocking issue] Legacy token names kept in `@theme inline`, repointed to v2 values (not deleted).**
- **Found during:** Task 1. The plan says "remove the dead teal/purple/orange/blue accent mappings," but a codebase grep shows out-of-scope components (TransactionInput, CardRecommendationList, HowItWorks, FloatingCards, chrome, error/legal pages) consume the legacy utility names heavily (`text-foreground` ×248, `bg-background` ×124, `bg-primary` ×58, `border-border` ×164, `bg-background-secondary` ×43, and `accent-purple/blue`). Deleting those mappings would leave those surfaces unstyled — and the plan's own Task 2 acceptance requires the hero's `TransactionInput` (and post-submit `CardRecommendationList`) to render correctly with "no unstyled/black-on-black regions."
- **Fix:** Kept the legacy `--color-*` names in `@theme inline` but repointed the underlying `:root` vars to v2 values (all referencing the v2 base vars so dark mode auto-flips). The whole app thus inherits the v2 palette; the true teal/purple/orange accent *values* are gone. Their proper per-component restyle is owned by the wave-2 plans (11-02+).
- **Files:** `src/app/globals.css`.

**2. [Rule 1 — Visual bug] Header shows the wordmark once, not twice.**
- **Issue:** The wordmark Logo now renders "CardGPT"; keeping the separate `{t('appName')}` heading next to it (as the plan's prose says) would print "CardGPT▍ CardGPT".
- **Fix:** Rendered the Logo as the sole visible brand element and kept `appName` as an `sr-only` `<h1>` — preserves the i18n key and the document heading without the visual duplicate.
- **Files:** `src/components/HomeClient.tsx`.

**Note (not a deviation):** the contract §"Dark theme" mentions `data-theme` selectors; per the plan (D-03) and the app's actual next-themes `attribute="class"` mechanism, dark tokens live under `.dark`. Following `data-theme` would have broken persistence.

## Known Stubs
None. No stubbed data or placeholder UI introduced — styling-only re-skin.

## Checkpoint status (Task 3 — human-verify, BLOCKING)
Implementation complete and committed; the plan's final task is a human visual sign-off that both themes render and dark-mode persists. **Not yet performed** — no sign-off fabricated. See "Awaiting" in the execution report.

## Self-Check: PASSED
- Files exist: globals.css, layout.tsx, Logo.tsx, HomeClient.tsx, TypingAnimation.tsx — all modified.
- Commits exist: `33b229f` (Task 1), `e5766dc` (Task 2).
