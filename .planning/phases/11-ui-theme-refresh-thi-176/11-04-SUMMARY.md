---
phase: 11-ui-theme-refresh-thi-176
plan: 04
subsystem: ui-chrome
tags: [ui, theme, i18n, brutalist, re-skin]
status: complete
requires:
  - 11-01 (v2 tokens + fonts + wordmark)
provides:
  - v2 nav chrome (dark toggle + EN·繁 language switch)
  - flat brutalist HowItWorks section
affects:
  - src/components/HomeClient.tsx (consumes the restyled chrome + section; unchanged)
tech-stack:
  patterns:
    - "v2 outline icon button: bg-bg + 1px border-border + rounded-[2px], hover bg-surface"
    - "active/primary control: bg-brand + 1.5px #121212 border + display uppercase"
key-files:
  modified:
    - src/components/DarkModeToggle.tsx
    - src/components/LanguageSwitcher.tsx
    - src/components/HowItWorks.tsx
decisions:
  - "Re-skin only: next-themes setTheme + mounted placeholder + locale router.replace behaviors kept byte-identical (D-02, D-03)"
  - "中 → 繁 is a display literal (not an i18n key), per contract §5; message files untouched"
metrics:
  duration: ~10m
  completed: 2026-07-28
  tasks: 2
  files: 3
---

# Phase 11 Plan 04: Nav Chrome + HowItWorks v2 Re-skin Summary

Restyled the dark-mode toggle, the `EN · 繁` language switch, and the three-step HowItWorks section onto the v2 brutalist-editorial system (ui-contract-v2.md §5 nav / §3 shape) while preserving theme persistence, locale switching, and the Try-Now scroll-to-input behavior exactly.

## What was built

- **DarkModeToggle** — now a v2 outline icon button (`bg-bg`, 1px `border-border`, 2px radius, hover `bg-surface`); placeholder pulse and hover ring recolored off the old teal onto v2 tokens. next-themes `theme`/`setTheme`, the `mounted` hydration placeholder, the `isDark` logic, the sun/moon crossfade icons, and the aria-labels are unchanged — the toggle still flips theme and persists across reload via the `.dark` class mechanism (D-03).
- **LanguageSwitcher** — renders the two locales as `EN · 繁` display-font outline buttons; active locale is mint-filled (`bg-brand`) with a 1.5px `#121212` border, inactive is `bg-bg` + 1px hairline. Changed the zh-HK label `中 → 繁` (display literal). Removed the two `console.log` debug lines. `useLocale`, `handleChange → router.replace(pathname,{locale}) + router.refresh`, the `routing.locales` map, and the aria-labels are unchanged.
- **HowItWorks** — flat square hairline step cards (0 radius, 1px `border-border`, no shadow); removed the blurred color blobs, gradient step badges, gradient icon tiles, rounded cards, shadows, and the connecting lines (contract §3 flat rule). Uppercase Rethink display headings, Inter `muted-fg` body, a single mint accent on the step number. Try-Now CTA is now mint-fill + 1.5px `#121212` border uppercase; its `onClick` (query `input[type="text"]`, scroll into view, focus) and the `useTranslations('howItWorks')` keys are unchanged. Message files untouched.

## Deviations from Plan

None — plan executed exactly as written. No new strings were needed (the `中 → 繁` change is a display literal, not an i18n key), so `messages/en.json` / `messages/zh-HK.json` were correctly left untouched per the plan.

## Verification

- `npx tsc --noEmit` → exit 0
- `npm run build` → `✓ Compiled successfully`
- `npm test` → 120 passed | 7 skipped (14 files) — suite stayed green

## Commits

- `5ed1d20` feat(11-04): re-skin nav chrome (dark toggle + EN·繁 switch) onto v2 (THI-176)
- `41f9d89` feat(11-04): re-skin HowItWorks as flat brutalist three-step section (THI-176)

## Known Stubs

None.

## Self-Check: PASSED

- All 3 modified files present on disk.
- Both task commits (`5ed1d20`, `41f9d89`) present in git log.
