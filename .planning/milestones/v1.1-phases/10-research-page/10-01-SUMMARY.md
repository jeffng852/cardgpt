---
phase: 10-research-page
plan: 01
subsystem: research-page
tags: [research, i18n, v2-design, tracer, bilingual]
requires:
  - v2 design system (ui-contract-v2.md)
  - next-intl en/zh-HK message infrastructure
  - v2 chrome components (Logo, DarkModeToggle, LanguageSwitcher)
provides:
  - /[locale]/research route (public bilingual explainer)
  - ResearchClient chrome + editorial reading layout
  - research i18n namespace (shell + ranking methodology) in both locales
  - Research header nav link
affects:
  - src/components/HomeClient.tsx (nav)
tech-stack:
  added: []
  patterns:
    - thin server-shell → client-component (mirrors cards/page.tsx)
    - static content page (no engine/data-layer call)
    - parallel-array list keys for nested en/zh index parity
key-files:
  created:
    - src/app/[locale]/research/page.tsx
    - src/components/ResearchClient.tsx
  modified:
    - src/components/HomeClient.tsx
    - messages/en.json
    - messages/zh-HK.json
decisions:
  - Active "Research" nav uses a fixed near-black label on the always-light mint fill (no token is always-dark); Directory/Research links reuse the exact HomeClient button classes.
  - Ranking copy authored strictly from recommendCards.ts + transactionParser.ts — net value = reward − fees, the real 5-level tie-break chain, preference filtering, bilingual parsing. No invented AI-scoring / accuracy-% claims.
metrics:
  duration: ~1h
  completed: 2026-07-31
status: complete
---

# Phase 10 Plan 01: Research Page (Tracer + Ranking Explainer) Summary

Stood up the public bilingual `/[locale]/research` route end-to-end in the live v2 brutalist-editorial system, wired the "Research" header nav, and authored the engine-accurate "how CardGPT ranks" explainer in English and Traditional Chinese with full key parity.

## What was built

- **`src/app/[locale]/research/page.tsx`** — thin server component rendering `<ResearchClient/>`. Mirrors `cards/page.tsx`'s shape but makes NO `loadCards`/engine call and omits `force-dynamic` (static content). No CMS, no MDX, no new dependency (RES-01 / D-03).
- **`src/components/ResearchClient.tsx`** — `'use client'`, `useTranslations('research')`. v2 chrome (sticky hairline header: Logo home-link, Directory link, Research active mint-filled affordance with `aria-current`, DarkModeToggle, LanguageSwitcher) over an editorial `max-w-3xl` reading column inside the `max-w-7xl` frame. Uppercase Rethink display headings, Inter body, hairline section rules, flat/square, tokens only so dark mode flips via `.dark`. Renders page eyebrow/title/intro + the ranking-methodology section with four sub-blocks (parsing, net value + FX example aside, ordered tie-break chain, preference filtering) + a footer note.
- **`src/components/HomeClient.tsx`** — added the "Research" `Link href="/research"` beside the Directory link using identical button classes, reading `research.navLink` (D-05).
- **`research` namespace** in both `messages/en.json` and `messages/zh-HK.json` (22 nested keys, identical sets) — real Traditional-Chinese copy, no placeholders. Tie-break steps modelled as a parallel array so index parity holds.

## Accuracy-to-code (D-01)

The ranking explainer describes what `recommendCards.ts` actually does:
- **Bilingual free-text parsing** (from `transactionParser.ts`): amount, currency (bare `$` → HKD), category, merchant, payment type; English + Traditional-Chinese keyword tables.
- **Net value = reward − fees** with the FX-fee worked example (a higher-rebate card with a foreign-transaction fee correctly losing to a plainer one).
- **The deterministic 5-level tie-break chain** in exact source order (recommendCards.ts ~125-154): net value → reward amount → lower annual fee → preferred issuer → alphabetical.
- **Preference filtering**: inactive/excluded cards removed, then preferred reward units + max annual fee narrow the set before ranking; top result is the recommendation.
No invented marketing ("AI scoring", accuracy percentages) — every claim traces to source.

## Verification

- `npx tsc --noEmit` — exit 0 (clean).
- `npx next build` — compiled successfully; `/[locale]/research` listed as a route (`ƒ /[locale]/research`).
- Deep nested en/zh-HK parity on `research` — "research parity ok 22".
- `npm test` — 15 files, 137 passed / 7 skipped, green (no regressions).
- `git diff package.json` — empty (no new dependencies; RES-01 / D-03 honored).

## Deviations from Plan

None — plan executed exactly as written. Note: the repo's vitest suite is 15 files / 144 tests locally (the plan/CLAUDE.md cite "14 files" from an earlier snapshot); all pass, no regression introduced.

## Known Stubs

None. The route renders real bilingual content in both themes; no empty/placeholder data paths.

## Commits

- `5be0490` — feat(10-01): research route + v2 chrome shell + nav wiring (THI-319)
- `f9beffd` — feat(10-01): author engine-accurate ranking methodology copy (THI-319)

## Self-Check: PASSED

All created files (page.tsx, ResearchClient.tsx, SUMMARY.md) exist on disk; both commits (5be0490, f9beffd) present in git.

## Notes for Plan 10-02

10-02 expands `ResearchClient` + the `research` namespace with the crypto-valuation explainer (Phase 7 model, D-02) and the full-namespace parity gate. The ranking section and chrome are stable seams to build alongside.
