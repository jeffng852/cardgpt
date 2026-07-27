# CardGPT v2 — Design Contract (brutalist-editorial)

**Status:** APPROVED 2026-07-27 (product owner). Locked visual system for the app redesign (THI-176 / GSD Phase 11) and every UI phase after it (incl. the Phase 9 directory, rebuilt into this system).

**Character:** stark, high-contrast, editorial. Near-black on white, uppercase bold display headings, sharp low-radius corners, thin gray hairline borders, **flat (no shadows)**, and a few electric accents used sparingly for emphasis and data encoding. Confident and punchy — big uppercase declaratives, concise sentence-case support copy.

> Interactive reference mockup (recommender + directory + detail, light/dark): built this session — see the "CardGPT × Ranked+ system" artifact. The mockup approximates the fonts with system stacks; the real app loads the exact faces via `next/font`.

---

## 1. Tokens

### Light (primary)
| Token | Value | Role |
|---|---|---|
| `--bg` | `#ffffff` | Page / card background |
| `--fg` | `#0b0b0b` | Primary text |
| `--primary` | `#121212` | Near-black — dark panels, primary buttons, emphasis borders |
| `--primary-fg` | `#ffffff` | Text on primary |
| `--brand` | `#67ffc5` | Mint — active nav, top-pick CTA, brand cursor |
| `--surface` | `#f5f5f5` | Raised surface |
| `--muted` | `#f2f2f2` | Muted background |
| `--muted-fg` | `#636363` | Secondary text |
| `--border` | `#dedede` | Hairline borders (the most-used color) |
| `--border-strong` | `#121212` | 2px emphasis border |
| `--ring` | `#121212` | Focus ring base (use `--brand` for the visible focus outline) |
| `--destructive` | `#e40014` | Error |
| radius | `2px` chips/buttons/inputs · `0px` cards (square) | |

### Neon accents (sparingly, high saturation)
- Yellow `#e1ff67`, Cyan `#4af5fe` — selected/"best for" chips.
- Telegram blue `#29a6ea` — reserved (not used in CardGPT nav today).

### Card-type badge colors (replaces ranked.plus's S–D tiers)
| Type | Light bg | Dark bg | Text |
|---|---|---|---|
| CREDIT | `#121212` | `#f4f4f4` | contrast |
| CRYPTO | `#067a58` (mint-dark, AA on white) | `#67ffc5` | contrast |
| PREPAID | `#1b6ea6` (cyan-dark, AA on white) | `#4af5fe` | contrast |

> Accessibility: pure `#67ffc5`/`#4af5fe` fail AA as text backgrounds in light mode — use the darkened variants for badges/text; keep the pure neons only for large fills (chips, CTA footer) where contrast holds.

### Dark theme (KEEP — product-owner confirmed; ranked.plus is light-only, this is CardGPT's considered dark variant)
`--bg #0b0b0b · --fg #f4f4f4 · --primary #f4f4f4 / --primary-fg #0b0b0b · --surface #141414 · --muted #161616 · --muted-fg #9a9a9a · --border #2b2b2b · --border-strong #f4f4f4`. Neon accents pop harder on the dark ground; mint CTA stays. Token-level theming: define on `:root`, override under `@media (prefers-color-scheme: dark)` AND `:root[data-theme="dark"|"light"]` (the DarkModeToggle stamps `data-theme`, which must win both directions).

---

## 2. Typography

- **Display:** **Rethink Sans** (700–800), **UPPERCASE**, tight negative tracking (~-0.02em to -0.035em). Headings, nav-ish labels, card names, CTA labels. Load via `next/font/google`.
- **Body/UI:** **Inter** (400–600), sentence case. Paragraphs, inputs, secondary labels.
- **Data/mono:** **Geist Mono** (already loaded) for numeric values (rates, fees) with `tabular-nums`.
- Base 16px / 24px, color `--fg`. Give headings `text-wrap: balance`.

