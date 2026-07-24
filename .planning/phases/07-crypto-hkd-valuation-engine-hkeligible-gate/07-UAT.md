---
status: complete
phase: 07-crypto-hkd-valuation-engine-hkeligible-gate
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-07-24T22:59:32Z
updated: 2026-07-24T22:59:32Z
---

## Current Test

[testing complete]

## Tests

<!--
Phase 7 is a pure engine/logic phase (no UI, no user-clickable surface). Every
deliverable is observable only via the test suite, typecheck, and build, so all
checks were auto-verified by the orchestrator running the actual gates rather
than presented as manual click-through UAT. Evidence recorded per test.
-->

### 1. Cold Start Smoke Test
expected: Production build boots from scratch — engine barrel (`src/lib/engine/index.ts`) compiles, all routes build, static pages generate without error.
result: pass
source: automated
evidence: "npm run build → ✓ Compiled successfully in 1057.8ms; 20/20 static pages generated."

### 2. Full test suite green
expected: `npm test` (vitest run) passes with no failures; the 7 Plan-01 quarantined parser tests remain skipped.
result: pass
source: automated
evidence: "npx vitest run → 7 files passed, 73 passed | 7 skipped | 0 failed."

### 3. Typecheck clean
expected: `npx tsc --noEmit` exits 0 after the additive rate-table types, `cryptoSegment`, and 4th `rateTable` param.
result: pass
source: automated
evidence: "npx tsc --noEmit → exit 0."

### 4. Fiat ranking byte-identical (TECH-01 regression)
expected: The full 11-card fiat ranking is unchanged by all crypto work — the committed baseline snapshot is byte-identical (never regenerated with -u).
result: pass
source: automated
evidence: "git status --porcelain on __snapshots__/ → empty; fiat-regression.test.ts.snap last touched at Wave 0 baseline e718dbe; fiat-regression.test.ts green."

### 5. Crypto→HKD valuation: staleness + fail-safe (CRY-04, DEC-VAL-A)
expected: valuateCrypto() values a reward as rewardAmount × hkdPerUnit; keeps last-known value with a rateStale flag past 24h; degrades to hkdEquivalent: null on missing/absent/zero/negative/NaN/unparseable rate — never a fabricated number or a throw.
result: pass
source: automated
evidence: "valuateCrypto.test.ts → 10 tests pass (fresh/stale/name-key/absent/zero/negative/NaN/no-table/no-asset/bad-asOf)."

### 6. minStaking not-met-by-default (DEC-VAL-C)
expected: A staking-gated reward tier is excluded from the default valuation (values at the base un-staked tier); un-gated bonuses still apply.
result: pass
source: automated
evidence: "minStaking.test.ts → 3 tests pass (gated tier excluded, un-gated bonus applies, base parity)."

### 7. hkEligible fail-closed gate (CRY-05, T-07-GATE)
expected: A card with hkEligible === false is excluded from BOTH recommendations and cryptoSegment; undefined/true stay eligible; the 11 legacy cards (all undefined) still return 11 recommendations.
result: pass
source: automated
evidence: "hkEligible.test.ts green — false ⇒ excluded, undefined/true ⇒ included, 11-card corpus intact, explicit-false dropped when mixed into corpus."

### 8. Partition-before-sort segmentation + cryptoSegment ranking (CRY-04, DEC-VAL-B)
expected: Eligible cards split into fiat (cardType === 'credit') and non-fiat BEFORE the sort so a crypto unit can never perturb the fiat ranking; cryptoSegment ranks by hkdEquivalent desc with null (value-unavailable) entries appended unranked; 3-arg callers see an unchanged result shape.
result: pass
source: automated
evidence: "segmentation.test.ts green — credit-only in recommendations, non-fiat in cryptoSegment, null appended unranked, no-rateTable backward-compat, rateTable does not perturb the 11-card corpus."

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Notes

- Phase 7 has no user-facing UI; `cryptoSegment` is wired into the engine contract but rendering it (a crypto section beside the fiat list) is explicitly downstream UI work, and the rate table that makes valuation non-inert is Phase 8 scope (DEC-DATA-002). Those are forward dependencies, not Phase 7 gaps.
- Two pre-existing parser tests remain quarantined (`.skip`, 7 assertions) pending a taxonomy spec decision — a Plan-01 deferred follow-up, out of Phase 7 scope. Recommend a Linear issue under the parser surface.
