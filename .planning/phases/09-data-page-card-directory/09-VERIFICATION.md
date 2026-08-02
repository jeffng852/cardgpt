---
phase: 09-data-page-card-directory
verified: 2026-07-30T18:56:00Z
status: passed
score: 13/15 must-haves verified
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/15
  gaps_closed:

    - "A page-level provenance banner disclosing bulk/community-sourced data (DEC-DATA-001, 09-CONTEXT D-04) sits at the top of the directory in both languages (DIR-02)."
  gaps_remaining: []
  regressions: []
behavior_unverified_items:

  - truth: "Search + sort state is URL-synced, shareable, survives reload (D3)."
    test: "On /en/cards, type a query that narrows the grid, change the sort select, confirm the URL gains ?q=...&sort=..., and that reloading or sharing that URL restores the same filtered/sorted view."
    expected: "Search narrows tiles, sort reorders them, URL updates, reload/share restores state."
    why_human: "The pure filterCards/sortCards logic is unit-tested (17/17 vitest cases), and router.replace wiring is present and wired, but end-to-end URL-round-trip interactivity in a real browser has no automated UI test in this stack. Flagged human_judgment: true (D3) by 09-03-SUMMARY.md itself."

  - truth: "No-match search renders a bilingual empty-state with acceptable copy quality (D4)."
    test: "On /en/cards, search for a term that matches nothing (e.g. \"zzz\"): confirm a bilingual empty-state renders. Switch to /zh-HK/cards and confirm search placeholder, sort options, and empty-state copy all read naturally in Chinese."
    expected: "No-match empty-state renders; zh-HK copy reads naturally (not machine-translated or awkward)."
    why_human: "Key presence + en/zh-HK parity are automated (confirmed below), but copy quality and visual rendering are a human judgment call. Flagged human_judgment: true (D4) by 09-03-SUMMARY.md itself."
human_verification:

  - test: "Open /en/cards and /zh-HK/cards; confirm the directory grid renders one browse tile per active card, footers align across columns, the new provenance banner reads naturally in both languages, and there is no nested-anchor hydration warning in the console."
    expected: "A responsive grid of browse-mode CreditCardCard tiles, one per active card, a legible hairline+left-accent provenance banner atop the grid in both locales, no console warnings."
    why_human: "Visual rendering, cross-column alignment, banner copy quality, and browser console warnings are not asserted by an automated test in this stack (no Playwright/jsdom render harness)."

  - test: "Click a directory tile -> lands on /en/cards/<id>; visit /en/cards/does-not-exist -> confirm a 404/not-found page (not a crash or blank page); switch to /zh-HK/cards/<id> -> confirm rule descriptions render in Chinese where description_zh exists."
    expected: "Valid id shows full detail; unknown id shows Next's not-found page; zh-HK descriptions localized."
    why_human: "Runtime navigation and locale-conditional text substitution are not covered by an automated route test; code correctly calls next/navigation's notFound() and the description_zh branch, but the rendered result needs a human/browser check."

  - test: "On /en/cards, type a query that narrows the grid (e.g. an issuer substring), change the sort select, confirm the URL gains ?q=...&sort=..., and that reloading or sharing that URL restores the same filtered/sorted view."
    expected: "Search narrows tiles, sort reorders them, URL updates, reload/share restores state."
    why_human: "Flagged human_judgment: true (D3) by 09-03-SUMMARY.md itself — the pure filterCards/sortCards logic is unit-tested (17 vitest cases, all passing), but end-to-end URL-synced interactivity in a real browser has no automated UI test in this stack."

  - test: "On /en/cards, search for a term that matches nothing (e.g. \"zzz\"): confirm a bilingual empty-state renders. Switch to /zh-HK/cards and confirm search placeholder, sort options, and empty-state copy all read naturally in Chinese."
    expected: "No-match empty-state renders; zh-HK copy reads naturally (not machine-translated or awkward)."
    why_human: "Flagged human_judgment: true (D4) by 09-03-SUMMARY.md itself — key presence + en/zh-HK parity are automated (confirmed below), but copy quality and visual rendering are a human judgment call."

  - test: "On /en/cards/<id> and /zh-HK/cards/<id>: confirm the HK-availability label, last-verified date, and provenance note read naturally in each language, and that a card with hkEligible=false shows the not-available label."
    expected: "Provenance block reads naturally in both languages; hkEligible=false renders the not-available copy."
    why_human: "Copy-quality and conditional-branch visual confirmation; the underlying data derivation (card.hkEligible !== false, getDatabaseMetadata()) is code-verified below."
