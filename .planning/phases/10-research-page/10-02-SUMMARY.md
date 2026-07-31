---
phase: 10-research-page
plan: 02
subsystem: research-page
tags: [research, i18n, crypto-valuation, bilingual, v2-design]
requires: ["10-01"]
provides:
  - crypto-valuation explainer section in ResearchClient
  - research.crypto keys (en + zh-HK)
  - full-namespace en/zh-HK parity gate (Phase 10 success criterion 3)
affects:
  - src/components/ResearchClient.tsx
  - messages/en.json
  - messages/zh-HK.json
tech-stack:
  added: []
  patterns:
    - next-intl nested namespace with parallel bilingual keys
    - static accurate-to-code explainer copy (no engine/data-layer call)
key-files:
  created: []
  modified:
    - src/components/ResearchClient.tsx
    - messages/en.json
    - messages/zh-HK.json
key-decisions:
  - Crypto copy describes valuateCrypto.ts behavior verbatim (injected rate table, not live fetch; value-unavailable never fabricated; base un-staked tier; hkEligible fail-closed) — accurate-to-code per D-02
requirements-completed: [RES-01]
coverage:
  - deliverable: "Crypto-valuation explainer section (HKD-equivalent, unit-segmentation, stale/missing-rate fail-safe, base un-staked tier, hkEligible gate)"
    verification:
      - kind: command
        ref: "npx tsc --noEmit"
        status: pass
      - kind: command
        ref: "node crypto-keys-present check"
        status: pass
      - kind: command
        ref: "npm test (vitest run) — 15 files, 137 passed"
        status: pass
    human_judgment: false
  - deliverable: "research.crypto real Traditional-Chinese copy in zh-HK.json"
    human_judgment: true
    rationale: "Copy quality / 繁體 register is a judgment call — Jeff's non-blocking localhost visual sign-off owns it"
  - deliverable: "Full research-namespace en/zh-HK parity (Phase 10 success criterion 3)"
    verification:
      - kind: command
        ref: "nested-aware parity gate — 'research parity ok 34'"
        status: pass
      - kind: command
        ref: "npx next build — lists /[locale]/research"
        status: pass
    human_judgment: false
duration: 12 min
completed: 2026-07-31
status: complete
---

# Phase 10 Plan 02: Crypto-Valuation Explainer + Bilingual Parity Gate Summary

Added an engine-accurate "how crypto rewards are valued in HKD" explainer to the Research page and closed Phase 10 with a full-namespace en/zh-HK parity gate.

## Accomplishments

- **Crypto-valuation section in `ResearchClient.tsx`** — a hairline-separated `<section>` after the ranking section, same v2 editorial layout (uppercase Rethink headings, Inter body, tokens only). Five sub-blocks, each traceable to `valuateCrypto.ts` / Phase 7:
  1. HKD-equivalent valuation via a maintained rate table (explicitly *not* a live per-request fetch — the table is cron-refreshed/injected).
  2. Unit-segmentation — crypto valued in its own segment; fiat ranking never affected (partition-before-sort).
  3. Fail-safe — stale rate shows last-known value with a recency marker; missing/unusable rate shows "value unavailable" and is never ranked; no fabricated numbers.
  4. Base un-staked tier by default; staking-gated higher tiers treated as conditional.
  5. `hkEligible` fail-closed gate — an unobtainable card is never recommended though it still appears in the directory.
- **`research.crypto` keys in both locales** — real Traditional-Chinese copy, full parity, no placeholders.
- **Full-namespace parity gate** — nested-aware check over the entire `research` namespace (shell + ranking + crypto) prints `research parity ok 34`, zero missing / zero extra.

## Verification Results

- `npx tsc --noEmit` — exit 0.
- crypto-keys-present node check — pass (present in both locales).
- `npm test` — 15 files, 137 passed / 7 skipped (green).
- Nested-aware parity gate — `research parity ok 34`.
- `npx next build` — compiled successfully, lists `ƒ /[locale]/research`.
- `git diff` on `package.json`/`package-lock.json` — empty (no new deps, per RES-01 / D-03).

## Deviations from Plan

None — plan executed exactly as written. Task 2 is a verification checkpoint that added no new content; the parity gate passed on the first run, so no zh-HK strings needed backfilling.

## Human Check (non-blocking)

Per `<verification>` and 10-CONTEXT discretion: view `/en/research` and `/zh-HK/research` in light + dark at localhost to confirm the crypto copy reads well and the layout matches the v2 editorial system. Recorded as a non-blocking `<human-check>` for the orchestrator/owner — not a blocking checkpoint.

## Self-Check: PASSED

- `src/components/ResearchClient.tsx` — modified, present on disk.
- `messages/en.json` / `messages/zh-HK.json` — `research.crypto` present in both.
- Commit `d25d5c5` (feat 10-02) exists in git log.

## Next

Phase 10 complete — both required explainers (ranking + crypto) render in both locales with full parity. Ready for phase-end verification / `/gsd-verify-work 10`.
