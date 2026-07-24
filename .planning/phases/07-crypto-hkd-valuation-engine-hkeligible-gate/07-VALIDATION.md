---
phase: 7
slug: crypto-hkd-valuation-engine-hkeligible-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This phase **installs the repo's first test runner (vitest, TECH-01)** — Wave 0 is the install.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (^4.x, dev-only) — NEW this phase per TECH-01 |
| **Config file** | `vitest.config.ts` — Wave 0 creates it (`environment: 'node'`, `globals: true`, `resolve.alias` `@`→`./src`) |
| **Quick run command** | `npx vitest run <file>` (single test file) |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~5–15 seconds (pure engine tests, node env, no DOM) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` on the touched test file(s)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-W0 | 01 | 0 | TECH-01 | — | vitest installed + config resolves `@/` alias; `npm test` runs | infra | `npm test` (exits 0 with ≥1 test) | ❌ W0 | ⬜ pending |
| 7-REG | 01 | 0/1 | TECH-01 | T-07-REG | Identity fiat rates ⇒ existing 11-card fiat ranking byte-identical | snapshot | `npx vitest run <fiat-regression>` | ❌ W0 | ⬜ pending |
| 7-VAL | 02 | 1 | CRY-04 | T-07-VAL | Crypto reward → HKD-equiv via injected static table; stale→last-known+flag; absent/zero→value-unavailable | unit | `npx vitest run <valuation>` | ❌ W0 | ⬜ pending |
| 7-SEG | 02 | 1 | CRY-04 | T-07-SEG | Crypto returned in a separate `cryptoSegment`; fiat `recommendations` unchanged (partition-before-sort) | unit | `npx vitest run <segmentation>` | ❌ W0 | ⬜ pending |
| 7-STK | 02 | 1 | CRY-04 | — | Staking-gated tier valued at BASE un-staked tier by default (no "assume met") | unit | `npx vitest run <staking>` | ❌ W0 | ⬜ pending |
| 7-GATE | 03 | 2 | CRY-05 | T-07-GATE | `hkEligible === false` ⇒ excluded from recommendations, still in directory; `undefined` ⇒ eligible | unit | `npx vitest run <hkeligible>` | ❌ W0 | ⬜ pending |
| 7-TRIAGE | 01 | 0 | TECH-01 | — | The 2 dormant test files (engine/parser) either pass or are quarantined — `globals:true` auto-activates them | infra | `npm test` (no unexpected red) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `vitest.config.ts` — install & configure (TECH-01); `@/` alias resolves; `npm test` script added
- [ ] **Triage the 2 pre-existing dormant test files** (`src/lib/engine/__tests__/engine.test.ts`, `src/lib/parser/__tests__/transactionParser.test.ts`) — they auto-activate under `globals:true` and have never been run; make them pass or explicitly quarantine (`.skip` + note) so the suite is green
- [ ] Baseline fiat-ranking snapshot generated on the CURRENT engine and committed BEFORE any valuation/segmentation change (so the regression test proves no drift)

*Wave 0 is mandatory here — the repo has no test infrastructure yet.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staleness marker copy reads correctly in EN + zh-HK | CRY-04 | i18n string rendering | Spot-check the "rate as of <time>" / "value unavailable" labels in both locales (no crypto card data exists until Phase 8, so this is fixture/preview-driven) |

*Most Phase 7 behavior is automated; only i18n copy is eyeballed.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (vitest install + dormant-test triage + baseline snapshot)
- [ ] No watch-mode flags (`vitest run`, never bare `vitest`)
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