---

# Phase 9: Data Page (Card Directory) Verification Report

**Phase Goal (ROADMAP):** A visitor can browse, filter, sort, and search the full card set — including global crypto/neobank cards — and open a detail view, with bulk-sourced data honestly labeled. (Filter clause explicitly deferred per D-03/RQ-001 — recorded, not silently dropped.)

**Verified:** 2026-07-30 (re-verification)
**Status:** human_needed
**Re-verification:** Yes — after gap closure (previous pass: `gaps_found`, 12/15, one BLOCKER on the DIR-02 page-level provenance banner)

## What changed since the last verification pass

Commit `7577dff` ("fix(09): add missing DIR-02 page-level provenance banner to directory (THI-311)") adds:

- A banner element in `src/components/CardDirectoryClient.tsx` (lines 120-127), positioned between the `<h1>` title and the search/sort controls row — a hairline box with a 6px left accent (`border-l-fg`), an uppercase eyebrow span, and a body paragraph.
- `directory.provenanceEyebrow` + `directory.provenanceBody` keys added to both `messages/en.json` and `messages/zh-HK.json`.

This was the only BLOCKER from the prior pass. It is now closed — see verification below.

## Gates Re-Run (not trusted from SUMMARY — executed directly, this pass)

| Gate | Command | Result |
|------|---------|--------|
| Unit/integration tests | `npx vitest run` | **PASS** — 15 files, 137 passed / 7 skipped (fiat-regression snapshot byte-identical, applyCtaProps, buildCardView, directoryControls all green — unchanged from prior pass) |
| Typecheck | `npx tsc --noEmit` | **PASS** — exit 0 |
| Build | `npx next build` | **PASS** — compiles; route table confirms `ƒ /[locale]/cards` and `ƒ /[locale]/cards/[id]` both present as dynamic routes |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Visitor can browse all cards on a Data page — browse/search/sort/detail, read-only, no engine call (filter clause deferred, DIR-01) | ✓ VERIFIED | Unchanged from prior pass — `page.tsx` -> `loadCards()` -> `CardDirectoryClient` grid; `directoryControls.ts` search+sort; `[id]/page.tsx` detail; no `recommendCards` under either route |
| 2 | Directory reads via the ungated async `loadCards()` `force-dynamic` path | ✓ VERIFIED | Unchanged — `src/app/[locale]/cards/page.tsx:18` `export const dynamic = 'force-dynamic'` |
| 3 | Directory tile is a single Link to `/[locale]/cards/[id]`; browse-mode `CreditCardCard` omits ranked reward rows and renders a non-anchor VIEW CARD footer | ✓ VERIFIED | Unchanged — confirmed no nested `<a>` |
| 4 | Home header carries a Directory nav link to `/cards` | ✓ VERIFIED | Unchanged — `HomeClient.tsx` `Link href="/cards"` |
| 5 | **A page-level provenance banner disclosing bulk/community-sourced data sits atop the directory, bilingual (DIR-02, D-04)** | ✓ **VERIFIED (gap closed)** | `CardDirectoryClient.tsx:120-127` — hairline+left-accent banner between `<h1>` and controls row, calls `t('provenanceEyebrow')` and `t('provenanceBody')`. `messages/en.json` `directory.provenanceEyebrow` = "About the data", `directory.provenanceBody` = "Hong Kong credit cards are hand-curated and verified. Global crypto and neobank cards (coming soon) are community-sourced and may be less precise — we label them and never let unverified data drive a recommendation." `messages/zh-HK.json` carries the equivalent Chinese copy conveying the same hand-curated-vs-community-sourced honesty distinction. Both keys confirmed present via direct JSON parse of both files (not grep-only). |
| 6 | `/[locale]/cards/[id]` renders full detail via `getCardById`; unknown id -> `notFound()` | ✓ VERIFIED | Unchanged — `[id]/page.tsx` calls `getCardById(id)` then `notFound()` on undefined |
| 7 | Detail page labels HK-availability + last-verified date + a provenance note (DIR-02, D-04) | ✓ VERIFIED | Unchanged — `[id]/page.tsx:94-96,244-256` derives `hkAvailable`/`lastVerifiedDate`, renders `hkAvailable`/`hkNotAvailable`/`lastVerified`/`provenanceNote` |
| 8 | Apply CTA reuses `applyCtaProps`; link-less card shows no anchor | ✓ VERIFIED | Unchanged — `applyCtaProps.test.ts` still 4/4 |
| 9 | Recommendation result deep-links into `/[locale]/cards/[id]` (DIR-03, D-07) | ✓ VERIFIED | Re-confirmed this pass — `CardRecommendationList.tsx:273` `href={\`/cards/${card.id}\`}` |
| 10 | Search (name/issuer, case-insensitive) and sort (reward rate desc / annual fee asc / name locale-aware) are pure, unit-tested helpers | ✓ VERIFIED | Unchanged — `directoryControls.test.ts` 17/17 pass this run |
| 11 | Search + sort state is URL-synced, shareable, survives reload | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `CardDirectoryClient.tsx:61-70` wires `router.replace` with `?q=`/`?sort=`; logic present and wired, no automated browser/e2e test exercises the URL round-trip; still flagged `human_judgment: true` (D3) |
| 12 | No-match search renders a bilingual empty-state | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `CardDirectoryClient.tsx:177-188` renders the empty-state block when `visibleCards.length === 0`; keys present with real zh-HK copy — code present and wired, but visual/copy-quality confirmation still flagged `human_judgment: true` (D4) |
| 13 | Bilingual: all new directory + cardDetail strings exist in both message files with key parity | ✓ VERIFIED | Direct parse of both `messages/en.json`/`messages/zh-HK.json` `directory` namespace: both now carry 12 keys (`navLink`, `title`, `provenanceEyebrow`, `provenanceBody`, `searchPlaceholder`, `sortLabel`, `sortRewardRate`, `sortAnnualFee`, `sortName`, `cardCount`, `emptyTitle`, `emptyHint`) — identical key sets both locales, all with real (non-placeholder) copy |
| 14 | The directory + detail routes are read-only — no recommendation-engine call | ✓ VERIFIED | Unchanged |
| 15 | Reuse correctness: ranked mode is byte-identical after the browse-mode footer change | ✓ VERIFIED | `fiat-regression.test.ts` snapshot still byte-identical this run |

