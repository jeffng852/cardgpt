# Phase 9: Data Page (Card Directory) - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 09-data-page-card-directory
**Areas discussed:** Layout, Detail view, Controls (v1), Provenance labeling

---

## Layout

| Option | Selected |
|--------|----------|
| Card grid (logos + key stats) | ✓ |
| Dense data table | |
| List rows (hybrid) | |

**Choice:** Card grid — consumer-directory feel, mobile-friendly. (D-01)

## Detail view

| Option | Selected |
|--------|----------|
| Dedicated route `/cards/[id]` | ✓ |
| Modal overlay | |
| Expand inline | |

**Choice:** Dedicated route — enables the recommender deep-link (phase goal), shareable/SEO, back-button. Uses existing `getCardById`. (D-02)

## Controls (v1)

| Option | Selected |
|--------|----------|
| Search by name/issuer | ✓ |
| Filter by card type | |
| Filter by issuer + HK-eligible | |
| Sort (reward rate / annual fee / name) | ✓ |

**Choice:** Search + sort only. Filters **deselected** → deferred (11 credit cards in prod today, nothing to filter until the set grows / crypto seeds via RQ-001). Note: the phase goal says "filter" — this is a recorded v1 scope reduction, not an omission. (D-03)

## Provenance labeling (DEC-DATA-001)

| Option | Selected |
|--------|----------|
| Per-card badge + tooltip | |
| Page-level banner only | ✓ |
| Both banner + per-card badge | |

**Choice:** Page-level banner only — honest disclosure without per-row noise. Per-card badges deferred. (D-04)

## Claude's Discretion
- Grid breakpoints, tile composition, search-match algorithm, sort UI, detail field layout.
- Search/sort state in URL query params (recommended, shareable) vs component state.
- Nav mechanism (no dedicated nav/header component exists today).

## Deferred Ideas
- Type/issuer/hkEligible filters (goal's "filter" clause) — until larger set / crypto seeds.
- Per-card provenance badges.
- Crypto-specific detail sections — when real crypto cards land (RQ-001).
- Phase 11 (THI-176) will restyle this page — v1 is current-design-system.
