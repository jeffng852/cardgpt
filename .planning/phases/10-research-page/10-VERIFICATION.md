---
phase: 10-research-page
verified: 2026-07-31T01:35:00Z
status: human_needed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "View /en/research and /zh-HK/research at localhost in both light and dark mode"
    expected: "The ranking-methodology and crypto-valuation explainers read naturally, the Traditional-Chinese copy is well-formed and idiomatic (not just mechanically parity-correct), and the editorial layout (headings, hairline rules, tie-break list, FX-fee aside) matches the v2 brutalist-editorial system visually in both themes"
    why_human: "Copy quality/register and visual layout fidelity are judgment calls that grep/build/test cannot assess — this is the discretionary owner sign-off both 10-01 and 10-02 SUMMARY.md explicitly flag as non-blocking and deferred to Jeff"
---

# Phase 10: Research Page Verification Report

**Phase Goal:** A visitor can read, in either language, how CardGPT ranks cards and understand how crypto-card rewards are valued in HKD.
**Verified:** 2026-07-31T01:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A bilingual Research page exists with a ranking-methodology explainer, plain React + next-intl, no CMS/MDX (RES-01, SC1) | ✓ VERIFIED | `src/app/[locale]/research/page.tsx` (thin server shell, no data/engine call) + `src/components/ResearchClient.tsx` (`'use client'`, `useTranslations('research')`); `npx next build` lists `ƒ /[locale]/research`; `git diff main..HEAD -- package.json` empty (no CMS/MDX/new deps added) |
| 2 | The ranking copy is accurate to `recommendCards.ts` — net value = reward − fees, the real 5-level tie-break chain, preference filtering, bilingual parsing (D-01) | ✓ VERIFIED | Cross-checked `messages/en.json` `research.ranking` against `recommendCards.ts` lines 41-154: net-value sort (line 125-132), tie-break order matches source exactly — net value → reward amount → annual fee → preferred issuer → alphabetical (lines 134-153); "bare $ = HKD" claim confirmed against `transactionParser.ts:167` comment; no invented "AI scoring"/accuracy-% language found |
| 3 | The Research page includes at least one crypto explainer covering HKD valuation (RES-01, SC2) | ✓ VERIFIED | `research.crypto` section rendered in `ResearchClient.tsx` (5 sub-blocks: hkdValuation, segmentation, failSafe, baseTier, hkEligibility) |
| 4 | The crypto copy is accurate to `valuateCrypto.ts` + Phase 7 — HKD-equivalent via injected/maintained rate table (not live fetch), unit-segmented, fail-safe (stale→last-known+marker, missing→"value unavailable"), base un-staked tier, `hkEligible` fail-closed (D-02) | ✓ VERIFIED | Cross-checked against `valuateCrypto.ts`: injected static table not live-fetched (matches "refreshed on a schedule, not fetched live"); stale rate keeps last-known value + flag (matches `rateStale` logic lines 61-63); missing/non-positive rate → `hkdEquivalent: null` never fabricated (matches "value unavailable... never invents a number"); partition-before-sort confirmed in `recommendCards.ts:74-83` (fiat/crypto split before the fiat sort, matching "never mixed into fiat ranking"); `hkEligible === false` fail-closed gate confirmed at `recommendCards.ts:70` |
| 5 | Both `en.json`/`zh-HK.json` have full key parity across the entire `research` namespace — no missing-string fallback (SC3, D-06) | ✓ VERIFIED | Nested-aware key diff run directly: `en count 30, zh count 30, missing in zh: [], extra in zh: []`; `tieBreak.steps` array length 5/5 (parallel-array parity holds); zh-HK content read in full — genuine 繁體 prose (e.g. "淨值（回贈減去費用）較高者勝出"), not stub/English-fallback text |
| 6 | The "Research" nav link routes to `/[locale]/research` (D-05) | ✓ VERIFIED | `src/components/HomeClient.tsx:89-94` — `<Link href="/research">{tResearch('navLink')}</Link>` reading the same `research.navLink` key rendered by `ResearchClient.tsx`'s own active-state header entry |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/[locale]/research/page.tsx` | Server route shell, no engine/data call | ✓ VERIFIED | Renders only `<ResearchClient/>`; no `loadCards`/fetch/prisma-equivalent call |
| `src/components/ResearchClient.tsx` | Client chrome + both explainer sections | ✓ VERIFIED | 223 lines; renders `ranking` and `crypto` sections fully from i18n keys, no hardcoded copy |
| `src/components/HomeClient.tsx` | "Research" nav link | ✓ VERIFIED | Link + `useTranslations('research')` present and wired |
| `research` namespace in `messages/en.json` / `messages/zh-HK.json` | Full shell+ranking+crypto content, bilingual | ✓ VERIFIED | 30/30 nested keys, real content both locales |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `HomeClient.tsx` Research link | `/[locale]/research` route | `href="/research"` (i18n routing `Link`) | ✓ WIRED | Confirmed at `HomeClient.tsx:89-94` |
| `ResearchClient.tsx` | `research` namespace | `useTranslations('research')` | ✓ WIRED | Every visible string sourced from `t(...)`/`t.raw(...)`, no literal copy in JSX |
| `page.tsx` | `ResearchClient` | direct render | ✓ WIRED | `<ResearchClient />` |

