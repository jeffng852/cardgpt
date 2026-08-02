---
status: complete
phase: 09-data-page-card-directory
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md]
started: 2026-07-31T13:20:00Z
updated: 2026-08-02T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Directory grid renders (both languages, no hydration warning)
expected: On /en/cards and /zh-HK/cards, a responsive grid shows one browse-mode tile per active card; card footers align across columns; the page-level provenance banner reads naturally in both en and zh-HK; browser console shows no nested-anchor hydration warning.
result: pass

### 2. Search + sort URL round-trip (shareable, survives reload)
expected: On /en/cards, typing a query narrows the grid and changing the sort reorders tiles; the URL gains ?q=...&sort=...; reloading or opening that URL in a new tab restores the same filtered/sorted view.
result: pass

### 3. No-match empty-state (bilingual copy quality)
expected: On /en/cards, searching a term that matches nothing (e.g. "zzz") renders a bilingual empty-state; on /zh-HK/cards the search placeholder, sort options, and empty-state copy all read naturally/idiomatically in Traditional Chinese (not machine-translated).
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
