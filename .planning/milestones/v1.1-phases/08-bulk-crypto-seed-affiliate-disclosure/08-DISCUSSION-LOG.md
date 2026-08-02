# Phase 8: Bulk Crypto Seed & Affiliate / Disclosure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 08-bulk-crypto-seed-affiliate-disclosure
**Areas discussed:** Scope/sequencing, Rate source, Disclosure UX, Copy + links, Disclosure reconciliation

---

## Scope / sequencing (under the RQ-001 data block)

| Option | Description | Selected |
|--------|-------------|----------|
| Build all machinery now, defer only the data load | Implement + test seed script, rate table, affiliate CTA, disclosure, loadCards fix against a small crypto fixture; real bulk seed later when RQ-001 resolves | ✓ |
| Split affiliate/disclosure + loadCards fix into its own sub-phase | Ship AFF work first (unblocked), crypto seed + rate table as a separate RQ-001-tied slice | |
| Block the whole phase on RQ-001 | Do nothing until real crypto-card data exists | |

**User's choice:** Build all machinery now, defer only the data load.
**Notes:** Only the real bulk crypto DATA is RQ-001-blocked; all machinery builds/tests against a fixture. (D-01)

---

## Rate source (DEC-DATA-002)

| Option | Description | Selected |
|--------|-------------|----------|
| Manually-seeded stablecoin rates, no external fetch | Static table (USDC/USDT ≈ 7.8 HKD); job just refreshes asOf; simplest, no new dependency | |
| Cron job fetches from a free price API (e.g. CoinGecko) | Vercel Cron pulls real rates on a schedule → Redis; adds external dependency + CRON_SECRET; Phase 7 staleness covers failures | ✓ |
| Admin-editable rate table | Rates set via admin surface; gated on THI-236 admin-auth; manual toil | |

**User's choice:** Cron job fetches from a free price API (CoinGecko).
**Notes:** Advances the earlier DEC-DATA-002 deferral of live price feeds — Jeff chose to bring a real fetched feed forward now. Rate-table key stays the Phase-7-locked `shortName` ticker. (D-02, D-03, D-04)

---

## Disclosure UX + Copy (AFF-02) — two answers conflicted, reconciled below

| Option (placement) | Description | Selected |
|--------|-------------|----------|
| Per-card, above each Apply button | Own disclosure line per card | |
| One global banner at top of results | Single conspicuous disclosure | |
| Both | Banner + per-card note | |
| No disclosure | (User's initial answer) | (retracted → see reconciliation) |

**User's choice (initial):** "No need disclosure" on placement, but "I'll draft EN/ZH copy for your review" on copy — contradictory.

**Reconciliation prompt (Claude flagged the conflict + the risk):** dropping the disclosure removes half of a locked requirement (AFF-02) and a stated legal/compliance release gate; taking affiliate revenue without disclosure is the specifically risky combination (advertising-standards / consumer-protection, heightened for HK financial products).

| Reconciliation option | Description | Selected |
|--------|-------------|----------|
| Keep it — draft EN/ZH copy for review | Build disclosure; keeps AFF-02 + compliance gate (Claude-recommended) | |
| Build it but keep OFF behind a flag | Ready to switch on before first monetized deploy | |
| Genuinely drop it — rewrite AFF-02, accept the risk | Remove disclosure; rewrite AFF-02; log risk acknowledgement | ✓ |

**User's choice (final):** Genuinely drop the disclosure; rewrite AFF-02; risk accepted.
**Notes:** Product-owner decision made with the trade-off laid out explicitly. Only the disclosure clause of AFF-02 is dropped; the ranking-neutrality and recommendable-without-applyUrl clauses are kept. AFF-02 rewritten in REQUIREMENTS.md; the associated pre-deploy compliance gate is correspondingly removed. (D-08)

---

## Claude's Discretion

- CoinGecko endpoint, id→ticker mapping, refresh cadence, rate-limit/caching, cron mechanics.
- Fixture composition (representative crypto/neobank cards: stablecoin + volatile + staking-gated + null-rate case).
- Affiliate CTA visual treatment within the existing Apply button.

## Deferred Ideas

- Real bulk crypto card data load (RQ-001) — machinery built against a fixture; real load later.
- Admin-editable rate table — rejected (toil + THI-236 gate).
- Live price feeds beyond CoinGecko / richer asset coverage — later.
- Prepaid handling / own results section — Phase 9.
- `cryptoSegment` UI rendering — downstream UI phase.
- Admin-auth hardening (THI-236) — release gate, not phase work.
- The bilingual disclosure + its compliance gate are **removed** (D-08), not merely deferred — revisiting re-opens scope + a fresh compliance review.
