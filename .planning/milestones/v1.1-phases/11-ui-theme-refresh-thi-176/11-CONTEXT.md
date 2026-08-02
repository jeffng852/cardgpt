# Phase 11: UI / Theme Refresh (THI-176) - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning
**Design contract:** `.planning/design/ui-contract-v2.md` (APPROVED, authoritative — read it first)

<domain>
## Phase Boundary

**Re-skin the existing app into the CardGPT v2 (brutalist-editorial) design system** — a re-skin, NOT a re-architecture. **Every existing behavior stays intact.**

**Re-sequencing note:** the ROADMAP scopes Phase 11 as restyling Home + Data + Research together, depending on Phases 9 & 10. We pulled the redesign forward, so Data (Phase 9) and Research (Phase 10) **do not exist yet**. Therefore THIS phase restyles **only what exists today**: the global design system + the Home/recommender surface + shared chrome + the shared card component. Data (Phase 9) and Research (Phase 10) will then be **built into** the finished system (not restyled later), and a light final cohesion check confirms all three match once they exist.

**In scope (now):**
1. **Global design system** — new `globals.css` tokens (light + dark, per ui-contract-v2.md §1), Tailwind v4 `@theme inline` mapping, square/hairline/flat conventions.
2. **Fonts** — add **Rethink Sans** (display) + **Inter** (body) via `next/font/google`; keep **Geist Mono** for data. (Currently only Geist Sans/Mono are loaded.)
3. **Logo** (`Logo.tsx`) — the new `CardGPT▍` wordmark + blinking mint cursor (contract §4).
4. **Header / nav** — restyle to outline/mint-active buttons; language switch + dark-mode toggle chrome.
5. **Home / recommender restyle** — hero, `TransactionInput` (describe-your-purchase), example tags, `TypingAnimation`, `HowItWorks`, `FloatingCards`, and `CardRecommendationList` → the new **shared card component** (contract §5). The transaction simulator is RETAINED — re-skinned only.
6. **Bilingual** — any new UI strings added to both `messages/en.json` + `messages/zh-HK.json`.

**Preserve (non-negotiable — success criteria):** recommendation flow, tag→input population, language switch, **dark mode + persistence**, the affiliate Apply CTA (`rel="sponsored nofollow noopener"`), and every current interaction.

**Out of scope:** Data page (Phase 9 — builds into this system next), Research page (Phase 10), the directory filters, any engine/data-layer change.
</domain>

<decisions>
## Implementation Decisions

- **D-01:** The full visual system is LOCKED in `.planning/design/ui-contract-v2.md` — tokens, type scale, shape (square cards / hairlines / flat), components (card, chips, buttons, nav, logo), and the alignment rule. Downstream agents implement to that contract; do not re-derive design choices. — **Reversibility:** costly — a global token/theme change touches every component.
- **D-02:** Re-skin, NOT re-architecture — swap styling (Tailwind classes, tokens, CSS) and the logo; do NOT change component logic, data flow, routing, or the engine. Every behavior must still pass. — **Reversibility:** reversible.
- **D-03 (dark mode KEPT):** ranked.plus is light-only; CardGPT keeps dark mode. Implement the contract's dark token set; the existing `ThemeProvider`/`DarkModeToggle`/persistence stays working. — **Reversibility:** reversible.
- **D-04 (fonts):** Load Rethink Sans + Inter via `next/font/google` (self-hosted, no CDN/CSP issue); keep Geist Mono for numeric data. Replace Geist Sans usage with Rethink Sans (display) + Inter (body). — **Reversibility:** reversible.
- **D-05 (shared card component):** `CardRecommendationList` becomes the new brutalist card (contract §5) — this same component is reused by the Phase 9 directory afterward, so build it cleanly/parameterized (ranked vs browse mode). — **Reversibility:** costly — reused downstream.
- **D-06 (alignment rule):** Enforce the contract's alignment rule (card name reserves 2 lines; identical data-grid rows within a view; footer pinned to bottom) so result cards line up column-to-column. — **Reversibility:** reversible.

### Claude's Discretion
- Exact Tailwind v4 token wiring, per-component class migration, hero composition, how much of `HowItWorks`/`FloatingCards`/`TypingAnimation` to keep vs simplify (keep behavior; restyle freely).
- Whether to add disabled/"coming soon" Directory/Research nav entries now or wait for those phases (recommend: minimal nav to existing surfaces).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/design/ui-contract-v2.md` — **the authoritative design spec** (tokens, type, components, logo, alignment rule)
- `.planning/ROADMAP.md` §"Phase 11" — goal + success criteria (UI-01; preserve behavior)
- Reference mockup (visual target): scratchpad `cardgpt-redesign-mockup.html` / artifact `59c451e4` — recommender + directory + detail, light/dark

### Files to restyle (existing)
- `src/app/globals.css` — token overhaul (light+dark), Tailwind v4 `@theme inline`
- `src/app/[locale]/layout.tsx` — swap/add fonts (Rethink Sans + Inter + Geist Mono via next/font)
- `src/components/Logo.tsx` — new wordmark + mint cursor
- `src/components/HomeClient.tsx`, `TransactionInput.tsx`, `CardRecommendationList.tsx`, `TypingAnimation.tsx`, `HowItWorks.tsx`, `FloatingCards.tsx` — Home/recommender restyle
- `src/components/DarkModeToggle.tsx`, `LanguageSwitcher.tsx`, `ThemeProvider.tsx` — chrome (behavior preserved)
- `messages/en.json`, `messages/zh-HK.json` — new strings (both languages)
- `src/app/[locale]/page.tsx` — server entry (unchanged data flow; may adjust layout wrappers)

</canonical_refs>

<code_context>
## Existing Code Insights

### Current state
- Fonts: only Geist Sans + Geist Mono loaded (`layout.tsx`). Design is "ChatGPT-teal + playful fintech" tokens in `globals.css` — being replaced wholesale.
- `CardRecommendationList` renders the recommender results with the Apply CTA (Phase 8 `applyCtaProps` — keep the `rel` treatment).
- `ThemeProvider` + `DarkModeToggle` already provide dark-mode + persistence — the theme *values* change, the mechanism stays.
- next-intl bilingual (en + zh-HK) is app-wide.

### Integration Points
- The new card component built here is the **same one Phase 9's directory will use** — parameterize for ranked (with reward calc) vs browse mode.
- Global tokens in `globals.css` cascade to every page — get them right first (tracer: tokens + fonts + one restyled surface).

</code_context>

<specifics>
## Specific Ideas
- Follow `ui-contract-v2.md` exactly. Logo = `CardGPT▍`. Monochrome + mint/neon, square, flat, hairlines. Keep dark mode.
</specifics>

<deferred>
## Deferred Ideas
- Data page (Phase 9), Research page (Phase 10) — built into this system afterward.
- Final cross-surface cohesion verification — once Data + Research exist.
- Directory filters, per-card provenance badges, crypto detail sections — later (RQ-001).
</deferred>

---

*Phase: 11-UI / Theme Refresh (THI-176)*
*Context gathered: 2026-07-27*
