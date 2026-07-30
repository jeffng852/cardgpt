---
phase: 09-data-page-card-directory
plan: 02
subsystem: ui
tags: [card-detail, dynamic-route, getCardById, provenance, applyCtaProps, deep-link, next-intl]
requirements-completed: [DIR-01, DIR-02, DIR-03]
duration: ~1 session (executor died on a mid-response connection drop AFTER committing all 3 tasks; orchestrator verified + wrote this SUMMARY)
completed: 2026-07-29
status: complete
---

# Phase 9 Plan 02: Card Detail Route + Deep-Link — Summary

**A per-card detail route `/[locale]/cards/[id]` renders full reward rules, fees, provenance labels (HK-availability, last-verified, note), and the affiliate Apply CTA via `getCardById`, with unknown ids 404ing; recommendation result cards now deep-link into it — all bilingual, in the v2 design system.**

## Accomplishments
- **`src/app/[locale]/cards/[id]/page.tsx`** (server) — resolves the card via `getCardById(id)`, calls `notFound()` for an unknown id; renders full reward rules + fees in the v2 style.
- **Provenance labels (DIR-02b)** — HK-availability (from `hkEligible`), last-verified (from `getDatabaseMetadata()`), and a provenance note on the detail page, so bulk/community-sourced data never reads as authoritative.
- **Apply CTA** — reuses the existing `applyCtaProps` (`rel="sponsored nofollow noopener"`); not re-implemented.
- **DIR-03 deep-link** — recommendation result cards (`CardRecommendationList` / `CreditCardCard`) now link into `/[locale]/cards/[id]`.
- **`messages/en.json` + `messages/zh-HK.json`** — new `cardDetail` namespace in both locales (parity verified).

## Commits (all atomic, THI-311)
- `3e0456d` feat(09-02): add /[locale]/cards/[id] server detail route
- `6913d67` feat(09-02): label provenance on card detail page
- `0757a42` feat(09-02): deep-link recommendation results into card detail

## Verification (orchestrator-run after the executor's connection-drop)
- `npx tsc --noEmit` → **exit 0**
- `npm run build` → **✓ Compiled successfully**; both `/[locale]/cards` and `/[locale]/cards/[id]` present as dynamic routes
- `npm test` → **14 files, 120 passed / 7 skipped** (applyCtaProps, buildCardView, fiat-regression snapshot all green — recommender unaffected)
- i18n top-level key parity en↔zh-HK holds; `cardDetail` namespace present in both

## Deviations
- **Recovery, not a scope change:** the executor completed and committed all 3 tasks, then its process died on a mid-response connection drop before writing this SUMMARY. Working tree was clean (nothing uncommitted). The orchestrator re-ran tsc/build/test/i18n-parity (all green) and authored this SUMMARY. No code changed during recovery.

## Next
- **09-03** (Wave 3, depends on 09-01 + 09-02): free-text search (name/issuer) + sort (reward rate/annual fee/name) with shareable URL-synced state + bilingual empty-state (DIR-01), via a pure `directoryControls` helper unit-tested in node-env vitest.

---
*Phase: 09-data-page-card-directory · Plan 02 · Completed 2026-07-29*
