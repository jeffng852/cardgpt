# Research Questions

Open questions surfaced during exploration that need deeper investigation before building.

---

## RQ-001 — Which crypto cards are available to HK residents, and what are their reward structures?

**Raised:** 2026-07-16 (`/gsd-explore` — ranked.plus/crypto expansion). **Related:** THI-51,
[[ranked-plus-directory-and-crypto-expansion]].

**Why it matters:** Supporting the crypto card category (a decided direction) needs real card data.
This blocks populating the crypto side of the Data page and the recommender. It must be answered
**before** the crypto work can be planned in detail.

**Do NOT source from ranked.plus** — its list is global and its data has no reuse license (see the
exploration note). Use **primary / publicly-available sources**: issuer sites, official card T&Cs,
and HK-specific references (e.g. spendnode.io's HK crypto-card page as a lead, then verify at source).

**Sub-questions to answer:**
1. Which crypto/neobank cards can a **Hong Kong resident** actually obtain (eligibility, KYC, HKID)?
2. For each: reward rate, **reward asset** (USDC, CRO, BTC…), and reward **unit** semantics.
3. **Staking / holding requirements** that gate reward tiers (amount + asset).
4. Fees — annual, FX, load/funding fees — and **funding options** (bank transfer, crypto deposit).
5. Which have **referral / affiliate programs** (ties directly to monetization + the `applyUrl` rail)?
6. How do their rewards map onto CardGPT's per-transaction model — do they reward by category, flat,
   or only on specific rails? (Determines whether the existing engine handles them as-is.)

**Output when answered:** a shortlist of HK-obtainable crypto cards with structured data ready to
model against the extended schema (`cardType`, `crypto` reward unit, `stakingRequirement`, etc.).