### Gates Re-Run (not trusted from SUMMARY — executed directly)

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npx tsc --noEmit` | exit 0, clean |
| Test suite | `npx vitest run` | 15 files, **137 passed / 7 skipped** — matches SUMMARY claim, no regressions |
| Build + route presence | `npx next build` | Compiled successfully; `ƒ /[locale]/research` listed in route table |
| No new deps | `git diff main..HEAD -- package.json package-lock.json` | empty diff |
| Bilingual parity (independently re-run, not copy-pasted from plan script) | inline node key-diff | `en count 30, zh count 30, missing: [], extra: []` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| RES-01 | 10-01, 10-02 | Bilingual Research page, ranking + crypto explainers, no CMS/MDX | ✓ SATISFIED | See truths 1-4 above. Note: `REQUIREMENTS.md` line 283/363 still shows RES-01 as an unchecked `[ ]` / "Pending" checkbox — this is a bookkeeping gap in the requirements tracker, not a code gap (informational only, not a blocker). |

### Anti-Patterns Found

None. Scanned `page.tsx`, `ResearchClient.tsx`, `HomeClient.tsx`, and the `research` namespace in both message files for `TODO|FIXME|TBD|XXX|HACK|PLACEHOLDER|placeholder|coming soon|not yet implemented` — zero matches. No empty handlers, no hardcoded-empty render paths, no committed secrets (public repo).

### v2 Design-System Fidelity

Spot-checked `ResearchClient.tsx` tokens against `.planning/design/ui-contract-v2.md`: uses `--brand` mint fill for the active "Research" nav item (contract §5 nav rule, `#67ffc5` per contract §1), `border-border`/`border-border-strong` hairline/emphasis borders (contract §3), `font-display` uppercase Rethink headings + Inter body (contract §2), `text-fg`/`text-muted-fg`/`bg-bg` token-only colors (no hardcoded hex except the deliberate near-black label-on-mint `#0b0b0b`, which the component comments correctly as "mint is a light fill in both themes, so its label stays near-black" — a token-conscious, intentional exception, not a violation). No engine/data-layer calls present anywhere in the phase's files — the read-only/no-regression requirement holds.

### Human Verification Required

### 1. Visual + copy-quality sign-off (both locales, both themes)

**Test:** At localhost, view `/en/research` and `/zh-HK/research` in both light and dark mode.
**Expected:** The ranking-methodology and crypto-valuation explainers read naturally and idiomatically in both English and Traditional Chinese; the editorial layout (eyebrow/title/intro, hairline section rules, the FX-fee bordered aside, the ordered tie-break list, the five crypto sub-blocks) visually matches the v2 brutalist-editorial system in both light and dark mode; dark mode flips cleanly via the `.dark` class with no unstyled/hardcoded-color artifacts.
**Why human:** Copy register/naturalness and visual layout fidelity are judgment calls no grep/build/test check can make. Both 10-01-SUMMARY.md and 10-02-SUMMARY.md explicitly flag this as Jeff's non-blocking discretionary sign-off (per 10-CONTEXT.md "Claude's Discretion" note) — automated checks (parity, tsc, build, tests) all pass; this is the one item automated verification cannot close.

### Gaps Summary

No gaps. All 6 must-have truths verified against the actual codebase (not SUMMARY claims): the route exists and compiles, both required explainers are accurate to their engine source files (`recommendCards.ts`, `valuateCrypto.ts`, Phase 7 verification), the `research` namespace has genuine full bilingual parity (independently re-counted, not trusted from the plan's own script output), the nav link is wired, no new dependencies were introduced, and the full test suite is green with no regressions. The only open item is the owner's own non-blocking localhost visual/copy sign-off across both locales and themes, which was always scoped as a human checkpoint rather than an automatable gate — hence `human_needed` rather than `passed`.

---

*Verified: 2026-07-31T01:35:00Z*
*Verifier: Claude (gsd-verifier)*
