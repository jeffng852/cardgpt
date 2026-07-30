---
phase: 09-data-page-card-directory
plan: 03
subsystem: ui
tags: [next-intl, react, url-state, vitest, card-directory, search, sort, i18n]

# Dependency graph
requires:
  - phase: 09-01
    provides: "CardDirectoryClient browse grid + directory i18n namespace"
  - phase: 09-02
    provides: "/cards/[id] detail route the tiles deep-link into"
provides:
  - "Pure directoryControls helper (filterCards + sortCards + topRewardRate) unit-tested in node-env vitest"
  - "Directory search (name OR issuer) + sort (reward rate / annual fee / name) over the server-loaded set"
  - "URL-synced ?q= / ?sort= shareable, reload-safe directory state"
  - "Bilingual no-match empty-state (en + zh-HK)"
affects: [future directory filters (RQ-001), crypto card seeding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure filter/sort helper extracted from the client and node-env unit-tested (mirrors buildCardView) — no component-render devDependency"
    - "URL query as shareable client state via next-intl useRouter/usePathname + next/navigation useSearchParams (router.replace)"

key-files:
  created:
    - "src/lib/cards/directoryControls.ts"
    - "src/lib/cards/__tests__/directoryControls.test.ts"
  modified:
    - "src/components/CardDirectoryClient.tsx"
    - "messages/en.json"
    - "messages/zh-HK.json"

key-decisions:
  - "Search + sort logic lives in a pure helper (directoryControls.ts), unit-tested in node-env vitest — no @testing-library/react added (single-artifact simplicity)"
  - "Shareable state via URL query params (?q=/?sort=) using router.replace (not push) so typing does not spam back-button history; default sort omitted from URL"
  - "sortCards fails safe on an unrecognized key (returns copy unchanged) + isSortKey guard validates the URL param — mitigates T-09-03-02"

patterns-established:
  - "Directory controls: filterCards(cards, q) then sortCards(..., key), both non-mutating, derived on each render"
  - "URL-as-state: seed control useState from useSearchParams, sync back via router.replace on change"

requirements-completed: [DIR-01]

coverage:
  - id: D1
    description: "Pure filterCards (name OR issuer, case-insensitive, trimmed, empty=all) + topRewardRate helper"
    requirement: "DIR-01"
    verification:
      - kind: unit
        ref: "src/lib/cards/__tests__/directoryControls.test.ts#filterCards"
        status: pass
      - kind: unit
        ref: "src/lib/cards/__tests__/directoryControls.test.ts#topRewardRate"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pure sortCards by reward rate desc / annual fee asc / name locale-aware; non-mutating; fail-safe on bad key"
    requirement: "DIR-01"
    verification:
      - kind: unit
        ref: "src/lib/cards/__tests__/directoryControls.test.ts#sortCards"
        status: pass
      - kind: unit
        ref: "src/lib/cards/__tests__/directoryControls.test.ts#isSortKey"
        status: pass
    human_judgment: false
  - id: D3
    description: "Search input + sort select wired into CardDirectoryClient with URL-synced (?q=/?sort=) shareable, reload-safe state and a live count"
    requirement: "DIR-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
      - kind: other
        ref: "grep -c recommendCards src/components/CardDirectoryClient.tsx == 0 (read-only, no engine call)"
        status: pass
    human_judgment: true
    rationale: "Observable browser behavior — typing narrows the grid, sort reorders tiles, the URL updates and a shared/reloaded link restores the view — is not asserted by an automated UI test (no Playwright in this stack); logic is unit-proven but end-to-end interactivity needs a human check on /en/cards."
  - id: D4
    description: "Bilingual no-match empty-state; directory i18n namespace en/zh-HK parity"
    requirement: "DIR-01"
    verification:
      - kind: integration
        ref: "node -e directory namespace parity check (10 keys, en==zh-HK)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: true
    rationale: "Whether the Traditional-Chinese copy reads naturally and the empty-state renders correctly on /zh-HK/cards for a no-match query is a human judgment; key presence + parity are automated but copy quality and visual rendering are not."

# Metrics
duration: 18min
completed: 2026-07-30
status: complete
---

# Phase 9 Plan 3: Directory Search + Sort Summary

**Client-side directory search (name OR issuer) and sort (reward rate / annual fee / name) over the server-loaded card set, backed by a pure node-env-tested helper, with shareable ?q=/?sort= URL state and a bilingual no-match empty-state.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-30T14:48:29Z
- **Completed:** 2026-07-30T15:06:23Z
- **Tasks:** 3 (Task 1 was TDD: RED + GREEN)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Pure `directoryControls` helper — `filterCards` (name OR issuer, case-insensitive, trimmed, empty=all), `sortCards` (reward rate desc / annual fee asc / name locale-aware, non-mutating, fail-safe on bad key), `topRewardRate`, and an `isSortKey` guard — with 17 node-env vitest cases.
- Search input + sort select wired into `CardDirectoryClient`, deriving the visible set from the helper and driving `?q=`/`?sort=` URL state (router.replace) so filtered/sorted views are shareable and survive reload; a live count label reflects the filtered length.
- Bilingual no-match empty-state (v2 bordered box, uppercase display heading, muted hint) with full en/zh-HK parity across all 8 new directory keys (real Traditional-Chinese copy).
- Type/issuer/hkEligible filters remain explicitly deferred (RQ-001) — v1 ships search + sort only.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD): Pure directory controls helper + node-env vitest** — `2c4c7c5` (test, RED) then `a8cde88` (feat, GREEN)
2. **Task 2: Wire search + sort into the client with URL-synced state** — `973e3ae` (feat)
3. **Task 3: Bilingual empty-state + search/sort labels** — `f9e2f3c` (feat)