**Score:** 13/15 truths verified (2 present + wired, behavior/visual-quality not exercised by an automated test — unchanged from before, and never gaps; those 2 were never affected by the banner fix)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/[locale]/cards/page.tsx` | server, force-dynamic, loads all cards | ✓ VERIFIED | Unchanged |
| `src/components/CardDirectoryClient.tsx` | client grid of browse tiles + provenance banner | ✓ **VERIFIED (was PARTIAL)** | Grid + search/sort/empty-state + **provenance banner now present and wired** |
| `src/components/CreditCardCard.tsx` | browse-mode non-anchor VIEW CARD footer | ✓ VERIFIED | Unchanged |
| `src/app/[locale]/cards/[id]/page.tsx` | server detail route | ✓ VERIFIED | Unchanged, re-confirmed intact this pass |
| `src/components/CardRecommendationList.tsx` | DIR-03 deep-link | ✓ VERIFIED | Unchanged, re-confirmed intact this pass |
| `src/lib/cards/directoryControls.ts` | pure filterCards/sortCards/topRewardRate | ✓ VERIFIED | Unchanged |
| `messages/en.json` + `messages/zh-HK.json` | directory.* / cardDetail.* namespaces | ✓ **VERIFIED (was PARTIAL)** | `directory` namespace now at full parity including `provenanceEyebrow`/`provenanceBody`; `cardDetail` unchanged at 15/15 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `page.tsx` `loadCards()` | `CardDirectoryClient` | `cards` prop | WIRED | Unchanged |
| `CardDirectoryClient` cards | `CreditCardCard` | `buildCardView(card, {mode:'browse'})` | WIRED | Unchanged |
| Directory tile | `/[locale]/cards/[id]` | `Link href` | WIRED | Unchanged |
| Home header | `/cards` | `Link href="/cards"` | WIRED | Unchanged |
| `[id]/page.tsx` `getCardById(id)` | `notFound()` | `if (!card)` | WIRED | Unchanged |
| Detail apply anchor | `applyCtaProps(card.applyUrl)` | spread `{...cta}` | WIRED | Unchanged |
| Detail provenance block | `getDatabaseMetadata()` + `card.hkEligible` | direct calls | WIRED | Unchanged |
| Recommender expanded region | `/[locale]/cards/[id]` | `Link href` | WIRED | Unchanged, re-confirmed |
| Search input / sort select | `filterCards`/`sortCards` -> rendered grid | `visibleCards = sortCards(filterCards(cards, query), sort)` | WIRED | Unchanged |
| **Directory banner** | **DEC-DATA-001 disclosure** | `t('provenanceEyebrow')` / `t('provenanceBody')` inside a hairline+left-accent `<div>` | **WIRED (was NOT_WIRED)** | Banner element now exists at `CardDirectoryClient.tsx:120-127`, reads both message keys, positioned between title and controls exactly as 09-CONTEXT D-04 / ROADMAP "Scope reconciliation" specify |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `CardDirectoryClient` | `cards` prop | `loadCards()` (Redis in prod, static fallback) | Yes | ✓ FLOWING (unchanged) |
| `[id]/page.tsx` | `card` | `getCardById(id)` | Yes | ✓ FLOWING (unchanged) |
| `[id]/page.tsx` | `lastVerifiedDate` | `getDatabaseMetadata()` -> `meta.lastUpdated` | Yes | ✓ FLOWING (unchanged) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite runs green | `npx vitest run` | 137 passed / 7 skipped, 15 files | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Build produces both routes | `npx next build` | `/[locale]/cards` + `/[locale]/cards/[id]` both `ƒ` (dynamic) | ✓ PASS |
| Interactive search/sort/empty-state/banner rendering in a real browser | — | Not run (no Playwright/e2e harness in this stack; requires a live server) | ? SKIP — routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|--------------|--------|----------|
| DIR-01 | 09-01, 09-02, 09-03 | Browse/search/sort/detail, read-only, filter deferred | ✓ SATISFIED | Unchanged from prior pass |
| DIR-02 | 09-01, 09-02 | Provenance + last-verified + HK-availability | ✓ **SATISFIED (was BLOCKED)** | Detail-page labels (unchanged, already correct) **plus** the page-level directory banner, now built exactly as 09-CONTEXT D-04 / ROADMAP "Scope reconciliation" require |
| DIR-03 | 09-02 | Recommendation result deep-links to detail view | ✓ SATISFIED | Unchanged, re-confirmed |

No orphaned requirements.

### Anti-Patterns Found

None. Re-scanned `CardDirectoryClient.tsx` (the file this pass's fix touched) plus `messages/en.json`/`messages/zh-HK.json` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|coming soon|not yet implemented` — the only matches were the legitimate HTML `placeholder` attribute on the search `<input>` and the literal string "(coming soon)" inside the new banner's own honest-disclosure copy (describing the not-yet-shipped crypto/neobank cards, not marking incomplete code — this is exactly the intended DEC-DATA-001 disclosure). No committed secrets.

