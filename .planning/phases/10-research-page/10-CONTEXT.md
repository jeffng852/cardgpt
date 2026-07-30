# Phase 10: Research Page - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning
**Design contract:** `.planning/design/ui-contract-v2.md` (the LIVE v2 system — build into it)

<domain>
## Phase Boundary

A new **public bilingual Research page** (`/[locale]/research`) where a visitor can read, in English or Traditional Chinese, **how CardGPT ranks cards** and **how crypto-card rewards are valued in HKD**. Plain React + next-intl content (NO CMS/MDX). Built in the v2 design system; the `Research` nav slot already exists in the approved mockup.

**In scope:** the research route, a ranking-methodology explainer, at least one crypto-valuation explainer, the "Research" nav entry, full en/zh-HK key parity.

**Out of scope:** a blog/CMS, MDX, dynamic/authored content, per-card research, anything requiring a data layer or the engine to change (this is a static explainer page).
</domain>

<decisions>
## Implementation Decisions

- **D-01 (content is accurate-to-code):** The "how CardGPT ranks" copy must describe what the engine ACTUALLY does, drawn from the real implementation — NOT invented marketing. Source of truth: `src/lib/engine/recommendCards.ts` (net-value ranking = reward − fees; the 5-level tie-break chain: net value → reward amount → annual fee → preferred issuer → alphabetical; preference filtering) and `src/lib/parser/transactionParser.ts` (bilingual free-text → structured transaction). Keep it plain-language for a consumer, but true. — **Reversibility:** reversible.
- **D-02 (crypto explainer accurate-to-Phase-7):** The crypto-valuation explainer must reflect Phase 7's actual model: crypto rewards valued in HKD-equivalent via an injected rate table (`valuateCrypto`), unit-segmented beside fiat (partition-before-sort, so fiat ranking is unaffected), fail-safe on stale/missing rates (last-known + staleness, else value-unavailable), base un-staked tier by default, `hkEligible` fail-closed gate. Plain-language but faithful to `07-VERIFICATION.md` / `src/lib/engine/valuateCrypto.ts`. — **Reversibility:** reversible.
- **D-03 (plain React + next-intl, no CMS):** Content lives as next-intl message keys (en + zh-HK) rendered by a React page — per RES-01's explicit "no CMS/MDX". — **Reversibility:** reversible.
- **D-04 (v2 design system):** Build in the live v2 brutalist-editorial system (`ui-contract-v2.md`) — uppercase Rethink display headings, Inter body, hairline/flat/square, mint accent, dark mode. Reuse the header/nav/chrome; an editorial long-form reading layout (generous measure, section rules) fits the "editorial" side of the system. — **Reversibility:** reversible.
- **D-05 (Research nav slot):** Wire the "Research" nav entry (already in the mockup nav) to `/[locale]/research`. — **Reversibility:** reversible.
- **D-06 (full bilingual parity):** Every new string in BOTH `messages/en.json` + `messages/zh-HK.json` — real Traditional-Chinese copy, no stubs, key parity enforced (success criterion #3). — **Reversibility:** reversible.

### Claude's Discretion
- Page structure/section breakdown, exact copy (drafted accurate-to-code, Jeff reviews at the localhost visual sign-off), how many crypto sub-sections, any diagrams/tables (keep simple — no new deps), whether to link the methodology page from the recommender results ("how is this ranked?").
- Reference: research.ranked.plus exists as a tonal reference for a card-research surface (do not copy content).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design + scope
- `.planning/design/ui-contract-v2.md` — the live design system (tokens, type, shape, chrome)
- `.planning/ROADMAP.md` §"Phase 10: Research Page" — goal + 3 success criteria (RES-01)

### Accuracy sources (content must match these)
- `src/lib/engine/recommendCards.ts` — net-value ranking + the 5-level tie-break chain + preference filter (the "how CardGPT ranks" truth)
- `src/lib/engine/valuateCrypto.ts` + `.planning/phases/07-crypto-hkd-valuation-engine-hkeligible-gate/07-VERIFICATION.md` — the crypto HKD-valuation model (the crypto explainer truth)
- `src/lib/parser/transactionParser.ts` — bilingual free-text parsing (for the "type a purchase" explanation)

### Reuse (existing)
- `src/app/[locale]/cards/page.tsx` — a recent v2 page (server component + layout) to mirror for structure
- `src/components/{Logo,LanguageSwitcher,DarkModeToggle,HomeClient}.tsx` — v2 chrome + the nav where "Research" attaches
- `src/app/[locale]/layout.tsx` — locale layout
- `messages/en.json`, `messages/zh-HK.json` — bilingual strings (add a `research` namespace to both)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The `/[locale]/cards` page (Phase 9) is the freshest template for a new v2 public route (server component, chrome, bilingual) — mirror its structure.
- next-intl (en/zh-HK) + ThemeProvider are app-wide — the new page inherits them via the locale layout.
- No data layer or engine involvement — this is a static content page; the "accuracy" comes from writing copy that matches the engine, not from calling it.

### Integration Points
- New route: `src/app/[locale]/research/page.tsx`.
- Nav entry ("Research") in the header/HomeClient/layout — same place the "Directory" link went in Phase 9.
- Optional: a "how is this ranked?" link from the recommender results into the methodology section (Claude's discretion).

</code_context>

<specifics>
## Specific Ideas
- Two required explainers: (1) how CardGPT ranks (net value + tie-breaks + bilingual parsing), (2) how crypto rewards are valued in HKD (Phase 7 model). Accurate-to-code, plain-language, bilingual, v2 editorial layout, no CMS.
</specifics>

<deferred>
## Deferred Ideas
- Blog/CMS/MDX, authored articles, per-card research write-ups — explicitly out of scope (RES-01 says no CMS).
- Interactive methodology demos / visualizations — keep v1 to readable explainer content (no new deps).
</deferred>

---

*Phase: 10-Research Page*
*Context gathered: 2026-07-31*