_Note: Task 1 is a TDD RED→GREEN pair._

## Files Created/Modified
- `src/lib/cards/directoryControls.ts` - Pure filterCards + sortCards + topRewardRate + isSortKey/SORT_KEYS/DEFAULT_SORT; no React/next-intl imports.
- `src/lib/cards/__tests__/directoryControls.test.ts` - Node-env vitest (17 cases) mirroring the buildCardView.test.ts makeCard fixture pattern.
- `src/components/CardDirectoryClient.tsx` - Added controls row (search input + sort select per contract §5), URL-synced state, live count, and bilingual empty-state.
- `messages/en.json` - Added directory keys: searchPlaceholder, sortLabel, sortRewardRate, sortAnnualFee, sortName, cardCount, emptyTitle, emptyHint.
- `messages/zh-HK.json` - Same 8 keys with real Traditional-Chinese copy (full parity).

## Decisions Made
- **Search/sort labels split into the Task 2 commit** (where the client consumes them) with emptyTitle/emptyHint added in Task 3, rather than adding all i18n keys in one Task 3 commit. Each commit is self-consistent and buildable; final parity (10 directory keys) is intact. This is a commit-grouping choice, not a behavior change.
- **`cardCount` key added** (referenced by the plan's Task 2 count label but not enumerated in Task 3's key list) as an ICU plural in en (`=0/one/other`) and a single `other` form in zh-HK.
- **Default sort = `rewardRate`**, omitted from the URL when active to keep shared links clean; `router.replace` (not push) avoids polluting back-button history while typing.

## Deviations from Plan

None - plan executed exactly as written. (The commit-grouping of the i18n labels and the added `cardCount` key are noted under Decisions Made; no code behavior deviated from the plan, and no deviation rules were triggered.)

## Issues Encountered
None. `npm run build` is env-gated by `scripts/health-check.js` (Redis), so compilation was verified via `npx next build` directly (the plan anticipated this — "build runs in CI"); the `/[locale]/cards` route compiles as a dynamic route.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DIR-01 search + sort delivered over the live server-loaded set; the directory is interactive and shareable.
- Filters (type/issuer/hkEligible) stay deferred (RQ-001) — `filterCards` is the natural extension point when the card set grows / crypto seeds.
- Phase 9 plans 09-01, 09-02, 09-03 are all complete; phase is ready for verification.

## Verification Results
- `npx vitest run src/lib/cards/__tests__/directoryControls.test.ts` — 17 passed.
- `npm test` (full suite) — 15 files, 137 passed / 7 skipped (skips pre-existing, out of scope).
- `npx tsc --noEmit` — exit 0.
- Read-only grep — no recommendation-engine call in CardDirectoryClient.
- Directory i18n parity — 10 keys, en == zh-HK.
- `npx next build` — compiles; `/[locale]/cards` present as a dynamic route.

---
*Phase: 09-data-page-card-directory*
*Completed: 2026-07-30*

## Self-Check: PASSED

All created files exist on disk (directoryControls.ts, its test, this SUMMARY); all 4 task commits present in git log (2c4c7c5, a8cde88, 973e3ae, f9e2f3c).