### Human Verification Required

See frontmatter `human_verification` for the full structured list (5 items, unchanged in substance from the prior pass — none were affected by the banner fix, and the banner itself adds a visual-quality check to item 1). In summary:

1. Directory grid renders correctly, provenance banner reads naturally in both locales, no nested-anchor console warning.
2. Detail-page navigation + 404 for unknown id + zh-HK localized rule descriptions.
3. **D3** — search/sort URL-sync round-trip in a real browser.
4. **D4** — zh-HK copy quality + visual rendering of the empty-state.
5. Detail-page provenance block copy quality + `hkEligible=false` branch rendering.

### Gaps Summary

None. The single BLOCKER from the prior pass (DIR-02 page-level provenance banner) is closed: the banner element exists in `CardDirectoryClient.tsx`, is wired to real bilingual copy in both message files, and that copy substantively conveys the intended honesty disclosure (hand-curated HK cards vs. community-sourced global crypto/neobank cards, with an explicit "never let unverified data drive a recommendation" commitment). All gates re-run green (137/137 non-skipped tests, tsc clean, build produces both routes). No regressions found in DIR-01/DIR-03/detail-page provenance labels/recommender ranked-mode byte-identical snapshot.

The remaining items are exactly the ones that were always going to need a human — real-browser visual rendering, URL-round-trip interactivity, and bilingual copy-quality judgment (2 of which were explicitly self-flagged `human_judgment: true` by the phase's own SUMMARY.md, and 1 of which now additionally covers the new banner's visual/copy quality). None of these are code gaps; they are the honest limit of what static analysis and a headless test suite can certify for a public bilingual UI. Status is `human_needed`, not `passed`, per the verifier's own decision tree (a non-empty human-verification section always routes here, even when every coded truth is verified).

---

*Verified: 2026-07-30 (re-verification)*
*Verifier: Claude (gsd-verifier)*