| Style | Family | Size | Weight | Transform |
|---|---|---|---|---|
| Hero H1 | Rethink Sans | clamp(38–62px) | 800 | uppercase |
| Section H2/H3 | Rethink Sans | 24–30px | 700–800 | uppercase |
| Body/lead | Inter | 15–17px | 400–500 | none |
| Data value | Geist Mono | 13.5–14px | 700 | tabular-nums |
| Micro/badge | Inter | 10–11px | 700 | uppercase |

---

## 3. Shape, spacing, elevation
- **Square cards (0px radius)**; 2px on chips/buttons/inputs.
- **1px `--border` hairlines** define nearly everything; **2px `--border-strong`** for emphasis (top pick, primary bordered controls, the active nav).
- **Flat — `box-shadow: none` everywhere.** Separation comes from borders + background contrast, never shadow.
- Dark feature panels: solid `--primary` bg, white text, ~30px padding.
- Layout: full-bleed sections separated by hairline rules; a two-column hero (headline left, dark feature card right).

---

## 4. Logo (CardGPT's own — NOT ranked.plus's boxed mark)
- Wordmark **`CardGPT`** in the display face, **camelCase** (distinct from the all-caps headings), tight tracking, followed by a **mint block cursor `▍`** that blinks (`prefers-reduced-motion`: no blink).
- The cursor encodes the conversational/AI nature (you type, it answers). Monochrome + the single mint accent. No boxes.

---

## 5. Components

### The card (shared by recommender results AND directory)
White/`--bg` surface, 1px hairline, **square, flat**. Structure:
1. **Header** — issuer row (small square logo bug + issuer name) with a **type badge** (CREDIT/CRYPTO/PREPAID) top-right; the **top pick** shows a mint `RECOMMENDED` tag instead. Card **name** in uppercase display — **reserve a 2-line min-height so data grids align across columns** (this was the alignment fix).
2. **Data grid** — hairline label/value rows: Reward (context calc when ranked) · Top reward · Reward type · Annual fee · FX fee. Values in Geist Mono, tabular. Positive reward values may use the mint-dark accent.
3. **"Best for"** — neon chips (yellow/cyan for the active/selected, black-filled for the rest).
4. **Footer** — uppercase CTA (`VIEW CARD →` / `APPLY →`). The **top pick's footer is filled mint**. A card with no `applyUrl` shows "No apply link · still ranked" (honors the Phase 8 loadCards fix — link-less cards still appear).

**Alignment rule (locked):** equal-width columns; card name reserves 2 lines; identical data-grid row set within a view; footer pinned to bottom (`margin-top:auto`) so all footers align. No column drifts.

### Buttons
Primary/active = mint fill + 1.5px `#121212` border, 2px radius, uppercase display label. Outline = white + 1px hairline. Dark CTA = `--primary` fill.

### Chips
- Selectable (example/use-case): white + 1px black border; selected → filled neon (yellow/cyan), keep the black border.
- Data/"best for": black-filled uppercase micro labels (or neon when selected).

### Inputs / selects
White, 1px `--border-strong`, 2px radius, Inter 14–16px; the simulator's main input uses a heavier 2px border. Visible focus = 2px mint outline.

### Nav
Outline buttons; the active view is mint-filled with a 1.5px black border. Right side: language (`EN · 繁`) + dark-mode toggle.

---

## 6. Scope of the redesign (THI-176 / Phase 11)
Restyle the **existing app into this system** — the **transaction simulator/recommender is retained**, just re-skinned (hero + describe-your-purchase input + example chips + ranked result cards) — plus the chrome (header/nav/logo, theme, i18n). **Bilingual** throughout (next-intl en + zh-HK). Then the **Phase 9 directory** is (re)built into the finished system using this same card component.

**Out of scope / deferred:** directory filters (DIR-01 clause — until crypto seeds), per-card provenance badges (banner + detail labels instead), crypto-specific detail sections (RQ-001).
