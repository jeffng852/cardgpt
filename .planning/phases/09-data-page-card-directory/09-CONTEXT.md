# Phase 9: Data Page (Card Directory) - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A new **public bilingual route** where a visitor can **browse, search, and sort** the full card set and open a **detail view** per card, with bulk-sourced data honestly labeled. Reads live card data via the existing `loadCards()` / `getCardById()`; no new data model.

**In scope:** the directory grid page, per-card detail routes, search + sort, a page-level provenance banner, a nav entry point from the home page, and the recommender→detail deep-link. Bilingual (en + zh-HK).

**Out of scope (deferred):** type/issuer/`hkEligible` **filters** (the phase goal says "filter", but with only 11 credit cards in prod there's nothing to filter yet — deferred until the set grows / crypto seeds, RQ-001); per-card provenance badges; crypto-specific detail sections; the real crypto card data itself (RQ-001). Phase 11 will restyle this page — build functional in the current design system, don't over-invest in bespoke visuals.

</domain>

<decisions>
## Implementation Decisions

### Layout & presentation
- **D-01 (Layout):** Responsive **card grid** of tiles — issuer logo, card name, top reward rate, annual fee, and a small type badge (credit/crypto/prepaid). Consumer-directory feel, mobile-friendly. Draw visual cues from the existing `CardRecommendationList` tile, but this is a browse surface (no recommendation ranking). — **Reversibility:** reversible.
- **D-04 (Provenance):** A **page-level banner** at the top of the directory disclosing that some card data is bulk/community-sourced (DEC-DATA-001) — NOT per-card badges (deferred). Honest without per-row noise. — **Reversibility:** reversible.

### Detail view & routing
- **D-02 (Detail view):** A **dedicated route `/[locale]/cards/[id]`** (server component using the existing `getCardById(id)`), not a modal. This is what enables the phase goal's **recommender deep-link** (link straight to a card), plus shareable/SEO-friendly URLs and working back-button. 404/not-found handling for unknown ids. — **Reversibility:** costly — a published URL contract; changing the path later breaks links.
- **D-07 (Entry points):** Add a **nav link from the home page** to the directory, and wire recommender result cards to deep-link into `/cards/[id]`. — **Reversibility:** reversible.

### Controls (v1)
- **D-03 (Search + sort only):** v1 ships **free-text search** (matches card name + issuer) and **sort** (reward rate / annual fee / name). **No type/issuer/hkEligible filters in v1** (Jeff deselected — deferred; 11 credit cards today, filters add little until the set grows). Search/sort is client-side interactivity over the server-loaded card set. — **Reversibility:** reversible (filters are additive later).

### Data & i18n
- **D-05 (Crypto handling):** The directory renders whatever `loadCards()` returns — **11 credit cards today**; crypto/neobank cards appear automatically once seeded (RQ-001). No special crypto empty-state needed now beyond the provenance banner. Do NOT hardcode "11" — render the live set. — **Reversibility:** reversible.
- **D-06 (Bilingual):** Fully bilingual via the existing `next-intl` setup (`messages/en.json` + `messages/zh-HK.json`, `zh-HK` locale). All new UI strings get both languages. — **Reversibility:** reversible.
- **D-08 (Styling):** Build in the **current design system** (Tailwind + `ThemeProvider`/dark-mode support). Phase 11 (THI-176 theme refresh) will restyle — keep it clean and conventional, not bespoke. — **Reversibility:** reversible.

### Claude's Discretion
- Exact grid breakpoints, tile composition, search-match algorithm (substring/normalized), sort control UI, and detail-page field layout.
- Whether search/sort state lives in URL query params (nice for shareable filtered views) or component state — recommend URL params for shareability, but Claude's call.
- The nav mechanism (the home layout has no dedicated nav/header component today).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & data
- `.planning/ROADMAP.md` §"Phase 9: Data Page (Card Directory)" — goal + success criteria
- `.planning/PROJECT.md` — product core value (HK card recommender, bilingual, no login)
- `.planning/STATE.md` §Accumulated Context — DEC-DATA-001 (provenance labeling for bulk crypto data)

### Reuse (existing code)
- `src/lib/data/loadCards.ts` — `loadCards()` (all cards), `getCardById(id)` (detail), `getCardsByIssuer` / `getCardsByRewardUnit` (future filters), `getDatabaseMetadata()`
- `src/app/[locale]/page.tsx` — the server-component pattern (loads cards, renders a client component); the model for the directory page
- `src/components/CardRecommendationList.tsx` — existing card-tile rendering (logo, stats, apply CTA) — visual reference for the grid tile
- `src/components/HomeClient.tsx` — server→client prop pattern
- `src/components/{ThemeProvider,DarkModeToggle,LanguageSwitcher,Logo}.tsx` — theming + i18n chrome to reuse on the new pages
- `src/app/[locale]/layout.tsx` — locale layout; where a nav entry point attaches
- `messages/en.json`, `messages/zh-HK.json` — bilingual strings (add directory + detail keys)
- `src/types/card.ts` — `CreditCard` shape (name, issuer, rewards, fees, applyUrl, cardType, hkEligible)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `loadCards()` + `getCardById()`: the directory and detail pages need no new data layer — both helpers already exist.
- The `[locale]/page.tsx` server→`HomeClient` pattern is the exact template for `cards/page.tsx` → a `CardDirectoryClient`.
- Theming (`ThemeProvider`/`DarkModeToggle`) and i18n (`next-intl`, `LanguageSwitcher`) are app-wide — the new pages inherit them via the locale layout.
- `CardRecommendationList` shows how a card tile renders (logo, reward stats, apply CTA) — reuse the visual vocabulary.

### Established Patterns
- App Router server components load data; client components handle interactivity (search/sort).
- Bilingual: every user-facing string is a `next-intl` key in both `en.json` and `zh-HK.json`.
- `force-dynamic` on data-backed pages (the home page reads Redis live).

### Integration Points
- New routes: `src/app/[locale]/cards/page.tsx` (grid) + `src/app/[locale]/cards/[id]/page.tsx` (detail).
- Nav entry from `[locale]/layout.tsx` or the home page.
- Recommender deep-link: `CardRecommendationList` card → `/cards/[id]`.

</code_context>

<specifics>
## Specific Ideas
- Card grid (not table) · dedicated detail routes (not modal) · search + sort (no filters v1) · page-level provenance banner (not per-card badges).
</specifics>

<deferred>
## Deferred Ideas
- **Filters** (card type, issuer, HK-eligible) — the goal's "filter" clause; deferred until the card set is larger / crypto seeds (RQ-001). `getCardsByIssuer`/`getCardsByRewardUnit` already exist to build on.
- **Per-card provenance badges** — banner-only for v1; per-card precision later (pairs with crypto seeding).
- **Crypto-specific detail sections** (staking tiers, hkEligible surfacing) — when real crypto cards land.
- **Phase 11 restyle** — this page gets the THI-176 theme treatment later; v1 is current-style.
</deferred>

---

*Phase: 9-Data Page (Card Directory)*
*Context gathered: 2026-07-27*
