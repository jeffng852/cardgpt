/**
 * Pure, Redis-free merge helper for the crypto seed script (D-09 / T-08-SEED).
 *
 * WHY THIS EXISTS: scripts/seed-crypto-cards.mjs mutates the LIVE production Redis
 * `cards` key. Its single most safety-critical property — never clobber the 11 credit
 * cards or any live admin edit, only APPEND crypto cards by a brand-new id — is
 * extracted here as a pure function so it can be unit-tested without a live/mocked
 * Redis (RESEARCH Wave-0 gap). See scripts/__tests__/seed-crypto-cards.test.ts.
 *
 * CONTRACT: mergeCards(existing, incoming) → { cards, added }
 *   - Appends an incoming card whose id is NOT already present; increments `added`.
 *   - Skips an incoming card whose id already exists — the PRE-EXISTING object is kept
 *     (same reference, never overwritten from the incoming duplicate). This is what makes
 *     re-runs idempotent and guarantees a live admin edit is never stomped by seed data.
 *   - De-duplicates repeated new ids WITHIN one incoming batch (first wins).
 *   - Never mutates the `existing` array or any card object it contains.
 *
 * No I/O, no timestamps, no Redis — a value-in / value-out function only.
 *
 * @param {Array<{id: string}>} existing  the current cards (e.g. the live Redis `cards[]`)
 * @param {Array<{id: string}>} incoming  cards to append by new id (the fixture / real load)
 * @returns {{ cards: Array<{id: string}>, added: number }}
 */
export function mergeCards(existing, incoming) {
  const existingArr = Array.isArray(existing) ? existing : [];
  const incomingArr = Array.isArray(incoming) ? incoming : [];

  const seenIds = new Set(existingArr.map((c) => c && c.id));
  const cards = [...existingArr];
  let added = 0;

  for (const card of incomingArr) {
    if (!card || card.id == null) continue; // ignore malformed entries defensively
    if (seenIds.has(card.id)) continue; // idempotent skip — existing/first-seen object wins
    cards.push(card);
    seenIds.add(card.id);
    added++;
  }

  return { cards, added };
}
